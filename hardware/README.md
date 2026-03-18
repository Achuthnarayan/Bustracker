# ESP32 GPS Tracker — Hardware Guide

## Components

| Part | Model | Where to buy |
|------|-------|-------------|
| Microcontroller | ESP32 Dev Module (38-pin) | Robu.in, Amazon |
| GPS Module | NEO-6M or NEO-8M | Robu.in, Amazon |
| Power from bus | DC Buck Converter (12V→5V 3A) | Amazon |
| Backup power | 18650 Li-ion + TP4056 charger | Amazon |
| Enclosure | ABS project box (100x60mm) | Amazon |

## Wiring

```
Bus 12V
  └── Buck Converter (12V → 5V)
        └── ESP32 VIN (5V pin)
              ├── 3.3V → GPS VCC
              ├── GND  → GPS GND
              ├── GPIO16 (RX2) ← GPS TX
              └── GPIO17 (TX2) → GPS RX
```

## Arduino IDE Setup

1. Install ESP32 board support:
   - File → Preferences → Additional Board URLs:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools → Board Manager → search "esp32" → install

2. Install libraries (Tools → Manage Libraries):
   - `TinyGPS++` by Mikal Hart
   - `ArduinoJson` by Benoit Blanchon

3. Board settings:
   - Board: "ESP32 Dev Module"
   - Upload Speed: 115200
   - Port: whichever COM port appears when ESP32 is plugged in

## Configuration (edit top of .ino file)

```cpp
const char* BUS_ID    = "KL07-BUS01";  // Change per bus
const char* WIFI_SSID = "BusWiFi";     // Hotspot or school WiFi
const char* WIFI_PASS = "password";
const char* SERVER_URL = "https://bustracker-two.vercel.app/api/hardware/location";
```

## LED Status Codes

| Pattern | Meaning |
|---------|---------|
| 3 fast blinks | WiFi connected |
| 1 slow blink | WiFi failed |
| 1 quick blink | GPS sent successfully |
| 2 blinks | HTTP error |
| Slow toggle | Waiting for GPS fix |

## GPS Fix Time

- First fix (cold start): 1–3 minutes outdoors
- Subsequent fixes: 10–30 seconds
- Place the GPS module near a window or on the dashboard

## Power

The ESP32 draws ~240mA during WiFi transmission.
The buck converter handles the bus's 12V battery.
The 18650 backup keeps it running if the bus engine is off.

## Physical Installation

1. Mount the enclosure on the dashboard (near windshield for GPS signal)
2. Run a thin wire to the fuse box for 12V power
3. The GPS antenna must face upward / toward the sky
4. Seal the enclosure with silicone to protect from dust/vibration
