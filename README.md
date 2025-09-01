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

---
Generado automáticamente.
