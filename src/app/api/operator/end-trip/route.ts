import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Operator } from '@/models';
import { requireAuth } from '@/lib/auth';
import { getWeeklyAssignment } from '@/lib/weeklyRotation';

export async function POST(req: Request) {
  const user = requireAuth(req);
  if (!user || user.role !== 'operator')
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();

    const operators = await Operator.find({}).sort({ createdAt: 1 });
    const idx = operators.findIndex(o => o.operatorId === user.operatorId);
    if (idx === -1) return NextResponse.json({ message: 'Operator not found' }, { status: 404 });

    const { busNumber } = getWeeklyAssignment(idx);

    await Bus.findOneAndUpdate(
      { busNumber },
      { status: 'Offline', speed: 0, lastUpdate: new Date() }
    );

    return NextResponse.json({ message: 'Trip ended', busNumber });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
