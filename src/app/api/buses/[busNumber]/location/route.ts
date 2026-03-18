import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus } from '@/models';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { busNumber: string } }) {
  if (!requireAuth(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const bus = await Bus.findOne({ busNumber: params.busNumber });
  if (!bus) return NextResponse.json({ message: 'Bus not found' }, { status: 404 });
  return NextResponse.json(bus);
}
