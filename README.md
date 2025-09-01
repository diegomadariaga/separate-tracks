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

---
Generado automáticamente.
