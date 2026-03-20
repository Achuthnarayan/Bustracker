import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Alert } from '@/models';
import { requireAuth } from '@/lib/auth';

// GET  – users poll this to get active alerts
export async function GET() {
  await connectDB();
  const alerts = await Alert.find({
    active: true,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }).limit(10);
  return NextResponse.json({ alerts });
}

// POST – operator sends an emergency alert
export async function POST(req: Request) {
  const user = requireAuth(req);
  if (!user || user.role !== 'operator')
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim())
    return NextResponse.json({ message: 'Message is required' }, { status: 400 });

  await connectDB();
  const { Operator } = await import('@/models');
  const operator = await Operator.findOne({ operatorId: user.operatorId });

  const alert = await Alert.create({
    message: message.trim(),
    busNumber: operator?.busNumber || user.operatorId,
    operatorId: user.operatorId,
  });
  return NextResponse.json({ alert }, { status: 201 });
}

// DELETE – operator dismisses their own alert
export async function DELETE(req: Request) {
  const user = requireAuth(req);
  if (!user || user.role !== 'operator')
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { alertId } = await req.json();
  await connectDB();
  await Alert.findOneAndUpdate(
    { _id: alertId, operatorId: user.operatorId },
    { active: false }
  );
  return NextResponse.json({ message: 'Alert dismissed' });
}
