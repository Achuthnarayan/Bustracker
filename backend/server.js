// Node.js Express Server for Bus Tracking System
// This server handles API requests and ESP32 GPS data

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../tracking'));

// Redirect root to index.html
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// In-memory storage (replace with actual database in production)
// Hardcoded users for testing
const users = [
  {
    id: 1,
    name: 'John Doe',
    collegeId: 'STU001',
    phone: '9876543210',
    email: 'john@college.edu',
    password: 'password123',
    role: 'student',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Jane Smith',
    collegeId: 'STU002',
    phone: '9876543211',
    email: 'jane@college.edu',
    password: 'password123',
    role: 'student',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Mike Johnson',
    collegeId: 'STU003',
    phone: '9876543212',
    email: 'mike@college.edu',
    password: 'password123',
    role: 'student',
    createdAt: new Date().toISOString()
  }
];

// Hardcoded bus operators
const operators = [
  {
    id: 1,
    name: 'Rajesh Kumar',
    operatorId: 'OP001',
    password: 'operator123',
    busNumber: 'BUS01',
    route: 'Route A - Main Campus',
    phone: '9876543220',
    role: 'operator',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Suresh Patel',
    operatorId: 'OP002',
    password: 'operator123',
    busNumber: 'BUS02',
    route: 'Route B - North Campus',
    phone: '9876543221',
    role: 'operator',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Amit Singh',
    operatorId: 'OP003',
    password: 'operator123',
    busNumber: 'BUS03',
    route: 'Route C - South Campus',
    phone: '9876543222',
    role: 'operator',
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    name: 'Vijay Sharma',
    operatorId: 'OP004',
    password: 'operator123',
    busNumber: 'BUS04',
    route: 'Route A - Main Campus',
    phone: '9876543223',
    role: 'operator',
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    name: 'Ravi Verma',
    operatorId: 'OP005',
    password: 'operator123',
    busNumber: 'BUS05',
    route: 'Route B - North Campus',
    phone: '9876543224',
    role: 'operator',
    createdAt: new Date().toISOString()
  }
];

// Hardcoded buses with simulated GPS data
const buses = new Map([
  ['BUS01', {
    busNumber: 'BUS01',
    route: 'Route A - Main Campus',
    latitude: 12.9716,
    longitude: 77.5946,
    speed: 35,
    heading: 90,
    status: 'Active',
    timestamp: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  }],
  ['BUS02', {
    busNumber: 'BUS02',
    route: 'Route B - North Campus',
    latitude: 12.9800,
    longitude: 77.6000,
    speed: 42,
    heading: 180,
    status: 'Active',
    timestamp: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  }],
  ['BUS03', {
    busNumber: 'BUS03',
    route: 'Route C - South Campus',
    latitude: 12.9650,
    longitude: 77.5900,
    speed: 28,
    heading: 270,
    status: 'Active',
    timestamp: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  }],
  ['BUS04', {
    busNumber: 'BUS04',
    route: 'Route A - Main Campus',
    latitude: 12.9750,
    longitude: 77.5980,
    speed: 0,
    heading: 0,
    status: 'Stopped',
    timestamp: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  }],
  ['BUS05', {
    busNumber: 'BUS05',
    route: 'Route B - North Campus',
    latitude: 12.9820,
    longitude: 77.6050,
    speed: 50,
    heading: 45,
    status: 'Active',
    timestamp: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  }]
]);

// Hardcoded tickets
const tickets = [
  {
    id: 'TKT1001',
    userId: 1,
    ticketType: 'Monthly Pass',
    route: 'Route A - Main Campus',
    amount: 1200,
    paymentMethod: 'UPI',
    status: 'Active',
    purchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'TKT1002',
    userId: 2,
    ticketType: 'Monthly Pass',
    route: 'Route B - North Campus',
    amount: 1500,
    paymentMethod: 'Card',
    status: 'Active',
    purchaseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Simulate GPS updates for buses (mimics ESP32 sending data)
setInterval(() => {
  buses.forEach((bus, busId) => {
    if (bus.status === 'Active') {
      // Simulate small movements
      bus.latitude += (Math.random() - 0.5) * 0.001;
      bus.longitude += (Math.random() - 0.5) * 0.001;
      bus.speed = Math.max(0, bus.speed + (Math.random() - 0.5) * 10);
      bus.heading = (bus.heading + (Math.random() - 0.5) * 20) % 360;
      bus.timestamp = new Date().toISOString();
      bus.lastUpdate = new Date().toISOString();
    }
  });
}, 5000); // Update every 5 seconds

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
app.post('/api/auth/register', (req, res) => {
  const { name, collegeId, phone, email, password } = req.body;

  // Validation
  if (!name || !collegeId || !phone || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if user already exists
  if (users.find(u => u.collegeId === collegeId)) {
    return res.status(409).json({ message: 'College ID already registered' });
  }

  if (users.find(u => u.email === email)) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  // Create user
  const user = {
    id: Date.now(),
    name,
    collegeId,
    phone,
    email,
    password, // In production, hash this with bcrypt
    createdAt: new Date().toISOString()
  };

  users.push(user);

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, collegeId: user.collegeId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: user.id,
      name: user.name,
      collegeId: user.collegeId,
      email: user.email
    }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { collegeId, password } = req.body;

  const user = users.find(u => u.collegeId === collegeId && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, collegeId: user.collegeId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      collegeId: user.collegeId,
      email: user.email
    }
  });
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// ============ Operator Authentication Routes ============

// Operator Login
app.post('/api/auth/operator/login', (req, res) => {
  const { operatorId, password } = req.body;

  const operator = operators.find(op => op.operatorId === operatorId && op.password === password);

  if (!operator) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: operator.id, operatorId: operator.operatorId, role: 'operator' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: operator.id,
      name: operator.name,
      operatorId: operator.operatorId,
      busNumber: operator.busNumber,
      route: operator.route,
      role: 'operator'
    }
  });
});

