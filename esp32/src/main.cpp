#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include <Temperature_LM75_Derived.h>
#include <Adafruit_MPU6050.h>

// Wi-Fi network credentials
#define WIFI_SSID "Xiaomi 11T"
#define WIFI_PASSWORD "yarinyarin5"

// Firebase Realtime Database URL
#define DATABASE_URL "https://nervemonitor-13953-default-rtdb.europe-west1.firebasedatabase.app/" // Replace with your Firebase database URL

// Function prototypes
void connectToWiFi();
void createBranchAndSetValues();
void fetchAndPrintValuesFromBranch();
void checkForAbnormalities(float bpm, float spo2, float temperature, sensors_event_t &accel, sensors_event_t &gyro, uint32_t irValue, uint32_t redValue);
void updateSettingsFromBranch();

MAX30105 particleSensor;
Adafruit_MPU6050 mpu;
Adafruit_Sensor *mpu_temp, *mpu_accel, *mpu_gyro;

const byte RATE_SIZE = 4; // Increase this for more averaging. 4 is good.
byte rates[RATE_SIZE]; // Array of heart rates
byte rateSpot = 0;
long lastBeat = 0; // Time at which the last beat occurred

float beatsPerMinute;
int beatAvg;

// Variables for SpO2
long redAC, irAC, redDC, irDC;
float ratio, spo2;

// Declare irValue and redValue as global variables
long irValue;
long redValue;

// Declare global variables for BPM calculation
float bpmSum = 0;
int bpmCount = 0;
unsigned long startTime = 0;

Generic_LM75 temperatureSensor;
float temperatureC; // Declare a global variable for temperature

int motorPins = 27; // 27 is the pin number for the motor
bool motorFlag = false;

// Replace with these variables
struct DeviceSettings {
  float bpm_threshold = 120.0;    // default value
  float spo2_threshold = 95.0;    // default value
  float temp_threshold = 37.0;    // default value
  String sensitivity = "medium";   // default value
  unsigned long update_interval = 2000; // default 2s
} settings;

// Add this function to validate and constrain settings
void constrainSettings() {
  // Only constrain if values are OUTSIDE reasonable ranges
  if (settings.bpm_threshold < 40.0 || settings.bpm_threshold > 200.0) {
    settings.bpm_threshold = constrain(settings.bpm_threshold, 40.0, 200.0);
    Serial.println("Warning: BPM threshold constrained to valid range");
  }
  // Was 120, which is valid, so should stay 120
  
  if (settings.spo2_threshold < 80.0 || settings.spo2_threshold > 100.0) {
    settings.spo2_threshold = constrain(settings.spo2_threshold, 80.0, 100.0);
    Serial.println("Warning: SpO2 threshold constrained to valid range");
  }
  // Was 95, which is valid, so should stay 95
  
  if (settings.temp_threshold < 20.0 || settings.temp_threshold > 40.0) {
    settings.temp_threshold = constrain(settings.temp_threshold, 20.0, 40.0);
    Serial.println("Warning: Temperature threshold constrained to valid range");
  }
  // Was 36.5, which is valid, so should stay 36.5
  
  // Set update interval based on sensitivity
  if (settings.sensitivity == "low") {
    settings.update_interval = 5000;
  } else if (settings.sensitivity == "high") {
    settings.update_interval = 500;
  } else {
    settings.sensitivity = "medium";
    settings.update_interval = 2000;
  }
}

// Add these global variables
String deviceMAC;  // Will store the MAC address
String userID;     // Will store the associated user ID

// Add this function to get the associated user ID
void fetchAssociatedUserID() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = DATABASE_URL;
    url += "users.json";
    
    http.begin(url);
    int httpResponseCode = http.GET();

    if (httpResponseCode == 200) {
      String payload = http.getString();
      Serial.println("\n=== User Association Check ===");
      Serial.println("Device MAC: " + deviceMAC);
      Serial.println("Raw users data: " + payload);
      
      // Reset userID
      userID = "";
      
      // Look through each user's devices
      int userPos = 0;
      while ((userPos = payload.indexOf("\"devices\":", userPos)) != -1) {
        // Find the user ID for this devices section
        int userIdStart = payload.lastIndexOf("\"", userPos);
        while (userIdStart > 0 && payload[userIdStart - 1] != '{') {
          userIdStart = payload.lastIndexOf("\"", userIdStart - 1);
        }
        int userIdEnd = payload.indexOf("\"", userIdStart + 1);
        String currentUserId = payload.substring(userIdStart + 1, userIdEnd);
        
        // Look for our device MAC in this user's devices
        int devicesSection = payload.indexOf("{", userPos);
        int devicesSectionEnd = payload.indexOf("}", devicesSection);
        String devicesData = payload.substring(devicesSection, devicesSectionEnd);
        
        if (devicesData.indexOf(deviceMAC) != -1) {
          userID = currentUserId;
          Serial.println("✓ Found device under user: " + userID);
          break;
        }
        
        userPos = devicesSectionEnd;
      }
      
      if (userID == "") {
        Serial.println("❌ WARNING: Device not associated with any user!");
      } else {
        Serial.println("✓ Device successfully associated with user: " + userID);
      }
      Serial.println("============================\n");
    }
    http.end();
  }
}

