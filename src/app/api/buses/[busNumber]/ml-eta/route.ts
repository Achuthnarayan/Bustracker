import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Route } from '@/models';
import { requireAuth } from '@/lib/auth';
import { haversine } from '@/lib/ml/etaPredictor';

const STALE_MS = 2 * 60 * 1000;
const MIN_SPEED_KMH = 10; // minimum assumed speed when bus is moving but speed=0

function fmtTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
}

function fmtEta(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins <= 0) return 'Arriving now';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export async function GET(req: Request, { params }: { params: { busNumber: string } }) {
  if (!requireAuth(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const bus = await Bus.findOne({ busNumber: params.busNumber });
    if (!bus) return NextResponse.json({ message: 'Bus not found' }, { status: 404 });

    const effectiveStatus = bus.status === 'Active' && (Date.now() - new Date(bus.lastUpdate).getTime()) > STALE_MS
      ? 'Offline' : bus.status;

    const route = await Route.findOne({ routeId: bus.route });
    if (!route) return NextResponse.json({ message: 'Route not found' }, { status: 404 });

    const isEvening = bus.tripType === 'evening';
    const rawStops = [...route.stops].sort((a: any, b: any) => a.order - b.order).map((s: any) => ({
      name: s.name, order: s.order, expectedTime: s.expectedTime,
      latitude: s.latitude, longitude: s.longitude,
    }));
    const stops = isEvening
      ? rawStops.reverse().map((s, i) => ({
          ...s, order: i + 1,
          expectedTime: i === 0 ? 0 : Math.round((i / (rawStops.length - 1)) * (route.totalDuration || 30)),
        }))
      : rawStops;

    const hasGPS = bus.latitude && bus.longitude && effectiveStatus === 'Active';

    // Current bus speed — use minimum assumed speed if GPS speed is 0 but bus is active
    const busSpeed = (bus.speed && bus.speed > 2) ? bus.speed : (hasGPS ? MIN_SPEED_KMH : 0);

    // Find nearest stop index
    let currentStopIndex = 0;
    if (hasGPS) {
      let minDist = Infinity;
      stops.forEach((stop: any, i: number) => {
        const d = haversine(bus.latitude, bus.longitude, stop.latitude, stop.longitude);
        if (d < minDist) { minDist = d; currentStopIndex = i; }
      });
    } else if (effectiveStatus !== 'Active') {
      // Offline fallback: use schedule
      const scheduleTime = isEvening ? (route.eveningStartTime || '16:00') : (route.startTime || '08:10');
      const [sh, sm] = scheduleTime.split(':').map(Number);
      const now = new Date();
      const start = new Date(now); start.setHours(sh, sm, 0, 0);
      const elapsed = Math.max(0, (now.getTime() - start.getTime()) / 60000);
      for (let i = stops.length - 1; i >= 0; i--) {
        if (elapsed >= stops[i].expectedTime) { currentStopIndex = i; break; }
      }
    }

    const now = new Date();
    const result = [];

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];

      if (i < currentStopIndex) {
        result.push({ ...stop, status: 'passed', etaMinutes: 0, etaFormatted: 'Passed', arrivalTime: null, confidence: null });

      } else if (i === currentStopIndex) {
        result.push({ ...stop, status: 'current', etaMinutes: 0, etaFormatted: 'Bus is here', arrivalTime: fmtTime(now), confidence: null });

      } else {
        if (hasGPS && busSpeed > 0) {
          // GPS-based: distance from bus to this stop / current speed
          const distKm = haversine(bus.latitude, bus.longitude, stop.latitude, stop.longitude);
          const etaMins = Math.max(1, Math.round((distKm / busSpeed) * 60));
          const arrivalDate = new Date(now.getTime() + etaMins * 60000);
          result.push({
            ...stop, status: 'upcoming',
            etaMinutes: etaMins,
            etaFormatted: fmtEta(etaMins * 60000),
            arrivalTime: fmtTime(arrivalDate),
            confidence: 'gps',
          });
        } else {
          // No GPS: use scheduled offset from start time
          const scheduleTime = isEvening ? (route.eveningStartTime || '16:00') : (route.startTime || '08:10');
          const [sh, sm] = scheduleTime.split(':').map(Number);
          const startMs = new Date().setHours(sh, sm, 0, 0);
          const arrivalMs = startMs + stop.expectedTime * 60000;
          const etaMs = arrivalMs - Date.now();
          result.push({
            ...stop, status: 'upcoming',
            etaMinutes: Math.max(0, Math.round(etaMs / 60000)),
            etaFormatted: etaMs > 0 ? fmtEta(etaMs) : 'Arriving now',
            arrivalTime: fmtTime(new Date(arrivalMs)),
            confidence: 'scheduled',
          });
        }
      }
    }

    return NextResponse.json({
      busNumber: bus.busNumber,
      routeId: route.routeId,
      routeName: isEvening ? `Route 1 – SCMS → Koratty` : route.name,
      currentStop: stops[currentStopIndex]?.name,
      speed: bus.speed,
      status: effectiveStatus,
      lastUpdate: bus.lastUpdate,
      stops: result,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
