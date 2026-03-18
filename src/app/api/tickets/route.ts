import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Ticket } from '@/models';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const tickets = await Ticket.find({ userId: user.id }).sort({ purchaseDate: -1 });
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const { ticketType, route, routeName, from, to, amount, paymentMethod } = await req.json();
    const ticket = await Ticket.create({
      ticketId: 'TKT' + Date.now(), userId: user.id,
      ticketType, route, routeName, from, to, amount, paymentMethod,
      status: 'Active', purchaseDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
