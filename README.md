# SeparateTracks (Monorepo Nx)

Monorepo gestionado con [Nx](https://nx.dev) usando `pnpm`:

- Backend: NestJS (`api`)
- Frontend: React + Vite (`web`)
- Librería compartida de tipos: (`shared-types`)

## Requisitos

- Node.js LTS (>=18)
- pnpm (>=8)

## Instalación

```bash
pnpm install
```

## Comandos principales

```bash
# Grafo de dependencias
pnpm nx graph

# Servir backend (NestJS)
pnpm nx serve api

# Servir frontend (Vite)
pnpm nx serve web

# Build producción
pnpm nx build api
pnpm nx build web

# Tests (Jest para api, Vitest para web)
pnpm nx test api
pnpm nx test web

# Lint
pnpm nx lint api
pnpm nx lint web
```

## Librería compartida

`shared-types` expone interfaces reutilizables. Ejemplo:

```ts
import type { User } from '@separate-tracks/shared-types';
```

Para crear más librerías:

```bash
pnpm nx g @nx/js:lib my-lib
```

## Añadir nuevas apps

React:
```bash
pnpm nx g @nx/react:app my-app --bundler=vite
```

NestJS:
```bash
pnpm nx g @nx/nest:application my-api
```

## Ejecución paralela útil

```bash
pnpm nx run-many -t serve -p api,web
```

## Formato y lint

```bash
pnpm nx format:write
pnpm nx lint api
```

## Caching e incrementales

Nx cachea resultados de build/test/lint. Para limpiar:
```bash
pnpm nx reset
```

## Variables de entorno

Puedes crear un archivo `.env` dentro de `api` o `web` e integrarlo según tus necesidades (por ejemplo usando `@nestjs/config` en `api` o `import.meta.env` en Vite).

## CI/CD

Para generar workflow base (GitHub Actions, etc.):
```bash
pnpm nx g ci-workflow
```

## Referencias

- Documentación Nx: https://nx.dev
- NestJS: https://docs.nestjs.com
- React: https://react.dev
- Vite: https://vite.dev

---

> Este README se centra en el flujo de trabajo práctico diario para este monorepo.
