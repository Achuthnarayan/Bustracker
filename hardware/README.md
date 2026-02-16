# ESP32 GPS Bus Tracker - Hardware Setup Guide

## Hardware Components Required

### 1. ESP32 Development Board
- ESP32-WROOM-32 or similar
- USB cable for programming
- Cost: ~$5-10

### 2. GPS Module
- **Recommended**: NEO-6M GPS Module
- Alternative: NEO-7M, NEO-8M, or any NMEA compatible GPS
- Cost: ~$10-15

### 3. Additional Components
- Jumper wires (Female-to-Female)
- Breadboard (for testing)
- Power supply (5V, 2A minimum)
- Enclosure box (waterproof recommended)
- Optional: External GPS antenna for better signal

## Wiring Diagram

```
GPS Module          ESP32
-----------         -----
VCC        ------>  3.3V or 5V (check your GPS module specs)
GND        ------>  GND
TX         ------>  GPIO 16 (RX2)
RX         ------>  GPIO 17 (TX2)
```

### Important Notes:
- Most GPS modules work with 3.3V or 5V (check your module's datasheet)
- ESP32 GPIO pins are 3.3V tolerant
- GPS TX connects to ESP32 RX (data flows from GPS to ESP32)
- GPS RX connects to ESP32 TX (data flows from ESP32 to GPS)

## Software Setup

### 1. Install Arduino IDE
- Download from: https://www.arduino.cc/en/software
- Install version 2.0 or later

### 2. Install ESP32 Board Support
1. Open Arduino IDE
2. Go to File → Preferences
3. Add this URL to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to Tools → Board → Boards Manager
5. Search for "ESP32" and install "esp32 by Espressif Systems"

### 3. Install Required Libraries
1. Go to Sketch → Include Library → Manage Libraries
2. Install these libraries:
   - **TinyGPS++** by Mikal Hart
   - WiFi (built-in)
   - HTTPClient (built-in)

### 4. Configure the Code
Open `esp32_gps_tracker.ino` and update:

```cpp
// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server URL (your backend server IP)
const char* SERVER_URL = "http://192.168.1.100:3000/api/hardware/location";

// Bus Identification (unique for each bus)
const char* BUS_ID = "BUS01";
```

### 5. Upload Code
1. Connect ESP32 to computer via USB
2. Select board: Tools → Board → ESP32 Dev Module
3. Select port: Tools → Port → (your ESP32 port)
4. Click Upload button

## Testing

### 1. Serial Monitor Test
1. Open Serial Monitor (Tools → Serial Monitor)
2. Set baud rate to 115200
3. You should see:
   - WiFi connection status
   - GPS satellite count
   - Location updates

### 2. GPS Fix
- Place GPS module near a window or outdoors
- Wait 1-5 minutes for initial GPS fix
- LED on GPS module will blink when receiving data

### 3. Server Communication
- Check Serial Monitor for "Location sent successfully"
- Verify data appears in your backend server logs

## Troubleshooting

### GPS Not Getting Fix
- **Solution**: Move GPS module outdoors or near window
- **Reason**: GPS needs clear view of sky
- **Time**: First fix can take 1-5 minutes (cold start)

### WiFi Connection Failed
- Check SSID and password
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Check WiFi signal strength

### No Data on Serial Monitor
- Check baud rate (should be 115200)
- Verify USB cable supports data transfer
- Try pressing RESET button on ESP32

### GPS Module Not Responding
- Check wiring connections
- Verify GPS module power (LED should be on)
- Try swapping TX/RX connections if still not working

### Server Connection Error
- Verify server is running
- Check server IP address and port
- Ensure ESP32 and server are on same network
- Check firewall settings

## Power Supply for Bus Installation

### Option 1: USB Power Bank
- Pros: Easy, portable, rechargeable
- Cons: Needs regular charging
- Recommended: 10,000mAh or higher

### Option 2: Car Charger Adapter
- Connect to bus 12V system
- Use DC-DC converter (12V to 5V)
- Pros: Continuous power
- Cons: Requires installation

### Option 3: Direct Bus Battery
- Use voltage regulator (12V/24V to 5V)
- Most reliable for permanent installation
- Requires professional installation

## Installation in Bus

### 1. GPS Module Placement
- Mount on dashboard near windshield
- Ensure clear view of sky
- Avoid metal obstructions
- Use double-sided tape or mounting bracket

### 2. ESP32 Placement
- Inside dashboard or under seat
- Protect from water and heat
- Ensure WiFi signal can reach
- Use enclosure box

### 3. Power Connection
- Connect to bus power system
- Add fuse for protection (1A recommended)
- Use proper wire gauge
- Secure all connections

### 4. Testing After Installation
- Start bus engine
- Check Serial Monitor for GPS fix
- Verify location updates on web dashboard
- Test for 30 minutes to ensure stability

## Data Usage Estimation

- Each location update: ~200 bytes
- Update interval: 5 seconds
- Data per hour: ~140 KB
- Data per day (8 hours): ~1.1 MB
- Monthly data (20 days): ~22 MB

**Recommendation**: Use WiFi when available, or add 4G module for mobile data

## Security Considerations

1. **Change default credentials** in code
2. **Use HTTPS** for production (requires SSL certificate)
3. **Add API key authentication** for ESP32 requests
4. **Encrypt sensitive data** in transit
5. **Regular firmware updates** for security patches

## Maintenance

### Weekly
- Check GPS signal strength
- Verify location accuracy
- Monitor battery/power supply

### Monthly
- Clean GPS antenna
- Check wire connections
- Update firmware if needed

### Quarterly
- Full system test
- Replace power supply if degraded
- Check enclosure for damage

## Cost Breakdown

| Component | Estimated Cost |
|-----------|---------------|
| ESP32 Board | $5-10 |
| GPS Module | $10-15 |
| Wires & Connectors | $5 |
| Enclosure | $5-10 |
| Power Supply | $10-20 |
| **Total per Bus** | **$35-60** |

## Next Steps

1. ✅ Complete hardware assembly
2. ✅ Upload and test code
3. ✅ Verify server communication
4. ✅ Test in vehicle
5. ✅ Deploy to production

## Support

For issues or questions:
- Check Serial Monitor output
- Review server logs
- Test individual components
- Verify all connections

## Future Enhancements

- Add 4G/LTE module for mobile connectivity
- Implement offline data buffering
- Add temperature/humidity sensors
- Include fuel level monitoring
- Add driver identification (RFID)
- Implement geofencing alerts
