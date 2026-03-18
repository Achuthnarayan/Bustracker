import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Operator } from '@/models';
import { requireAuth } from '@/lib/auth';

export async function POST(req: Request) {
  const user = requireAuth(req);
  if (!user || user.role !== 'operator') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const operator = await Operator.findOne({ operatorId: user.operatorId });
    if (!operator?.busNumber) return NextResponse.json({ message: 'No bus assigned' }, { status: 400 });

    await Bus.findOneAndUpdate(
      { busNumber: operator.busNumber },
      { status: 'Offline', speed: 0, lastUpdate: new Date() }
    );

    return NextResponse.json({ message: 'Trip ended', busNumber: operator.busNumber });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
