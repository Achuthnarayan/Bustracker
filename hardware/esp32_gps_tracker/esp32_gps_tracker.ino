/**
 * SSET BusTracker ESP32 Firmware - Direct WiFi (no WiFiManager)
 * CHANGE ONLY: WIFI_SSID and WIFI_PASS below
 * Libraries: TinyGPSPlus, ArduinoJson
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

const char* BUS_ID    = "KL07-BUS01";
const char* WIFI_SSID = "POCO X3 Pro";
const char* WIFI_PASS = "12345543";
const char* SERVER_URL = "https://bustracker-two.vercel.app/api/hardware/location";

const int LED_PIN      = 2;
const int GPS_RX_PIN   = 16;
const int GPS_TX_PIN   = 17;
const int GPS_BAUD     = 9600;
const int GPS_INTERVAL = 5000;

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
unsigned long lastSendTime = 0;

void blinkLED(int times, int ms = 200) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH); delay(ms);
    digitalWrite(LED_PIN, LOW);  delay(ms);
  }
}

void connectWiFi() {
  Serial.print("Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.disconnect(true);
  delay(500);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());
    blinkLED(3, 100);
  } else {
    Serial.println("\nWiFi FAILED - check SSID/password in code");
    blinkLED(5, 500);
  }
}

void sendLocation(double lat, double lng, double speed, double heading) {
  if (WiFi.status() != WL_CONNECTED) { connectWiFi(); return; }
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);
  StaticJsonDocument<256> doc;
  doc["busId"]    = BUS_ID;
  doc["latitude"] = lat;
  doc["longitude"]= lng;
  doc["speed"]    = speed;
  doc["heading"]  = heading;
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
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS ready");
  connectWiFi();
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
      Serial.printf("[GPS] No fix yet - sats=%d chars=%d\n", gps.satellites.value(), gps.charsProcessed());
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
  }
}