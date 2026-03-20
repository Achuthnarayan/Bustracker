import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Route, PushSub } from '@/models';
import { haversine, recordSegment } from '@/lib/ml/etaPredictor';
import webpush from 'web-push';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@bustracker.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function triggerPushNotifications(bus: any, route: any) {
  try {
    // Find the stop closest to the bus (current position)
    let currentStopIndex = 0, minDist = Infinity;
    route.stops.forEach((stop: any, i: number) => {
      const d = haversine(bus.latitude, bus.longitude, stop.latitude, stop.longitude);
      if (d < minDist) { minDist = d; currentStopIndex = i; }
    });

    const now = new Date();
    const [sh, sm] = (route.startTime || '08:00').split(':').map(Number);
    const startTime = new Date(now); startTime.setHours(sh, sm, 0, 0);
    const elapsed = Math.max(0, (now.getTime() - startTime.getTime()) / 60000);

    // Get all subscribers on this route
    const subs = await PushSub.find({ routeId: route.routeId });
    if (!subs.length) return;

    const DEBOUNCE_MS = 5 * 60 * 1000; // don't re-notify within 5 min

    for (const sub of subs) {
      // Find which stop this user is boarding at
      const userStop = route.stops.find((s: any) => s.order > currentStopIndex + 1);
      if (!userStop) continue;

      const etaMinutes = Math.max(0, userStop.expectedTime - elapsed);
      const threshold = sub.notifyBefore ?? 10;

      // Notify if ETA is within threshold and we haven't notified recently
      if (etaMinutes <= threshold && etaMinutes > 0) {
        const lastNotified = sub.notifiedAt ? new Date(sub.notifiedAt).getTime() : 0;
        if (Date.now() - lastNotified < DEBOUNCE_MS) continue;

        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title: `🚌 Bus ${bus.busNumber} is ${Math.round(etaMinutes)} min away`,
              body: `Arriving at ${userStop.name} in ~${Math.round(etaMinutes)} minutes. Head to your stop!`,
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
