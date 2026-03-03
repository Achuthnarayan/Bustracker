// Bus Movement Simulator
// This script simulates GPS updates from multiple buses for testing

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api/hardware/location';

// Define bus routes with waypoints
const busRoutes = {
  BUS01: {
    name: 'Route A - Main Campus',
    waypoints: [
      { lat: 12.9716, lng: 77.5946 },
      { lat: 12.9730, lng: 77.5960 },
      { lat: 12.9745, lng: 77.5975 },
      { lat: 12.9760, lng: 77.5990 },
      { lat: 12.9775, lng: 77.6005 }
    ],
    currentIndex: 0
  },
  BUS02: {
    name: 'Route B - North Campus',
    waypoints: [
      { lat: 12.9800, lng: 77.6000 },
      { lat: 12.9815, lng: 77.6015 },
      { lat: 12.9830, lng: 77.6030 },
      { lat: 12.9845, lng: 77.6045 },
      { lat: 12.9860, lng: 77.6060 }
    ],
    currentIndex: 0
  },
  BUS03: {
    name: 'Route C - South Campus',
    waypoints: [
      { lat: 12.9650, lng: 77.5900 },
      { lat: 12.9635, lng: 77.5885 },
      { lat: 12.9620, lng: 77.5870 },
      { lat: 12.9605, lng: 77.5855 },
      { lat: 12.9590, lng: 77.5840 }
    ],
    currentIndex: 0
  }
};

// Simulate realistic bus movement
function simulateBusMovement(busId, route) {
  const waypoints = route.waypoints;
  const currentWaypoint = waypoints[route.currentIndex];
  const nextWaypoint = waypoints[(route.currentIndex + 1) % waypoints.length];

  // Calculate intermediate position (smooth movement)
  const progress = Math.random() * 0.3; // Move 0-30% towards next waypoint
  const lat = currentWaypoint.lat + (nextWaypoint.lat - currentWaypoint.lat) * progress;
  const lng = currentWaypoint.lng + (nextWaypoint.lng - currentWaypoint.lng) * progress;

  // Random speed between 20-60 km/h
  const speed = Math.floor(Math.random() * 40) + 20;

  // Calculate heading (direction)
  const heading = Math.floor(
    Math.atan2(
      nextWaypoint.lng - currentWaypoint.lng,
      nextWaypoint.lat - currentWaypoint.lat
    ) * (180 / Math.PI)
  );

  // Move to next waypoint occasionally
  if (Math.random() > 0.7) {
    route.currentIndex = (route.currentIndex + 1) % waypoints.length;
  }

  return {
    busId,
    latitude: lat,
    longitude: lng,
    speed,
    heading: heading >= 0 ? heading : heading + 360
  };
}

// Send GPS update to server
async function sendGPSUpdate(data) {
  try {
    const response = await axios.post(API_URL, data);
    console.log(`✓ ${data.busId}: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)} @ ${data.speed} km/h`);
    return response.data;
  } catch (error) {
    console.error(`✗ ${data.busId}: ${error.message}`);
  }
}

// Main simulation loop
function startSimulation() {
  console.log('🚌 Bus Movement Simulator Started');
  console.log('📡 Sending GPS updates to:', API_URL);
  console.log('🔄 Update interval: 5 seconds');
  console.log('-----------------------------------\n');

  // Initial update
  Object.keys(busRoutes).forEach(busId => {
    const data = simulateBusMovement(busId, busRoutes[busId]);
    sendGPSUpdate(data);
  });

  // Continuous updates
  setInterval(() => {
    console.log(`\n[${new Date().toLocaleTimeString()}] Updating bus positions...`);
    
    Object.keys(busRoutes).forEach(busId => {
      const data = simulateBusMovement(busId, busRoutes[busId]);
      sendGPSUpdate(data);
    });
  }, 5000); // Update every 5 seconds
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping bus simulator...');
  process.exit(0);
});

// Start the simulator
startSimulation();
