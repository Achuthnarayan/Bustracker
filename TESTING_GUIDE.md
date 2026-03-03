# Complete Testing Guide - Bus Tracker with Live Map

Follow these steps to test your complete bus tracking system with real-time map updates.

## Prerequisites

✅ MongoDB Atlas connection string configured in `.env`
✅ Node.js installed
✅ Modern web browser (Chrome, Firefox, Safari, Edge)

## Step-by-Step Testing

### 1. Setup Database

```bash
cd Bustracker/backend

# Install dependencies
npm install

# Seed the database with test data
npm run seed
```

Expected output:
```
MongoDB connected successfully
✓ 3 routes created
✓ 3 test users created
✓ 3 operators created
✓ 3 buses created
✅ Database seeded successfully!

Test Credentials:
Student Login: STU001 / password123
Operator Login: OP001 / operator123
```

### 2. Start the Backend Server

Open Terminal 1:
```bash
cd Bustracker/backend
npm start
```

Expected output:
```
Bus Tracking Server running on port 3000
ESP32 endpoint: http://localhost:3000/api/hardware/location
Frontend: http://localhost:3000
```

Keep this terminal running!

### 3. Start the Bus Simulator (Optional but Recommended)

Open Terminal 2:
```bash
cd Bustracker/backend
npm run simulate
```

Expected output:
```
🚌 Bus Movement Simulator Started
📡 Sending GPS updates to: http://localhost:3000/api/hardware/location
🔄 Update interval: 5 seconds
-----------------------------------

✓ BUS01: 12.971600, 77.594600 @ 45 km/h
✓ BUS02: 12.980000, 77.600000 @ 38 km/h
✓ BUS03: 12.965000, 77.590000 @ 52 km/h
```

This simulates real GPS updates from buses. Keep this running!

### 4. Open the Application

Open your browser and go to:
```
http://localhost:3000
```

### 5. Test User Registration (Optional)

1. Click "Sign Up"
2. Fill in the form:
   - Name: Your Name
   - College ID: TEST001
   - Phone: 9876543210
   - Email: test@example.com
   - Password: test123
3. Click "Sign Up"
4. You should be redirected to dashboard

### 6. Test User Login

1. Go to http://localhost:3000
2. Enter credentials:
   - College ID: `STU001`
   - Password: `password123`
3. Click "Login"
4. You should see the dashboard

### 7. Test Live Map Tracking

1. On the dashboard, click **"🗺️ Live Map Tracking"**
2. You should see:
   - Full-screen interactive map
   - All buses displayed as markers
   - Search box at the top
   - "All Buses" button on the right

### 8. Interact with the Map

**View All Buses:**
- You should see 3 bus markers (BUS01, BUS02, BUS03)
- Each marker shows the bus number
- Colors indicate status (green = active)

**Click on a Bus:**
- Click any bus marker
- A popup appears with bus details
- Bottom card slides up showing:
  - Bus number and route
  - Current speed
  - Heading direction
  - Live status indicator
  - Last update time

**Search for a Bus:**
- Type "BUS01" in the search box
- Click "Track" or press Enter
- Map centers on that bus
- Bus details card appears

**View All Buses List:**
- Click "📋 All Buses" button
- Side panel slides in from right
- Shows list of all buses with status
- Click any bus to track it

**Watch Live Updates:**
- If simulator is running, buses will move every 5 seconds
- Watch the markers update position
- Speed and heading values change
- "Last updated" time refreshes

### 9. Test Other Features

**View Routes:**
1. Go back to dashboard (click ← Back)
2. Click "🚌 View Routes"
3. You should see 3 routes with details

**Buy Tickets:**
1. Go back to dashboard
2. Click "🎫 Buy Tickets"
3. Select a ticket type
4. Choose payment method
5. Complete purchase

**Operator Login:**
1. Logout from student account
2. Go to http://localhost:3000/operator-login.html
3. Login with:
   - Operator ID: `OP001`
   - Password: `operator123`
4. Access operator dashboard

### 10. Test API Endpoints

