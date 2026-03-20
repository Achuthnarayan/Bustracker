import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import { Route, Operator, Bus } from '@/models';

// All 7 SSET Karukutty routes
const ROUTES = [
  {
    routeId: 'ROUTE_1',
    name: 'Route 1 – North Paravur → SCMS',
    description: 'North Paravur · Vedimara · Mannam · Manakapady · Thatampady · Karumaloor · Kottapuram · Malikampeedika · UC College · Paravur Kavala · SCMS',
    startTime: '08:00', eveningStartTime: '16:00', duration: '50 mins', totalDuration: 50, price: 25, active: true,
    stops: [
      { name: 'North Paravur',                             order: 1,  expectedTime: 0,  latitude: 10.1405, longitude: 76.2305 },
      { name: 'Vedimara',                                  order: 2,  expectedTime: 5,  latitude: 10.1467, longitude: 76.2512 },
      { name: 'Mannam',                                    order: 3,  expectedTime: 10, latitude: 10.1523, longitude: 76.2734 },
      { name: 'Manakapady',                                order: 4,  expectedTime: 15, latitude: 10.1578, longitude: 76.2980 },
      { name: 'Thatampady',                                order: 5,  expectedTime: 20, latitude: 10.1634, longitude: 76.3210 },
      { name: 'Karumaloor',                                order: 6,  expectedTime: 25, latitude: 10.1689, longitude: 76.3450 },
      { name: 'Kottapuram',                                order: 7,  expectedTime: 30, latitude: 10.1745, longitude: 76.3700 },
      { name: 'Malikampeedika',                            order: 8,  expectedTime: 35, latitude: 10.1800, longitude: 76.3950 },
      { name: 'UC College',                                order: 9,  expectedTime: 40, latitude: 10.1856, longitude: 76.4200 },
      { name: 'Paravur Kavala',                            order: 10, expectedTime: 45, latitude: 10.1950, longitude: 76.4650 },
      { name: 'SCMS School of Engineering and Technology', order: 11, expectedTime: 50, latitude: 10.2167, longitude: 76.5167 },
    ],
  },
  {
    routeId: 'ROUTE_2',
    name: 'Route 2 – Kaloor → SCMS',
    description: 'Kaloor · Palarivattom · Edapally · Kalamassery · Aluva · Angamaly · SCMS',
    startTime: '07:30', eveningStartTime: '16:00', duration: '75 mins', totalDuration: 75, price: 40, active: true,
    stops: [
      { name: 'Kaloor',                                   order: 1, expectedTime: 0,  latitude: 9.9986,  longitude: 76.2978 },
      { name: 'Palarivattom',                             order: 2, expectedTime: 10, latitude: 9.9985,  longitude: 76.3119 },
      { name: 'Edapally',                                 order: 3, expectedTime: 20, latitude: 10.0233, longitude: 76.3114 },
      { name: 'Kalamassery',                              order: 4, expectedTime: 35, latitude: 10.0520, longitude: 76.3158 },
      { name: 'Aluva',                                    order: 5, expectedTime: 50, latitude: 10.1078, longitude: 76.3507 },
      { name: 'Angamaly',                                 order: 6, expectedTime: 63, latitude: 10.1960, longitude: 76.5720 },
      { name: 'SCMS School of Engineering and Technology',order: 7, expectedTime: 75, latitude: 10.2167, longitude: 76.5167 },
    ],
  },
  {
    routeId: 'ROUTE_3',
    name: 'Route 3 – Aluva → SSET',
    description: 'Aluva Metro · UC College · Desom · Athani · Karukutty · SSET',
    startTime: '07:55', eveningStartTime: '16:00', duration: '45 mins', totalDuration: 45, price: 35, active: true,
    stops: [
      { name: 'Aluva Metro Station',    order: 1, expectedTime: 0,  latitude: 10.1004, longitude: 76.3570 },
      { name: 'UC College',             order: 2, expectedTime: 8,  latitude: 10.1050, longitude: 76.3700 },
      { name: 'Desom',                  order: 3, expectedTime: 18, latitude: 10.1400, longitude: 76.4200 },
      { name: 'Athani',                 order: 4, expectedTime: 30, latitude: 10.2130, longitude: 76.5300 },
      { name: 'Karukutty',              order: 5, expectedTime: 38, latitude: 10.2200, longitude: 76.5000 },
      { name: 'SSET College',           order: 6, expectedTime: 45, latitude: 10.2167, longitude: 76.5167 },
    ],
  },
  {
    routeId: 'ROUTE_4',
    name: 'Route 4 – Perumbavoor → SSET',
    description: 'Perumbavoor · Kuruppampady · Kalady · Mattoor · Angamaly · Karukutty · SSET',
    startTime: '07:30', eveningStartTime: '16:00', duration: '70 mins', totalDuration: 70, price: 50, active: true,
    stops: [
      { name: 'Perumbavoor Bus Stand',  order: 1, expectedTime: 0,  latitude: 10.1167, longitude: 76.4667 },
      { name: 'Kuruppampady',           order: 2, expectedTime: 12, latitude: 10.1333, longitude: 76.4833 },
      { name: 'Kalady',                 order: 3, expectedTime: 25, latitude: 10.1667, longitude: 76.5333 },
      { name: 'Mattoor',                order: 4, expectedTime: 38, latitude: 10.1833, longitude: 76.5500 },
      { name: 'Angamaly',               order: 5, expectedTime: 52, latitude: 10.1960, longitude: 76.5720 },
      { name: 'Karukutty',              order: 6, expectedTime: 62, latitude: 10.2200, longitude: 76.5000 },
      { name: 'SSET College',           order: 7, expectedTime: 70, latitude: 10.2167, longitude: 76.5167 },
    ],
  },
  {
    routeId: 'ROUTE_5',
    name: 'Route 5 – Kalady → SSET',
    description: 'Kalady · Mattoor · Nayathode · Angamaly · Karukutty · SSET',
    startTime: '08:00', eveningStartTime: '16:00', duration: '40 mins', totalDuration: 40, price: 30, active: true,
    stops: [
      { name: 'Kalady',                 order: 1, expectedTime: 0,  latitude: 10.1667, longitude: 76.5333 },
      { name: 'Mattoor',                order: 2, expectedTime: 8,  latitude: 10.1833, longitude: 76.5500 },
      { name: 'Nayathode',              order: 3, expectedTime: 16, latitude: 10.1900, longitude: 76.5600 },
      { name: 'Angamaly',               order: 4, expectedTime: 24, latitude: 10.1960, longitude: 76.5720 },
      { name: 'Karukutty',              order: 5, expectedTime: 33, latitude: 10.2200, longitude: 76.5000 },
      { name: 'SSET College',           order: 6, expectedTime: 40, latitude: 10.2167, longitude: 76.5167 },
    ],
  },
  {
    routeId: 'ROUTE_6',
    name: 'Route 6 – North Paravur → SSET',
    description: 'North Paravur · Cherai Junction · Moothakunnam · Athani · Karukutty · SSET',
    startTime: '07:35', eveningStartTime: '16:00', duration: '65 mins', totalDuration: 65, price: 45, active: true,
    stops: [
      { name: 'North Paravur',          order: 1, expectedTime: 0,  latitude: 10.1500, longitude: 76.2167 },
      { name: 'Cherai Junction',        order: 2, expectedTime: 12, latitude: 10.1600, longitude: 76.2800 },
      { name: 'Moothakunnam',           order: 3, expectedTime: 28, latitude: 10.1750, longitude: 76.3800 },
      { name: 'Athani',                 order: 4, expectedTime: 45, latitude: 10.2130, longitude: 76.5300 },
      { name: 'Karukutty',              order: 5, expectedTime: 57, latitude: 10.2200, longitude: 76.5000 },
      { name: 'SSET College',           order: 6, expectedTime: 65, latitude: 10.2167, longitude: 76.5167 },
    ],
  },
  {
    routeId: 'ROUTE_7',
    name: 'Route 7 – Thrissur → SSET',
    description: 'Thrissur · Kodakara · Chalakudy · Koratty · Karukutty · SSET',
    startTime: '07:10', eveningStartTime: '16:00', duration: '90 mins', totalDuration: 90, price: 60, active: true,
    stops: [
      { name: 'Thrissur KSRTC',         order: 1, expectedTime: 0,  latitude: 10.5276, longitude: 76.2144 },
      { name: 'Kodakara',               order: 2, expectedTime: 25, latitude: 10.3667, longitude: 76.3167 },
      { name: 'Chalakudy',              order: 3, expectedTime: 45, latitude: 10.3000, longitude: 76.3333 },
      { name: 'Koratty',                order: 4, expectedTime: 60, latitude: 10.2667, longitude: 76.3833 },
      { name: 'Karukutty',              order: 5, expectedTime: 78, latitude: 10.2200, longitude: 76.5000 },
      { name: 'SSET College',           order: 6, expectedTime: 90, latitude: 10.2167, longitude: 76.5167 },
    ],
  },
];

