#include "src/behavior/behavior.h"
#include "src/def.h"
#include "src/motor/motor.h"
#include "src/sensor/sensor.h"
#include "src/servo/servo.h"
#include "src/task/task.h"

// ================= SETUP =================
void setup() {

  Serial.begin(115200);

  // Connect WiFi + WebSocket
  setupWiFi();
  setupWebSocket();

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  // ===== SERVO trước =====
  ESP32PWM::allocateTimer(0);
  myServo.setPeriodHertz(50);
  myServo.attach(SERVO_PIN, 500, 2400);

  myServo.write(90);
  delay(500); // cho servo ổn định

  // ===== PWM MOTOR sau =====
  ledcAttach(ENA, 1000, 8);
  ledcAttach(ENB, 1000, 8);

  // LED
  pinMode(LED, OUTPUT);


  xTaskCreatePinnedToCore(sensorTask, "Sensor Task", 4096, NULL, 2, NULL, 1);
}

void loop() {
  // WebSocket loop - nhận lệnh từ server
  webSocket.loop();

  // Real-time Event-Driven WebSocket Updates
  // Chỉ gửi tín hiệu qua ngõ Socket nếu có bất kì thông số nào thay đổi (Quay đầu, Đổi khoảng cách >0.5cm, Thay đổi chế độ)
  static int lastSentHead = -1;
  static float lastSentDist = -1.0;
  static bool lastSentAuto = !autoMode;

  if (lastSentHead != headDegree || abs(lastSentDist - distance) > 0.5 || lastSentAuto != autoMode) {
    lastSentHead = headDegree;
    lastSentDist = distance;
    lastSentAuto = autoMode;
    
    char statusMsg[64];
    snprintf(statusMsg, sizeof(statusMsg), "{\"dist\":%.2f, \"auto\":%s, \"head\":%d}", 
             distance, autoMode ? "true" : "false", headDegree);
    webSocket.sendTXT(statusMsg);
  }

  // Process the latest pending command
  if (pendingCmd != 0) {
    char cmd = pendingCmd;
    pendingCmd = 0; // Clear it so we don't process it again
    executeCommand(cmd);
    
    // Ensure movement commands run for at least 30ms
    // to overcome motor deadzone before processing any subsequent stop commands
    if (cmd == 'F' || cmd == 'B' || cmd == 'L' || cmd == 'R') {
      delay(30);
    }
  }

  // Safety Timeout: Nếu quá lâu không nhận được lệnh, tự động dừng motor và Servo
  // (Chỉ áp dụng khi không ở chế độ autoMode)
  if (!autoMode && (millis() - lastCmdTime > timeout) && (speedL != 0 || speedR != 0 || headTurnDir != 0)) {
    stopMotor();
    headTurnDir = 0;
  }

  // Continuous smooth head turning
  if (headTurnDir != 0) {
    static unsigned long lastHeadTurn = 0;
    if (millis() - lastHeadTurn > 15) { // Adjust turn speed (15ms delay per step)
      lastHeadTurn = millis();
      headDegree += headTurnDir * 2; // Step size
      if (headDegree < 0) headDegree = 0;
      if (headDegree > 180) headDegree = 180;
      myServo.write(headDegree);
    }
  }

  // Auto mode
  if (autoMode) {
    if (distance < StopDistance) {
      stopMotor();
      autoTurn();
    } else {
      forward();
      delay(20);
      stopMotor();
    }
  }
}