import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import { Route, Operator, Bus } from '@/models';

export async function POST() {
  await connectDB();

  // Clear existing routes so we can re-seed with correct data
  await Route.deleteMany({});

  await Route.insertMany([
    {
      routeId: 'ROUTE_A',
      name: 'Route A – Kaloor → SCMS Karukutty',
      description: 'Kaloor · Palarivattom · Edapally · Kalamassery · Aluva · Angamaly · SCMS',
      startTime: '07:00',
      price: 1200,
      duration: '90 mins',
      totalDuration: 90,
      active: true,
      stops: [
        { name: 'Kaloor',                    order: 1,  expectedTime: 0,  latitude: 9.9816,  longitude: 76.2999 },
        { name: 'Palarivattom',              order: 2,  expectedTime: 10, latitude: 9.9897,  longitude: 76.3063 },
        { name: 'Edapally',                  order: 3,  expectedTime: 20, latitude: 10.0269, longitude: 76.3090 },
        { name: 'Kalamassery',               order: 4,  expectedTime: 35, latitude: 10.0543, longitude: 76.3213 },
        { name: 'Aluva',                     order: 5,  expectedTime: 50, latitude: 10.1004, longitude: 76.3570 },
        { name: 'Angamaly',                  order: 6,  expectedTime: 65, latitude: 10.1960, longitude: 76.3860 },
        { name: 'SCMS School of Engineering',order: 7,  expectedTime: 90, latitude: 10.2167, longitude: 76.4167 },
      ],
    },
    {
      routeId: 'ROUTE_B',
      name: 'Route B – Thrissur → SCMS Karukutty',
      description: 'Thrissur · Pudukkad · Kodakara · Perambra · Chalakudy · Koratty · SCMS',
      startTime: '07:00',
      price: 1500,
      duration: '120 mins',
      totalDuration: 120,
      active: true,
      stops: [
        { name: 'Thrissur',                  order: 1,  expectedTime: 0,   latitude: 10.5276, longitude: 76.2144 },
        { name: 'Pudukkad',                  order: 2,  expectedTime: 20,  latitude: 10.4167, longitude: 76.2833 },
        { name: 'Kodakara',                  order: 3,  expectedTime: 40,  latitude: 10.3667, longitude: 76.3167 },
        { name: 'Perambra',                  order: 4,  expectedTime: 60,  latitude: 10.3167, longitude: 76.3500 },
        { name: 'Chalakudy',                 order: 5,  expectedTime: 75,  latitude: 10.3000, longitude: 76.3333 },
        { name: 'Koratty',                   order: 6,  expectedTime: 95,  latitude: 10.2667, longitude: 76.3833 },
        { name: 'SCMS School of Engineering',order: 7,  expectedTime: 120, latitude: 10.2167, longitude: 76.4167 },
      ],
    },
  ]);

  const ops = [
    { operatorId: 'OP001', name: 'Driver Rajan',  password: 'driver123', busNumber: 'KL07-BUS01', route: 'ROUTE_A' },
    { operatorId: 'OP002', name: 'Driver Suresh', password: 'driver123', busNumber: 'KL07-BUS02', route: 'ROUTE_B' },
  ];

  for (const op of ops) {
    if (!(await Operator.findOne({ operatorId: op.operatorId })))
      await Operator.create({ ...op, password: await bcrypt.hash(op.password, 10) });
    else
      await Operator.updateOne({ operatorId: op.operatorId }, { busNumber: op.busNumber, route: op.route });

    if (!(await Bus.findOne({ busNumber: op.busNumber })))
      await Bus.create({ busNumber: op.busNumber, route: op.route });
    else
      await Bus.updateOne({ busNumber: op.busNumber }, { route: op.route });
  }

  return NextResponse.json({
    message: 'Seeded SCMS Karukutty routes',
    routes: ['ROUTE_A – Kaloor → SCMS', 'ROUTE_B – Thrissur → SCMS'],
    operators: ops.map(o => ({ operatorId: o.operatorId, busNumber: o.busNumber, password: o.password })),
  });
}
