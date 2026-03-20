#include "behavior.h"
#include "../def.h"
#include "../motor/motor.h"
#include "../servo/servo.h"
#include <Arduino.h>

void scanWhileMove() {

  scanAngle += scanDir * 3;

  if (scanAngle > 160) {
    scanAngle = 160;
    scanDir = -1;
  }

  if (scanAngle < 20) {
    scanAngle = 20;
    scanDir = 1;
  }

  myServo.write(scanAngle);

  float d = distance;
//   SerialBT.printf("Behavior: scanWhileMove - Dist: %.2f, Angle: %d\n", d,

  if (d < 30) {

    if (scanAngle < 90) {
//       SerialBT.println("Behavior: Object on Right -> Adjusting Left");
      // vật bên phải → lệch trái
      speedL = speedBase;
      speedR = speedBase * 0.5;
    } else {
//       SerialBT.println("Behavior: Object on Left -> Adjusting Right");
      // vật bên trái → lệch phải
      speedL = speedBase * 0.5;
      speedR = speedBase;
    }

  } else {

    speedL = speedBase;
    speedR = speedBase;
  }

  applySpeed();
}

void autoTurn() {

  float leftDist;
  float rightDist;

  // Scan left
  moveServoTo(170);
  delay(300);
  leftDist = distance;
//   SerialBT.printf("Behavior autoTurn: Left Dist = %.2f\n", leftDist);

  // Scan right
  moveServoTo(20);
  delay(300);
  rightDist = distance;
//   SerialBT.printf("Behavior autoTurn: Right Dist = %.2f\n", rightDist);

  // Move head to middle
  moveServoTo(90);
  delay(200);
  backward();
  delay(200);

  // choose best direction
  if (leftDist > rightDist) {
//     SerialBT.println("Behavior: Best direction is LEFT (executing Turn Left)");
    turnLeft();

    int okCount = 0;

    // turn until we count 3 times distance  > 50
    while (okCount < 3) {

      float d = distance;

      if (d > StopDistance) {
        okCount++;
      } else {
        okCount = 0;
      }

      delay(20);
    }

  } else {
//     SerialBT.println(
//         "Behavior: Best direction is RIGHT (executing Turn Right)");
    turnRight();

    int okCount = 0;

    while (okCount < 3) {

      float d = distance;

      if (d > StopDistance) {
        okCount++;
      } else {
        okCount = 0;
      }

      delay(20);
    }
  }

//   SerialBT.println("Behavior autoTurn: Completed turning, stopping motor.");
  stopMotor();
}