// Function to format MAC address with colons
String formatMAC(String mac) {
  String formattedMAC = "";
  for (int i = 0; i < mac.length(); i++) {
    if (i > 0 && i % 2 == 0) {
      formattedMAC += ":";
    }
    formattedMAC += mac[i];
  }
  return formattedMAC;
}

// Add at the top with other global variables
struct AttackMetrics {
  float initial_bpm;
  float initial_spo2;
  float initial_temperature;
  String start_timestamp;
  unsigned long start_time;
  bool attack_in_progress;
} currentAttack;

// Add this function to get ISO 8601 timestamp
String getISOTimestamp() {
  // Since ESP32 doesn't have real-time clock, we'll need to format millis()
  // You might want to add NTP time sync later for accurate timestamps
  unsigned long ms = millis();
  unsigned long sec = ms / 1000;
  unsigned long min = sec / 60;
  unsigned long hr = min / 60;
  
  char timestamp[30];
  sprintf(timestamp, "2024-03-20T%02d:%02d:%02d.%03dZ", 
          (int)(hr % 24), (int)(min % 60), (int)(sec % 60), (int)(ms % 1000));
  return String(timestamp);
}

// Add to global variables
bool client_on = false;

// Modify createBranchAndSetValues to also check client_on
void createBranchAndSetValues() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // First check client_on
    String url = DATABASE_URL;
    url += "devices/" + deviceMAC + "/data/client_on.json";
    http.begin(url);
    int response = http.GET();
    if (response == 200) {
      String value = http.getString();
      value.replace("\"", "");
      client_on = (value == "1" || value == "true");
    }
    http.end();

    // Then send data update
    url = DATABASE_URL;
    url += "devices/" + deviceMAC + "/data.json";
    
    String jsonData = "{\"deviceId\":\"" + deviceMAC + 
                     "\",\"userId\":\"" + userID + 
                     "\",\"bpm\":" + String(beatAvg) + 
                     ",\"spo2\":" + String(spo2) + 
                     ",\"internal_temperature\":" + String(temperatureC) + 
                     ",\"ir\":" + String(irValue) + 
                     ",\"red\":" + String(redValue) + 
                     ",\"motor_state\":" + String(motorFlag) + 
                     ",\"timestamp\":\"" + String(millis()) + "\"}";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.PATCH(jsonData);
    
    if (httpResponseCode > 0) {
      Serial.println("\n=== Data Update ===");
      Serial.println("Device MAC (formatted): " + deviceMAC);
      Serial.println("URL: " + url);
      Serial.println("Data sent: " + jsonData);
      Serial.println("Response code: " + String(httpResponseCode));
      if (client_on) Serial.println("Client activation is ON");
      Serial.println("=================\n");
    } else {
      Serial.println("\n❌ Failed to update data. Error code: " + String(httpResponseCode));
    }
    http.end();
  } else {
    Serial.println("WiFi not connected");
  }
}

void fetchAndPrintValuesFromBranch() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(DATABASE_URL) + "/devices/" + deviceMAC + "/data.json";

    http.begin(url);
    int httpResponseCode = http.GET();

    if (httpResponseCode == 200) {
      String payload = http.getString();
      Serial.print("Latest sensor readings: ");
      Serial.println(payload);
    } else {
      Serial.print("Failed to fetch values. Error code: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("WiFi not connected");
  }
}

