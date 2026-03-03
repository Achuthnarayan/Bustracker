# 🚀 Quick Start - Bus Tracker

Get your bus tracking system running in 5 minutes!

## Prerequisites

- Node.js installed
- MongoDB Atlas account (free)
- Modern web browser

## Setup (One Time)

### 1. Get MongoDB Connection String

1. Go to https://cloud.mongodb.com
2. Create free cluster (M0)
3. Create database user
4. Add IP: `0.0.0.0/0`
5. Get connection string
6. Add `/bustracker` after `.net/`

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bustracker?retryWrites=true&w=majority
```

### 2. Configure Backend

```bash
cd Bustracker/backend
cp .env.example .env
```

Edit `.env` and paste your MongoDB URI:
```
MONGODB_URI=your_connection_string_here
JWT_SECRET=your-secret-key-here
```

### 3. Install & Seed

```bash
npm install
npm run seed
```

## Run (Every Time)

### Terminal 1: Backend Server
```bash
cd Bustracker/backend
npm start
```

### Terminal 2: Bus Simulator (Optional)
```bash
cd Bustracker/backend
npm run simulate
```

### Browser
Open: http://localhost:3000

Login: `STU001` / `password123`

## Features to Test

1. **Live Map Tracking** 🗺️
   - Click "Live Map Tracking" button
   - See all buses on map
   - Click any bus to track
   - Watch real-time updates

2. **Search Bus** 🔍
   - Type bus number (e.g., BUS01)
   - Click Track
   - View bus details

3. **View Routes** 🚌
   - See all available routes
   - Check stops and prices

4. **Buy Tickets** 🎫
   - Select ticket type
   - Choose payment method
   - Complete purchase

## Test Accounts

**Students:**
- STU001 / password123
- STU002 / password123
- STU003 / password123

**Operators:**
- OP001 / operator123
- OP002 / operator123
- OP003 / operator123

## Simulate GPS Updates

### Option 1: Use Simulator Script
```bash
npm run simulate
```

### Option 2: Manual API Call
```bash
curl -X POST http://localhost:3000/api/hardware/location \
  -H "Content-Type: application/json" \
  -d '{
    "busId": "BUS01",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "speed": 45,
    "heading": 90
  }'
```

## Customize

### Change Map Center (Your College Location)

Edit `tracking/config.js`:
```javascript
MAP: {
  DEFAULT_CENTER: { 
    lat: 12.9716,  // Your latitude
    lng: 77.5946   // Your longitude
  }
}
```

### Change Update Frequency

Edit `tracking/config.js`:
```javascript
MAP: {
  UPDATE_INTERVAL: 5000  // milliseconds (5000 = 5 seconds)
}
```

## Deploy to Production

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd Bustracker
vercel
```

Add environment variables in Vercel dashboard:
- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV=production`

## Troubleshooting

### Buses not showing?
- Check backend is running (Terminal 1)
- Run `npm run seed` to add test data
- Check browser console (F12)

### Map not loading?
- Check internet connection
- Clear browser cache
- Try incognito mode

### Login not working?
- Verify database is seeded
- Check credentials (case-sensitive)
- Clear localStorage: `localStorage.clear()`

### Updates not working?
- Start simulator (Terminal 2)
- Check backend logs
- Refresh browser

## File Structure

```
Bustracker/
├── backend/
│   ├── models/          # Database models
│   ├── scripts/         # Seed & simulator
│   ├── server.js        # Main server
│   └── package.json
├── tracking/
│   ├── live-track.html  # Live map page
│   ├── dashboard.html   # User dashboard
│   ├── config.js        # Configuration
│   └── style.css
└── hardware/
    └── esp32_gps_tracker.ino
```

## API Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/buses` - Get all buses
- `GET /api/buses/:id/location` - Get bus location
- `POST /api/hardware/location` - Update GPS (ESP32)
- `GET /api/routes` - Get routes
- `POST /api/tickets/purchase` - Buy ticket
- `GET /api/health` - Health check

## Next Steps

1. ✅ Test locally
2. ✅ Customize for your location
3. ✅ Add your routes
4. 🔄 Connect ESP32 hardware
5. 🔄 Deploy to Vercel
6. 🔄 Share with users

## Documentation

- **Full Testing Guide**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Live Tracking Guide**: [LIVE_TRACKING_GUIDE.md](LIVE_TRACKING_GUIDE.md)
- **MongoDB Setup**: [MONGODB_SETUP_GUIDE.md](MONGODB_SETUP_GUIDE.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)

## Support

Check browser console (F12) and backend logs for errors.

---

**That's it!** Your bus tracking system is ready! 🎉

Open http://localhost:3000 and start tracking! 🚌🗺️
