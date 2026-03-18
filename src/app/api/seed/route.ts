import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import { Route, Operator, Bus } from '@/models';

export async function POST() {
  await connectDB();
  if (!(await Route.countDocuments())) {
    await Route.insertMany([
      { routeId: 'Bus001', name: 'Bus001 - SCMS School of Engineering and Technology', description: 'Via North Paravur to SCMS',
        stops: [
          { name: 'North Paravur',                      order: 1,  expectedTime: 0,  latitude: 10.1478, longitude: 76.2144 },
          { name: 'Vedimara',                           order: 2,  expectedTime: 5,  latitude: 10.1550, longitude: 76.2200 },
          { name: 'Mannam',                             order: 3,  expectedTime: 10, latitude: 10.1620, longitude: 76.2260 },
          { name: 'Manakapady',                         order: 4,  expectedTime: 15, latitude: 10.1690, longitude: 76.2320 },
          { name: 'Thatampady',                         order: 5,  expectedTime: 20, latitude: 10.1760, longitude: 76.2380 },
          { name: 'Karumaloor',                         order: 6,  expectedTime: 25, latitude: 10.1830, longitude: 76.2440 },
          { name: 'Kottapuram',                         order: 7,  expectedTime: 30, latitude: 10.1900, longitude: 76.2500 },
          { name: 'Malikampeedika',                     order: 8,  expectedTime: 35, latitude: 10.1970, longitude: 76.2560 },
          { name: 'UC College',                         order: 9,  expectedTime: 40, latitude: 10.2040, longitude: 76.2620 },
          { name: 'Paravur Kavala',                     order: 10, expectedTime: 45, latitude: 10.2110, longitude: 76.2680 },
          { name: 'SCMS School of Engineering and Technology', order: 11, expectedTime: 50, latitude: 10.2180, longitude: 76.2740 },
        ], price: 1200, duration: '50 mins', totalDuration: 50, startTime: '08:00' },
      { routeId: 'Bus002', name: 'Bus002 - North Campus', description: 'Via Hebbal, Yelahanka',
        stops: [
          { name: 'College Gate', order: 1, expectedTime: 0,  latitude: 12.9716, longitude: 77.5946 },
          { name: 'Hebbal',       order: 2, expectedTime: 20, latitude: 13.0359, longitude: 77.5970 },
          { name: 'Yelahanka',    order: 3, expectedTime: 40, latitude: 13.1007, longitude: 77.5963 },
          { name: 'North Campus', order: 4, expectedTime: 60, latitude: 13.1200, longitude: 77.6100 },
        ], price: 1500, duration: '60 mins', totalDuration: 60, startTime: '08:30' },
      { routeId: 'Bus003', name: 'Bus003 - South Campus', description: 'Via Jayanagar, BTM Layout',
        stops: [
          { name: 'College Gate', order: 1, expectedTime: 0,  latitude: 12.9716, longitude: 77.5946 },
          { name: 'Jayanagar',    order: 2, expectedTime: 15, latitude: 12.9308, longitude: 77.5838 },
          { name: 'BTM Layout',   order: 3, expectedTime: 30, latitude: 12.9166, longitude: 77.6101 },
          { name: 'South Campus', order: 4, expectedTime: 50, latitude: 12.9000, longitude: 77.6200 },
        ], price: 1300, duration: '50 mins', totalDuration: 50, startTime: '09:00' },
    ]);
  }
  const ops = [
    { operatorId: 'OP001', name: 'Driver Rajan',  password: 'driver123', busNumber: 'Bus001', route: 'Bus001' },
    { operatorId: 'OP002', name: 'Driver Suresh', password: 'driver123', busNumber: 'Bus002', route: 'Bus002' },
    { operatorId: 'OP003', name: 'Driver Mohan',  password: 'driver123', busNumber: 'Bus003', route: 'Bus003' },
  ];
  for (const op of ops) {
    if (!(await Operator.findOne({ operatorId: op.operatorId })))
      await Operator.create({ ...op, password: await bcrypt.hash(op.password, 10) });
    if (!(await Bus.findOne({ busNumber: op.busNumber })))
      await Bus.create({ busNumber: op.busNumber, route: op.route });
  }
  return NextResponse.json({ message: 'Seeded', operators: ops.map(o => ({ operatorId: o.operatorId, password: o.password })) });
}
