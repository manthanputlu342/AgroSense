#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>
#include <time.h>

// 1. YOUR CREDENTIALS
#define WIFI_SSID "J2"
#define WIFI_PASSWORD "rajeshdas"
#define API_KEY "AIzaSyCDHfVYVcnY3jXJw36f8dI4fWD-YWhUItA"
#define FIREBASE_PROJECT_ID "smart-farming-e0a57"
#define DATABASE_URL "https://smart-farming-e0a57-default-rtdb.asia-southeast1.firebasedatabase.app"

// 2. HARDWARE PINS
#define RELAY_PIN 23
#define SOIL_PIN 34
#define LDR_PIN 35
#define TRIG_PIN 5
#define ECHO_PIN 18
#define DHTPIN 21
#define BUTTON_PIN 4

// 3. TANK DIMENSIONS
#define TANK_HEIGHT_CM 10  
#define TANK_RADIUS_CM 4   

// 4. SENSOR CALIBRATION (Adjust these based on Serial Monitor)
#define SOIL_DRY 4095   // Value in dry air
#define SOIL_WET 1200   // Value in a glass of water

#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool pumpState = false;
unsigned long lastMotorCheckMillis = 0;
unsigned long lastSensorPushMillis = 0;
unsigned long lastButtonPress = 0; 

void tokenStatusCallback(TokenInfo info) {
  if (info.status == token_status_ready) Serial.println("Cloud Connected!");
  if (info.status == token_status_error) Serial.printf("Token Error: %s\n", info.error.message.c_str());
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(2, OUTPUT); 
  digitalWrite(RELAY_PIN, HIGH); 

  dht.begin();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print("."); 
  }
  Serial.println("\nConnected!");
  
  // Time Sync with Timeout
  Serial.print("Syncing Time");
  configTime(0, 0, "pool.ntp.org", "time.google.com", "time.nist.gov");
  int timeout = 0;
  while (time(nullptr) < 1000000 && timeout < 30) { 
    delay(500); 
    Serial.print("t"); 
    timeout++;
  }
  Serial.println(time(nullptr) < 1000000 ? "\nTime Sync Failed!" : "\nTime Synced!");

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;
  Firebase.signUp(&config, &auth, "", "");
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (Firebase.ready()) {
    // 1. LISTEN FOR DASHBOARD COMMANDS
    if (millis() - lastMotorCheckMillis > 2000) {
      lastMotorCheckMillis = millis();
      if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", "control/motor", "")) {
        String payload = fbdo.payload();
        bool newState = (payload.indexOf("\"booleanValue\": true") > 0 || payload.indexOf("\"isOn\":true") > 0);
        
        if (newState != pumpState) {
          pumpState = newState;
          digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
          Serial.println("Motor State Changed. Waiting for noise to settle...");
          delay(1000); 
        }
      }
    }

  // 2. PUSH SENSOR DATA
    if (millis() - lastSensorPushMillis > 15000) {
      lastSensorPushMillis = millis();
      pushToFirestore();
    }
  } else {
    // If Firebase is not ready, print why
    static unsigned long lastErrorPrint = 0;
    if (millis() - lastErrorPrint > 5000) {
      lastErrorPrint = millis();
      Serial.println("Firebase Not Ready. Checking connection...");
    }
  }

  // 3. PHYSICAL BUTTON
  if (digitalRead(BUTTON_PIN) == LOW && millis() - lastButtonPress > 1000) {
    lastButtonPress = millis();
    pumpState = !pumpState;
    digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
    
    FirebaseJson content;
    content.set("fields/isOn/booleanValue", pumpState);
    Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", "control/motor", content.raw(), "isOn");
    delay(1000); 
  }
}

void pushToFirestore() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int retry = 0;
  while ((isnan(h) || isnan(t)) && retry < 5) {
    delay(1000);
    h = dht.readHumidity();
    t = dht.readTemperature();
    retry++;
  }

  delay(200);
  int soil = analogRead(SOIL_PIN);
  int lightRaw = analogRead(LDR_PIN);
  
  // DEBUG: Print raw values to Serial Monitor
  Serial.printf("DEBUG -> Raw Soil: %d, Raw Light: %d\n", soil, lightRaw);

  int lightPercent = map(lightRaw, 4095, 0, 0, 100); 

  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); 
  int distance = (duration * 0.034 / 2);
  
  // DEBUG: Print distance
  Serial.printf("DEBUG -> Distance: %d cm\n", distance);
  
  int volumeMl = 0;
  if (duration > 0 && distance < TANK_HEIGHT_CM) {
    int waterHeight = TANK_HEIGHT_CM - distance;
    volumeMl = 3.14159 * TANK_RADIUS_CM * TANK_RADIUS_CM * waterHeight;
  }

  FirebaseJson content;
  
  // SANITIZE DATA: Check for NaN (Not a Number) errors
  if (isnan(t)) t = 0.0;
  if (isnan(h)) h = 0.0;

  content.set("fields/temperature/doubleValue", t);
  content.set("fields/humidity/doubleValue", h);
  
  // Improved Soil Mapping
  int moisturePercent = map(soil, SOIL_DRY, SOIL_WET, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100); // Keep it between 0-100
  
  content.set("fields/soilMoisture/integerValue", moisturePercent);
  content.set("fields/ldr/integerValue", lightPercent);
  content.set("fields/tankLevel/integerValue", volumeMl);
  
  time_t now = time(nullptr);
  // FALLBACK: If time sync failed (now < 1000000), use a dummy recent timestamp
  if (now < 1000000) {
    now = 1740780000 + (millis() / 1000); // Today's base + uptime
  }
  content.set("fields/timestamp/integerValue", (int)now);
  
  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", "sensor_data", content.raw())) {
    Serial.printf("Pushed! Temp: %.1f, Water: %d ml, Dist: %d cm\n", t, volumeMl, distance);
  } else {
    Serial.print("Push Failed! Reason: ");
    Serial.println(fbdo.errorReason());
  }
}