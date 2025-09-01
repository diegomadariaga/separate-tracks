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

## Interfaz YouTube -> MP3 (Frontend)

La aplicación web incluye un componente `YouTubeToMp3` que:
- Valida una URL de YouTube.
- Simula la conversión mostrando estados (cargando, éxito, error).
- Genera un enlace de descarga ficticio (aún no funcional hasta crear la API).

Cuando la API esté lista, se reemplazará la simulación por una llamada real (`fetch` al endpoint) y se descargará el binario.

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

Estados posibles: `pending`, `downloading`, `converting`, `done`, `error`.

El porcentaje se distribuye: 0–50% descarga, 50–99% conversión, 100% final.

### Limpieza automática

Un job se elimina de memoria ~1h después de creado. Archivos en `media/` mayores a 24h se eliminan periódicamente (cada 15 min se ejecuta limpieza). Ajustable en `YoutubeService` (`jobTtlMs`, `fileTtlMs`).

### Metadata incluida

La respuesta final incluye `title` y `durationSeconds` si están disponibles en la información del video.

Notas:
- Conversión usando `ytdl-core` + `fluent-ffmpeg`.
- Se requiere ffmpeg (usamos binario de `@ffmpeg-installer/ffmpeg`).
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
El componente `YouTubeToMp3` ahora:
- Envía `POST /youtube/mp3`.
- Muestra estado de conversión y permite cancelar (AbortController + timeout 2min).
- Ofrece botón de descarga que abre la URL de `downloadUrl`.

Si el backend corre en otro host/puerto, actualiza `VITE_API_URL` y reinicia Vite.

---
Generado automáticamente.
