import dotenv from "dotenv";
import mqtt from "mqtt";

// configuracion variables de entorno
const config = {
  host: process.env.MQTT_HOST || 'localhost',
  port: process.env.MQTT_PORT || '1883',
  protocol: process.env.MQTT_PROTOCOL || 'mqtt',
  username: process.env.MQTT_USERNAME || 'admin',
  password: process.env.MQTT_PASSWORD || 'admin',
  deviceId: process.env.DEVICE_UUID || 'esp32-001',
  tempIntervalMs: parseInt(process.env.TEMP_INTERVAL_MS || '5000', 10),
  tempMin: parseFloat(process.env.TEMP_MIN || '20'),
  tempMax: parseFloat(process.env.TEMP_MAX || '1240'),
  tempStart: parseFloat(process.env.TEMP_START || '25'),
};

// topicos
const TOPIC_TEMP = `controller/${config.deviceId}/temp`;
const TOPIC_CMD = `controller/${config.deviceId}/cmd`;
const TOPIC_STATUS = `controller/${config.deviceId}/status`;

// estado simulado
let currentTemp = config.tempStart;
let relayState = 'OFF'; // Estado simulado del switch, controlado por comando ON/OFF

// conexión al broker
const brokerUrl = `${config.protocol}://${config.host}:${config.port}`;

console.log(`[${config.deviceId}] Conectando a ${brokerUrl} ...`);

const client = mqtt.connect(brokerUrl, {
  username: config.username,
  password: config.password,
  clientId: `esp32-sim-${config.deviceId}-${Math.random().toString(16).slice(2, 8)}`,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
  // Last Will and Testament: si el simulador se cae, el backend se entera
  will: {
    topic: TOPIC_STATUS,
    payload: JSON.stringify({ deviceId: config.deviceId, status: 'offline' }),
    qos: 1,
    retain: true,
  },
});

let tempTimer = null;

client.on('connect', () => {
  console.log(`[${config.deviceId}] Conectado al broker MQTT.`);
  console.log(`[${config.deviceId}] Publicando temperatura en:  ${TOPIC_TEMP}`);
  console.log(`[${config.deviceId}] Escuchando comandos en:     ${TOPIC_CMD}`);

  // Aviso de que el dispositivo está online (retained, para que el backend lo vea al conectarse)
  client.publish(
    TOPIC_STATUS,
    JSON.stringify({ deviceId: config.deviceId, status: 'online' }),
    { qos: 1, retain: true }
  );

  client.subscribe(TOPIC_CMD, { qos: 1 }, (err) => {
    if (err) {
      console.error(`[${config.deviceId}] Error al suscribirse a ${TOPIC_CMD}:`, err.message);
    }
  });

  if (tempTimer) clearInterval(tempTimer);
  tempTimer = setInterval(publishTemperature, config.tempIntervalMs);
  publishTemperature(); // primera lectura inmediata
});

client.on('message', (topic, payloadBuffer) => {
  if (topic !== TOPIC_CMD) return;

  const raw = payloadBuffer.toString();
  let command;

  // Acepta tanto JSON { "command": "ON" } como texto plano "ON"
  try {
    const parsed = JSON.parse(raw);
    command = (parsed.command || '').toString().toUpperCase();
  } catch (e) {
    command = raw.trim().toUpperCase();
  }

  if (command !== 'ON' && command !== 'OFF') {
    console.warn(`[${config.deviceId}] Comando desconocido recibido: "${raw}" (ignorado)`);
    return;
  }

  relayState = command;
  console.log(`[${config.deviceId}] Comando recibido -> ${relayState}`);
});

client.on('error', (err) => {
  console.error(`[${config.deviceId}] Error de conexión MQTT:`, err.message || "broker no disponible");
});

client.on('reconnect', () => {
  console.log(`[${config.deviceId}] Reconectando al broker...`);
});

client.on('close', () => {
  console.log(`[${config.deviceId}] Conexión cerrada.`);
});

// logica simulacion temperatura
function publishTemperature() {
  // Deriva aleatoria pequeña + tendencia según el estado del relé
  const drift = (Math.random() - 0.5) * 0.6; // ruido de sensor
  const trend = relayState === 'ON' ? 0.4 : -0.3; // sube si está ON, baja si está OFF

  currentTemp += drift + trend;
  currentTemp = Math.min(config.tempMax, Math.max(config.tempMin, currentTemp));

  const payload = {
    deviceId: config.deviceId,
    value: Math.round(currentTemp * 100) / 100,
    unit: 'C',
    relayState,
    timestamp: new Date().toISOString(),
  };

  client.publish(TOPIC_TEMP, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) {
      console.error(`[${config.deviceId}] Error al publicar temperatura:`, err.message);
    } else {
      console.log(`[${config.deviceId}] Temp publicada: ${payload.value}°C (relay: ${relayState})`);
    }
  });
}

// apagado
function shutdown() {
  if (shuttingDown) return; // evita doble Ctrl+C reentrante
  shuttingDown = true;
 
  console.log(`\n[${config.deviceId}] Cerrando simulador...`);
  if (tempTimer) clearInterval(tempTimer);
 
  // Deja de escuchar eventos de reconexión/error para no seguir imprimiendo ruido
  client.removeAllListeners('reconnect');
  client.removeAllListeners('error');
 
  const exitNow = () => process.exit(0);
 
  // Si nunca se llegó a conectar (o se perdió la conexión), no tiene sentido
  // intentar publicar el estado offline: forzamos el cierre para cortar los
  // reintentos de reconexión inmediatamente.
  if (!client.connected) {
    console.log(`[${config.deviceId}] Sin conexión activa al broker, forzando cierre...`);
    client.end(true, exitNow);
    // Salvavidas por si end() no dispara el callback
    setTimeout(exitNow, 1500).unref();
    return;
  }
 
  client.publish(
    TOPIC_STATUS,
    JSON.stringify({ deviceId: config.deviceId, status: 'offline' }),
    { qos: 1, retain: true },
    () => {
      client.end(false, exitNow);
    }
  );
 
  // Salvavidas también en el caso "conectado" por si el publish nunca confirma
  setTimeout(exitNow, 2000).unref();
}