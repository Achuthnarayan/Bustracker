require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/database');

const User = require('../models/User');
const Operator = require('../models/Operator');
const Bus = require('../models/Bus');
const Route = require('../models/Route');

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Operator.deleteMany({});
    await Bus.deleteMany({});
    await Route.deleteMany({});

    console.log('Seeding routes...');
    const routes = await Route.insertMany([
      {
        routeId: 'ROUTE_A',
        name: 'Route A - Main Campus',
        description: 'Via MG Road, Indiranagar',
        stops: ['College Gate', 'MG Road', 'Indiranagar', 'Main Campus'],
        price: 1200,
        duration: '45 mins'
      },
      {
        routeId: 'ROUTE_B',
        name: 'Route B - North Campus',
        description: 'Via Hebbal, Yelahanka',
        stops: ['College Gate', 'Hebbal', 'Yelahanka', 'North Campus'],
        price: 1500,
        duration: '60 mins'
      },
      {
        routeId: 'ROUTE_C',
        name: 'Route C - South Campus',
        description: 'Via Jayanagar, BTM Layout',
        stops: ['College Gate', 'Jayanagar', 'BTM Layout', 'South Campus'],
        price: 1300,
        duration: '50 mins'
      }
    ]);
    console.log(`✓ ${routes.length} routes created`);

    console.log('Seeding test users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const users = await User.insertMany([
      {
        name: 'John Doe',
        collegeId: 'STU001',
        phone: '9876543210',
        email: 'john@college.edu',
        password: hashedPassword,
        role: 'student'
      },
      {
        name: 'Jane Smith',
        collegeId: 'STU002',
        phone: '9876543211',
        email: 'jane@college.edu',
        password: hashedPassword,
        role: 'student'
      },
      {
        name: 'Mike Johnson',
        collegeId: 'STU003',
        phone: '9876543212',
        email: 'mike@college.edu',
        password: hashedPassword,
        role: 'student'
      }
    ]);
    console.log(`✓ ${users.length} test users created (password: password123)`);

    console.log('Seeding operators...');
    const operatorPassword = await bcrypt.hash('operator123', 10);
    const operators = await Operator.insertMany([
      {
        name: 'Rajesh Kumar',
        operatorId: 'OP001',
        password: operatorPassword,
        busNumber: 'BUS01',
        route: 'Route A - Main Campus',
        phone: '9876543220'
      },
      {
        name: 'Suresh Patel',
        operatorId: 'OP002',
        password: operatorPassword,
        busNumber: 'BUS02',
        route: 'Route B - North Campus',
        phone: '9876543221'
      },
      {
        name: 'Amit Singh',
        operatorId: 'OP003',
        password: operatorPassword,
        busNumber: 'BUS03',
        route: 'Route C - South Campus',
        phone: '9876543222'
      }
    ]);
    console.log(`✓ ${operators.length} operators created (password: operator123)`);

    console.log('Seeding buses...');
    const buses = await Bus.insertMany([
      {
        busNumber: 'BUS01',
        route: 'Route A - Main Campus',
        latitude: 12.9716,
        longitude: 77.5946,
        speed: 35,
        heading: 90,
        status: 'Active'
      },
      {
        busNumber: 'BUS02',
        route: 'Route B - North Campus',
        latitude: 12.9800,
        longitude: 77.6000,
        speed: 42,
        heading: 180,
        status: 'Active'
      },
      {
        busNumber: 'BUS03',
        route: 'Route C - South Campus',
        latitude: 12.9650,
        longitude: 77.5900,
        speed: 28,
        heading: 270,
        status: 'Active'
      }
    ]);
    console.log(`✓ ${buses.length} buses created`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Credentials:');
    console.log('Student Login: STU001 / password123');
    console.log('Operator Login: OP001 / operator123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
