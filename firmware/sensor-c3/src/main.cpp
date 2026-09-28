#include <Arduino.h>
#include <Wire.h>

constexpr uint8_t I2C_ADDRESS = 0x42;
constexpr int I2C_SDA = 0;
constexpr int I2C_SCL = 1;

volatile int16_t temperatureX10 = 200;

void onRequest() {
  uint16_t value = static_cast<uint16_t>(temperatureX10);

  Wire.write(static_cast<uint8_t>(value >> 8));
  Wire.write(static_cast<uint8_t>(value & 0xFF));
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.onRequest(onRequest);

  if (!Wire.begin(I2C_ADDRESS, I2C_SDA, I2C_SCL, 400000)) {
    Serial.println("[ERROR] I2C esclavo falló al iniciar");

    while (true) {
      delay(1000);
    }
  }

  Serial.println("Sensor C3 listo");
}

void loop() {
  temperatureX10 += 15;

  if (temperatureX10 > 10000) {
    temperatureX10 = 200;
  }

  Serial.printf("[C3] Temperatura simulada: %.1f °C\n", temperatureX10 / 10.0f);

  delay(500);
}