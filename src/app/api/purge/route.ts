import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Ticket, User, Bus } from '@/models';

// Wipes all tickets, student accounts, and stale buses
// Then re-creates clean buses from the 7 seeded operators
export async function POST() {
  await connectDB();
  const tickets = await Ticket.deleteMany({});
  const users   = await User.deleteMany({});

  // Remove ALL buses then re-insert clean ones
  await Bus.deleteMany({});
  await Bus.insertMany([
    { busNumber: 'KL07-BUS01', route: 'ROUTE_1', status: 'Offline', latitude: 10.1960, longitude: 76.5720, speed: 0 },
    { busNumber: 'KL07-BUS02', route: 'ROUTE_2', status: 'Offline', latitude: 10.3000, longitude: 76.3333, speed: 0 },
    { busNumber: 'KL07-BUS03', route: 'ROUTE_3', status: 'Offline', latitude: 10.1004, longitude: 76.3570, speed: 0 },
    { busNumber: 'KL07-BUS04', route: 'ROUTE_4', status: 'Offline', latitude: 10.1167, longitude: 76.4667, speed: 0 },
    { busNumber: 'KL07-BUS05', route: 'ROUTE_5', status: 'Offline', latitude: 10.1667, longitude: 76.5333, speed: 0 },
    { busNumber: 'KL07-BUS06', route: 'ROUTE_6', status: 'Offline', latitude: 10.1500, longitude: 76.2167, speed: 0 },
    { busNumber: 'KL07-BUS07', route: 'ROUTE_7', status: 'Offline', latitude: 10.5276, longitude: 76.2144, speed: 0 },
  ]);

  return NextResponse.json({
    message: 'Purged tickets, users, and stale buses. Clean buses re-created.',
    ticketsDeleted: tickets.deletedCount,
    usersDeleted: users.deletedCount,
    busesReset: 7,
  });
}
