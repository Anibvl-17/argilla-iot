#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_MAX31856.h>

constexpr uint8_t I2C_ADDRESS = 0x42;
constexpr int I2C_SDA = 0;
constexpr int I2C_SCL = 1;

constexpr int MAX_SCK = 4;
constexpr int MAX_MISO = 5;
constexpr int MAX_MOSI = 6;
constexpr int MAX_CS = 7;

Adafruit_MAX31856 maxthermo(MAX_CS, MAX_MOSI, MAX_MISO, MAX_SCK);

enum SensorStatus : uint8_t {
  SENSOR_OK = 0,
  SENSOR_FAULT = 1,
  SENSOR_INVALID = 2
};

volatile uint8_t sensorStatus = SENSOR_INVALID;
volatile uint8_t sensorFault = 0;
volatile int16_t temperatureX10 = 0;

void onRequest() {
  uint16_t value = static_cast<uint16_t>(temperatureX10);

  Wire.write(sensorStatus);
  Wire.write(sensorFault);
  Wire.write(static_cast<uint8_t>(value >> 8));
  Wire.write(static_cast<uint8_t>(value & 0xFF));
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("[C3:INFO] Inicializando sensor C3...");

  if (!maxthermo.begin()) {
    Serial.println("[C3:ERROR] MAX31856 no pudo inicializarse");

    while (true) {
      delay (1000);
    }
  }

  maxthermo.setThermocoupleType(MAX31856_TCTYPE_K);

  // red eléctrica en Chile: 50 hz
  maxthermo.setNoiseFilter(MAX31856_NOISE_FILTER_50HZ);

  Wire.onRequest(onRequest);

  if (!Wire.begin(I2C_ADDRESS, I2C_SDA, I2C_SCL, 400000)) {
    Serial.println("[C3:ERROR] I2C esclavo falló al iniciar");

    while (true) {
      delay(1000);
    }
  }

  Serial.println("[C3:INFO] Sensor C3 listo");
}

void loop() {
  float temperature = maxthermo.readThermocoupleTemperature();

  uint8_t fault = maxthermo.readFault();

  if (fault != 0) {
    sensorStatus = SENSOR_FAULT;
    sensorFault = fault;

    Serial.printf("[C3:ERROR] MAX31856 falla: 0x%02X\n", fault);
    
    if (fault & MAX31856_FAULT_OPEN)
      Serial.println("[C3:ERROR] Termocupla abierta/desconectada");

    if (fault & MAX31856_FAULT_OVUV)
      Serial.println("[C3:ERROR] Sobrevoltaje o bajo voltaje");

    if (fault & MAX31856_FAULT_TCHIGH)
      Serial.println("[C3:ERROR] Temperatura termocupla demasiado alta");

    if (fault & MAX31856_FAULT_TCLOW)
      Serial.println("[C3:ERROR] Temperatura termocupla demasiado baja");
    
    delay(500);
    return;
  }

  if (isnan(temperature)) {
    sensorStatus = SENSOR_INVALID;
    sensorFault = 0;

    Serial.println("[C3:ERROR] Lectura de temperatura inválida");
    
    delay(500);
    return;
  }

  temperatureX10 = static_cast<uint16_t>(temperature * 10.0f);

  sensorFault = 0;
  sensorStatus = SENSOR_OK;

  Serial.printf("[C3:INFO] Temperatura termocupla: %.2f °C\n", temperature);

  delay(500);
}