#  College Bus Tracking System

A real-time GPS-based bus tracking system for colleges with ESP32 hardware integration, built with Node.js, Express, and vanilla JavaScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

##  Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Hardware Integration](#hardware-integration)
- [Contributing](#contributing)
- [License](#license)

##  Features

### User Features
-  **Secure Authentication** - JWT-based login and registration system
-  **Real-time Bus Tracking** - Live GPS location updates every 10 seconds
-  **Interactive Maps** - Visual bus location display with Google Maps
-  **Ticket Management** - Purchase and manage monthly bus passes
-  **Route Information** - View all available bus routes and stops
-  **Responsive Design** - Works seamlessly on desktop and mobile devices

### Admin Features
-  **System Dashboard** - Monitor active buses and registered users
-  **Health Monitoring** - Real-time system status and diagnostics
-  **GPS Data Management** - Receive and process ESP32 GPS updates

### Technical Features
-  **Auto-updating GPS** - Simulated bus movement every 5 seconds
-  **RESTful API** - Clean and well-documented API endpoints
-  **CORS Enabled** - Cross-origin resource sharing support
-  **In-memory Database** - Fast data access (easily replaceable with MongoDB/PostgreSQL)
-  **Input Validation** - Client and server-side validation
-  **Secure Sessions** - Token-based authentication with expiry

##  Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: JSON Web Tokens (JWT)
- **Middleware**: CORS, Body-parser

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with flexbox/grid
- **JavaScript (ES6+)** - Vanilla JS, no frameworks
- **Maps**: Google Maps Embed API

### Hardware
- **Microcontroller**: ESP32
- **GPS Module**: NEO-6M or compatible
- **Communication**: HTTP POST requests to backend

##  Project Structure

```
bustracker/
 backend/
    server.js              # Main Express server
    package.json           # Backend dependencies
    .env.example           # Environment variables template
 tracking/
    index.html             # Login page
    signup.html            # Registration page
    dashboard.html         # User dashboard
    track.html             # Bus tracking page
    routes.html            # Routes information
    tickets.html           # Ticket management
    payment.html           # Payment processing
    style.css              # Global styles
    config.js              # Frontend configuration
    js/
        api.js             # API communication layer
        session.js         # Session management
        ui.js              # UI utilities
        validation.js      # Input validation
 hardware/
    esp32_gps_tracker.ino  # ESP32 Arduino code
    README.md              # Hardware setup guide
 README.md                  # This file
```

##  Installation

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (v6 or higher) - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **Modern web browser** - Chrome, Firefox, Edge, or Safari

To verify your installations, run:

```bash
node --version
npm --version
git --version
```

### Step-by-Step Installation

#### 1. Clone the Repository

Open your terminal/command prompt and run:

```bash
# Clone the repository
git clone https://github.com/Achuthnarayan/Bustracker.git

# Navigate into the project directory
cd Bustracker
```

#### 2. Install Backend Dependencies

```bash
# Navigate to the backend folder
cd backend

# Install all required npm packages
npm install

# This will install:
# - express (web framework)
# - cors (cross-origin resource sharing)
# - body-parser (request body parsing)
# - jsonwebtoken (JWT authentication)
# - bcrypt (password hashing)
# - dotenv (environment variables)
```

#### 3. Configure Environment Variables (Optional)

Create a `.env` file in the `backend` directory:

```bash
# Create .env file from example
cp .env.example .env

# Edit the .env file with your settings
# PORT=3000
# JWT_SECRET=your-secret-key-here
```

Or use the default settings (works out of the box).

#### 4. Start the Server

```bash
# Make sure you're in the backend directory
cd backend

# Start the server
npm start

# You should see:
#  Bus Tracking Server running on port 3000
#  ESP32 endpoint: http://localhost:3000/api/hardware/location
#  Frontend: http://localhost:3000
```

#### 5. Access the Application

Open your web browser and navigate to:

```
http://localhost:3000
```

You should see the login page!

### Alternative: Using npm run dev (Development Mode)

For development with auto-restart on file changes:

```bash
# Install nodemon globally (optional)
npm install -g nodemon

# Run in development mode
npm run dev
```

### Troubleshooting Installation

#### Port Already in Use

If port 3000 is already in use:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

Or change the port in `.env`:

```env
PORT=3001
```

#### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Module not found errors

```bash
# Ensure you're in the backend directory
cd backend

# Reinstall dependencies
npm install
```

##  Usage

### Quick Start

1. **Access the Application**
   - Open your browser
   - Navigate to: `http://localhost:3000`

2. **Login with Test Credentials**
   ```
   College ID: STU001
   Password: password123
   ```

3. **Track a Bus**
   - Click "Track Your Bus"
   - Enter bus number: `BUS01`
   - Click "Track Now"
   - Watch real-time updates every 10 seconds!

### Available Test Accounts

| College ID | Password | Name |
|------------|----------|------|
| STU001 | password123 | John Doe |
| STU002 | password123 | Jane Smith |
| STU003 | password123 | Mike Johnson |

### Available Buses

| Bus Number | Route | Status |
|------------|-------|--------|
| BUS01 | Route A - Main Campus | Active |
| BUS02 | Route B - North Campus | Active |
| BUS03 | Route C - South Campus | Active |
| BUS04 | Route A - Main Campus | Stopped |
| BUS05 | Route B - North Campus | Active |

##  API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  \"name\": \"John Doe\",
  \"collegeId\": \"STU001\",
  \"phone\": \"9876543210\",
  \"email\": \"john@college.edu\",
  \"password\": \"password123\"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  \"collegeId\": \"STU001\",
  \"password\": \"password123\"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

### Bus Tracking Endpoints

#### Get All Buses
```http
GET /buses
Authorization: Bearer <token>
```

#### Get Bus Location
```http
GET /buses/:busNumber/location
Authorization: Bearer <token>
```

#### Search Buses
```http
GET /buses/search?q=BUS01
Authorization: Bearer <token>
```

### Hardware Integration Endpoints

#### Update Bus Location (ESP32)
```http
POST /hardware/location
Content-Type: application/json

{
  \"busId\": \"BUS01\",
  \"latitude\": 12.9716,
  \"longitude\": 77.5946,
  \"speed\": 35,
  \"heading\": 90,
  \"timestamp\": \"2024-01-01T12:00:00Z\"
}
```

#### Get Bus Hardware Status
```http
GET /hardware/status/:busId
Authorization: Bearer <token>
```

### Route Endpoints

#### Get All Routes
```http
GET /routes
Authorization: Bearer <token>
```

### Ticket Endpoints

#### Purchase Ticket
```http
POST /tickets/purchase
Authorization: Bearer <token>
Content-Type: application/json

{
  \"ticketType\": \"Monthly Pass\",
  \"route\": \"Route A - Main Campus\",
  \"amount\": 1200,
  \"paymentMethod\": \"UPI\"
}
```

#### Get My Tickets
```http
GET /tickets/my
Authorization: Bearer <token>
```

### System Endpoints

#### Health Check
```http
GET /health
```

Response:
```json
{
  \"status\": \"OK\",
  \"timestamp\": \"2024-01-01T12:00:00Z\",
  \"activeBuses\": 5,
  \"registeredUsers\": 3
}
```

##  Hardware Integration

### ESP32 Setup

1. **Components Required**
   - ESP32 Development Board
   - NEO-6M GPS Module
   - Jumper wires
   - Power supply (5V)

2. **Wiring Diagram**
   ```
   GPS Module    ESP32
   VCC       ->  5V
   GND       ->  GND
   TX        ->  GPIO16 (RX2)
   RX        ->  GPIO17 (TX2)
   ```

3. **Upload Code**
   - Open `hardware/esp32_gps_tracker.ino` in Arduino IDE
   - Update WiFi credentials and server URL
   - Upload to ESP32

4. **Configuration**
   ```cpp
   const char* ssid = \"YOUR_WIFI_SSID\";
   const char* password = \"YOUR_WIFI_PASSWORD\";
   const char* serverUrl = \"http://YOUR_SERVER_IP:3000/api/hardware/location\";
   const char* busId = \"BUS01\";
   ```

For detailed hardware setup instructions, see [hardware/README.md](hardware/README.md)

##  Configuration

### Backend Configuration

Create a `.env` file in the `backend` directory:

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development
```

### Frontend Configuration

Edit `tracking/config.js`:

```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api',
  MAP: {
    DEFAULT_CENTER: { lat: 12.9716, lng: 77.5946 },
    DEFAULT_ZOOM: 13,
    UPDATE_INTERVAL: 10000
  }
};
```

##  Testing

### API Testing with cURL

```bash
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H \"Content-Type: application/json\" \
  -d '{\"collegeId\":\"STU001\",\"password\":\"password123\"}'

# Get buses (replace TOKEN with actual token)
curl http://localhost:3000/api/buses \
  -H \"Authorization: Bearer TOKEN\"
```

##  Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Authors

- **Achuthnarayan** - [GitHub Profile](https://github.com/Achuthnarayan)

##  Acknowledgments

- ESP32 community for hardware support
- Express.js team for the excellent framework
- All contributors and testers

##  Support

For support, open an issue in the GitHub repository.

##  Future Enhancements

- [ ] Real-time notifications for bus arrival
- [ ] Mobile app (React Native)
- [ ] Admin panel for bus management
- [ ] Historical route data and analytics
- [ ] Integration with payment gateways
- [ ] Multi-language support
- [ ] Push notifications
- [ ] QR code ticket generation

---

**Made with  for college students**

**Star  this repository if you find it helpful!**
