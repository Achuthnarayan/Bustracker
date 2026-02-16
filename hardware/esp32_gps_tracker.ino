/*
 * ESP32 GPS Bus Tracker
 * 
 * Hardware Required:
 * - ESP32 Development Board
 * - GPS Module (NEO-6M or similar)
 * - Connections:
 *   GPS TX -> ESP32 RX (GPIO 16)
 *   GPS RX -> ESP32 TX (GPIO 17)
 *   GPS VCC -> 3.3V or 5V
 *   GPS GND -> GND
 * 
 * Libraries Required:
 * - TinyGPS++ (Install from Arduino Library Manager)
 * - WiFi (Built-in)
 * - HTTPClient (Built-in)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ============ Configuration ============

// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server Configuration
const char* SERVER_URL = "http://YOUR_SERVER_IP:3000/api/hardware/location";

// Bus Identification
const char* BUS_ID = "BUS01";  // Change for each bus

// GPS Configuration
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define GPS_BAUD 9600

// Update Interval (milliseconds)
const unsigned long UPDATE_INTERVAL = 5000;  // 5 seconds

// ============ Global Objects ============

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);  // Use UART2
WiFiClient wifiClient;
HTTPClient http;

unsigned long lastUpdate = 0;
bool wifiConnected = false;

// ============ Setup ============

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=================================");
  Serial.println("ESP32 GPS Bus Tracker");
  Serial.println("=================================\n");
  
  // Initialize GPS
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS Module initialized");
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("\nSystem Ready!");
  Serial.println("Waiting for GPS fix...\n");
}

// ============ Main Loop ============

void loop() {
  // Read GPS data
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
  } else {
    wifiConnected = true;
  }
  
  // Send location update at specified interval
  if (millis() - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = millis();
    
    if (gps.location.isValid()) {
      sendLocationUpdate();
    } else {
      Serial.println("Waiting for GPS fix... Satellites: " + String(gps.satellites.value()));
    }
  }
  
  // Display GPS info every 10 seconds
  static unsigned long lastDisplay = 0;
  if (millis() - lastDisplay >= 10000) {
    lastDisplay = millis();
    displayGPSInfo();
  }
}

// ============ WiFi Functions ============

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    wifiConnected = true;
  } else {
    Serial.println("\nWiFi Connection Failed!");
    wifiConnected = false;
  }
}

// ============ GPS Functions ============

void sendLocationUpdate() {
  if (!wifiConnected) {
    Serial.println("Cannot send update: WiFi not connected");
    return;
  }
  
  if (!gps.location.isValid()) {
    Serial.println("Cannot send update: GPS location invalid");
    return;
  }
  
  // Prepare JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"busId\":\"" + String(BUS_ID) + "\",";
  jsonPayload += "\"latitude\":" + String(gps.location.lat(), 6) + ",";
  jsonPayload += "\"longitude\":" + String(gps.location.lng(), 6) + ",";
  jsonPayload += "\"speed\":" + String(gps.speed.kmph(), 2) + ",";
  jsonPayload += "\"heading\":" + String(gps.course.deg(), 2) + ",";
  jsonPayload += "\"satellites\":" + String(gps.satellites.value()) + ",";
  jsonPayload += "\"timestamp\":\"" + getTimestamp() + "\"";
  jsonPayload += "}";
  
  // Send HTTP POST request
  http.begin(wifiClient, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✓ Location sent successfully");
    Serial.println("  Response: " + response);
  } else {
    Serial.println("✗ Error sending location");
    Serial.println("  Error code: " + String(httpResponseCode));
  }
  
  http.end();
  
  // Display sent data
  Serial.println("\n--- Location Update ---");
  Serial.println("Bus ID: " + String(BUS_ID));
  Serial.println("Lat: " + String(gps.location.lat(), 6));
  Serial.println("Lng: " + String(gps.location.lng(), 6));
  Serial.println("Speed: " + String(gps.speed.kmph(), 2) + " km/h");
  Serial.println("Satellites: " + String(gps.satellites.value()));
  Serial.println("----------------------\n");
}

void displayGPSInfo() {
  Serial.println("\n=== GPS Status ===");
  
  if (gps.location.isValid()) {
    Serial.println("Location: VALID");
    Serial.println("Latitude: " + String(gps.location.lat(), 6));
    Serial.println("Longitude: " + String(gps.location.lng(), 6));
  } else {
    Serial.println("Location: INVALID");
  }
  
  Serial.println("Satellites: " + String(gps.satellites.value()));
  Serial.println("HDOP: " + String(gps.hdop.value()));
  
  if (gps.date.isValid() && gps.time.isValid()) {
    Serial.print("Date/Time: ");
    Serial.print(gps.date.year());
    Serial.print("-");
    Serial.print(gps.date.month());
    Serial.print("-");
    Serial.print(gps.date.day());
    Serial.print(" ");
    Serial.print(gps.time.hour());
    Serial.print(":");
    Serial.print(gps.time.minute());
    Serial.print(":");
    Serial.println(gps.time.second());
  }
  
  Serial.println("WiFi: " + String(wifiConnected ? "Connected" : "Disconnected"));
  Serial.println("==================\n");
}

String getTimestamp() {
  // In production, use NTP time or GPS time
  // For now, return a simple timestamp
  return String(millis());
}

// ============ Utility Functions ============

void blinkLED(int times) {
  // Optional: Add LED blinking for status indication
  // pinMode(LED_BUILTIN, OUTPUT);
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(100);
    digitalWrite(LED_BUILTIN, LOW);
    delay(100);
  }
}
