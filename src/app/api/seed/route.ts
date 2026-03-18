import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import { Route, Operator, Bus } from '@/models';

export async function POST() {
  await connectDB();
  if (!(await Route.countDocuments())) {
    await Route.insertMany([
      { routeId: 'ROUTE_A', name: 'Route A - Main Campus', description: 'Via MG Road, Indiranagar',
        stops: [
          { name: 'College Gate', order: 1, expectedTime: 0,  latitude: 12.9716, longitude: 77.5946 },
          { name: 'MG Road',      order: 2, expectedTime: 15, latitude: 12.9758, longitude: 77.5995 },
          { name: 'Indiranagar',  order: 3, expectedTime: 30, latitude: 12.9784, longitude: 77.6408 },
          { name: 'Main Campus',  order: 4, expectedTime: 45, latitude: 12.9900, longitude: 77.6500 },
        ], price: 1200, duration: '45 mins', totalDuration: 45, startTime: '08:00' },
      { routeId: 'ROUTE_B', name: 'Route B - North Campus', description: 'Via Hebbal, Yelahanka',
        stops: [
          { name: 'College Gate', order: 1, expectedTime: 0,  latitude: 12.9716, longitude: 77.5946 },
          { name: 'Hebbal',       order: 2, expectedTime: 20, latitude: 13.0359, longitude: 77.5970 },
          { name: 'Yelahanka',    order: 3, expectedTime: 40, latitude: 13.1007, longitude: 77.5963 },
          { name: 'North Campus', order: 4, expectedTime: 60, latitude: 13.1200, longitude: 77.6100 },
        ], price: 1500, duration: '60 mins', totalDuration: 60, startTime: '08:30' },
      { routeId: 'ROUTE_C', name: 'Route C - South Campus', description: 'Via Jayanagar, BTM Layout',
        stops: [
          { name: 'College Gate', order: 1, expectedTime: 0,  latitude: 12.9716, longitude: 77.5946 },
          { name: 'Jayanagar',    order: 2, expectedTime: 15, latitude: 12.9308, longitude: 77.5838 },
          { name: 'BTM Layout',   order: 3, expectedTime: 30, latitude: 12.9166, longitude: 77.6101 },
          { name: 'South Campus', order: 4, expectedTime: 50, latitude: 12.9000, longitude: 77.6200 },
        ], price: 1300, duration: '50 mins', totalDuration: 50, startTime: '09:00' },
    ]);
  }
  const ops = [
    { operatorId: 'OP001', name: 'Driver Rajan',  password: 'driver123', busNumber: 'BUS01', route: 'ROUTE_A' },
    { operatorId: 'OP002', name: 'Driver Suresh', password: 'driver123', busNumber: 'BUS02', route: 'ROUTE_B' },
    { operatorId: 'OP003', name: 'Driver Mohan',  password: 'driver123', busNumber: 'BUS03', route: 'ROUTE_C' },
  ];
  for (const op of ops) {
    if (!(await Operator.findOne({ operatorId: op.operatorId })))
      await Operator.create({ ...op, password: await bcrypt.hash(op.password, 10) });
    if (!(await Bus.findOne({ busNumber: op.busNumber })))
      await Bus.create({ busNumber: op.busNumber, route: op.route });
  }
  return NextResponse.json({ message: 'Seeded', operators: ops.map(o => ({ operatorId: o.operatorId, password: o.password })) });
}
