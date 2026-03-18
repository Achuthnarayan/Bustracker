import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus, Operator, Route } from '@/models';
import { requireAuth } from '@/lib/auth';
import { getWeeklyAssignment } from '@/lib/weeklyRotation';

// Allow start up to EARLY_WINDOW_MIN minutes before scheduled time
const EARLY_WINDOW_MIN = 15;

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

    // ── Time gate ────────────────────────────────────────────────────────────
    const routeDoc = await Route.findOne({ routeId: route });
    if (routeDoc?.startTime) {
      const [sh, sm] = routeDoc.startTime.split(':').map(Number);
      const now = new Date();
      // Use IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const nowMinutes = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
      const schedMinutes = sh * 60 + sm;
      const earliest = schedMinutes - EARLY_WINDOW_MIN;

      if (nowMinutes < earliest) {
        const waitMin = earliest - nowMinutes;
        const hh = Math.floor(waitMin / 60).toString().padStart(2, '0');
        const mm = (waitMin % 60).toString().padStart(2, '0');
        return NextResponse.json({
          message: `Too early. Trip starts at ${routeDoc.startTime}. You can start at ${String(sh).padStart(2,'0')}:${String(sm - EARLY_WINDOW_MIN).padStart(2,'0')}. Wait ${hh}h ${mm}m.`,
          tooEarly: true,
          scheduledTime: routeDoc.startTime,
          earliestStart: `${String(Math.floor(earliest / 60)).padStart(2,'0')}:${String(earliest % 60).padStart(2,'0')}`,
          waitMinutes: waitMin,
        }, { status: 403 });
      }
    }
    // ────────────────────────────────────────────────────────────────────────

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