// Modify saveAttackMetrics to use a better path structure
void saveAttackMetrics(unsigned long duration) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = DATABASE_URL;
    // Use timestamp as the key for this entry within the history
    url += "devices/" + deviceMAC + "/history.json";
    
    // Create a unique key using the timestamp
    String timeKey = currentAttack.start_timestamp;
    timeKey.replace(":", "-"); // Replace colons with dashes for valid Firebase key
    timeKey.replace(".", "-"); // Replace periods with dashes for valid Firebase key
    
    String jsonData = "{\""+ timeKey + "\": {" +
                     "\"bpm\":" + String(currentAttack.initial_bpm) + 
                     ",\"spo2\":" + String(currentAttack.initial_spo2) + 
                     ",\"temperature\":" + String(currentAttack.initial_temperature) + 
                     ",\"timestamp\":\"" + currentAttack.start_timestamp + "\"" +
                     ",\"duration\":" + String(duration) + 
                     ",\"triggered_by\":\"" + (client_on ? "client" : "metrics") + "\"}}";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.PATCH(jsonData); // Use PATCH instead of POST
    
    if (httpResponseCode > 0) {
      Serial.println("\n=== Attack Metrics Saved ===");
      Serial.println("Duration: " + String(duration) + "ms");
      Serial.println("Initial BPM: " + String(currentAttack.initial_bpm));
      Serial.println("Initial SpO2: " + String(currentAttack.initial_spo2));
      Serial.println("Initial Temperature: " + String(currentAttack.initial_temperature));
      Serial.println("Start Time: " + currentAttack.start_timestamp);
      Serial.println("Triggered By: " + String(client_on ? "client" : "metrics"));
      Serial.println("=========================\n");
    }
    http.end();
  }
}

// Add this task for second core
void attackMonitorTask(void * parameter) {
  for(;;) {
    if (currentAttack.attack_in_progress) {
      // Check if attack has ended
      if (!motorFlag) {
        unsigned long duration = millis() - currentAttack.start_time;
        saveAttackMetrics(duration);
        currentAttack.attack_in_progress = false;
      }
    }
    vTaskDelay(100); // Small delay to prevent watchdog issues
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("Initializing...");

  // Get MAC Address and format it properly
  deviceMAC = WiFi.macAddress();
  deviceMAC.replace(":", "");  // First remove any existing colons
  deviceMAC = formatMAC(deviceMAC);  // Then add them in the correct positions
  Serial.print("Device MAC Address: ");
  Serial.println(deviceMAC);

  pinMode(motorPins, OUTPUT);

  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip");
    while (1) {
      delay(10);
    }
  }

  Serial.println("MPU6050 Found!");
  mpu_temp = mpu.getTemperatureSensor();
  mpu_accel = mpu.getAccelerometerSensor();
  mpu_gyro = mpu.getGyroSensor();

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30105 was not found. Please check wiring/power.");
    while (1);
  }

  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeIR(0x0F);
  particleSensor.setPulseAmplitudeGreen(0);

  // Connect to WiFi
  connectToWiFi();

  // Get associated user ID
  fetchAssociatedUserID();

  // Load settings from Firebase and print them
  Serial.println("Loading settings from Firebase...");
  updateSettingsFromBranch();
  
  // Print the loaded settings to verify
  Serial.println("Current settings:");
  Serial.print("BPM Threshold: "); Serial.println(settings.bpm_threshold);
  Serial.print("SpO2 Threshold: "); Serial.println(settings.spo2_threshold);
  Serial.print("Temperature Threshold: "); Serial.println(settings.temp_threshold);
  Serial.print("Sensitivity: "); Serial.println(settings.sensitivity);
  Serial.print("Update Interval: "); Serial.println(settings.update_interval);

  startTime = millis();

  // Start attack monitor task on core 0 (loop() runs on core 1)
  xTaskCreatePinnedToCore(
    attackMonitorTask,   // Task function
    "AttackMonitor",     // Task name
    10000,              // Stack size
    NULL,               // Task parameters
    1,                  // Priority
    NULL,               // Task handle
    0                   // Core ID
  );
}

