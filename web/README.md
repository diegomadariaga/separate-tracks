# Web App

Esta aplicación React (Nx + Vite) incluye un componente `AudioUploader` que permite subir archivos de audio mediante:

1. Botón de selección (`input type=file`).
2. Área drag & drop.

Solo se aceptan archivos cuyo MIME comienza con `audio/`.

## Componente `AudioUploader`

Ubicación: `src/app/AudioUploader.tsx`

Estado mostrado:
- `uploading`: Mientras se realiza la petición.
- `success`: Subida exitosa (placeholder).
- `error`: Archivo inválido o fallo en la petición.

## Endpoint Placeholder

Actualmente las subidas van a:
```
https://api.example.com/upload-audio
```
Reemplaza `PLACEHOLDER_UPLOAD_URL` dentro del componente por el endpoint real cuando la API esté lista.

La petición se realiza con `fetch` `POST multipart/form-data` con campo `file`.

## Pruebas

Archivo de pruebas: `src/app/audio-uploader.spec.tsx`

Casos cubiertos:
- Render básico.
- Rechazo de archivo no audio.
- Subida (mock fetch) de archivo de audio.
- Drag & drop.

## Ejecución de tests

Desde la raíz del monorepo:
```
pnpm nx test web
```

## Futuras mejoras sugeridas
- Mostrar barra de progreso real usando `XMLHttpRequest` o API de chunks.
- Permitir múltiples archivos.
- Integrar autenticación si el endpoint lo requiere.
