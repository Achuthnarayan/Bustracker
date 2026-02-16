# 🚌 Bus Tracking System - Quick Start

## ✅ System is Running!

Your bus tracking application is now live and ready to use!

### 🌐 Access the Application

Open your browser and visit: **http://localhost:3000**

The login page will load automatically!

---

## 🔐 Test Login Credentials

Use any of these pre-configured accounts:

```
College ID: STU001
Password: password123
```

```
College ID: STU002
Password: password123
```

```
College ID: STU003
Password: password123
```

---

## 🚍 Available Buses for Tracking

Try tracking these buses (they have simulated GPS data):

- **BUS01** - Route A - Main Campus
- **BUS02** - Route B - North Campus  
- **BUS03** - Route C - South Campus
- **BUS04** - Route A - Main Campus
- **BUS05** - Route B - North Campus

---

## 📱 How to Use

1. **Login** at http://localhost:3000
2. Click **"Track Your Bus"**
3. Enter a bus number (e.g., **BUS01**)
4. Click **"Track Now"**
5. Watch the live GPS location update every 10 seconds!

---

## 🎯 Features

✅ User authentication (login/signup)  
✅ Real-time bus tracking with GPS coordinates  
✅ Auto-updating location every 10 seconds  
✅ View all available routes  
✅ Purchase monthly bus passes  
✅ View your tickets  
✅ System health monitoring  

---

## 🔧 Technical Details

- **Backend**: Node.js + Express (Port 3000)
- **Frontend**: Vanilla JavaScript + HTML/CSS
- **Database**: In-memory (hardcoded data)
- **GPS Simulation**: Buses move automatically every 5 seconds
- **API**: RESTful endpoints at `/api/*`

---

## 🛑 To Stop the Server

The server is running in the background. To stop it, use the Kiro process manager or run:

```bash
# Find the process
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

---

## 📝 Notes

- All data is stored in memory and will reset when the server restarts
- GPS coordinates are simulated (no actual ESP32 hardware connected)
- The system includes 3 pre-registered users and 5 buses with live tracking
- Bus locations update automatically to simulate real movement

---

## 🎉 Enjoy Your Bus Tracking System!

The application is fully integrated and ready for testing. All features work with the hardcoded database.