void loop() {
  static unsigned long lastDataUpdate = 0;
  static unsigned long lastSettingsUpdate = 0;
  unsigned long currentMillis = millis();

  // Update settings every 30 seconds
  if (currentMillis - lastSettingsUpdate >= 30000) {
    updateSettingsFromBranch();
    lastSettingsUpdate = currentMillis;
  }

  // Use dynamic update interval from settings
  if (currentMillis - lastDataUpdate >= settings.update_interval) {
    createBranchAndSetValues();
    fetchAndPrintValuesFromBranch();
    lastDataUpdate = currentMillis;
  }

  // Get sensor readings
  irValue = particleSensor.getIR();
  redValue = particleSensor.getRed();

  // Calculate heart rate
  static long lastIRValue = 0;
  static long irValueSum = 0;
  static int irValueCount = 0;
  static long irValueAvg = 0;

  // Update moving average
  irValueSum += irValue;
  irValueCount++;
  if (irValueCount == 10) { // Adjust the window size as needed
    irValueAvg = irValueSum / irValueCount;
    irValueSum = 0;
    irValueCount = 0;
  }

  // Use adaptive threshold based on moving average
  if (irValue > irValueAvg + 1000 && lastIRValue <= irValueAvg + 1000) { // Example adaptive threshold
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;
    }
  }
  lastIRValue = irValue;

  // Accumulate BPM values
  bpmSum += beatsPerMinute;
  bpmCount++;

  // Check if one second has passed
  if (millis() - startTime >= 1000) {
    // Calculate average BPM
    beatAvg = bpmSum / bpmCount;

    // Reset for the next second
    bpmSum = 0;
    bpmCount = 0;
    startTime = millis();
  }

  // Extract AC and DC components
  redDC = redValue / 128; // Example scaling, adjust based on observed data
  irDC = irValue / 128;
  redAC = redValue - redDC;
  irAC = irValue - irDC;

  // Calculate SpO2
  if (redAC > 0 && irAC > 0) {
    ratio = (float)(redAC * irDC) / (irAC * redDC);
    spo2 = 104 - 17 * ratio; // Example formula, adjust based on calibration
  }

  // Read temperature
  temperatureC = temperatureSensor.readTemperatureC();

  // Get MPU6050 sensor events
  sensors_event_t accel, gyro, temp;
  mpu_temp->getEvent(&temp);
  mpu_accel->getEvent(&accel);
  mpu_gyro->getEvent(&gyro);

  // Check for abnormalities
  checkForAbnormalities(beatsPerMinute, spo2, temperatureC, accel, gyro, irValue, redValue);
}

void connectToWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nConnected to Wi-Fi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void updateSettingsFromBranch() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    DeviceSettings oldSettings = settings;
    bool settingsChanged = false;

    // Get BPM threshold
    String url = DATABASE_URL;
    url += "devices/" + deviceMAC + "/settings/bpm_threshold.json";
    http.begin(url);
    int response = http.GET();
    if (response == 200) {
      String value = http.getString();
      value.replace("\"", ""); // Remove any quotes
      settings.bpm_threshold = value.toFloat();
      settingsChanged = true;
    }
    http.end();

    // Get SpO2 threshold
    url = DATABASE_URL;
    url += "devices/" + deviceMAC + "/settings/spo2_threshold.json";
    http.begin(url);
    response = http.GET();
    if (response == 200) {
      String value = http.getString();
      value.replace("\"", "");
      settings.spo2_threshold = value.toFloat();
      settingsChanged = true;
    }
    http.end();

    // Get temperature threshold
    url = DATABASE_URL;
    url += "devices/" + deviceMAC + "/settings/temperature_threshold.json";
    http.begin(url);
    response = http.GET();
    if (response == 200) {
      String value = http.getString();
      value.replace("\"", "");
      settings.temp_threshold = value.toFloat();
      settingsChanged = true;
    }
    http.end();

    // Get sensitivity
    url = DATABASE_URL;
    url += "devices/" + deviceMAC + "/settings/sensitivity.json";
    http.begin(url);
    response = http.GET();
    if (response == 200) {
      String value = http.getString();
      value.replace("\"", "");
      settings.sensitivity = value;
      settingsChanged = true;
    }
    http.end();

    if (settingsChanged) {
      Serial.println("\n=== Settings Update Summary ===");
      Serial.println("Device MAC: " + deviceMAC);
      
      // Print raw values before constraining
      Serial.println("\nRaw values received:");
      Serial.println("BPM Threshold (raw): " + String(settings.bpm_threshold));
      Serial.println("SpO2 Threshold (raw): " + String(settings.spo2_threshold));
      Serial.println("Temperature Threshold (raw): " + String(settings.temp_threshold));
      Serial.println("Sensitivity (raw): " + settings.sensitivity);

      // Only constrain if values are outside valid ranges
      if (settings.bpm_threshold < 40.0 || settings.bpm_threshold > 200.0) {
        float original = settings.bpm_threshold;
        settings.bpm_threshold = constrain(settings.bpm_threshold, 40.0, 200.0);
        Serial.println("Warning: BPM threshold constrained from " + String(original) + " to " + String(settings.bpm_threshold));
      }

      if (settings.spo2_threshold < 80.0 || settings.spo2_threshold > 100.0) {
        float original = settings.spo2_threshold;
        settings.spo2_threshold = constrain(settings.spo2_threshold, 80.0, 100.0);
        Serial.println("Warning: SpO2 threshold constrained from " + String(original) + " to " + String(settings.spo2_threshold));
      }

      if (settings.temp_threshold < 20.0 || settings.temp_threshold > 40.0) {
        float original = settings.temp_threshold;
        settings.temp_threshold = constrain(settings.temp_threshold, 20.0, 40.0);
        Serial.println("Warning: Temperature threshold constrained from " + String(original) + " to " + String(settings.temp_threshold));
      }

      // Set update interval based on sensitivity
      if (settings.sensitivity == "low") {
        settings.update_interval = 5000;
      } else if (settings.sensitivity == "high") {
        settings.update_interval = 500;
      } else {
        settings.sensitivity = "medium";
        settings.update_interval = 2000;
      }

      // Print final settings
      Serial.println("\nFinal settings after processing:");
      Serial.println("- BPM Threshold: " + String(settings.bpm_threshold));
      Serial.println("- SpO2 Threshold: " + String(settings.spo2_threshold));
      Serial.println("- Temperature Threshold: " + String(settings.temp_threshold));
      Serial.println("- Sensitivity: " + settings.sensitivity);
      Serial.println("- Update Interval: " + String(settings.update_interval) + "ms");
      Serial.println("===========================\n");

      // Print changes if any
      if (oldSettings.bpm_threshold != settings.bpm_threshold)
        Serial.println("Updated BPM threshold to: " + String(settings.bpm_threshold));
      if (oldSettings.spo2_threshold != settings.spo2_threshold)
        Serial.println("Updated SpO2 threshold to: " + String(settings.spo2_threshold));
      if (oldSettings.temp_threshold != settings.temp_threshold)
        Serial.println("Updated temperature threshold to: " + String(settings.temp_threshold));
      if (oldSettings.sensitivity != settings.sensitivity)
        Serial.println("Updated sensitivity to: " + settings.sensitivity);
    }
  } else {
    Serial.println("WiFi not connected. Cannot fetch settings.");
  }
}

