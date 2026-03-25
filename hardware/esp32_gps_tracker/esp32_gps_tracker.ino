/**
 * SSET BusTracker ESP32 Firmware
 * ─────────────────────────────────────────────────────────────
 * WiFi setup WITHOUT touching code:
 *
 * FIRST BOOT (or after reset):
 *   1. ESP32 creates hotspot "BusTracker-BUS01"
 *   2. Driver connects phone to that hotspot
 *   3. Browser opens 192.168.4.1 automatically
 *   4. Click "Configure WiFi" -> networks list appears -> pick yours -> enter password -> Save
 *   5. ESP32 saves to flash and starts tracking
 *
 * TO RESET WiFi (new driver / new phone hotspot):
 *   Hold BOOT button for 3 seconds on power-on
 *
 * Libraries needed (Arduino Library Manager):
 *   - TinyGPSPlus  by Mikal Hart
 *   - ArduinoJson  by Benoit Blanchon
 *   - WiFiManager  by tzapu
 *
 * Board: ESP32 Dev Module
 */

#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ── ONLY CHANGE THIS PER BUS ──────────────────────────────────
const char* BUS_ID  = "KL07-BUS01";
const char* AP_NAME = "BusTracker-BUS01";
// ─────────────────────────────────────────────────────────────

const char* SERVER_URL   = "https://bustracker-two.vercel.app/api/hardware/location";
const int   LED_PIN      = 2;
const int   RESET_BTN    = 0;
const int   GPS_RX_PIN   = 16;
const int   GPS_TX_PIN   = 17;
const int   GPS_BAUD     = 9600;
const int   GPS_INTERVAL = 5000;

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
unsigned long lastSendTime = 0;

void blinkLED(int times, int ms = 200) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH); delay(ms);
    digitalWrite(LED_PIN, LOW);  delay(ms);
  }
}

void checkReset() {
  pinMode(RESET_BTN, INPUT_PULLUP);
  delay(100);
  if (digitalRead(RESET_BTN) == LOW) {
    Serial.println("BOOT held - clearing WiFi credentials...");
    blinkLED(10, 80);
    WiFiManager wm;
    wm.resetSettings();
    Serial.println("Cleared. Rebooting...");
    delay(500);
    ESP.restart();
  }
}

void setupWiFi() {
  WiFiManager wm;

  // Force network scan so the list shows in portal
  wm.setScanNetworks(true);
  wm.setTitle("BusTracker WiFi Setup");
  wm.setConfigPortalTimeout(300); // 5 min timeout
  wm.setDebugOutput(true);

  wm.setAPCallback([](WiFiManager* wm) {
    Serial.println("\n=== WiFi Setup Portal Open ===");
    Serial.println("1. Connect phone to hotspot: " + String(AP_NAME));
    Serial.println("2. Open browser -> 192.168.4.1");
    Serial.println("3. Click Configure WiFi -> pick network -> enter password -> Save");
  });

  wm.setSaveConfigCallback([]() {
    Serial.println("WiFi credentials saved!");
  });

  bool ok = wm.autoConnect(AP_NAME);

  if (ok) {
    Serial.println("WiFi connected: " + WiFi.SSID());
    Serial.println("IP: " + WiFi.localIP().toString());
    blinkLED(3, 100);
  } else {
    Serial.println("Portal timed out - rebooting");
    blinkLED(5, 500);
    ESP.restart();
  }
}

void sendLocation(double lat, double lng, double speed, double heading) {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(3000);
    if (WiFi.status() != WL_CONNECTED) return;
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
    Serial.printf("[OK] lat=%.6f lng=%.6f spd=%.1f\n", lat, lng, speed);
    blinkLED(1, 80);
  } else {
    Serial.printf("[ERR] HTTP %d\n", code);
    blinkLED(2, 300);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("\n=== SSET BusTracker ===");
  Serial.print("Bus: "); Serial.println(BUS_ID);
  checkReset();
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS ready");
  setupWiFi();
  blinkLED(5, 80);
  Serial.println("Tracking started. Waiting for GPS fix...");
}

void loop() {
  while (gpsSerial.available() > 0) { gps.encode(gpsSerial.read()); }
  unsigned long now = millis();
  if (now - lastSendTime >= GPS_INTERVAL) {
    lastSendTime = now;
    if (gps.location.isValid()) {
      sendLocation(gps.location.lat(), gps.location.lng(), gps.speed.kmph(), gps.course.deg());
    } else {
      Serial.printf("[GPS] No fix - sats=%d chars=%d\n", gps.satellites.value(), gps.charsProcessed());
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
  }
}