// ============ Bus Tracking Routes ============

// Get all buses
app.get('/api/buses', authenticateToken, (req, res) => {
  const busesArray = Array.from(buses.values());
  res.json({ buses: busesArray });
});

// Get specific bus location
app.get('/api/buses/:busNumber/location', authenticateToken, (req, res) => {
  const { busNumber } = req.params;
  const bus = buses.get(busNumber);

  if (!bus) {
    return res.status(404).json({ message: 'Bus not found' });
  }

  // Check if location data is stale
  const locationAge = Date.now() - new Date(bus.timestamp).getTime();
  if (locationAge > 60000) { // 1 minute
    bus.status = 'Offline';
  }

  res.json(bus);
});

// Search buses
app.get('/api/buses/search', authenticateToken, (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ message: 'Search query required' });
  }

  const results = Array.from(buses.values()).filter(bus =>
    bus.busNumber.toLowerCase().includes(q.toLowerCase()) ||
    bus.route.toLowerCase().includes(q.toLowerCase())
  );

  res.json({ results });
});

// ============ Hardware Integration Routes (ESP32) ============

// ESP32 sends GPS location updates
app.post('/api/hardware/location', (req, res) => {
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
  const busData = {
    busNumber: busId,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    speed: speed || 0,
    heading: heading || 0,
    status: 'Active',
    timestamp: timestamp || new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  };

  // Get route info if exists
  const existingBus = buses.get(busId);
  if (existingBus) {
    busData.route = existingBus.route;
  }

  buses.set(busId, busData);

  console.log(`[GPS UPDATE] Bus ${busId}: ${latitude}, ${longitude} @ ${speed} km/h`);

  res.json({
    message: 'Location updated successfully',
    busId,
    timestamp: busData.timestamp
  });
});

// Get bus hardware status
app.get('/api/hardware/status/:busId', authenticateToken, (req, res) => {
  const { busId } = req.params;
  const bus = buses.get(busId);

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
});

// ============ Routes Management ============

app.get('/api/routes', authenticateToken, (req, res) => {
  const routes = [
    {
      id: 'ROUTE_A',
      name: 'Route A - Main Campus',
      description: 'Via MG Road, Indiranagar',
      stops: ['College Gate', 'MG Road', 'Indiranagar', 'Main Campus'],
      price: 1200,
      duration: '45 mins'
    },
    {
      id: 'ROUTE_B',
      name: 'Route B - North Campus',
      description: 'Via Hebbal, Yelahanka',
      stops: ['College Gate', 'Hebbal', 'Yelahanka', 'North Campus'],
      price: 1500,
      duration: '60 mins'
    }
  ];

  res.json({ routes });
});

// ============ Ticket Routes ============

app.post('/api/tickets/purchase', authenticateToken, (req, res) => {
  const { ticketType, route, amount, paymentMethod } = req.body;

  const ticket = {
    id: 'TKT' + Date.now(),
    userId: req.user.id,
    ticketType,
    route,
    amount,
    paymentMethod,
    status: 'Active',
    purchaseDate: new Date().toISOString()
  };

  tickets.push(ticket);

  res.status(201).json({
    message: 'Ticket purchased successfully',
    ticket
  });
});

app.get('/api/tickets/my', authenticateToken, (req, res) => {
  const userTickets = tickets.filter(t => t.userId === req.user.id);
  res.json({ tickets: userTickets });
});

// ============ Health Check ============

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    activeBuses: buses.size,
    registeredUsers: users.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Bus Tracking Server running on port ${PORT}`);
  console.log(`ESP32 endpoint: http://localhost:${PORT}/api/hardware/location`);
  console.log(`Frontend: http://localhost:${PORT}`);
});

module.exports = app;
