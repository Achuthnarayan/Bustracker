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

  const routeDoc = await (await import('@/models')).Route.findOne({ routeId: assignment.route });

  return NextResponse.json({
    ...assignment,
    operatorIndex: idx,
    weekNumber: getISOWeek(new Date()),
    nextRotation: nextMonday(),
    startTime: routeDoc?.startTime || '07:00',
    earliestStart: (() => {
      const [sh, sm] = (routeDoc?.startTime || '07:00').split(':').map(Number);
      const e = sh * 60 + sm - 15;
      return `${String(Math.floor(e/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`;
    })(),
  });
}
