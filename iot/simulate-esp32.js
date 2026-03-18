/**
 * ESP32 GPS Simulator
 * --------------------
 * Simulates 7 buses moving along their real SSET routes.
 * Sends POST /api/bus/update-location every 5 seconds.
 *
 * This mimics what the actual ESP32 + NEO-6M GPS module would do.
 *
 * Usage:
 *   node simulate-esp32.js              → simulate all 7 buses
 *   node simulate-esp32.js KL07-BUS01  → simulate one specific bus
 *
 * The IoT server (server.js) must be running first.
 */

require('dotenv').config();
const axios = require('axios');

const IOT_SERVER = process.env.IOT_SERVER_URL || 'http://localhost:3001';
const INTERVAL_MS = 5000; // 5 seconds — matches real ESP32 GPS update rate

// ── Route waypoints (lat/lng path each bus follows) ───────────────────────────
// Each array is an ordered list of GPS coordinates the bus passes through.
// The simulator interpolates between them to create smooth movement.
const ROUTES = {
  'KL07-BUS01': {
    name: 'Route 1 – Angamaly → SSET',
    waypoints: [
      { lat: 10.1960, lng: 76.5720 }, // Angamaly KSRTC
      { lat: 10.1985, lng: 76.5680 }, // LF Hospital
      { lat: 10.2000, lng: 76.5700 }, // Angamaly Junction
      { lat: 10.2100, lng: 76.5500 }, // Karukutty Junction
      { lat: 10.2130, lng: 76.5300 }, // Athani
      { lat: 10.2167, lng: 76.5167 }, // SSET College
    ],
  },
  'KL07-BUS02': {
    name: 'Route 2 – Chalakudy → SSET',
    waypoints: [
      { lat: 10.3000, lng: 76.3333 }, // Chalakudy KSRTC
      { lat: 10.2950, lng: 76.3400 }, // South Junction
      { lat: 10.2667, lng: 76.3833 }, // Koratty
      { lat: 10.2450, lng: 76.4500 }, // Muringoor
      { lat: 10.2200, lng: 76.5000 }, // Karukutty
      { lat: 10.2167, lng: 76.5167 }, // SSET College
    ],
  },
  'KL07-BUS03': {
    name: 'Route 3 – Aluva → SSET',
    waypoints: [
      { lat: 10.1004, lng: 76.3570 }, // Aluva Metro
      { lat: 10.1050, lng: 76.3700 }, // UC College
      { lat: 10.1400, lng: 76.4200 }, // Desom
      { lat: 10.2130, lng: 76.5300 }, // Athani
      { lat: 10.2200, lng: 76.5000 }, // Karukutty
      { lat: 10.2167, lng: 76.5167 }, // SSET College
    ],
  },
  'KL07-BUS04': {
    name: 'Route 4 – Perumbavoor → SSET',
    waypoints: [
      { lat: 10.1167, lng: 76.4667 }, // Perumbavoor
      { lat: 10.1333, lng: 76.4833 }, // Kuruppampady
      { lat: 10.1667, lng: 76.5333 }, // Kalady
      { lat: 10.1833, lng: 76.5500 }, // Mattoor
      { lat: 10.1960, lng: 76.5720 }, // Angamaly
      { lat: 10.2200, lng: 76.5000 }, // Karukutty
      { lat: 10.2167, lng: 76.5167 }, // SSET College
    ],
  },
  'KL07-BUS05': {
    name: 'Route 5 – Kalady → SSET',
    waypoints: [
      { lat: 10.1667, lng: 76.5333 }, // Kalady
      { lat: 10.1833, lng: 76.5500 }, // Mattoor
      { lat: 10.1900, lng: 76.5600 }, // Nayathode
      { lat: 10.1960, lng: 76.5720 }, // Angamaly
      { lat: 10.2200, lng: 76.5000 }, // Karukutty
      { lat: 10.2167, lng: 76.5167 }, // SSET College
    ],
  },
  'KL07-BUS06': {
    name: 'Route 6 – North Paravur → SSET',
    waypoints: [
      { lat: 10.1500, lng: 76.2167 }, // North Paravur
      { lat: 10.1600, lng: 76.2800 }, // Cherai Junction
      { lat: 10.1750, lng: 76.3800 }, // Moothakunnam
      { lat: 10.2130, lng: 76.5300 }, // Athani
      { lat: 10.2200, lng: 76.5000 }, // Karukutty
      { lat: 10.2167, lng: 76.5167 }, // SSET College
    ],
  },
  'KL07-BUS07': {
    name: 'Route 7 – Thrissur → SSET',
    waypoints: [
      { lat: 10.5276, lng: 76.2144 }, // Thrissur KSRTC
      { lat: 10.3667, lng: 76.3167 }, // Kodakara
      { lat: 10.3000, lng: 76.3333 }, // Chalakudy
      { lat: 10.2667, lng: 76.3833 }, // Koratty
      { lat: 10.2200, lng: 76.5000 }, // Karukutty
      { lat: 10.2167, lng: 76.5167 }, // SSET College
    ],
  },
};

