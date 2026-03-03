# Live Bus Tracking - Quick Start Guide

Your Bus Tracker now has a real-time map tracking feature similar to the Chalo app!

## Features

✅ **Real-time Map View** - See all buses on an interactive map
✅ **Live Updates** - Bus positions update every 5 seconds automatically
✅ **Smooth Animations** - Buses move smoothly on the map
✅ **Bus Details Card** - View speed, heading, status, and route info
✅ **Search & Track** - Search for specific buses
✅ **All Buses Panel** - Side panel showing all active buses
✅ **Status Indicators** - Color-coded status (Active/Stopped/Offline)
✅ **Mobile Responsive** - Works perfectly on phones and tablets

## How to Test

### Step 1: Start the Backend

```bash
cd Bustracker/backend
npm start
```

Server should be running on http://localhost:3000

### Step 2: Open the Frontend

Open in your browser:
```
http://localhost:3000/index.html
```

### Step 3: Login

Use test credentials (after running `npm run seed`):
- College ID: `STU001`
- Password: `password123`

### Step 4: Access Live Tracking

1. Click on **"🗺️ Live Map Tracking"** button on dashboard
2. You'll see a full-screen map with all buses
3. Buses appear as circular markers with their bus numbers

### Step 5: Interact with the Map

**View All Buses:**
- All buses are shown on the map automatically
- Different colors indicate status:
  - 🟢 Green = Active
  - 🟡 Yellow = Stopped
  - 🔴 Red = Offline

**Track Specific Bus:**
- Click on any bus marker on the map
- OR use the search box at the top
- OR click "📋 All Buses" to see the list

**Bus Details:**
- When you select a bus, a card appears at the bottom showing:
  - Bus number and route
  - Current speed
  - Heading direction
  - Live status
  - Last update time

**Auto-Refresh:**
- Map updates every 5 seconds automatically
- Live indicator shows real-time tracking status

## Simulating Bus Movement

Since you don't have ESP32 hardware yet, you can simulate bus movement:

### Option 1: Use the API Directly

Send GPS updates using curl or Postman:

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

### Option 2: Create a Simulator Script

Create `Bustracker/backend/scripts/simulate-buses.js`:

```javascript
const axios = require('axios');

const buses = [
  { id: 'BUS01', lat: 12.9716, lng: 77.5946 },
  { id: 'BUS02', lat: 12.9800, lng: 77.6000 },
  { id: 'BUS03', lat: 12.9650, lng: 77.5900 }
];

setInterval(() => {
  buses.forEach(bus => {
    // Simulate movement
    bus.lat += (Math.random() - 0.5) * 0.001;
    bus.lng += (Math.random() - 0.5) * 0.001;
    
    const speed = Math.floor(Math.random() * 60);
    const heading = Math.floor(Math.random() * 360);
    
    axios.post('http://localhost:3000/api/hardware/location', {
      busId: bus.id,
      latitude: bus.lat,
      longitude: bus.lng,
      speed: speed,
      heading: heading
    }).then(() => {
      console.log(`Updated ${bus.id}: ${bus.lat}, ${bus.lng}`);
    }).catch(err => {
      console.error(`Error updating ${bus.id}:`, err.message);
    });
  });
}, 5000); // Update every 5 seconds

console.log('Bus simulator started...');
```

Run it:
```bash
npm install axios
node scripts/simulate-buses.js
```

## Map Controls

- **Zoom In/Out**: Use + and - buttons or mouse wheel
- **Pan**: Click and drag the map
- **Center on Bus**: Click any bus marker
- **Search**: Type bus number in search box
- **Refresh**: Click refresh button in top bar
- **All Buses**: Toggle side panel to see list

## Customization

### Change Default Map Center

Edit `Bustracker/tracking/config.js`:

```javascript
MAP: {
  DEFAULT_CENTER: { 
    lat: 12.9716,  // Your college latitude
    lng: 77.5946   // Your college longitude
  },
  DEFAULT_ZOOM: 13,
  UPDATE_INTERVAL: 5000 // Update frequency in ms
}
```

### Change Update Frequency

In `live-track.html`, find:

```javascript
startAutoUpdate() {
  updateInterval = setInterval(() => {
    loadAllBuses();
  }, 5000); // Change this value (in milliseconds)
}
```

### Customize Bus Marker Colors

In `live-track.html`, find `getBusColor()` function:

```javascript
function getBusColor(status) {
  switch (status.toLowerCase()) {
    case 'active': return '#16a34a';   // Green
    case 'stopped': return '#f59e0b';  // Yellow
    case 'offline': return '#ef4444';  // Red
    default: return '#5b8fd6';         // Blue
  }
}
```

## Mobile Experience

The live tracking is fully responsive:
- Full-screen map on mobile
- Swipeable bus info card
- Touch-friendly controls
- Optimized for small screens

## Troubleshooting

### Buses Not Showing
- Check if backend is running
- Verify database has bus data (run `npm run seed`)
- Check browser console for errors
- Ensure you're logged in

### Map Not Loading
- Check internet connection (map tiles load from OpenStreetMap)
- Clear browser cache
- Try different browser

### Updates Not Working
- Check if auto-update interval is running
- Verify API is responding: http://localhost:3000/api/health
- Check browser console for errors

### GPS Coordinates Wrong
- Update DEFAULT_CENTER in config.js to your location
- Use Google Maps to find your college coordinates
- Format: latitude, longitude (e.g., 12.9716, 77.5946)

## Production Deployment

When deploying to Vercel:

1. Map will work automatically (uses OpenStreetMap)
2. Update API_BASE_URL in config.js to your Vercel URL
3. Ensure CORS is configured in backend
4. Test on mobile devices

## Next Steps

1. ✅ Test live tracking locally
2. ✅ Simulate bus movements
3. ✅ Customize for your location
4. 🔄 Connect ESP32 hardware
5. 🔄 Deploy to Vercel
6. 🔄 Test with real GPS data

## ESP32 Integration

Once you have ESP32 hardware:

1. Upload the code from `hardware/esp32_gps_tracker.ino`
2. Update WiFi credentials
3. Update server URL to your deployed backend
4. GPS data will automatically appear on the map

## Support

For issues or questions:
- Check browser console for errors
- Verify backend logs
- Test API endpoints manually
- Review DEPLOYMENT.md for production setup

---

**Enjoy your real-time bus tracking system!** 🚌🗺️
