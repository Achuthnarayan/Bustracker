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

    // Get stable operator index for rotation
    const operators = await Operator.find({}).sort({ createdAt: 1 });
    const idx = operators.findIndex(o => o.operatorId === user.operatorId);
    if (idx === -1) return NextResponse.json({ message: 'Operator not found' }, { status: 404 });

    const { busNumber, route, routeName } = getWeeklyAssignment(idx);

    const bus = await Bus.findOneAndUpdate(
      { busNumber },
      { status: 'Active', route, lastUpdate: new Date() },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      message: 'Trip started',
      busNumber: bus.busNumber,
      route: bus.route,
      routeName,
      status: bus.status,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
