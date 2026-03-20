#include "sensor.h"
#include "../def.h"
#include <Arduino.h>
float readDistance() {

    //make sure TRIG is LOW (clear noise)
  digitalWrite(TRIG,LOW);
  delayMicroseconds(2);


  //Shoot the signal and wait 
  digitalWrite(TRIG,HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG,LOW);


  //Wait until signal comeback
  duration = pulseIn(ECHO,HIGH,30000); // 30ms timeout covers max ~5 meters



  //Distance = ( time * speed ) / 2, where speed = sound speed in air
  return  duration * 0.034 / 2;
}