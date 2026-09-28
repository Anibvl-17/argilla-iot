#include <Arduino.h>

void setup()
{
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("Memoria Controller S3");

  Serial.printf(
      "Flash size: %.2f MB\n",
      ESP.getFlashChipSize() / 1024.0 / 1024.0);

  Serial.printf(
      "PSRAM size: %.2f MB\n",
      ESP.getPsramSize() / 1024.0 / 1024.0);

  Serial.printf(
      "Free PSRAM: %.2f MB\n",
      ESP.getFreePsram() / 1024.0 / 1024.0);
}

void loop()
{
  delay(1000);
}