// ── Bus state tracker ─────────────────────────────────────────────────────────
// Each bus has a position along its route (0.0 → 1.0)
const busState = {};
Object.keys(ROUTES).forEach(busId => {
  busState[busId] = { progress: 0, direction: 1 }; // direction: 1=forward, -1=return
});

/**
 * Interpolate position along waypoints given a 0–1 progress value.
 * Returns { lat, lng, speed, heading }
 */
function interpolate(waypoints, progress) {
  const totalSegments = waypoints.length - 1;
  const scaled = progress * totalSegments;
  const segIdx = Math.min(Math.floor(scaled), totalSegments - 1);
  const t = scaled - segIdx; // 0–1 within this segment

  const from = waypoints[segIdx];
  const to   = waypoints[segIdx + 1] || waypoints[segIdx];

  const lat = from.lat + (to.lat - from.lat) * t;
  const lng = from.lng + (to.lng - from.lng) * t;

  // Approximate speed: 30–60 km/h with slight noise
  const speed = 35 + Math.random() * 25;

  // Heading: bearing from → to
  const dLng = (to.lng - from.lng) * (Math.PI / 180);
  const lat1r = from.lat * (Math.PI / 180);
  const lat2r = to.lat   * (Math.PI / 180);
  const y = Math.sin(dLng) * Math.cos(lat2r);
  const x = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLng);
  const heading = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;

  // Add tiny GPS noise (±0.0001° ≈ ±11m) to simulate real GPS jitter
  return {
    lat: lat + (Math.random() - 0.5) * 0.0002,
    lng: lng + (Math.random() - 0.5) * 0.0002,
    speed: parseFloat(speed.toFixed(1)),
    heading: parseFloat(heading.toFixed(1)),
  };
}

/**
 * Send one GPS update for a bus to the IoT server.
 * This is exactly what the ESP32 firmware does via HTTP POST.
 */
async function sendUpdate(busId) {
  const route = ROUTES[busId];
  const state = busState[busId];

  const pos = interpolate(route.waypoints, state.progress);

  try {
    const res = await axios.post(`${IOT_SERVER}/api/bus/update-location`, {
      busId,
      latitude:  pos.lat,
      longitude: pos.lng,
      speed:     pos.speed,
      heading:   pos.heading,
    });
    console.log(`[${busId}] → lat:${pos.lat.toFixed(5)} lng:${pos.lng.toFixed(5)} speed:${pos.speed}km/h | ${res.data.message}`);
  } catch (err) {
    console.error(`[${busId}] ✗ Failed: ${err.message}`);
  }

  // Advance progress (each tick moves ~2% of route)
  const step = 0.02 * state.direction;
  state.progress += step;

  // Bounce at ends: simulate morning trip → pause → evening return
  if (state.progress >= 1) {
    state.progress = 1;
    state.direction = -1; // start return trip
    console.log(`[${busId}] Reached SSET — starting return trip`);
  } else if (state.progress <= 0) {
    state.progress = 0;
    state.direction = 1;  // start morning trip again
    console.log(`[${busId}] Back at origin — starting morning trip`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const targetBus = process.argv[2]; // optional: simulate only one bus
const busesToSimulate = targetBus
  ? (ROUTES[targetBus] ? [targetBus] : (() => { console.error(`Unknown bus: ${targetBus}`); process.exit(1); })())
  : Object.keys(ROUTES);

console.log('╔══════════════════════════════════════════════╗');
console.log('║   SSET BusTracker — ESP32 GPS Simulator      ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`Simulating: ${busesToSimulate.join(', ')}`);
console.log(`Sending to: ${IOT_SERVER}`);
console.log(`Interval:   ${INTERVAL_MS / 1000}s (matches real ESP32 rate)\n`);

// Stagger bus starts by 1s each to avoid thundering herd
busesToSimulate.forEach((busId, i) => {
  setTimeout(() => {
    sendUpdate(busId); // immediate first update
    setInterval(() => sendUpdate(busId), INTERVAL_MS);
  }, i * 1000);
});
