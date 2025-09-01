# separate-tracks

Monorepo (Turborepo + pnpm) con:

- `apps/api`: API en NestJS
- `apps/web`: Frontend Vite + React + TypeScript

## Requisitos

- Node.js >= 18
- pnpm >= 9 (`npm i -g pnpm`)

## Instalación

```bash
pnpm install
```

## Desarrollo

Ejecutar ambos (api y web) en paralelo:
```bash
pnpm dev
```

## Scripts raíz

- `pnpm dev`: corre todos los `dev` en paralelo (api, web)
- `pnpm build`: construye todos los paquetes
- `pnpm lint`: lint de todos los proyectos
- `pnpm format`: Prettier write
- `pnpm typecheck`: revisa tipos en todos los proyectos
- `pnpm format:check`: (si agregas) verificar formato sin escribir

## Estructura
```
apps/
  api/
  web/
packages/
```

## Próximos pasos
- Agregar CI/CD (GitHub Actions)
- Testing (Jest en API, Vitest en Web)
- Compartir librerías en `packages/`
- Implementar endpoint real para conversión YouTube -> MP3

## Frontend YouTube -> MP3

El componente `YouTubeToMp3` permite encolar trabajos en la cola persistente y el componente `JobQueue` muestra el estado detallado de cada conversión.

## API YouTube -> MP3 (Backend)

Endpoint principal (NestJS):

POST `/youtube/mp3`
Body JSON:
```json
{ "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
```
Respuesta:
```json
{
  "file": "titulo-slug-<uuid>.mp3",
  "sizeBytes": 1234567,
  "downloadUrl": "/youtube/download/titulo-slug-<uuid>.mp3"
}
```

GET `/youtube/download/:file` sirve el archivo MP3 para descarga.

### Flujo asíncrono con progreso

Para mostrar barra de progreso en el frontend se expone un flujo async:

1. Iniciar job:
   POST `/youtube/mp3/async`
   Body:
   ```json
   { "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
   ```
   Respuesta:
   ```json
   { "jobId": "<uuid>" }
   ```
2. Consultar progreso:
   GET `/youtube/progress/:jobId`
   Respuesta ejemplo (en proceso):
   ```json
   {
     "id": "<uuid>",
     "state": "converting",
     "percent": 73.42,
     "message": "Convirtiendo..."
   }
   ```
   Finalizado:
   ```json
   {
     "id": "<uuid>",
     "state": "done",
     "percent": 100,
     "result": {
       "file": "titulo-slug-<uuid>.mp3",
       "sizeBytes": 1234567,
       "title": "Título original del video",
       "durationSeconds": 213,
       "downloadUrl": "/youtube/download/titulo-slug-<uuid>.mp3"
     }
   }
   ```

Estados posibles: `queued`, `pending`, `downloading`, `converting`, `done`, `error`, `canceled`.

Distribución de porcentaje global (`percent`):
- 0–50: descarga
- 50–99: conversión
- 100: finalización

Además se exponen porcentajes separados:
- `downloadPercent` (0–100 real de la etapa de descarga)
- `convertPercent` (0–100 real de la etapa de conversión)

### Limpieza automática

- Jobs antiguos (>1h) se eliminan de la cache en memoria (persisten en DB si no se purgan manualmente).
- Archivos en `media/` mayores a 24h se eliminan cada 15 min.
- Próximo paso (opcional): borrar filas antiguas de la tabla `youtube_jobs` según política definida.

### Metadata incluida

La respuesta final incluye `title` y `durationSeconds` si están disponibles en la información del video.

## Cola de trabajos (Queue)

Además del inicio inmediato, existe un flujo de cola manual:

Endpoints adicionales:

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/youtube/mp3/enqueue` | Encola un job (estado `queued`) |
| POST | `/youtube/job/:id/start` | Inicia un job en cola |
| POST | `/youtube/job/:id/cancel` | Cancela (marca `canceled`) |
| DELETE | `/youtube/job/:id` | Elimina el job de memoria (si terminal) |
| DELETE | `/youtube/job/:id/file` | Elimina archivo generado del disco |
| GET | `/youtube/jobs` | Lista todos los jobs (resumen) |

Estados adicionales: `queued`, `canceled`.

El frontend muestra un panel "Cola de trabajos" con acciones: Play (start), Cancel, Descargar, Eliminar archivo, Eliminar job.

Cancelación: se abortan streams de YouTube y proceso ffmpeg (kill) para liberar recursos inmediatamente.

Notas:
- Conversión usando `@distube/ytdl-core` (fork más resiliente) + `fluent-ffmpeg`.
- Binario ffmpeg provisto por `@ffmpeg-installer/ffmpeg`.
- Archivos almacenados en `media/` (ignorados por git).

Ejemplo con curl:
```bash
curl -X POST http://localhost:3000/youtube/mp3 \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## Integración Frontend -> Backend

Configura la variable en `apps/web/.env` (crear desde `.env.example`):
```
VITE_API_URL=http://localhost:3000
```
El flujo preferido es encolar trabajos (`POST /youtube/mp3/enqueue`) y gestionarlos desde el panel. También se soporta inicio inmediato (`/youtube/mp3/async`).

Si el backend corre en otro host/puerto, actualiza `VITE_API_URL` y reinicia Vite.

## Persistencia (TypeORM + SQLite)

Se añadió persistencia de la cola para sobrevivir reinicios:

- Dependencias: `typeorm`, `@nestjs/typeorm`, `sqlite3`.
- Configuración en `AppModule` con `synchronize: true` (para producción se recomienda migraciones explícitas).
- Entidad: `YoutubeJobEntity` (`apps/api/src/youtube/job.entity.ts`). Campos clave:
  - `id` (UUID), `url`, `state`, `progress` (percent global), `downloadPercent`, `convertPercent`, `message`, `outputFile`, `title`, `durationSeconds`, timestamps (`createdAt`, `updatedAt`, `completedAt`).
- Al reiniciar, jobs en estado activo (`pending`, `downloading`, `converting`) se marcan `queued` y se reencolan para evitar inconsistencias.
- Las transiciones de estado se guardan mediante `persistAndCache` en `YoutubeService`.

### Recuperación
`onModuleInit` lee las filas de la tabla y reconstruye la cache en memoria para respuestas rápidas y manejo de concurrencia.

### Doble Progreso
Se almacena por separado `downloadPercent` y `convertPercent` para permitir al frontend mostrar dos barras más una barra global.

### Cancelación Real
`cancelJob` destruye el stream de YouTube, el write stream y envía `kill` al proceso ffmpeg para liberar recursos inmediatamente.

### Próximas mejoras sugeridas
- Paginación/filtrado en `GET /youtube/jobs` (limitar payload).
- Índices adicionales (e.g. por `state`, `createdAt`).
- Limpieza de filas terminales antiguas (`DELETE` basado en `completedAt`).
- Migrar a migraciones manuales (`synchronize: false`).
- SSE o WebSockets para actualizaciones push en lugar de polling.

## Desarrollo rápido
```bash
pnpm install
pnpm dev
```

Abrir: Frontend `http://localhost:5173`, API `http://localhost:3000`.

---
Actualizado con persistencia y doble progreso.