// Modify checkForAbnormalities to use the global client_on variable
void checkForAbnormalities(float bpm, float spo2, float temperature, sensors_event_t &accel, sensors_event_t &gyro, uint32_t irValue, uint32_t redValue) {
  const uint32_t IR_PRESENCE_THRESHOLD = 50000;
  const float RED_IR_RATIO_MIN = 0.3;
  const float RED_IR_RATIO_MAX = 3.0;

  bool braceletWorn = (irValue > IR_PRESENCE_THRESHOLD);
  float redIrRatio = (float)redValue / irValue;
  bool validReading = (redIrRatio >= RED_IR_RATIO_MIN && redIrRatio <= RED_IR_RATIO_MAX);

  bool abnormalityDetected = false;

  if (braceletWorn && validReading) {
    bool abnormalBPM = (bpm >= 20 && bpm <= 200 && bpm > settings.bpm_threshold);
    
    if (abnormalBPM ||
        spo2 < settings.spo2_threshold ||
        temperature > settings.temp_threshold) {
      abnormalityDetected = true;
    }
  }

  if (abnormalityDetected || client_on) {
    digitalWrite(motorPins, HIGH);
    motorFlag = true;

    // Start tracking attack if not already tracking
    if (!currentAttack.attack_in_progress) {
      currentAttack.attack_in_progress = true;
      currentAttack.initial_bpm = bpm;
      currentAttack.initial_spo2 = spo2;
      currentAttack.initial_temperature = temperature;
      currentAttack.start_timestamp = getISOTimestamp();
      currentAttack.start_time = millis();
      
      Serial.println("\n⚠ ABNORMALITY DETECTED ⚠");
      Serial.println("Readings that triggered alert:");
      if (bpm > settings.bpm_threshold) Serial.println("- High BPM: " + String(bpm));
      if (spo2 < settings.spo2_threshold) Serial.println("- Low SpO2: " + String(spo2));
      if (temperature > settings.temp_threshold) Serial.println("- High Temperature: " + String(temperature));
      if (client_on) Serial.println("- Activated by client (client_on = 1)");
      Serial.println("Motor activated!\n");
    }
  } else {
    digitalWrite(motorPins, LOW);
    motorFlag = false;
  }
}