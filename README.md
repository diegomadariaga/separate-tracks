# SeparateTracks (Monorepo Turborepo)

Monorepo gestionado con [Turborepo](https://turbo.build/repo) + `pnpm`:

- Backend: NestJS (`api`)
- Frontend: React + Vite (`web`)
- Librería compartida de tipos (`shared-types`)

## Requisitos

- Node.js LTS (>=18)
- pnpm (>=8)

## Instalación

```bash
pnpm install
```

## Comandos principales

En la raíz se usan scripts de Turborepo que delegan a cada paquete.

```bash
# Desarrollo (backend + frontend en paralelo)
pnpm dev

# Build de todos los paquetes (respeta dependencias)
pnpm build

# Tests (api usa Jest, web usa Vitest)
pnpm test

# Type checking en todos los paquetes
pnpm typecheck

# Lint (si defines scripts lint en cada paquete)
pnpm lint
```

Dentro de cada paquete:

```bash
# API
pnpm --filter @separate-tracks/api build
pnpm --filter @separate-tracks/api dev     # modo watch (webpack + nodemon)
pnpm --filter @separate-tracks/api start   # ejecutar build compilado

# Web
pnpm --filter @separate-tracks/web dev
pnpm --filter @separate-tracks/web build
pnpm --filter @separate-tracks/web preview

# Shared Types
pnpm --filter @separate-tracks/shared-types build
```

## Librería compartida

`shared-types` expone interfaces reutilizables. Ejemplo:

```ts
import type { User } from '@separate-tracks/shared-types';
```

Para nuevas libs puedes crear carpeta + `package.json` + `tsconfig` y añadir script `build`.

## Añadir nuevas apps

1. Crea carpeta `apps/nueva-app` (o raíz al mismo nivel) con su `package.json`.
2. Añade scripts (`dev`, `build`, etc.).
3. Agrega dependencias y referencias TS si aplica.
4. Turborepo detectará automáticamente si los scripts comparten nombres (build/dev) y ejecutará en orden según dependencias (`dependencies`/`devDependencies`).

## Ejecución paralela

Turborepo ejecuta en paralelo por defecto cuando no hay dependencia directa. Para filtrar:

```bash
pnpm turbo run dev --filter="@separate-tracks/web"
```

## Lint y formato

Define `lint` en cada paquete (por ejemplo `eslint . --ext .ts,.tsx`). Luego:

```bash
pnpm lint
```

## Caching e incrementales

Turborepo cachea outputs declarados (ver `turbo.json`). Para limpiar cache local:
```bash
rm -rf .turbo
```
O con variable de entorno:
```bash
TURBO_FORCE=true pnpm build
```

## Variables de entorno

Puedes crear un archivo `.env` dentro de `api` o `web` e integrarlo según tus necesidades (por ejemplo usando `@nestjs/config` en `api` o `import.meta.env` en Vite).

## CI/CD

En CI típicamente:
```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```
Puedes habilitar cache remoto (Vercel Remote Cache) ejecutando:
```bash
pnpm turbo login
pnpm turbo link
```

## Referencias

- Turborepo: https://turbo.build/repo
- NestJS: https://docs.nestjs.com
- React: https://react.dev
- Vite: https://vite.dev

---

> Este README se centra en el flujo de trabajo práctico diario para este monorepo.
