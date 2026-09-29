#pragma once

void home_screen_create();

void home_screen_set_temperature(float temperature);
void home_screen_set_temperature_unavailable();
void home_screen_set_status(const char *status);
void home_screen_set_sensor_status(const char *status);