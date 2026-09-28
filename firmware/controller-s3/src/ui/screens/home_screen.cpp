#include <Arduino.h>
#include <lvgl.h>

#include "ui/screens/home_screen.h"

static lv_obj_t *temperatureValueLabel = nullptr;
static lv_obj_t *statusValueLabel = nullptr;
static lv_obj_t *buttonLabel = nullptr;

static void startButtonEvent(lv_event_t *event) {
  if (lv_event_get_code(event) != LV_EVENT_CLICKED) {
    return;
  }

  lv_label_set_text(statusValueLabel, "¡Quemando!");
  lv_label_set_text(buttonLabel, "Programa iniciado");

  Serial.println("Inicio de programa solicitado");
}

void home_screen_create() {
  // Obtiena la pantalla activa
  lv_obj_t *screen = lv_scr_act();

  lv_obj_t *title = lv_label_create(screen);
  lv_label_set_text(title, "Argillá Hornos");
  lv_obj_align(title, LV_ALIGN_TOP_MID, 0, 30);

  lv_obj_t *temperatureTitle = lv_label_create(screen);
  lv_label_set_text(temperatureTitle, "742 °C");
  lv_obj_align(temperatureTitle, LV_ALIGN_CENTER, 0, -100);

  temperatureValueLabel = lv_label_create(screen);
  lv_label_set_text(temperatureValueLabel, "0 °C");
  lv_obj_align(temperatureValueLabel, LV_ALIGN_CENTER, 0, -65);

  lv_obj_t *statusTitle = lv_label_create(screen);
  lv_label_set_text(statusTitle, "Estado");
  lv_obj_align(statusTitle, LV_ALIGN_CENTER, 0, -10);

  statusValueLabel = lv_label_create(screen);
  lv_label_set_text(statusValueLabel, "En pausa");
  lv_obj_align(statusValueLabel, LV_ALIGN_CENTER, 0, 20);

  lv_obj_t *programLabel = lv_label_create(screen);
  lv_label_set_text(programLabel, "Programa: Ninguno");
  lv_obj_align(programLabel, LV_ALIGN_CENTER, 0, 65);

  lv_obj_t *startButton = lv_btn_create(screen);
  lv_obj_set_size(startButton, 220, 60);
  lv_obj_align(startButton, LV_ALIGN_CENTER, 0, 125);

  lv_obj_add_event_cb(
    startButton,
    startButtonEvent,
    LV_EVENT_CLICKED,
    nullptr
  );

  buttonLabel = lv_label_create(startButton);
  lv_label_set_text(buttonLabel, "Iniciar programa");
  lv_obj_center(buttonLabel);
}

void home_screen_set_temperature(float temperature) {
  if (temperatureValueLabel == nullptr) {
    return;
  }

  lv_label_set_text_fmt(
    temperatureValueLabel,
    "%.1f °C",
    temperature
  );
}

void home_screen_set_status(const char *status) {
  if (statusValueLabel == nullptr) {
    return;
  }

  lv_label_set_text(statusValueLabel, status);
}