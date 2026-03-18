# BusTracker IoT Layer

Real-time GPS server + ESP32 simulation for SSET BusTracker.

## Setup

```bash
cd iot
npm install
```

## Run the real-time server

```bash
node server.js
```

Starts on `http://localhost:3001`. Connects to MongoDB and opens a Socket.IO endpoint.

## Run the ESP32 simulator

In a second terminal:

```bash
node simulate-esp32.js          # simulate all 7 buses
node simulate-esp32.js KL07-BUS01  # simulate one bus
```

Sends GPS updates every 5 seconds, exactly like real ESP32 hardware.

## How it works

```
ESP32 (or simulator)
    │
    │  POST /api/bus/update-location
    ▼
IoT Server (Express + Socket.IO)
    │  saves to MongoDB
    │  emits 'busLocationUpdate' to all clients
    │  emits 'geofenceAlert' when bus is within 150m of a stop
    ▼
Next.js Frontend (LiveTrackMap)
    │  socket.on('busLocationUpdate') → moves bus marker instantly
    │  socket.on('geofenceAlert')     → shows toast notification
```

## API Endpoints (IoT server)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bus/update-location` | Receive GPS from ESP32 |
| GET  | `/api/buses` | List all buses |
| GET  | `/api/bus/:id` | Single bus |
| GET  | `/api/routes` | All routes |
| GET  | `/api/routes/:id/stops` | Stops for a route |
| GET  | `/health` | Server health + connected clients |

## Real ESP32 Arduino code

See `../Bustracker/hardware/esp32_gps_tracker.ino` — update the server URL to point to your deployed IoT server.

## Environment variables

Copy `.env` and update:
- `MONGODB_URI` — your MongoDB Atlas connection string
- `NEXT_APP_URL` — your Next.js app URL
- `PORT` — server port (default 3001)
- `GEOFENCE_RADIUS_KM` — alert radius (default 0.15 = 150m)
