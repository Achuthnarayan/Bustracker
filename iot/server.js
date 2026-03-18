/**
 * BusTracker IoT Real-Time Server
 * --------------------------------
 * Express + Socket.IO server that:
 *  1. Receives GPS updates from ESP32 / simulation script
 *  2. Persists location to MongoDB
 *  3. Broadcasts real-time updates to all connected frontend clients
 *  4. Detects geofence events (bus near a stop) and emits alerts
 *
 * Run: node server.js  (port 3001)
 * Frontend connects via: io('http://localhost:3001')
 */

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const mongoose   = require('mongoose');

const PORT          = process.env.PORT || 3001;
const MONGODB_URI   = process.env.MONGODB_URI;
const GEOFENCE_KM   = parseFloat(process.env.GEOFENCE_RADIUS_KM || '0.15');

// ── Mongoose models (mirrors bustracker-next/src/models/index.ts) ─────────────
const busSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true },
  route:     { type: String, default: 'Unassigned' },
  latitude:  { type: Number, default: 10.2167 },
  longitude: { type: Number, default: 76.5167 },
  speed:     { type: Number, default: 0 },
  heading:   { type: Number, default: 0 },
  status:    { type: String, enum: ['Active', 'Stopped', 'Offline'], default: 'Offline' },
  lastUpdate:{ type: Date, default: Date.now },
}, { timestamps: true });

const stopSchema = new mongoose.Schema({
  name: String, order: Number, expectedTime: Number,
  latitude: Number, longitude: Number,
});
const routeSchema = new mongoose.Schema({
  routeId:      { type: String, required: true, unique: true },
  name:         String,
  stops:        [stopSchema],
  startTime:    String,
  totalDuration:Number,
}, { timestamps: true });

const Bus   = mongoose.models.Bus   || mongoose.model('Bus',   busSchema);
const Route = mongoose.models.Route || mongoose.model('Route', routeSchema);

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Express + Socket.IO setup ─────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ── Track which stops each bus has already triggered alerts for ───────────────
// Prevents repeated alerts for the same stop
const alertedStops = {}; // { busNumber: Set<stopName> }

// ── POST /api/bus/update-location ─────────────────────────────────────────────
// Used by ESP32 hardware OR the simulation script
// Body: { busId, latitude, longitude, speed?, heading? }
app.post('/api/bus/update-location', async (req, res) => {
  const { busId, latitude, longitude, speed = 0, heading = 0 } = req.body;

  if (!busId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ message: 'busId, latitude, longitude required' });
  }

  try {
    // Upsert bus location in MongoDB
    const bus = await Bus.findOneAndUpdate(
      { busNumber: busId },
      { latitude, longitude, speed, heading, status: 'Active', lastUpdate: new Date() },
      { new: true, upsert: true }
    );

    // Build the payload to broadcast
    const payload = {
      busNumber: bus.busNumber,
      route:     bus.route,
      latitude,
      longitude,
      speed,
      heading,
      status:    'Active',
      lastUpdate: bus.lastUpdate,
    };

    // Broadcast to all connected frontend clients
    io.emit('busLocationUpdate', payload);

    // ── Geofence check ────────────────────────────────────────────────────────
    if (bus.route && bus.route !== 'Unassigned') {
      const route = await Route.findOne({ routeId: bus.route });
      if (route) {
        if (!alertedStops[busId]) alertedStops[busId] = new Set();

        for (const stop of route.stops) {
          const dist = haversine(latitude, longitude, stop.latitude, stop.longitude);

          if (dist < GEOFENCE_KM && !alertedStops[busId].has(stop.name)) {
            // Bus just entered this stop's geofence
            alertedStops[busId].add(stop.name);

            const alert = {
              busNumber: busId,
              stopName:  stop.name,
              routeName: route.name,
              distanceM: Math.round(dist * 1000),
              message:   `🚌 ${busId} is arriving at ${stop.name} (${Math.round(dist * 1000)}m away)`,
            };

            // Emit geofence alert to all clients
            io.emit('geofenceAlert', alert);
            console.log(`[GEOFENCE] ${alert.message}`);

          } else if (dist >= GEOFENCE_KM * 2 && alertedStops[busId].has(stop.name)) {
            // Bus has moved away — reset so it can alert again next time
            alertedStops[busId].delete(stop.name);
          }
        }
      }
    }

    res.json({ message: 'Location updated and broadcast', busId, timestamp: bus.lastUpdate });
  } catch (err) {
    console.error('[ERROR]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/buses ─────────────────────────────────────────────────────────────
app.get('/api/buses', async (req, res) => {
  try {
    const buses = await Bus.find({}).lean();
    res.json({ buses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/bus/:id ───────────────────────────────────────────────────────────
app.get('/api/bus/:id', async (req, res) => {
  try {
    const bus = await Bus.findOne({ busNumber: req.params.id }).lean();
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.json(bus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/routes ────────────────────────────────────────────────────────────
app.get('/api/routes', async (req, res) => {
  try {
    const routes = await Route.find({}).lean();
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/routes/:id/stops ──────────────────────────────────────────────────
app.get('/api/routes/:id/stops', async (req, res) => {
  try {
    const route = await Route.findOne({ routeId: req.params.id }).lean();
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json({ stops: route.stops, routeName: route.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', clients: io.engine.clientsCount }));

// ── Socket.IO connection log ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id} (total: ${io.engine.clientsCount})`);
  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

// ── Start ──────────────────────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`[SERVER] IoT real-time server running on http://localhost:${PORT}`);
      console.log(`[SERVER] Socket.IO ready — frontend connect to ws://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });
