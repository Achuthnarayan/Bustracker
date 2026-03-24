import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Route, PushSub, TripHistory } from '@/models';
import { haversine, recordSegment } from '@/lib/ml/etaPredictor';
import webpush from 'web-push';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@bustracker.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function avgSegmentMinutes(routeId: string, fromStop: string, toStop: string): Promise<number | null> {
  const docs = await TripHistory.find({ routeId, fromStop, toStop }).sort({ recordedAt: -1 }).limit(30).lean();
  if (!docs.length) return null;
  let wSum = 0, wTotal = 0;
  docs.forEach((d: any, i: number) => { const w = Math.exp(-i * 0.05); wSum += d.actualMinutes * w; wTotal += w; });
  return wSum / wTotal;
}

async function triggerPushNotifications(bus: any, route: any) {
  try {
    const stops = route.stops.sort((a: any, b: any) => a.order - b.order);

    // Find nearest stop by GPS
    let currentStopIndex = 0, minDist = Infinity;
    stops.forEach((stop: any, i: number) => {
      const d = haversine(bus.latitude, bus.longitude, stop.latitude, stop.longitude);
      if (d < minDist) { minDist = d; currentStopIndex = i; }
    });

    const subs = await PushSub.find({ routeId: route.routeId });
    if (!subs.length) return;

    const DEBOUNCE_MS = 5 * 60 * 1000;

    for (const sub of subs) {
      // Find the user's boarding stop (first upcoming stop after current)
      const userStopIndex = stops.findIndex((s: any) => s.order > stops[currentStopIndex].order);
      if (userStopIndex === -1) continue;
      const userStop = stops[userStopIndex];

      // Chain ETA from current stop to user's stop using recorded segment times
      let etaMinutes = 0;
      for (let i = currentStopIndex; i < userStopIndex; i++) {
        const recorded = await avgSegmentMinutes(route.routeId, stops[i].name, stops[i + 1].name);
        if (recorded) {
          etaMinutes += recorded;
        } else {
          etaMinutes += stops[i + 1].expectedTime - stops[i].expectedTime;
        }
      }

      etaMinutes = Math.max(0, Math.round(etaMinutes));
      const threshold = sub.notifyBefore ?? 10;

      if (etaMinutes <= threshold && etaMinutes > 0) {
        const lastNotified = sub.notifiedAt ? new Date(sub.notifiedAt).getTime() : 0;
        if (Date.now() - lastNotified < DEBOUNCE_MS) continue;

        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title: `🚌 Bus ${bus.busNumber} is ${etaMinutes} min away`,
              body: `Arriving at ${userStop.name} in ~${etaMinutes} minutes. Head to your stop!`,
              url: '/live-track',
            })
          );
          await PushSub.findByIdAndUpdate(sub._id, { notifiedAt: new Date() });
        } catch {
          // Subscription expired — remove it
          await PushSub.deleteOne({ _id: sub._id });
        }
      }
    }
  } catch {}
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const { busId, latitude, longitude, speed, heading } = await req.json();
    if (!busId || latitude === undefined || longitude === undefined)
      return NextResponse.json({ message: 'busId, latitude, and longitude are required' }, { status: 400 });

    let bus = await Bus.findOne({ busNumber: busId });
    if (bus) {
      // ML: record segment when bus crosses within 80m of a stop
      if (bus.route && bus.route !== 'Unassigned') {
        const route = await Route.findOne({ routeId: bus.route });
        if (route) {
          for (let i = 1; i < route.stops.length; i++) {
            const stop = route.stops[i];
            const distToStop = haversine(parseFloat(latitude), parseFloat(longitude), stop.latitude, stop.longitude);
            if (distToStop < 0.08) {
              const prevStop = route.stops[i - 1];
              const prevDist = haversine(bus.latitude, bus.longitude, prevStop.latitude, prevStop.longitude);
              if (prevDist > 0.08) {
                const elapsedMin = (Date.now() - new Date(bus.lastUpdate).getTime()) / 60000;
                recordSegment(bus.route, prevStop.name, stop.name, elapsedMin).catch(() => {});
              }
              break;
            }
          }
        }
      }
      Object.assign(bus, { latitude, longitude, speed: speed || 0, heading: heading || 0, status: 'Active', lastUpdate: new Date() });
      await bus.save();
      // Trigger push notifications for nearby users
      if (bus.route && bus.route !== 'Unassigned') {
        const route = await Route.findOne({ routeId: bus.route });
        if (route) triggerPushNotifications(bus, route);
      }
    } else {
      bus = await Bus.create({ busNumber: busId, route: 'Unassigned', latitude, longitude, speed: speed || 0, heading: heading || 0, status: 'Active' });
    }
    return NextResponse.json({ message: 'Location updated', busId, timestamp: bus.lastUpdate });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
