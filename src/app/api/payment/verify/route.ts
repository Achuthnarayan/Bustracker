import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { Ticket } from '@/models';
import { requireAuth } from '@/lib/auth';

export async function POST(req: Request) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // ticket details
      ticketType, route, routeName, from, to, amount, paymentMethod,
    } = await req.json();

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ message: 'Payment verification failed' }, { status: 400 });
    }

    // Signature valid — create ticket
    await connectDB();
    const ticket = await Ticket.create({
      ticketId: 'TKT' + Date.now(),
      userId: user.id,
      ticketType,
      route,
      routeName,
      from,
      to,
      amount,
      paymentMethod: paymentMethod || 'Razorpay',
      status: 'Active',
      purchaseDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
