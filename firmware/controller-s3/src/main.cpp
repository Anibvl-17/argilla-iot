#include <Arduino.h>
#include <esp_display_panel.hpp>
#include <lvgl.h>

#include "lvgl_v8_port.h"

using namespace esp_panel::drivers;
using namespace esp_panel::board;

static lv_obj_t *statusLabel;

static void buttonEvent(lv_event_t *event)
{
  if (lv_event_get_code(event) == LV_EVENT_CLICKED)
  {
    lv_label_set_text(statusLabel, "Touch OK");
    Serial.println("Touch OK");
  }
}

void setup()
{
  Serial.begin(115200);
  delay(1000);

  Serial.println("Inicializando controlador...");

  Board *board = new Board();
  if (!board->init())
  {
    Serial.println("ERROR: Board init failed");
    while (true)
    {
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

  assert(board->begin());

  Serial.println("Inicializando LVGL...");
  assert(lvgl_port_init(board->getLCD(), board->getTouch()));

  lvgl_port_lock(-1);

  statusLabel = lv_label_create(lv_scr_act());
  lv_label_set_text(statusLabel, "Controlador Argillá");
  lv_obj_align(statusLabel, LV_ALIGN_CENTER, 0, -50);

  lv_obj_t *button = lv_btn_create(lv_scr_act());
  lv_obj_set_size(button, 180, 60);
  lv_obj_align(button, LV_ALIGN_CENTER, 0, 30);
  lv_obj_add_event_cb(button, buttonEvent, LV_EVENT_CLICKED, nullptr);

  lv_obj_t *buttonLabel = lv_label_create(button);
  lv_label_set_text(buttonLabel, "Probar touch");
  lv_obj_center(buttonLabel);

  lvgl_port_unlock();

  Serial.println("LVGL listo");
}

void loop()
{
  delay(1000);
}