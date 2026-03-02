# AgroSense Hardware Integration Guide (Blynk to Firebase Migration)

You **do not need Blynk at all** for this application. Firebase replaces Blynk as your cloud backend, providing faster real-time updates and direct integration with your React dashboard.

## 1. Why Remove Blynk?
- **Single Source of Truth:** Your React app already talks to Firebase. Adding Blynk would require a complex "bridge" to sync data between two different clouds.
- **Latency:** Direct Firebase connection is often faster for custom web dashboards.
- **Cost:** Firebase has a generous free tier for small IoT projects.

## 2. Arduino IDE Setup
1. Install **"Firebase ESP Client"** by Mobizt via Library Manager.
2. Install **"DHT sensor library"** by Adafruit.

## 3. Converted ESP32 Code (Firebase Version)
Copy and paste this code into your Arduino IDE. It uses your exact pins and logic but talks to AgroSense instead of Blynk.

```cpp
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>

// 1. WI-FI & FIREBASE CREDENTIALS
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define FIREBASE_PROJECT_ID "smart-farming-e0a57" // From your firebase.ts

// 2. HARDWARE PIN DEFINITIONS (Same as your Blynk code)
#define RELAY_PIN 23
#define SOIL_PIN 34
#define LDR_PIN 35
#define TRIG_PIN 5
#define ECHO_PIN 18
#define DHTPIN 21
#define BUTTON_PIN 4

#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool pumpState = false;
unsigned long lastMillis = 0;

void setup() {
  Serial.begin(115200);
  
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, HIGH); // Pump OFF initially

  dht.begin();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }

  config.api_key = API_KEY;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (Firebase.ready()) {
    // 1. LISTEN FOR DASHBOARD COMMANDS (Every 2 seconds)
    if (millis() - lastMillis > 2000) {
      if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", "control/motor", "")) {
        // Parse JSON to get "isOn"
        String payload = fbdo.payload();
        if (payload.indexOf("\"isOn\":true") > 0) {
          pumpState = true;
          digitalWrite(RELAY_PIN, LOW);
        } else {
          pumpState = false;
          digitalWrite(RELAY_PIN, HIGH);
        }
      }
      
      // 2. PUSH SENSOR DATA
      pushToFirestore();
      lastMillis = millis();
    }
  }

  // 3. PHYSICAL BUTTON OVERRIDE
  if (digitalRead(BUTTON_PIN) == LOW) {
    pumpState = !pumpState;
    digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
    // Sync back to dashboard
    FirebaseJson content;
    content.set("fields/isOn/booleanValue", pumpState);
    Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", "control/motor", content.raw(), "isOn");
    delay(500);
  }
}

void pushToFirestore() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int soil = analogRead(SOIL_PIN);
  int light = analogRead(LDR_PIN);

  // Ultrasonic Tank Level
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  int distance = duration * 0.034 / 2;

  FirebaseJson content;
  content.set("fields/temperature/doubleValue", t);
  content.set("fields/humidity/doubleValue", h);
  content.set("fields/soilMoisture/integerValue", map(soil, 4095, 0, 0, 100)); // Calibrate as needed
  content.set("fields/ldr/integerValue", light);
  content.set("fields/tankLevel/integerValue", distance);
  
  // Add a timestamp (Server side preferred, but we can send a placeholder)
  // Note: For simplicity, we just create a new document in the collection
  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", "sensor_data", content.raw())) {
    Serial.println("Data pushed to AgroSense");
  }
}
```

## 4. Key Changes from Blynk
- **Virtual Pins are gone:** Instead of `V0`, `V1`, etc., we use field names like `temperature` and `humidity`.
- **Blynk.run() is gone:** Replaced by `Firebase.ready()`.
- **Real-time Sync:** When you use the Hindi Voice Assistant to say *"Motor chalu karo"*, the dashboard updates the `control/motor` document, and your ESP32 picks it up in the next poll.
