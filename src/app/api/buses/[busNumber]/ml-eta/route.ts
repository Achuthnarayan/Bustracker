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
  // Force IST (UTC+5:30)
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

    // Evening trip = reverse direction (SCMS → Koratty)
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

    // ── Find current segment (bus is between prevStop and nextStop) ─────────
    let prevStopIndex = 0;
    let minSegDist = Infinity;

    if (!hasGPS) {
      if (effectiveStatus === 'Active') {
        // Trip started but no GPS yet — assume bus is at first stop, chain from now
        prevStopIndex = 0;
      } else {
        // Offline: fall back to schedule time
        const scheduleTime = isEvening ? (route.eveningStartTime || '16:00') : (route.startTime || '08:10');
        const [sh2, sm2] = scheduleTime.split(':').map(Number);
        const now2 = new Date();
        const start2 = new Date(now2); start2.setHours(sh2, sm2, 0, 0);
        const elapsed2 = Math.max(0, (now2.getTime() - start2.getTime()) / 60000);
        for (let i = stops.length - 1; i >= 0; i--) {
          if (elapsed2 >= stops[i].expectedTime) { prevStopIndex = i; break; }
        }
      }
    } else {
      for (let i = 0; i < stops.length - 1; i++) {
        const dPrev = haversine(bus.latitude, bus.longitude, stops[i].latitude, stops[i].longitude);
        const dNext = haversine(bus.latitude, bus.longitude, stops[i + 1].latitude, stops[i + 1].longitude);
        const segLen = haversine(stops[i].latitude, stops[i].longitude, stops[i + 1].latitude, stops[i + 1].longitude);
        const segDist = Math.min(dPrev, dNext, (dPrev + dNext - segLen) / 2);
        if (segDist < minSegDist) { minSegDist = segDist; prevStopIndex = i; }
      }
    }

    const nextStopIndex = Math.min(prevStopIndex + 1, stops.length - 1);

    // How far through the current segment (0 = at prevStop, 1 = at nextStop)
    const distFromPrev = haversine(bus.latitude, bus.longitude, stops[prevStopIndex].latitude, stops[prevStopIndex].longitude);
    const segTotalDist = haversine(stops[prevStopIndex].latitude, stops[prevStopIndex].longitude, stops[nextStopIndex].latitude, stops[nextStopIndex].longitude);
    const segProgress = hasGPS && segTotalDist > 0 ? Math.min(1, distFromPrev / segTotalDist) : 0;

    // ── Delay due to being stuck (block/traffic) ──────────────────────────────
    // If bus speed is 0 or very low for a while, add the extra time already spent
    // in this segment beyond what the recorded average would expect
    const busSpeed = bus.speed || 0;
    const isStuck = busSpeed < 2; // less than 2 km/h = effectively stopped
    // Time already spent in current segment (since last GPS update is too short;
    // use distFromPrev / expected_speed as proxy for time already consumed)
    let extraDelayMins = 0;
    if (isStuck && hasGPS) {
      // How long has the bus been at this position? Use lastUpdate staleness
      const secsSinceUpdate = (Date.now() - new Date(bus.lastUpdate).getTime()) / 1000;
      // If GPS is fresh (< 30s) but speed=0, estimate delay from position progress vs expected
      // Expected time to reach current position = segProgress × segMins
      // We'll add this after computing segMins below
      extraDelayMins = Math.max(0, secsSinceUpdate / 60 - 0.5); // subtract 30s grace
    }

    // currentStopIndex = prevStop (bus has passed it, heading to nextStop)
    const currentStopIndex = prevStopIndex;

    // ── Chain ETAs forward from current stop ─────────────────────────────────
    let chainTime = new Date();

    const result = [];
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];

      if (i < currentStopIndex) {
        result.push({ ...stop, status: 'passed', etaMinutes: 0, etaFormatted: 'Passed', arrivalTime: null, confidence: null });
      } else if (i === currentStopIndex) {
        result.push({ ...stop, status: 'current', etaMinutes: 0, etaFormatted: 'Bus is here', arrivalTime: fmtTime(chainTime), confidence: null });
      } else if (i === nextStopIndex) {
        const fromStop = stops[currentStopIndex].name;
        const recorded = await avgSegmentMinutes(route.routeId, fromStop, stop.name);
        const segMins = recorded ?? (stop.expectedTime - stops[currentStopIndex].expectedTime || 5);
        const positionRemaining = segMins * (1 - segProgress);
        const remainingMins = isStuck ? Math.max(positionRemaining, positionRemaining + extraDelayMins) : positionRemaining;
        chainTime = new Date(chainTime.getTime() + remainingMins * 60000);
        const etaMs = chainTime.getTime() - Date.now();
        result.push({
          ...stop, status: 'upcoming',
          etaMinutes: Math.max(0, Math.round(etaMs / 60000)),
          etaFormatted: fmtEta(etaMs),
          arrivalTime: fmtTime(chainTime),
          confidence: recorded ? 'recorded' : 'scheduled',
          segmentMins: Math.round(remainingMins),
        });
      } else {
        const fromStop = stops[i - 1].name;
        const recorded = await avgSegmentMinutes(route.routeId, fromStop, stop.name);
        const segMins = recorded ?? (stop.expectedTime - stops[i - 1].expectedTime || 5);
        chainTime = new Date(chainTime.getTime() + segMins * 60000);
        const etaMs = chainTime.getTime() - Date.now();
        result.push({
          ...stop, status: 'upcoming',
          etaMinutes: Math.max(0, Math.round(etaMs / 60000)),
          etaFormatted: fmtEta(etaMs),
          arrivalTime: fmtTime(chainTime),
          confidence: recorded ? 'recorded' : 'scheduled',
          segmentMins: Math.round(segMins),
        });
      }
    }

    return NextResponse.json({
      busNumber: bus.busNumber,
      routeId: route.routeId,
      routeName: isEvening ? route.name.replace('→', '←').split('–')[0].trim() + ' – SCMS → Koratty' : route.name,
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
