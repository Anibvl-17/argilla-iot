# Argilla IoT

Aplicación local para monitorear y controlar hornos cerámicos eléctricos. Incluye una API con Express, PostgreSQL mediante Prisma, comunicación MQTT, actualizaciones en tiempo real con Socket.IO y una interfaz React.

> El proyecto está orientado al desarrollo y evaluación local. La configuración MQTT incluida permite conexiones anónimas y no debe exponerse como instalación de producción.

## Componentes

| Componente | Tecnología | Responsabilidad |
| --- | --- | --- |
| `frontend` | React, Vite y Tailwind | Interfaz para ceramistas y administración. |
| `backend` | Express, Prisma y Socket.IO | API, autenticación, autorización y persistencia. |
| `backend` simulador | Node.js y MQTT | Una instancia simulada por cada controlador registrado. |
| PostgreSQL | Base de datos | Usuarios, hornos, controladores e historial térmico. |
| Mosquitto | Broker MQTT | Telemetría, estado de conexión y comandos de control. |

## Funcionalidades

- Registro e inicio de sesión con JWT; roles `USER` y `ADMIN`.
- Gestión administrativa de usuarios, hornos y controladores.
- Vinculación de controladores y hornos mediante PIN temporal.
- Visualización de temperatura, estado de conexión y estado del switch en tiempo real.
- Control `ON`/`OFF` del controlador vinculado a un horno.
- Historial de telemetría por horno, con muestreo configurable.
- Simulador MQTT integrado: cada controlador de la base de datos recibe su propia instancia simulada.

## Desarrollo local (flujo principal)

### Requisitos

- Node.js 22 o compatible con las dependencias del proyecto.
- PostgreSQL accesible localmente.
- Un broker MQTT accesible, normalmente Mosquitto en `mqtt://localhost:1883`.

### 1. Configurar PostgreSQL y MQTT

Crea una base de datos PostgreSQL y levanta un broker MQTT local. El backend usa `DATABASE_URL` y `MQTT_URL` para conectarse a ellos.

El archivo de Mosquitto incluido en `mosquitto/config/mosquitto.conf` está pensado solo para pruebas locales y permite conexiones anónimas.

### 2. Configurar e iniciar el backend

En una terminal:

```bash
cd backend
npm ci
cp .env.example .env
```

Actualiza al menos estas variables en `backend/.env`:

```dotenv
PORT=3000
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/argilla?schema=public"
JWT_SECRET="un-secreto-local-largo-y-unico"
FRONTEND_URL="http://localhost:5173"
MQTT_URL="mqtt://localhost:1883"
```

Aplica las migraciones, carga los datos de demostración opcionales e inicia la API:

```bash
npx prisma migrate deploy
npm run seed
npm run dev
```

La API queda disponible en <http://localhost:3000>, con salud en <http://localhost:3000/health> y rutas bajo `/api`.

### 3. Iniciar el simulador MQTT

En otra terminal, desde `backend` y usando el mismo archivo `.env`:

```bash
npm run simulator
```

El servicio sincroniza periódicamente los controladores registrados. Cada controlador tiene una sola instancia de simulación, que publica temperatura y estado MQTT, y recibe comandos `ON` y `OFF`.

### 4. Configurar e iniciar el frontend

En otra terminal:

```bash
cd frontend
npm ci
cp .env.example .env
```

Como Vite no tiene proxy de desarrollo configurado, usa el backend directamente en `frontend/.env`:

```dotenv
VITE_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

Luego inicia la aplicación:

```bash
npm run dev
```

Abre la URL que indique Vite, habitualmente <http://localhost:5173>.

## Datos de demostración

El seed crea o normaliza datos locales sin eliminar los existentes. Las credenciales predeterminadas son únicamente para desarrollo:

```text
Administrador
Correo: admin@argilla.test
Contraseña: Admin123!

Ceramistas varios
[nombre]@argilla.test
Contraseña común: Password123!
```

Puedes reemplazar las credenciales y datos de seed con las variables `SEED_*` de `backend/.env`.

## Variables de entorno

| Ubicación | Variables principales |
| --- | --- |
| `backend/.env` | `PORT`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `MQTT_URL`, `MQTT_USER`, `MQTT_PASS`, `TELEMETRY_SAMPLE_SECONDS`, `MQTT_COMMAND_TIMEOUT_MS`. |
| `frontend/.env` | `VITE_BASE_URL`, `VITE_SOCKET_URL`. |
| `backend/.env` (simulador) | `SIMULATOR_TEMP_INTERVAL_MS`, `SIMULATOR_TEMP_MIN`, `SIMULATOR_TEMP_MAX`, `SIMULATOR_TEMP_START`, `SIMULATOR_REFRESH_MS`. |

## Docker Compose (opcional)

El archivo `docker-compose.yml` sigue disponible para un entorno local autocontenido. Construye frontend, backend, PostgreSQL, Mosquitto, el inicializador de migraciones/seed y el simulador:

```bash
docker compose up --build
```

En este modo la aplicación queda en <http://localhost:8080>, el broker MQTT en `localhost:1883` y el frontend actúa como proxy de API y Socket.IO.

No usar los valores por defecto de Compose ni la configuración MQTT anónima fuera de un entorno local controlado.

## Verificación disponible

```bash
cd frontend
npm run lint

cd ../backend
npx prisma validate
```
