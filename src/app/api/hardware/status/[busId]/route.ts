import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus } from '@/models';

export async function GET(_req: Request, { params }: { params: { busId: string } }) {
  try {
    await connectDB();
    const bus = await Bus.findOne({ busNumber: params.busId });
    if (!bus) return NextResponse.json({ status: 'unknown', message: 'Bus not found' }, { status: 404 });
    return NextResponse.json({
      busNumber: bus.busNumber,
      status: bus.status,
      lastUpdate: bus.lastUpdate,
      latitude: bus.latitude,
      longitude: bus.longitude,
      speed: bus.speed,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
