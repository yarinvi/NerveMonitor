#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include <Temperature_LM75_Derived.h>
#include <Adafruit_MPU6050.h>

// Wi-Fi network credentials
#define WIFI_SSID "Kinneret College"
#define WIFI_PASSWORD ""

// Firebase Realtime Database URL
#define DATABASE_URL "https://nervemonitor-13953-default-rtdb.europe-west1.firebasedatabase.app/" // Replace with your Firebase database URL

// Function prototypes
void connectToWiFi();
void createBranchAndSetValues();
void fetchAndPrintValuesFromBranch();
void checkForAbnormalities(float bpm, float spo2, float temperature, sensors_event_t &accel, sensors_event_t &gyro, uint32_t irValue, uint32_t redValue);
void updateSettingsFromBranch();

// Retrieve and set the MAC address as the deviceID
String deviceID = WiFi.macAddress();
String branchName = deviceID; // Update branchName with the MAC address

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

// Add these after other global variables
float BPM_THRESHOLD = 100.0;
float SPO2_THRESHOLD = 75.0;
float TEMP_THRESHOLD = 27.5;
float GYRO_THRESHOLD = 250.0;
String SENSITIVITY = "medium";

// Add these to your config
String deviceId = WiFi.macAddress();  // Use MAC address as device ID
String userId = "USER_ID_HERE";       // This will be set during device registration

#define DEVICE_ID "D4:8A:FC:60:2E:F0"  // Your ESP32's MAC address

void setup() {
  Serial.begin(115200);
  Serial.println("Initializing...");

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
  particleSensor.setPulseAmplitudeRed(0x0A); // Set Red LED
  particleSensor.setPulseAmplitudeIR(0x0F);  // Set IR LED
  particleSensor.setPulseAmplitudeGreen(0); // Turn off Green LED

  connectToWiFi();
  updateSettingsFromBranch();
  startTime = millis();

  // Get MAC Address
  Serial.print("Device MAC Address: ");
  Serial.println(WiFi.macAddress());
}

void loop() {
  static unsigned long lastSettingsUpdate = 0;
  unsigned long currentMillis = millis();

  // Update settings every 30 seconds
  if (currentMillis - lastSettingsUpdate >= 30000) {
    updateSettingsFromBranch();
    lastSettingsUpdate = currentMillis;
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

  // Every 2 seconds, send data to Firebase
  createBranchAndSetValues();
  fetchAndPrintValuesFromBranch();
  delay(2000);
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

void createBranchAndSetValues() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(DATABASE_URL) + "/devices/" + DEVICE_ID + "/data.json";
    
    // Create JSON with sensor data and device ID
    String jsonData = "{\"deviceId\":\"" + String(DEVICE_ID) + 
                     "\",\"bpm\":" + String(beatAvg) + 
                     ",\"spo2\":" + String(spo2) + 
                     ",\"internal_temperature\":" + String(temperatureC) + 
                     ",\"ir\":" + String(irValue) + 
                     ",\"red\":" + String(redValue) + 
                     ",\"motor_state\":" + String(motorFlag) + 
                     ",\"timestamp\":\"" + String(millis()) + "\"}";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.PUT(jsonData);
    
    if (httpResponseCode > 0) {
      Serial.print("Data updated successfully, response code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Failed to update data. Error code: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("WiFi not connected");
  }
}

void fetchAndPrintValuesFromBranch() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(DATABASE_URL) + "/" + branchName + ".json"; // Path to the branch

    http.begin(url);

    int httpResponseCode = http.GET(); // Send a GET request

    if (httpResponseCode == 200) {
      String payload = http.getString();
      Serial.print("Values from branch: ");
      Serial.println(payload);
    } else {
      Serial.print("Failed to fetch values from branch. Error code: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("WiFi not connected");
  }
}

void checkForAbnormalities(float bpm, float spo2, float temperature, sensors_event_t &accel, sensors_event_t &gyro, uint32_t irValue, uint32_t redValue) {
  const uint32_t IR_PRESENCE_THRESHOLD = 50000;
  const float RED_IR_RATIO_MIN = 0.3;
  const float RED_IR_RATIO_MAX = 3.0;

  bool braceletWorn = (irValue > IR_PRESENCE_THRESHOLD);
  float redIrRatio = (float)redValue / irValue;
  bool validReading = (redIrRatio >= RED_IR_RATIO_MIN && redIrRatio <= RED_IR_RATIO_MAX);

  bool abnormalityDetected = false;

  if (braceletWorn && validReading) {
    // Only check BPM if it's in a valid range (e.g., 20-200)
    bool abnormalBPM = (bpm >= 20 && bpm <= 200 && bpm > BPM_THRESHOLD);
    
    if (abnormalBPM ||
        spo2 < SPO2_THRESHOLD ||
        temperature < TEMP_THRESHOLD ||
        abs(gyro.gyro.x) > GYRO_THRESHOLD || 
        abs(gyro.gyro.y) > GYRO_THRESHOLD || 
        abs(gyro.gyro.z) > GYRO_THRESHOLD) {
      abnormalityDetected = true;
    }
  }

  if (abnormalityDetected) {
    digitalWrite(motorPins, HIGH);
    motorFlag = true;
  } else {
    digitalWrite(motorPins, LOW);
    motorFlag = false;
  }
}

void updateSettingsFromBranch() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(DATABASE_URL) + "/devices/" + DEVICE_ID + "/settings.json";
    
    http.begin(url);
    int httpResponseCode = http.GET();

    if (httpResponseCode == 200) {
      String payload = http.getString();
      
      // Basic JSON parsing (you might want to use ArduinoJson library for more robust parsing)
      if (payload.indexOf("bpm_threshold") != -1) {
        int start = payload.indexOf("bpm_threshold") + 14;
        int end = payload.indexOf(",", start);
        if (end == -1) end = payload.indexOf("}", start);
        String value = payload.substring(start, end);
        BPM_THRESHOLD = value.toFloat();
      }

      if (payload.indexOf("spo2_threshold") != -1) {
        int start = payload.indexOf("spo2_threshold") + 15;
        int end = payload.indexOf(",", start);
        if (end == -1) end = payload.indexOf("}", start);
        String value = payload.substring(start, end);
        SPO2_THRESHOLD = value.toFloat();
      }

      if (payload.indexOf("temperature_threshold") != -1) {
        int start = payload.indexOf("temperature_threshold") + 21;
        int end = payload.indexOf(",", start);
        if (end == -1) end = payload.indexOf("}", start);
        String value = payload.substring(start, end);
        TEMP_THRESHOLD = value.toFloat();
      }

      if (payload.indexOf("sensitivity") != -1) {
        int start = payload.indexOf("sensitivity") + 13;
        int end = payload.indexOf(",", start);
        if (end == -1) end = payload.indexOf("}", start);
        String value = payload.substring(start, end);
        value.replace("\"", "");
        SENSITIVITY = value;
        
        // Adjust GYRO_THRESHOLD based on sensitivity
        if (SENSITIVITY == "high") {
          GYRO_THRESHOLD = 150.0;
        } else if (SENSITIVITY == "low") {
          GYRO_THRESHOLD = 350.0;
        } else {
          GYRO_THRESHOLD = 250.0;
        }
      }
    }
    http.end();
  }
}

void sendDataToFirebase() {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String url = String(DATABASE_URL) + "/users/" + userId + "/devices/" + deviceId + "/data.json";
        // ... rest of the sending logic
    }
}
