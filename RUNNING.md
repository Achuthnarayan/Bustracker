# Bus Tracking System - Running Guide

## Server Status
✅ Backend server is running on http://localhost:3000

## How to Access the Application

1. Open your browser and go to: **http://localhost:3000**

## Test Credentials

The system comes with 3 pre-configured users:

| College ID | Password | Name |
|------------|----------|------|
| STU001 | password123 | John Doe |
| STU002 | password123 | Jane Smith |
| STU003 | password123 | Mike Johnson |

## Available Buses (Hardcoded GPS Data)

The system has 5 buses with simulated GPS tracking:

- **BUS01** - Route A - Main Campus (Active)
- **BUS02** - Route B - North Campus (Active)
- **BUS03** - Route C - South Campus (Active)
- **BUS04** - Route A - Main Campus (Stopped)
- **BUS05** - Route B - North Campus (Active)

## Features Available

1. **Login/Signup**: Use test credentials or create a new account
2. **Dashboard**: View system status and navigate to features
3. **Track Bus**: Enter bus number (e.g., BUS01) to see real-time location
4. **View Routes**: See available bus routes
5. **Buy Tickets**: Purchase monthly passes
6. **View Tickets**: See your purchased tickets

## How to Test

1. Login with **STU001** / **password123**
2. Click "Track Your Bus"
3. Enter **BUS01** and click "Track Now"
4. Watch the bus location update every 10 seconds (simulated GPS movement)

## API Endpoints

All endpoints are available at http://localhost:3000/api/

- POST `/auth/login` - User login
- POST `/auth/register` - User registration
- GET `/buses` - Get all buses
- GET `/buses/:busNumber/location` - Get specific bus location
- GET `/routes` - Get all routes
- POST `/tickets/purchase` - Purchase ticket
- GET `/tickets/my` - Get user tickets
- GET `/health` - System health check

## Notes

- GPS data is simulated and updates every 5 seconds
- Buses move slightly to simulate real movement
- No actual hardware (ESP32) is connected
- Database is in-memory (data resets on server restart)
