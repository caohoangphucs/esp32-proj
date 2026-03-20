#include "motor.h"
#include "../def.h"
#include <Arduino.h>

void applySpeed() {
  ledcWrite(ENA, speedL);
  ledcWrite(ENB, speedR);
}

void forward() {

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);

  speedL = speedBase;
  speedR = speedBase;

  // Serial.println("[MOTOR] Forward");
  applySpeed();
}

void backward() {

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);

  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);

  speedL = speedBase;
  speedR = speedBase;

  // Serial.println("[MOTOR] Backward");
  applySpeed();
}

void turnLeft() {

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);

  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);

  speedL = speedBase;
  speedR = speedBase;

  // Serial.println("[MOTOR] Turn Left");
  applySpeed();
}

void turnRight() {

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);

  speedL = speedBase;
  speedR = speedBase;

  // Serial.println("[MOTOR] Turn Right");
  applySpeed();
}

void stopMotor() {
  // Serial.println("[MOTOR] Stop");
  speedL = 0;
  speedR = 0;

  applySpeed();
}