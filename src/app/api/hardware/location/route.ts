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

    // Find the two stops the bus is currently between (prevStop → nextStop)
    // by finding which segment the bus is closest to
    let prevStopIndex = 0;
    let minSegDist = Infinity;
    for (let i = 0; i < stops.length - 1; i++) {
      const dPrev = haversine(bus.latitude, bus.longitude, stops[i].latitude, stops[i].longitude);
      const dNext = haversine(bus.latitude, bus.longitude, stops[i + 1].latitude, stops[i + 1].longitude);
      const segLen = haversine(stops[i].latitude, stops[i].longitude, stops[i + 1].latitude, stops[i + 1].longitude);
      // Approximate perpendicular distance to segment
      const segDist = Math.min(dPrev, dNext, (dPrev + dNext - segLen) / 2);
      if (segDist < minSegDist) { minSegDist = segDist; prevStopIndex = i; }
    }
    const nextStopIndex = prevStopIndex + 1;

    // How far through the current segment is the bus? (0.0 = at prevStop, 1.0 = at nextStop)
    const distFromPrev = haversine(bus.latitude, bus.longitude, stops[prevStopIndex].latitude, stops[prevStopIndex].longitude);
    const distFromNext = haversine(bus.latitude, bus.longitude, stops[nextStopIndex].latitude, stops[nextStopIndex].longitude);
    const segTotalDist = haversine(stops[prevStopIndex].latitude, stops[prevStopIndex].longitude, stops[nextStopIndex].latitude, stops[nextStopIndex].longitude);
    const progress = segTotalDist > 0 ? Math.min(1, distFromPrev / segTotalDist) : 0;

    const subs = await PushSub.find({ routeId: route.routeId });
    if (!subs.length) return;

    const DEBOUNCE_MS = 5 * 60 * 1000;

    for (const sub of subs) {
      const userStopIndex = sub.boardingStop
        ? stops.findIndex((s: any) => s.name === sub.boardingStop)
        : nextStopIndex;

      if (userStopIndex === -1 || userStopIndex <= prevStopIndex) continue;
      const userStop = stops[userStopIndex];

      // First segment: only count the remaining fraction + any stuck delay
      const busSpeed = bus.speed || 0;
      const isStuck = busSpeed < 2;
      const extraDelayMins = isStuck
        ? Math.max(0, (Date.now() - new Date(bus.lastUpdate).getTime()) / 60000 - 0.5)
        : 0;

      let etaMinutes = 0;
      for (let i = prevStopIndex; i < userStopIndex; i++) {
        const recorded = await avgSegmentMinutes(route.routeId, stops[i].name, stops[i + 1].name);
        const segMins = recorded ?? (stops[i + 1].expectedTime - stops[i].expectedTime);
        if (i === prevStopIndex) {
          const posRemaining = segMins * (1 - progress);
          etaMinutes += isStuck ? Math.max(posRemaining, posRemaining + extraDelayMins) : posRemaining;
        } else {
          etaMinutes += segMins;
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
      // Block GPS updates if operator hasn't started the trip
      if (bus.status === 'Offline') {
        return NextResponse.json({ message: 'Trip not started. Operator must start trip first.' }, { status: 403 });
      }
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
      // Bus not found in DB — don't create it, operator must be seeded first
      return NextResponse.json({ message: 'Bus not registered. Contact admin.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Location updated', busId, timestamp: bus.lastUpdate });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
