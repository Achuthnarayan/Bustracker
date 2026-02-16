// Configuration for Bus Tracking System
const CONFIG = {
  // API Configuration
  API_BASE_URL: 'http://localhost:3000/api',
  
  // Hardware Integration Settings
  HARDWARE: {
    ESP32_ENDPOINT: '/hardware/location',
    GPS_UPDATE_INTERVAL: 5000, // 5 seconds
    HEARTBEAT_TIMEOUT: 30000, // 30 seconds
    MAX_LOCATION_AGE: 60000 // 1 minute
  },
  
  // Map Configuration
  MAP: {
    DEFAULT_CENTER: { lat: 12.9716, lng: 77.5946 }, // Bangalore (change to your college location)
    DEFAULT_ZOOM: 13,
    UPDATE_INTERVAL: 10000 // 10 seconds
  },
  
  // Validation Rules
  VALIDATION: {
    COLLEGE_ID_PATTERN: /^[A-Z0-9]{6,10}$/,
    PHONE_PATTERN: /^[6-9]\d{9}$/,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD_MIN_LENGTH: 6,
    BUS_NUMBER_PATTERN: /^[A-Z0-9]{2,10}$/
  },
  
  // Session Configuration
  SESSION: {
    TOKEN_KEY: 'bus_tracker_token',
    USER_KEY: 'bus_tracker_user',
    EXPIRY_HOURS: 24
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
