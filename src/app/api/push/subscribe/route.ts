import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { PushSub } from '@/models';
import { requireAuth } from '@/lib/auth';

// GET – return VAPID public key
export async function GET() {
  return NextResponse.json({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY });
}

// POST – save/update push subscription + preferences
export async function POST(req: Request) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { subscription, routeId, notifyBefore } = await req.json();
  if (!subscription) return NextResponse.json({ message: 'subscription required' }, { status: 400 });

  await connectDB();
  await PushSub.findOneAndUpdate(
    { userId: user.id },
    { subscription, routeId, notifyBefore: notifyBefore ?? 10 },
    { upsert: true, new: true }
  );
  return NextResponse.json({ message: 'Subscribed' });
}

// DELETE – unsubscribe
export async function DELETE(req: Request) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await connectDB();
  await PushSub.deleteOne({ userId: user.id });
  return NextResponse.json({ message: 'Unsubscribed' });
}