// One operator + bus per route
const OPERATORS = [
  { operatorId: 'OP001', name: 'Driver Rajan',    password: 'driver123', busNumber: 'KL07-BUS01', route: 'ROUTE_1' },
  { operatorId: 'OP002', name: 'Driver Suresh',   password: 'driver123', busNumber: 'KL07-BUS02', route: 'ROUTE_2' },
  { operatorId: 'OP003', name: 'Driver Biju',     password: 'driver123', busNumber: 'KL07-BUS03', route: 'ROUTE_3' },
  { operatorId: 'OP004', name: 'Driver Manoj',    password: 'driver123', busNumber: 'KL07-BUS04', route: 'ROUTE_4' },
  { operatorId: 'OP005', name: 'Driver Santhosh', password: 'driver123', busNumber: 'KL07-BUS05', route: 'ROUTE_5' },
  { operatorId: 'OP006', name: 'Driver Anil',     password: 'driver123', busNumber: 'KL07-BUS06', route: 'ROUTE_6' },
  { operatorId: 'OP007', name: 'Driver Thomas',   password: 'driver123', busNumber: 'KL07-BUS07', route: 'ROUTE_7' },
];

export async function POST() {
  await connectDB();

  // Wipe and re-seed routes
  await Route.deleteMany({});
  await Route.insertMany(ROUTES);

  // Upsert operators and buses
  for (const op of OPERATORS) {
    const hashed = await bcrypt.hash(op.password, 10);
    await Operator.findOneAndUpdate(
      { operatorId: op.operatorId },
      { name: op.name, password: hashed, busNumber: op.busNumber, route: op.route },
      { upsert: true, new: true }
    );
    await Bus.findOneAndUpdate(
      { busNumber: op.busNumber },
      { busNumber: op.busNumber, route: op.route, status: 'Offline' },
      { upsert: true, new: true }
    );
  }

  return NextResponse.json({
    message: 'Seeded 7 SSET Karukutty routes',
    routes: ROUTES.map(r => r.name),
    operators: OPERATORS.map(o => ({ operatorId: o.operatorId, busNumber: o.busNumber, password: o.password })),
  });
}
