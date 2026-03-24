import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Route, TripHistory } from '@/models';
import { requireAuth } from '@/lib/auth';
import { haversine } from '@/lib/ml/etaPredictor';

const STALE_MS = 2 * 60 * 1000;

// Get average recorded travel time between two stops (last 30 trips, weighted recent)
async function avgSegmentMinutes(routeId: string, fromStop: string, toStop: string): Promise<number | null> {
  const docs = await TripHistory.find({ routeId, fromStop, toStop })
    .sort({ recordedAt: -1 }).limit(30).lean();
  if (!docs.length) return null;
  let wSum = 0, wTotal = 0;
  docs.forEach((d: any, i: number) => {
    const w = Math.exp(-i * 0.05); // more recent = higher weight
    wSum += d.actualMinutes * w;
    wTotal += w;
  });
  return wSum / wTotal;
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
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

    const stops = route.stops.sort((a: any, b: any) => a.order - b.order);

    // ── Find current stop by GPS (nearest stop) ──────────────────────────────
    const hasGPS = bus.latitude && bus.longitude && effectiveStatus === 'Active';
    let currentStopIndex = 0;

    if (hasGPS) {
      let minDist = Infinity;
      stops.forEach((stop: any, i: number) => {
        const d = haversine(bus.latitude, bus.longitude, stop.latitude, stop.longitude);
        if (d < minDist) { minDist = d; currentStopIndex = i; }
      });
    } else {
      // Offline: fall back to schedule time
      const [sh, sm] = route.startTime.split(':').map(Number);
      const now = new Date();
      const start = new Date(now); start.setHours(sh, sm, 0, 0);
      const elapsed = Math.max(0, (now.getTime() - start.getTime()) / 60000);
      for (let i = stops.length - 1; i >= 0; i--) {
        if (elapsed >= stops[i].expectedTime) { currentStopIndex = i; break; }
      }
    }

    // ── Chain ETAs forward from current stop ─────────────────────────────────
    // currentArrivalTime = now (bus is at/near this stop right now)
    let chainTime = new Date(); // rolling arrival time for each upcoming stop

    const result = [];
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];

      if (i < currentStopIndex) {
        result.push({ ...stop.toObject(), status: 'passed', etaMinutes: 0, etaFormatted: 'Passed', arrivalTime: null, confidence: null });

      } else if (i === currentStopIndex) {
        result.push({ ...stop.toObject(), status: 'current', etaMinutes: 0, etaFormatted: 'Bus is here', arrivalTime: fmtTime(chainTime), confidence: null });

      } else {
        const fromStop = stops[i - 1].name;
        const toStop = stop.name;

        // Try recorded average segment time first
        let segmentMins: number;
        let confidence: string;
        const recorded = await avgSegmentMinutes(route.routeId, fromStop, toStop);

        if (recorded && recorded > 0) {
          segmentMins = recorded;
          confidence = 'recorded';
        } else {
          // Fall back to scheduled segment duration
          const scheduledSeg = stop.expectedTime - stops[i - 1].expectedTime;
          segmentMins = scheduledSeg > 0 ? scheduledSeg : 10;
          confidence = 'scheduled';
        }

        chainTime = new Date(chainTime.getTime() + segmentMins * 60000);
        const etaMs = chainTime.getTime() - Date.now();

        result.push({
          ...stop.toObject(),
          status: 'upcoming',
          etaMinutes: Math.max(0, Math.round(etaMs / 60000)),
          etaFormatted: fmtEta(etaMs),
          arrivalTime: fmtTime(chainTime),
          confidence,
          segmentMins: Math.round(segmentMins),
        });
      }
    }

    return NextResponse.json({
      busNumber: bus.busNumber,
      routeId: route.routeId,
      routeName: route.name,
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
