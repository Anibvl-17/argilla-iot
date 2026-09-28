#include <Arduino.h>

#include "waveshare_lcd_port.h"

void setup()
{
    Serial.begin(115200);
    Serial.println("Test RGB LCD iniciado"); // Print start message for RGB LCD example
    waveshare_lcd_init(); // Initialize the RGB LCD
    Serial.println("Test RGB LCD terminado"); // Print end message for RGB LCD example
}

void loop()
{
    delay(1000); // Wait for 1 second
    Serial.println("Loop ejecutado"); // Print idle loop message

}
