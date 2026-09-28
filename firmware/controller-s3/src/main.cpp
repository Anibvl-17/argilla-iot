#include <Arduino.h>
#include <esp_display_panel.hpp>

#include "lvgl_v8_port.h"
#include "ui/ui.h"

#include "ui/screens/home_screen.h"

using namespace esp_panel::drivers;
using namespace esp_panel::board;

void setup() {
  Serial.begin(115200);
  delay(1000);

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

void loop()
{
  static float temperature = 20.0f;

  temperature += 1.5f;

  if (temperature > 1000.0f) {
    temperature = 20.0f;
  }

  lvgl_port_lock(-1);
  home_screen_set_temperature(temperature);
  lvgl_port_unlock();

  delay(500);
}