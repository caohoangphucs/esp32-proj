#include "servo.h"
#include "../def.h"
#include <Arduino.h>
void moveServoTo(int target){

    //if target andgle is right
  if(target > headDegree){

    for(int i=headDegree;i<=target;i+=degreePerTurn){
      myServo.write(i);
      delay(0);
    }

    //if target angle is left
  }else{

    for(int i=headDegree;i>=target;i-=degreePerTurn){
      myServo.write(i);
      delay(0);
    }

  }

  headDegree = target;
//   SerialBT.printf("Servo moved to: %d\n", headDegree);
}