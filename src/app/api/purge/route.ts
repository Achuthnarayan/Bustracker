import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Ticket, User } from '@/models';

// Wipes all tickets and student accounts (operators/routes/buses untouched)
export async function POST() {
  await connectDB();
  const tickets = await Ticket.deleteMany({});
  const users   = await User.deleteMany({});
  return NextResponse.json({
    message: 'Purged all tickets and student accounts',
    ticketsDeleted: tickets.deletedCount,
    usersDeleted:   users.deletedCount,
  });
}
