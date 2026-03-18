/**
 * SSET BusTracker — ESP32 GPS Tracker Firmware
 * -----------------------------------------------
 * Hardware:
 *   - ESP32 (any 38-pin variant)
 *   - NEO-6M / NEO-8M GPS module  (UART2: GPIO16=RX, GPIO17=TX)
 *   - SIM800L GSM module (optional, UART1: GPIO4=RX, GPIO2=TX)
 *
 * Behavior:
 *   1. Reads GPS coordinates every 5 seconds
 *   2. Sends POST /api/bus/update-location to the server
 *   3. Uses WiFi if available, falls back to SIM800L GPRS
 *   4. Onboard LED blinks to show status
 *
 * Libraries needed (install via Arduino Library Manager):
 *   - TinyGPS++  by Mikal Hart
 *   - ArduinoJson by Benoit Blanchon
 *   - HTTPClient (built-in with ESP32 board package)
 *
 * Board: "ESP32 Dev Module" in Arduino IDE
 * Upload speed: 115200
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ── CONFIG — change these for each bus ───────────────────────────────────────
const char* BUS_ID       = "KL07-BUS01";   // Must match seed data
const char* WIFI_SSID    = "YOUR_WIFI_SSID";
const char* WIFI_PASS    = "YOUR_WIFI_PASSWORD";

// Server URL — use your Vercel URL in production, localhost for testing
const char* SERVER_URL   = "https://bustracker-two.vercel.app/api/hardware/location";
// For local IoT server (Socket.IO real-time):
// const char* SERVER_URL = "http://192.168.1.100:3001/api/bus/update-location";

const int   GPS_INTERVAL_MS = 5000;   // Send every 5 seconds
const int   LED_PIN         = 2;      // Onboard LED

// ── GPS setup ─────────────────────────────────────────────────────────────────
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);   // UART2
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define GPS_BAUD   9600

// ── State ─────────────────────────────────────────────────────────────────────
unsigned long lastSendTime = 0;
bool wifiConnected = false;

// ── LED blink patterns ────────────────────────────────────────────────────────
void blinkLED(int times, int delayMs = 200) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH); delay(delayMs);
    digitalWrite(LED_PIN, LOW);  delay(delayMs);
  }
}

// ── WiFi connect ──────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());
    blinkLED(3, 100); // 3 fast blinks = WiFi OK
  } else {
    wifiConnected = false;
    Serial.println("\nWiFi failed — will retry");
    blinkLED(1, 500); // 1 slow blink = WiFi failed
  }
}

// ── Send GPS data to server ───────────────────────────────────────────────────
bool sendLocation(double lat, double lng, double speed, double heading) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (!wifiConnected) return false;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000); // 8 second timeout

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["busId"]     = BUS_ID;
  doc["latitude"]  = lat;
  doc["longitude"] = lng;
  doc["speed"]     = speed;
  doc["heading"]   = heading;

  String payload;
  serializeJson(doc, payload);

  Serial.print("Sending: ");
  Serial.println(payload);

  int httpCode = http.POST(payload);
  http.end();

  if (httpCode == 200 || httpCode == 201) {
    Serial.println("OK (" + String(httpCode) + ")");
    blinkLED(1, 100); // 1 quick blink = success
    return true;
  } else {
    Serial.println("HTTP Error: " + String(httpCode));
    blinkLED(2, 300); // 2 blinks = HTTP error
    return false;
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  Serial.println("=== SSET BusTracker ESP32 ===");
  Serial.print("Bus ID: "); Serial.println(BUS_ID);

  // Start GPS serial
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS serial started on UART2");

  // Connect WiFi
  connectWiFi();

  // Startup blink
  blinkLED(5, 100);
  Serial.println("Ready. Waiting for GPS fix...");
}

// ── Main loop ─────────────────────────────────────────────────────────────────
void loop() {
  // Feed GPS data into TinyGPS++ parser
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  unsigned long now = millis();
  if (now - lastSendTime >= GPS_INTERVAL_MS) {
    lastSendTime = now;

    if (gps.location.isValid() && gps.location.isUpdated()) {
      double lat     = gps.location.lat();
      double lng     = gps.location.lng();
      double speed   = gps.speed.kmph();
      double heading = gps.course.deg();
      int    sats    = gps.satellites.value();

      Serial.printf("[GPS] lat=%.6f lng=%.6f speed=%.1fkm/h heading=%.1f sats=%d\n",
                    lat, lng, speed, heading, sats);

      sendLocation(lat, lng, speed, heading);

    } else {
      // No GPS fix yet
      int age = gps.location.age();
      Serial.printf("[GPS] No fix yet (age=%dms, chars=%d, sats=%d)\n",
                    age, gps.charsProcessed(), gps.satellites.value());

      // Blink LED slowly while waiting for fix
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));

      // Reconnect WiFi if dropped
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi dropped — reconnecting...");
        connectWiFi();
      }
    }
  }
}
