/**
 * SSET BusTracker — ESP32 GPS Tracker Firmware
 * -----------------------------------------------
 * WiFi setup: Driver uses their phone to configure WiFi credentials
 * via a captive portal — no coding or laptop required.
 *
 * First boot flow:
 *   1. ESP32 creates WiFi hotspot "BusTracker-BUS01"
 *   2. Driver connects phone to that hotspot
 *   3. Config page opens automatically (captive portal)
 *   4. Driver picks their hotspot + enters password → Save
 *   5. ESP32 saves credentials and starts tracking
 *   6. On every future boot, connects automatically
 *
 * To reset WiFi (e.g. driver changes phone):
 *   Hold BOOT button on ESP32 for 3 seconds while powering on
 *
 * Libraries needed (Arduino Library Manager):
 *   - TinyGPS++     by Mikal Hart
 *   - ArduinoJson   by Benoit Blanchon
 *   - WiFiManager   by tzapu  ← new
 *
 * Board: ESP32 Dev Module
 */

#include <WiFi.h>
#include <WiFiManager.h>       // handles WiFi credential storage
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <Preferences.h>       // ESP32 non-volatile storage (like EEPROM)

// ── PER-BUS CONFIG — only this changes between buses ─────────────────────────
const char* BUS_ID     = "KL07-BUS01";   // Change for each bus
const char* AP_NAME    = "BusTracker-BUS01"; // WiFi name driver sees on first boot

// Server — your live Vercel deployment
const char* SERVER_URL = "https://bustracker-two.vercel.app/api/hardware/location";

const int GPS_INTERVAL_MS = 5000;  // Send every 5 seconds
const int LED_PIN         = 2;     // Onboard LED
const int RESET_BUTTON    = 0;     // BOOT button — hold to reset WiFi credentials

// ── GPS setup ─────────────────────────────────────────────────────────────────
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define GPS_BAUD   9600

// ── State ─────────────────────────────────────────────────────────────────────
unsigned long lastSendTime = 0;
Preferences prefs;

// ── LED helpers ───────────────────────────────────────────────────────────────
void blinkLED(int times, int ms = 200) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH); delay(ms);
    digitalWrite(LED_PIN, LOW);  delay(ms);
  }
}

// ── WiFiManager callback — called while config portal is open ─────────────────
// LED blinks slowly so driver knows to check their phone
void configModeCallback(WiFiManager* wm) {
  Serial.println("Config portal open — connect to: " + String(AP_NAME));
  Serial.println("Then open 192.168.4.1 in your browser");
}

// ── Connect WiFi via WiFiManager ──────────────────────────────────────────────
void setupWiFi() {
  WiFiManager wm;

  // Custom title shown on the config page
  wm.setTitle("BusTracker WiFi Setup");

  // Timeout: if no one configures within 3 minutes, reboot and try again
  wm.setConfigPortalTimeout(180);

  // Callback while portal is open
  wm.setAPCallback(configModeCallback);

  // Try to connect with saved credentials.
  // If no saved credentials (or they fail), open the config portal.
  bool connected = wm.autoConnect(AP_NAME);

  if (connected) {
    Serial.println("WiFi connected: " + WiFi.SSID());
    Serial.println("IP: " + WiFi.localIP().toString());
    blinkLED(3, 100); // 3 fast blinks = connected
  } else {
    Serial.println("WiFi setup timed out — rebooting");
    blinkLED(5, 500);
    ESP.restart();
  }
}

// ── Check if BOOT button held on startup → reset saved WiFi ──────────────────
void checkResetButton() {
  pinMode(RESET_BUTTON, INPUT_PULLUP);
  delay(100);

  if (digitalRead(RESET_BUTTON) == LOW) {
    Serial.println("BOOT button held — clearing saved WiFi credentials");
    blinkLED(10, 100);

    WiFiManager wm;
    wm.resetSettings(); // wipes saved SSID + password from flash

    Serial.println("Credentials cleared — rebooting");
    delay(1000);
    ESP.restart();
  }
}

// ── Send GPS to server ────────────────────────────────────────────────────────
bool sendLocation(double lat, double lng, double speed, double heading) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost — reconnecting...");
    WiFi.reconnect();
    delay(3000);
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  StaticJsonDocument<256> doc;
  doc["busId"]     = BUS_ID;
  doc["latitude"]  = lat;
  doc["longitude"] = lng;
  doc["speed"]     = speed;
  doc["heading"]   = heading;

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  http.end();

  if (code == 200 || code == 201) {
    Serial.printf("[OK] Sent lat=%.6f lng=%.6f speed=%.1f\n", lat, lng, speed);
    blinkLED(1, 80);
    return true;
  } else {
    Serial.printf("[ERR] HTTP %d\n", code);
    blinkLED(2, 300);
    return false;
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  Serial.println("\n=== SSET BusTracker ===");
  Serial.print("Bus: "); Serial.println(BUS_ID);

  // Check if driver is holding BOOT to reset WiFi
  checkResetButton();

  // Start GPS
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS ready");

  // Connect WiFi (shows config portal if no credentials saved)
  setupWiFi();

  blinkLED(5, 80);
  Serial.println("Tracking started. Waiting for GPS fix...");
}

// ── Main loop ─────────────────────────────────────────────────────────────────
void loop() {
  // Feed GPS parser
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  unsigned long now = millis();
  if (now - lastSendTime >= GPS_INTERVAL_MS) {
    lastSendTime = now;

    if (gps.location.isValid()) {
      sendLocation(
        gps.location.lat(),
        gps.location.lng(),
        gps.speed.kmph(),
        gps.course.deg()
      );
    } else {
      Serial.printf("[GPS] Waiting for fix... sats=%d chars=%d\n",
        gps.satellites.value(), gps.charsProcessed());
      // Slow blink while waiting for GPS fix
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
  }
}
