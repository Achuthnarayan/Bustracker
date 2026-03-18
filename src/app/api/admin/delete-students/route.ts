import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, Ticket } from '@/models';

export async function POST() {
  await connectDB();
  const users   = await User.deleteMany({});
  const tickets = await Ticket.deleteMany({});
  return NextResponse.json({
    message: 'All student accounts and tickets deleted.',
    usersDeleted:   users.deletedCount,
    ticketsDeleted: tickets.deletedCount,
  });
}
