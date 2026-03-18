import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Route } from '@/models';
import { haversine, recordSegment } from '@/lib/ml/etaPredictor';

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
    } else {
      bus = await Bus.create({ busNumber: busId, route: 'Unassigned', latitude, longitude, speed: speed || 0, heading: heading || 0, status: 'Active' });
    }
    return NextResponse.json({ message: 'Location updated', busId, timestamp: bus.lastUpdate });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
