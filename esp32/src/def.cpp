#include "def.h"

Servo myServo;

SemaphoreHandle_t motorMutex = NULL;
SemaphoreHandle_t distanceMutex = NULL;

int scanAngle = 90;
int scanDir = 1;
bool autoMode = false;
int degreePerTurn = 10;

int headDegree = 90;
int headTurnDir = 0;

int speedBase = 200;
int speedL = speedBase * 0.7;
int speedR = speedBase * 0.7;

int moveTime = 50;
bool moving = false;

volatile float distance = 100;
long duration = 0;

unsigned long lastCmdTime = 0;

int timeout = 100;

unsigned long lastSensor = 0;

int StopDistance = 30;

volatile char pendingCmd = 0;
unsigned long lastConnectTime = 0;

#include "behavior/behavior.h"
#include "motor/motor.h"
#include "servo/servo.h"

// ============ WiFi Config ============
const char *ssid = "Jendeukie";
const char *password = "thaongan";

WebSocketsClient webSocket;

// ============ Command Handler ============
// This just buffers the latest command
void handleCommand(char cmd) { pendingCmd = cmd; }

// This actually runs the command (called from loop)
void executeCommand(char cmd) {
  // Serial.printf("[CMD] Executing: %c\n", cmd);
  if (cmd != 'P') {
    lastCmdTime = millis();
  }
  switch (cmd) {
  case 'F':
    forward();
    break;
  case 'B':
    backward();
    break;
  case 'L':
    turnLeft();
    break;
  case 'R':
    turnRight();
    break;
  case 'S':
    stopMotor();
    headTurnDir = 0;
    break;
  case 'C':
    headTurnDir = 5;
    break;
  case 'D':
    headTurnDir = -5;
    break;
  case '1':
    autoTurn();
    break;
  case 'V':
    autoMode = true;
    break;
  case 'v':
    autoMode = false;
    stopMotor();
    break;
  case 'P':
    webSocket.sendTXT("PONG");
    break;
  case 'I':
    digitalWrite(LED, !digitalRead(LED));
    break;
  }
}

// ============ WebSocket Event ============
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
  case WStype_DISCONNECTED:
    Serial.println("[WS] Disconnected!");
    pendingCmd = 0; // Clear pending on disconnect
    break;
  case WStype_CONNECTED:
    Serial.printf("[WS] Connected to: %s\n", payload);
    lastConnectTime = millis();
    pendingCmd = 0; // Clear pending on connect
    webSocket.sendTXT("ESP32 connected");
    break;
  case WStype_TEXT:
    if (length > 0) {
      // Ignore commands received within 500ms of connecting (likely
      // stale/buffered)
      if (millis() - lastConnectTime < 500) {
        Serial.println(
            "[WS] Data received too soon after connect, ignoring...");
        return;
      }
      char cmd = (char)payload[0];
      // Serial.printf("[WS] Command Received: %c\n", cmd);
      handleCommand(cmd);
    }
    break;
  }
}

// ============ WiFi Setup ============
void setupWiFi() {
  Serial.print("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// ============ WebSocket Setup ============
void setupWebSocket() {
  webSocket.begin("222.253.80.30", 41205, "/ws/car");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}