You can test the API directly using curl or Postman:

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Get All Buses (requires token):**
```bash
# First login to get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"collegeId":"STU001","password":"password123"}' \
  | jq -r '.token')

# Then get buses
curl http://localhost:3000/api/buses \
  -H "Authorization: Bearer $TOKEN"
```

**Send GPS Update (simulate ESP32):**
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

## Expected Behavior

### Live Tracking Features

✅ **Auto-refresh**: Map updates every 5 seconds
✅ **Smooth animations**: Buses move smoothly between positions
✅ **Real-time status**: Status indicators update automatically
✅ **Responsive design**: Works on desktop, tablet, and mobile
✅ **Search functionality**: Find buses by number
✅ **Bus details**: View speed, heading, route, status
✅ **Multiple buses**: Track all buses simultaneously
✅ **Live indicator**: Pulsing dot shows live tracking

### Performance Expectations

- Initial load: < 2 seconds
- Map render: < 1 second
- GPS update: < 500ms
- Search response: Instant
- Auto-refresh: Every 5 seconds

## Troubleshooting

### Issue: Buses Not Showing on Map

**Solution:**
1. Check if backend is running (Terminal 1)
2. Check browser console for errors (F12)
3. Verify database has bus data:
   ```bash
   npm run seed
   ```
4. Check if you're logged in

### Issue: Map Not Loading

**Solution:**
1. Check internet connection (map tiles from OpenStreetMap)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try incognito/private mode
4. Check browser console for errors

### Issue: Buses Not Moving

**Solution:**
1. Check if simulator is running (Terminal 2)
2. Verify simulator output shows updates
3. Check backend logs for GPS updates
4. Refresh the page

### Issue: "Failed to fetch buses"

**Solution:**
1. Verify backend is running on port 3000
2. Check MongoDB connection in backend logs
3. Verify token is valid (try logging in again)
4. Check CORS settings in backend

### Issue: Login Not Working

**Solution:**
1. Verify database is seeded
2. Check credentials (case-sensitive)
3. Check backend logs for errors
4. Clear browser localStorage:
   ```javascript
   // In browser console
   localStorage.clear()
   ```

## Mobile Testing

### On Your Phone

1. Find your computer's local IP:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. On your phone's browser, go to:
   ```
   http://YOUR_IP:3000
   ```
   Example: `http://192.168.1.100:3000`

3. Test all features on mobile:
   - Touch gestures on map
   - Swipe bus info card
   - Responsive layout
   - Search functionality

## Performance Testing

### Load Testing

Test with multiple buses:

1. Modify `simulate-buses.js` to add more buses
2. Add more bus routes in the simulator
3. Monitor performance in browser DevTools
4. Check memory usage

### Network Testing

Test with slow connection:

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Slow 3G" throttling
4. Test map loading and updates

## Production Testing Checklist

Before deploying to production:

- [ ] All features work locally
- [ ] Mobile responsive design tested
- [ ] API endpoints secured with authentication
- [ ] Environment variables configured
- [ ] Database connection stable
- [ ] Error handling works properly
- [ ] CORS configured correctly
- [ ] HTTPS enabled (for production)
- [ ] GPS coordinates accurate for your location
- [ ] Performance acceptable under load

## Next Steps

After successful testing:

1. ✅ Customize map center to your college location
2. ✅ Update route information
3. ✅ Configure ESP32 hardware
4. ✅ Deploy to Vercel (see DEPLOYMENT.md)
5. ✅ Test with real GPS data
6. ✅ Monitor production performance

## Support

If you encounter issues:

1. Check browser console (F12)
2. Check backend logs (Terminal 1)
3. Review error messages
4. Verify all prerequisites
5. Try restarting servers

## Success Criteria

Your system is working correctly if:

✅ Backend starts without errors
✅ Database connection successful
✅ User can login
✅ Map loads and displays
✅ Buses appear on map
✅ Buses update position (with simulator)
✅ Search works
✅ Bus details display correctly
✅ Mobile responsive
✅ No console errors

---

**Happy Testing!** 🚌🗺️✨

If everything works, you're ready to deploy to production!
