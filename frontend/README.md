# Frontend de Argilla IoT

Interfaz React para clientes, técnicos y administradores. Consume la API REST
del backend y recibe telemetría y resúmenes mediante Socket.IO.

La guía completa del proyecto, incluyendo PostgreSQL, MQTT, seed y Docker, está
en el [README principal](../README.md).

## Configuración local

```bash
npm ci
cp .env.example .env
npm run dev
```

Variables disponibles:

- `VITE_BASE_URL`: URL base de la API, normalmente
  `http://localhost:3000/api` durante desarrollo.
- `VITE_SOCKET_URL`: origen del servidor Socket.IO, normalmente
  `http://localhost:3000`. Si se omite, se deriva de `VITE_BASE_URL`.

En la imagen Docker ambas variables se inyectan durante el build; Nginx sirve
el frontend y reenvía `/api` y `/socket.io` al backend.

## Estructura

- `src/pages`: pantallas cargadas bajo demanda por el router.
- `src/components`: componentes compartidos.
- `src/services`: acceso HTTP y Socket.IO.
- `src/context` y `src/hooks`: sesión, tema y comportamiento reutilizable.
- `src/styles`: tokens semánticos y temas claro/oscuro.
- `tests`: pruebas Vitest y Testing Library.

## Verificación

```bash
npm run lint
npm test
npm run build
```

Desde la raíz del repositorio, `npm run check` ejecuta además las verificaciones
del backend.
