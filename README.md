# Bus Tracker System

A real-time college bus tracking system with ESP32 GPS integration, student authentication, and ticket management.

## Features

- 🗺️ **Real-time Live Map Tracking** - Interactive map with all buses (like Chalo app)
- 🚌 Real-time GPS tracking of buses with smooth animations
- 📱 Student and operator authentication
- 🎫 Digital ticket purchasing system
- 🗺️ Multiple route management
- 🔧 ESP32 hardware integration
- 📊 Operator dashboard
- 🔄 Auto-refresh every 5 seconds
- 📍 Search and track specific buses
- 📱 Fully responsive mobile design
- 🎨 Modern, clean UI with smooth animations

## Tech Stack

### Backend
- Node.js + Express
- MongoDB (via Mongoose)
- JWT Authentication
- bcrypt for password hashing

### Frontend
- HTML5, CSS3, JavaScript
- Leaflet.js for interactive maps
- Real-time updates with auto-refresh
- Responsive design
- Smooth animations and transitions

### Hardware
- ESP32 microcontroller
- GPS module (NEO-6M or similar)

## Quick Start Guide

**Complete testing guide**: See [TESTING_GUIDE.md](TESTING_GUIDE.md)

**Live tracking guide**: See [LIVE_TRACKING_GUIDE.md](LIVE_TRACKING_GUIDE.md)

**MongoDB setup**: See [MONGODB_SETUP_GUIDE.md](MONGODB_SETUP_GUIDE.md)

**Deployment guide**: See [DEPLOYMENT.md](DEPLOYMENT.md)

### Quick Test (3 steps)

```bash
# 1. Setup and seed database
cd backend
npm install
npm run seed

# 2. Start backend (Terminal 1)
npm start

# 3. Start bus simulator (Terminal 2)
npm run simulate
```

Then open http://localhost:3000 and login with `STU001` / `password123`

Click "🗺️ Live Map Tracking" to see buses moving in real-time!

### 1. Setup MongoDB

1. Create a free account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (M0 Free tier)
3. Get your connection string
4. Whitelist your IP or use 0.0.0.0/0 for development

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and add your MongoDB URI:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bustracker
JWT_SECRET=your-secret-key-here
```

Seed the database:
```bash
npm run seed
```

Start the server:
```bash
npm start
```

Server runs on http://localhost:3000

### 3. Test with Bus Simulator (Recommended)

Open a new terminal and run the bus simulator to see live updates:

```bash
cd backend
npm run simulate
```

This simulates GPS updates from 3 buses moving on different routes. You'll see buses moving on the map in real-time!

### 3. Test Credentials

After seeding:
- Student: `STU001` / `password123`
- Operator: `OP001` / `operator123`

### 4. Access Live Map Tracking

1. Login with student credentials
2. Click "🗺️ Live Map Tracking" on dashboard
3. See all buses on interactive map
4. Click any bus to track it
5. Watch real-time updates (if simulator is running)

### 5. ESP32 Setup

1. Open `hardware/esp32_gps_tracker.ino` in Arduino IDE
2. Update WiFi credentials and server URL
3. Upload to ESP32
4. Monitor serial output for GPS data

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new student
- `POST /api/auth/login` - Student login
- `POST /api/auth/operator/login` - Operator login
- `POST /api/auth/logout` - Logout

### Buses
- `GET /api/buses` - Get all buses
- `GET /api/buses/:busNumber/location` - Get specific bus location
- `GET /api/buses/search?q=query` - Search buses

### Hardware (ESP32)
- `POST /api/hardware/location` - Update bus GPS location
- `GET /api/hardware/status/:busId` - Get hardware status

### Routes
- `GET /api/routes` - Get all routes

### Tickets
- `POST /api/tickets/purchase` - Purchase ticket
- `GET /api/tickets/my` - Get user's tickets

### Health
- `GET /api/health` - Server health check

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Vercel deployment instructions.

### Quick Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard:
- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV=production`

## Project Structure

```
Bustracker/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── Bus.js
│   │   ├── Operator.js
│   │   ├── Route.js
│   │   ├── Ticket.js
│   │   └── User.js
│   ├── scripts/
│   │   └── seed.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── hardware/
│   ├── esp32_gps_tracker.ino
│   └── README.md
├── tracking/
│   ├── js/
│   ├── index.html
│   ├── dashboard.html
│   ├── operator-dashboard.html
│   └── style.css
├── vercel.json
├── DEPLOYMENT.md
└── README.md
```

## Development

Run in development mode with auto-reload:
```bash
cd backend
npm run dev
```

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first.
