import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { requireAuth } from '@/lib/auth';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const { amount, currency = 'INR', receipt } = await req.json();
    // amount must be in paise (multiply by 100)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    });
    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Failed to create order' }, { status: 500 });
  }
}
