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
    if (!operator) return NextResponse.json({ message: 'Operator not found' }, { status: 404 });
    if (!operator.busNumber) return NextResponse.json({ message: 'No bus assigned to this operator' }, { status: 400 });

    // Set bus to Active with the operator's assigned route
    const bus = await Bus.findOneAndUpdate(
      { busNumber: operator.busNumber },
      { status: 'Active', route: operator.route, lastUpdate: new Date() },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      message: 'Trip started',
      busNumber: bus.busNumber,
      route: bus.route,
      status: bus.status,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
