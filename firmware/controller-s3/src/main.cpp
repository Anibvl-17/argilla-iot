#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("Controlador S3 iniciado");
}

void loop() {
  Serial.println("Controlador S3 activo");
  delay(1000);
}