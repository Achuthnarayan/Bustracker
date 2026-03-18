import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Route } from '@/models';
import { requireAuth } from '@/lib/auth';
import { haversine } from '@/lib/ml/etaPredictor';

// Fallback schedule-based ETA (no ML)
export async function GET(req: Request, { params }: { params: { busNumber: string } }) {
  if (!requireAuth(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const bus = await Bus.findOne({ busNumber: params.busNumber });
    if (!bus) return NextResponse.json({ message: 'Bus not found' }, { status: 404 });
    const route = await Route.findOne({ routeId: bus.route });
    if (!route) return NextResponse.json({ message: 'Route not found' }, { status: 404 });

    let currentStopIndex = 0, minDist = Infinity;
    route.stops.forEach((stop: any, i: number) => {
      const d = haversine(bus.latitude, bus.longitude, stop.latitude, stop.longitude);
      if (d < minDist) { minDist = d; currentStopIndex = i; }
    });

    const now = new Date();
    const [sh, sm] = (route.startTime || '08:00').split(':').map(Number);
    const startTime = new Date(now); startTime.setHours(sh, sm, 0, 0);
    const elapsed = Math.max(0, (now.getTime() - startTime.getTime()) / 60000);

    const stops = route.stops.map((stop: any, i: number) => {
      const remaining = Math.max(0, stop.expectedTime - elapsed);
      const arrivalTime = new Date(startTime.getTime() + stop.expectedTime * 60000);
      return {
        ...stop.toObject(),
        status: i < currentStopIndex ? 'passed' : i === currentStopIndex ? 'current' : 'upcoming',
        etaMinutes: Math.round(remaining),
        etaFormatted: remaining <= 0 ? (i <= currentStopIndex ? 'Passed' : 'Due') : `${Math.round(remaining)} min`,
        arrivalTime: arrivalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
    });

    return NextResponse.json({ busNumber: bus.busNumber, routeId: route.routeId, routeName: route.name, stops });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
