#include "task.h"
#include "../def.h"
#include "../sensor/sensor.h"
#include <Arduino.h>


static unsigned long lastSend = 0;
void sensorTask(void *parameter) {

  while (true) {

    float d = readDistance();

    if (d > 0 && d < 400) {
      distance = d;
    }

    if (millis() - lastSend > 1000) {
      // SerialBT.printf("Raw D: %.2f | Saved Dist: %.2f\n", d, distance);
      lastSend = millis();
    }

    vTaskDelay(200 / portTICK_PERIOD_MS);
  }
}
