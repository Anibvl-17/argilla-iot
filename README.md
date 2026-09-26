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

- Registro e inicio de sesión con JWT; roles `CLIENT`, `TECHNICIAN` y `ADMIN`.
- Gestión de usuarios, hornos, controladores y circuitos de resistencias jerárquicos.
- Vinculación de conjuntos horno–controlador mediante PIN temporal generado por el ESP32.
- Programas globales de quema y selección persistente por horno.
- Ciclos confirmados por el controlador con pausa, reanudación, cancelación e historial.
- Visualización en tiempo real y telemetría histórica inicial, cada diez minutos y final.
- Soporte por tickets con motivos administrables, asignación atómica, diagnóstico
  contextual, resolución y mantenimientos asociados. Los técnicos acceden a los
  equipos únicamente desde tickets sin asignar o asignados a ellos.
- Ejecución local y sincronización posterior cuando un controlador pierde conexión MQTT.
- Simulador MQTT integrado con el mismo contrato de ciclos que los controladores físicos.

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

El servicio sincroniza periódicamente los controladores registrados. Cada instancia conserva su catálogo, ciclo activo, comandos deduplicados y muestras pendientes en `.simulator-state`. `SIMULATOR_TIME_SCALE` permite acelerar las curvas durante desarrollo. Por defecto actualiza la simulación cada segundo, sin acreditar tiempo antes del primer intervalo.

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

El seed crea o sincroniza sus datos locales sin eliminar registros ajenos. Además de
las cuentas y equipos, incorpora selecciones de programas, ciclos terminales con
telemetría, tickets en distintos estados y mantenimientos para recorrer los flujos
principales de la aplicación. Puede ejecutarse más de una vez sin duplicar esos
registros. Las credenciales predeterminadas son únicamente para desarrollo:

```text
Administrador
Correo: admin@argilla.test
Contraseña: Admin123!

Ceramistas varios
[nombre]@argilla.test
Contraseña común: Password123!

Técnico
Correo: tecnico@argilla.test
Contraseña: Tecnico123!
```

Puedes reemplazar las credenciales y datos de seed con las variables `SEED_*` de `backend/.env`.

Las migraciones están orientadas a bases de desarrollo recreables y no trasladan
datos de modelos anteriores. Si una base local aplicó una versión previa de las
migraciones, debe recrearse antes de continuar.

## Variables de entorno

| Ubicación | Variables principales |
| --- | --- |
| `backend/.env` | `PORT`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `MQTT_URL`, `MQTT_USER`, `MQTT_PASS`, `MQTT_COMMAND_TIMEOUT_MS` y variables `SEED_*`. |
| `frontend/.env` | `VITE_BASE_URL`, `VITE_SOCKET_URL`. |
| `backend/.env` (simulador) | `SEED_DEVICE_SECRET`, `SIMULATOR_TEMP_INTERVAL_MS`, `SIMULATOR_TEMP_MIN`, `SIMULATOR_TEMP_MAX`, `SIMULATOR_TEMP_START`, `SIMULATOR_REFRESH_MS`, `SIMULATOR_PAIRING_PIN`. |

## Docker Compose (opcional)

El archivo `docker-compose.yml` sigue disponible para un entorno local autocontenido. Construye frontend, backend, PostgreSQL, Mosquitto, el inicializador de migraciones/seed y el simulador:

```bash
docker compose up --build
```

En este modo la aplicación queda en <http://localhost:8080>, el broker MQTT en `localhost:1883` y el frontend actúa como proxy de API y Socket.IO.

No usar los valores por defecto de Compose ni la configuración MQTT anónima fuera de un entorno local controlado.

## Verificación disponible

Después de instalar las dependencias de `backend` y `frontend`, ejecuta desde
la raíz:

```bash
npm run check
```

Este comando ejecuta el lint de ambos módulos, todas las pruebas, la validación
estática del esquema Prisma y el build de producción. La validación del esquema
usa una URL sintácticamente válida, pero no se conecta a PostgreSQL.

Las verificaciones del modelo y de los servicios sí necesitan una base de datos
migrada y con el seed cargado:

```bash
cd backend
npm run verify:model
npm run verify:services
```

También puede comprobarse la configuración de contenedores sin levantarlos:

```bash
docker compose config --quiet
```

### Alcance de la simulación

El simulador permite verificar el contrato MQTT versionado, la idempotencia de
comandos persistidos, las curvas y mesetas, pausa y recuperación lógica,
telemetría inicial/periódica/final, mensajes desordenados o duplicados,
continuidad offline y reconciliación de ciclos.

Siguen pendientes de firmware y validación con hardware real el control PID y
la modulación del relé, la lectura y seguridad eléctrica de sensores, la
persistencia no volátil del ESP32, el umbral físico de arranque bajo 35 °C, las
tolerancias exactas de recuperación térmica y el comportamiento ante cortes de
energía o fallas de componentes.
