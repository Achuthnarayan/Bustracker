import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Route } from '@/models';
import { requireAuth } from '@/lib/auth';
import { predictETA, haversine } from '@/lib/ml/etaPredictor';

export async function GET(req: Request, { params }: { params: { busNumber: string } }) {
  if (!requireAuth(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const bus = await Bus.findOne({ busNumber: params.busNumber });
    if (!bus) return NextResponse.json({ message: 'Bus not found' }, { status: 404 });

    // Auto-detect stale: if last update > 2 min ago, treat as Offline
    const STALE_MS = 2 * 60 * 1000;
    const effectiveStatus = bus.status === 'Active' && (Date.now() - new Date(bus.lastUpdate).getTime()) > STALE_MS
      ? 'Offline'
      : bus.status;
    const route = await Route.findOne({ routeId: bus.route });
    if (!route) return NextResponse.json({ message: 'Route not found' }, { status: 404 });

    const RADIUS = 0.15;
    let currentStopIndex = 0, minDist = Infinity;
    route.stops.forEach((stop: any, i: number) => {
      const d = haversine(bus.latitude, bus.longitude, stop.latitude, stop.longitude);
      if (d < minDist) { minDist = d; currentStopIndex = i; }
    });
    if (minDist > RADIUS) {
      const now = new Date();
      const [sh, sm] = route.startTime.split(':').map(Number);
      const startTime = new Date(now); startTime.setHours(sh, sm, 0, 0);
      const elapsed = Math.max(0, (now.getTime() - startTime.getTime()) / 60000);
      for (let i = route.stops.length - 1; i >= 0; i--) {
        if (elapsed >= route.stops[i].expectedTime) { currentStopIndex = i; break; }
      }
    }

    const [sh, sm] = (route.startTime || '08:05').split(':').map(Number);
    const scheduledArrival = (offsetMin: number): string => {
      const arrMins = sh * 60 + sm + offsetMin;
      const h = Math.floor(arrMins / 60) % 24;
      const m = arrMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const stops = [];
    for (let i = 0; i < route.stops.length; i++) {
      const stop = route.stops[i];
      if (i < currentStopIndex) {
        stops.push({ ...stop.toObject(), status: 'passed', etaMinutes: 0, etaFormatted: 'Passed', arrivalTime: scheduledArrival(stop.expectedTime), confidence: null });
      } else if (i === currentStopIndex) {
        stops.push({ ...stop.toObject(), status: 'current', etaMinutes: 0, etaFormatted: 'Here now', arrivalTime: scheduledArrival(stop.expectedTime), confidence: null });
      } else {
        if (effectiveStatus === 'Active') {
          const pred = await predictETA(bus, stop, route.routeId, route.stops[currentStopIndex].name);
          stops.push({ ...stop.toObject(), status: 'upcoming', ...pred });
        } else {
          // Bus offline — show scheduled times based on startTime
          stops.push({ ...stop.toObject(), status: 'upcoming', etaMinutes: stop.expectedTime, etaFormatted: `+${stop.expectedTime} min`, arrivalTime: scheduledArrival(stop.expectedTime), confidence: 'scheduled' });
        }
      }
    }

    return NextResponse.json({ busNumber: bus.busNumber, routeId: route.routeId, routeName: route.name, currentStop: route.stops[currentStopIndex]?.name, speed: bus.speed, status: effectiveStatus, lastUpdate: bus.lastUpdate, stops });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
