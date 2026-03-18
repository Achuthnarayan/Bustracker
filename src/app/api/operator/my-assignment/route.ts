import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Operator } from '@/models';
import { requireAuth } from '@/lib/auth';
import { getWeeklyAssignment, getISOWeek, nextMonday } from '@/lib/weeklyRotation';

export async function GET(req: Request) {
  const user = requireAuth(req);
  if (!user || user.role !== 'operator')
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();

  // Get all operators sorted by creation date to get stable index
  const operators = await Operator.find({}).sort({ createdAt: 1 });
  const idx = operators.findIndex(o => o.operatorId === user.operatorId);
  if (idx === -1) return NextResponse.json({ message: 'Operator not found' }, { status: 404 });

  const assignment = getWeeklyAssignment(idx);

  return NextResponse.json({
    ...assignment,
    operatorIndex: idx,
    weekNumber: getISOWeek(new Date()),
    nextRotation: nextMonday(),
  });
}
