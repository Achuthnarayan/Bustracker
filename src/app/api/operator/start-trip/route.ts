import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Operator, Route } from '@/models';
import { requireAuth } from '@/lib/auth';
import { getWeeklyAssignment } from '@/lib/weeklyRotation';

const EARLY_WINDOW_MIN = 15;

function getISTMinutes(): number {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function fmtMinutes(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export async function POST(req: Request) {
  const user = requireAuth(req);
  if (!user || user.role !== 'operator')
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();

    // tripType: 'morning' | 'evening'  (default: auto-detect by current IST hour)
    let body: any = {};
    try { body = await req.json(); } catch {}
    const nowMin = getISTMinutes();
    const tripType: 'morning' | 'evening' = body.tripType || (nowMin < 12 * 60 ? 'morning' : 'evening');

    const operators = await Operator.find({}).sort({ createdAt: 1 });
    const idx = operators.findIndex(o => o.operatorId === user.operatorId);
    if (idx === -1) return NextResponse.json({ message: 'Operator not found' }, { status: 404 });

    const { busNumber, route, routeName } = getWeeklyAssignment(idx);

    const routeDoc = await Route.findOne({ routeId: route });

    // ── Time gate ────────────────────────────────────────────────────────────
    const scheduledTime = tripType === 'evening'
      ? (routeDoc?.eveningStartTime || '16:00')
      : (routeDoc?.startTime || '08:05');

    const schedMin  = timeToMinutes(scheduledTime);
    const earliest  = schedMin - EARLY_WINDOW_MIN;

    if (nowMin < earliest) {
      const wait = earliest - nowMin;
      return NextResponse.json({
        message: `Too early. ${tripType === 'evening' ? 'Evening' : 'Morning'} trip starts at ${scheduledTime}. Earliest: ${fmtMinutes(earliest)}. Wait ${Math.floor(wait / 60)}h ${wait % 60}m.`,
        tooEarly: true,
        scheduledTime,
        earliestStart: fmtMinutes(earliest),
        waitMinutes: wait,
      }, { status: 403 });
    }
    // ────────────────────────────────────────────────────────────────────────

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
