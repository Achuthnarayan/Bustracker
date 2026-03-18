import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Operator, Route } from '@/models';
import { requireAuth } from '@/lib/auth';
import { getWeeklyAssignment, getISOWeek, nextMonday } from '@/lib/weeklyRotation';

function calcEarliest(time: string, windowMin = 15): string {
  const [h, m] = time.split(':').map(Number);
  const e = h * 60 + m - windowMin;
  return `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  const user = requireAuth(req);
  if (!user || user.role !== 'operator')
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const operators = await Operator.find({}).sort({ createdAt: 1 });
  const idx = operators.findIndex(o => o.operatorId === user.operatorId);
  if (idx === -1) return NextResponse.json({ message: 'Operator not found' }, { status: 404 });

  const assignment = getWeeklyAssignment(idx);
  const routeDoc = await Route.findOne({ routeId: assignment.route });

  const morningStart   = routeDoc?.startTime        || '08:05';
  const eveningStart   = routeDoc?.eveningStartTime || '16:00';

  return NextResponse.json({
    ...assignment,
    operatorIndex: idx,
    weekNumber: getISOWeek(new Date()),
    nextRotation: nextMonday(),
    // morning
    startTime:    morningStart,
    earliestStart: calcEarliest(morningStart),
    // evening
    eveningStartTime:    eveningStart,
    eveningEarliestStart: calcEarliest(eveningStart),
  });
}
