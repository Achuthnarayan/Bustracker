// Node.js Express Server for Bus Tracking System
// This server handles API requests and ESP32 GPS data

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const connectDB = require('./config/database');

// Models
const User = require('./models/User');
const Operator = require('./models/Operator');
const Bus = require('./models/Bus');
const Route = require('./models/Route');
const Ticket = require('./models/Ticket');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Connect to MongoDB
connectDB().catch(err => {
  console.error('MongoDB connection failed:', err);
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../tracking'));

// Redirect root to index.html
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Seed initial data (run once)
const seedData = async () => {
  try {
    const routeCount = await Route.countDocuments();
    if (routeCount === 0) {
      await Route.insertMany([
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
      console.log('Routes seeded');
    }
  } catch (error) {
    console.error('Seed error:', error);
  }
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ============ Authentication Routes ============

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, collegeId, phone, email, password } = req.body;

    // Validation
    if (!name || !collegeId || !phone || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ collegeId }, { email }] 
    });

    if (existingUser) {
      if (existingUser.collegeId === collegeId) {
        return res.status(409).json({ message: 'College ID already registered' });
      }
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      collegeId,
      phone,
      email,
      password: hashedPassword
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, collegeId: user.collegeId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        collegeId: user.collegeId,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { collegeId, password } = req.body;

    const user = await User.findOne({ collegeId });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, collegeId: user.collegeId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        collegeId: user.collegeId,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// ============ Operator Authentication Routes ============

// Operator Login
app.post('/api/auth/operator/login', async (req, res) => {
  try {
    const { operatorId, password } = req.body;

    const operator = await Operator.findOne({ operatorId });

    if (!operator) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, operator.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: operator._id, operatorId: operator.operatorId, role: 'operator' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: operator._id,
        name: operator.name,
        operatorId: operator.operatorId,
        busNumber: operator.busNumber,
        route: operator.route,
        role: 'operator'
      }
    });
  } catch (error) {
    console.error('Operator login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ Bus Tracking Routes ============

// Get all buses
app.get('/api/buses', authenticateToken, async (req, res) => {
  try {
    const buses = await Bus.find();
    res.json({ buses });
  } catch (error) {
    console.error('Get buses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific bus location
app.get('/api/buses/:busNumber/location', authenticateToken, async (req, res) => {
  try {
    const { busNumber } = req.params;
    const bus = await Bus.findOne({ busNumber });

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Check if location data is stale
    const locationAge = Date.now() - new Date(bus.lastUpdate).getTime();
    if (locationAge > 60000) { // 1 minute
      bus.status = 'Offline';
      await bus.save();
    }

    res.json(bus);
  } catch (error) {
    console.error('Get bus location error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search buses
app.get('/api/buses/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query required' });
    }

    const results = await Bus.find({
      $or: [
        { busNumber: { $regex: q, $options: 'i' } },
        { route: { $regex: q, $options: 'i' } }
      ]
    });

    res.json({ results });
  } catch (error) {
    console.error('Search buses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ Hardware Integration Routes (ESP32) ============

// ESP32 sends GPS location updates
app.post('/api/hardware/location', async (req, res) => {
  try {
    const { busId, latitude, longitude, speed, heading, timestamp } = req.body;

    // Validation
    if (!busId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'busId, latitude, and longitude are required' });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Update or create bus location
    let bus = await Bus.findOne({ busNumber: busId });

    if (bus) {
      bus.latitude = parseFloat(latitude);
      bus.longitude = parseFloat(longitude);
      bus.speed = speed || 0;
      bus.heading = heading || 0;
      bus.status = 'Active';
      bus.lastUpdate = new Date();
      await bus.save();
    } else {
      bus = await Bus.create({
        busNumber: busId,
        route: 'Unassigned',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed: speed || 0,
        heading: heading || 0,
        status: 'Active'
      });
    }

    console.log(`[GPS UPDATE] Bus ${busId}: ${latitude}, ${longitude} @ ${speed} km/h`);

    res.json({
      message: 'Location updated successfully',
      busId,
      timestamp: bus.lastUpdate
    });
  } catch (error) {
    console.error('Hardware location update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get bus hardware status
app.get('/api/hardware/status/:busId', authenticateToken, async (req, res) => {
  try {
    const { busId } = req.params;
    const bus = await Bus.findOne({ busNumber: busId });

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const lastUpdateTime = new Date(bus.lastUpdate).getTime();
    const timeSinceUpdate = Date.now() - lastUpdateTime;

    res.json({
      busId,
      online: timeSinceUpdate < 30000, // Online if updated within 30 seconds
      lastUpdate: bus.lastUpdate,
      timeSinceUpdate: Math.floor(timeSinceUpdate / 1000) + ' seconds ago'
    });
  } catch (error) {
    console.error('Hardware status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ Routes Management ============

app.get('/api/routes', authenticateToken, async (req, res) => {
  try {
    const routes = await Route.find({ active: true });
    res.json({ routes });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ Ticket Routes ============

app.post('/api/tickets/purchase', authenticateToken, async (req, res) => {
  try {
    const { ticketType, route, amount, paymentMethod } = req.body;

    const ticket = await Ticket.create({
      ticketId: 'TKT' + Date.now(),
      userId: req.user.id,
      ticketType,
      route,
      amount,
      paymentMethod,
      status: 'Active',
      purchaseDate: new Date()
    });

    res.status(201).json({
      message: 'Ticket purchased successfully',
      ticket
    });
  } catch (error) {
    console.error('Purchase ticket error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/tickets/my', authenticateToken, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id }).sort({ purchaseDate: -1 });
    res.json({ tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ Health Check ============

app.get('/api/health', async (req, res) => {
  try {
    const activeBuses = await Bus.countDocuments({ status: 'Active' });
    const registeredUsers = await User.countDocuments();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      activeBuses,
      registeredUsers,
      database: 'Connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Environment Check (for debugging)
app.get('/api/env-check', (req, res) => {
  res.json({
    hasMongoUri: !!process.env.MONGODB_URI,
    hasJwtSecret: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || 'not set',
    isVercel: !!process.env.VERCEL,
    mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0
  });
});

// Seed data on startup
seedData();

// Start server (only in non-serverless environment)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Bus Tracking Server running on port ${PORT}`);
    console.log(`ESP32 endpoint: http://localhost:${PORT}/api/hardware/location`);
    console.log(`Frontend: http://localhost:${PORT}`);
  });
}

module.exports = app;
