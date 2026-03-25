import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Operator, Route } from '@/models';
import { requireAuth } from '@/lib/auth';
import { getWeeklyAssignment } from '@/lib/weeklyRotation';

export async function POST(req: Request) {
  const user = requireAuth(req);
  if (!user || user.role !== 'operator')
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();

    let body: any = {};
    try { body = await req.json(); } catch {}
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const tripType: 'morning' | 'evening' = body.tripType || (ist.getUTCHours() < 12 ? 'morning' : 'evening');

    const operators = await Operator.find({}).sort({ createdAt: 1 });
    const idx = operators.findIndex(o => o.operatorId === user.operatorId);
    if (idx === -1) return NextResponse.json({ message: 'Operator not found' }, { status: 404 });

    const { busNumber, route, routeName } = getWeeklyAssignment(idx);
    await Route.findOne({ routeId: route }); // preload for side effects

    const bus = await Bus.findOneAndUpdate(
      { busNumber },
      { status: 'Active', route, lastUpdate: new Date() },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      message: `${tripType === 'evening' ? 'Evening' : 'Morning'} trip started`,
      busNumber: bus.busNumber,
      route: bus.route,
      routeName,
      tripType,
      status: bus.status,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
