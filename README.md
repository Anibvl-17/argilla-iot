# Argilla IoT

Sistema IoT para monitorear y controlar hornos cerámicos eléctricos.

## Despliegue con Docker

### Requisitos

- Docker
- Docker Compose V2

### Inicio rápido

No es necesario crear un archivo `.env` ni ejecutar migraciones manualmente.

```bash
git clone https://github.com/Anibvl-17/argilla-iot.git
cd argilla-iot
docker compose up
```

También se puede construir explícitamente o ejecutar en segundo plano:

```bash
docker compose up --build
docker compose up -d
```

Durante el primer inicio se aplican las migraciones, se crean datos demo y se
inician PostgreSQL, Mosquitto, la API, el simulador MQTT y el frontend.

### Acceso

- Aplicación web: <http://localhost:8080>
- API mediante proxy: <http://localhost:8080/api>
- Salud del backend: <http://localhost:8080/health>
- Broker MQTT: `localhost:1883`

El backend y PostgreSQL no publican puertos en el host.

### Credenciales demo

Administrador:

```text
Correo: admin@argilla.test
Contraseña: Admin123!
```

Ceramistas disponibles:

```text
maria@argilla.test
jose@argilla.test
ana@argilla.test
carlos@argilla.test
valentina@argilla.test
Contraseña común: Password123!
```

Estas credenciales son exclusivamente locales y no deben utilizarse en
producción. El seed sólo crea datos ausentes; nunca reemplaza datos existentes.

### Variables de entorno opcionales

Docker Compose incluye valores locales predeterminados. Para personalizarlos:

```bash
cp .env.example .env
```

Las variables disponibles se encuentran documentadas en `.env.example`. Si se
cambia `FRONTEND_PORT`, también se debe ajustar `FRONTEND_URL` para mantener el
origen permitido por la API y Socket.IO.

### Servicios

| Servicio | Función | Puerto publicado |
| --- | --- | --- |
| `frontend` | Nginx, SPA, proxy de API y Socket.IO | `8080` |
| `backend` | API Express y Socket.IO | Interno `3000` |
| `simulator` | Simulación de controladores registrados | Ninguno |
| `broker-mqtt` | Broker Mosquitto | `1883` |
| `db` | PostgreSQL | Ninguno |
| `init` | Migraciones y datos demo | Ninguno; termina al completar |

### Detención y persistencia

```bash
docker compose down
```

Los datos de PostgreSQL y Mosquitto se conservan en volúmenes nombrados. El
siguiente comando elimina esos volúmenes y todos sus datos:

```bash
docker compose down -v
```

### Diagnóstico

```bash
docker compose ps
docker compose logs -f
docker compose logs -f backend
docker compose logs -f simulator
docker compose logs -f init
```

Para reconstruir las imágenes:

```bash
docker compose build
docker compose build --no-cache
```

## Desarrollo sin Docker

El frontend y backend conservan sus scripts habituales:

```bash
cd frontend
npm ci
npm run dev
```

```bash
cd backend
npm ci
npm run dev
```
