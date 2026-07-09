# Simulador ESP32 (MQTT)

Simula un controlador ESP32 que:
- Publica temperatura periódicamente.
- Recibe comandos `ON` / `OFF` y ajusta la simulación en consecuencia (ON tiende a subir la temperatura, OFF a bajarla).
- Publica su estado online/offline (con Last Will) para que el backend sepa si el dispositivo está conectado.

## Tópicos

| Función                | Tópico                          | Payload (JSON)                                                                 |
|-------------------------|----------------------------------|---------------------------------------------------------------------------------|
| Publica temperatura      | `controller/{UUID}/temp`         | `{ "deviceId", "value", "unit", "relayState", "timestamp" }`                    |
| Recibe comando           | `controller/{UUID}/cmd`          | `{ "command": "ON" }` o `{ "command": "OFF" }` (también acepta texto plano `ON`/`OFF`) |
| Estado del dispositivo   | `controller/{UUID}/status`       | `{ "deviceId", "status": "online" \| "offline" }` (retained)                     |

`{UUID}` se reemplaza por el valor de `DEVICE_UUID` en tu `.env`.

## Instalación y uso

```bash
cd esp32-simulator
cp .env.example .env
# Edita .env con el host/puerto/usuario/password real de tu broker
npm install
npm start
```

## Simular varios dispositivos a la vez

Como el `DEVICE_UUID` viene de `.env`, se pueden lanzar varias instancias con distintos UUID:

```bash
DEVICE_UUID=esp32-002 npm start
```

O crear un `.env` distinto por dispositivo y cargarlo manualmente si prefieres correr varios procesos en paralelo.

## Probar sin backend (opcional)

Si quieres verificar rápido que el simulador publica y escucha bien, puedes usar `mosquitto_sub` / `mosquitto_pub` contra el mismo broker:

```bash
# Ver la temperatura que publica el simulador
mosquitto_sub -h TU_HOST -p 1883 -u admin -P admin -t "controller/esp32-001/temp" -v

# Enviarle un comando
mosquitto_pub -h TU_HOST -p 1883 -u admin -P admin -t "controller/esp32-001/cmd" -m '{"command":"ON"}'
```
