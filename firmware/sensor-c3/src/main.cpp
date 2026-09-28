#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("Sensor C3 iniciado");
}

void loop() {
  Serial.println("Sensor C3 activo");
  delay(1000);
}