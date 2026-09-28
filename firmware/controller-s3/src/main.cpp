#include <Arduino.h>
#include <esp_display_panel.hpp>

#include "lvgl_v8_port.h"
#include "ui/ui.h"
#include "driver/i2c.h"

#include "ui/screens/home_screen.h"

using namespace esp_panel::drivers;
using namespace esp_panel::board;

constexpr uint8_t SENSOR_I2C_ADDRESS = 0x42;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("Inicializanco I2C...");
  
  Serial.println("Inicializando controlador...");
  
  Board *board = new Board();
  if (!board->init()) {
    Serial.println("[ERROR] Controlador no iniciado");
    
    while (true) {
      delay(1000);
    }
  }

#if LVGL_PORT_AVOID_TEARING_MODE
  auto lcd = board->getLCD();

  lcd->configFrameBufferNumber(LVGL_PORT_DISP_BUFFER_NUM);

#if ESP_PANEL_DRIVERS_BUS_ENABLE_RGB && CONFIG_IDF_TARGET_ESP32S3
  auto lcdBus = lcd->getBus();

  if (lcdBus->getBasicAttributes().type == ESP_PANEL_BUS_TYPE_RGB)
  {
    static_cast<BusRGB *>(lcdBus)->configRGB_BounceBufferSize(
        lcd->getFrameWidth() * 10);
  }
#endif
#endif

  if (!board->begin()) {
    Serial.println("[ERROR] Controlador no iniciado");

    while (true) {
      delay(1000);
    }
    
  }

  Serial.println("Inicializando LVGL...");

  if (!lvgl_port_init(board->getLCD(), board->getTouch())) {
    Serial.println("[ERROR] LVGL falló al iniciar");

    while (true) {
      delay(1000);
    }
  }

  lvgl_port_lock(-1);
  ui_init();
  lvgl_port_unlock();

  Serial.println("[INFO] LVGL listo");
  Serial.println("[INFO] Controlador listo");
}

void loop() {
  constexpr uint8_t SENSOR_I2C_ADDRESS = 0x42;

  uint8_t buffer[2];

  esp_err_t result = i2c_master_read_from_device(
    I2C_NUM_0,
    SENSOR_I2C_ADDRESS,
    buffer,
    sizeof(buffer),
    pdMS_TO_TICKS(100)
  );

  if (result == ESP_OK) {
    uint16_t raw =
      (static_cast<uint16_t>(buffer[0]) << 8) |
      static_cast<uint16_t>(buffer[1]);

    int16_t temperatureX10 = static_cast<int16_t>(raw);
    float temperature = temperatureX10 / 10.0f;

    Serial.printf("Temperatura recibida: %.1f °C\n", temperature);

    lvgl_port_lock(-1);
    home_screen_set_temperature(temperature);
    lvgl_port_unlock();
  } else {
    Serial.printf(
      "[ERROR] Sensor C3 no responde. Error I2C: %d\n",
      static_cast<int>(result)
    );
  }

  delay(500);
}