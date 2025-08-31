# Monorepo Audio Processing (Turborepo + Vite + Nest)

## Stack
- Turborepo (orquestación tareas)
- Web: Vite + React + TypeScript
- API: NestJS (subida audio, WebSocket estados, cola simple en memoria + SQLite)
- Shared: UI lib, tsconfig, eslint config

## Flujo de procesamiento
1. El usuario sube un archivo de audio (drag & drop o selector).
2. El backend guarda el archivo en `./uploads` (Multer diskStorage) y crea un registro en SQLite con estado `queued`.
3. Se encola el id y un procesador simulado cambia estados: `queued -> processing -> processed`.
4. Un WebSocket (`/ws/status`) emite la lista completa de archivos cada vez que cambia algo.
5. El front actualiza en tiempo real la tabla de archivos y la barra de progreso de subida se maneja por `XMLHttpRequest.upload.onprogress`.

Estados posibles: `queued`, `processing`, `processed`, `failed` (reservado para manejar errores futuros).

## Endpoints API
- `POST /upload` campo `file`: sube un audio.
- `GET /files`: lista los archivos con sus estados.
- WebSocket: `ws://localhost:3000/ws/status` mensajes `{ type: 'status', data: FileRecord[] }`.

## Estructura
```
apps/
  api/        # NestJS
  web/        # Vite React
packages/
  ui/         # Componentes compartidos
  tsconfig/   # Configs ts
  eslint-config/
```

## Scripts principales
- `pnpm dev` (root): corre `web` y `api` en paralelo.
- `pnpm build`: compila todos los paquetes/apps.
- `pnpm lint`: eslint en todos los workspaces.

## Instalación
```bash
pnpm install
pnpm dev
```
Web: http://localhost:5173  |  API: http://localhost:3000

## Notas
- Turbopack no se usa aquí (orientado a Next.js). Se usa Turborepo para pipeline.
- La cola es simple (memoria). Para producción se recomendaría una cola externa (Redis, BullMQ, etc.).
- SQLite se maneja con `better-sqlite3` para simplicidad y cero migraciones iniciales.

## Mejoras futuras
- Manejo de errores reales y estado `failed`.
- Reintentos / cancelación.
- Almacenamiento en S3 u otro bucket en lugar de disco local.
- Procesamiento real (transcodificación, extracción de metadata, etc.).

## Licencia
Privado / Ajustar según necesidad.

# Docker

Construir y levantar ambos servicios (API + Web + volumen persistente para uploads):

```bash
docker compose build
docker compose up -d
```

Servicios:
- Web: http://localhost:8080 (sirve frontend y proxy a API mediante nginx)
- API directa: http://localhost:3000
- WebSocket: ws://localhost:3000/ws/status (o a través de web -> proxy)

Volumen persistente:
- `uploads_data` montado en `/data/uploads` dentro del contenedor `api`.

Regenerar imágenes tras cambios en dependencias o código base:
```bash
docker compose build --no-cache api web
docker compose up -d --force-recreate
```

Ver logs:
```bash
docker compose logs -f api
# o
docker compose logs -f web
```

Detener y borrar contenedores:
```bash
docker compose down
# Borrar volumen también:
docker compose down -v
```

### Variables de entorno Frontend
Se puede definir la URL de la API en build con ARG `VITE_API_URL` (por defecto `http://api:3000` en compose). Para override en build manual:
```bash
docker build -f apps/web/Dockerfile . --build-arg VITE_API_URL=https://mi-api.ejemplo.com -t separate-tracks-web
```

### Notas
- `multer` 1.x y `fluent-ffmpeg` están deprecados; considerar actualización futura.
- Ajustar límites de subida y validaciones si se expone públicamente.
