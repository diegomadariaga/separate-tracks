# syntax=docker/dockerfile:1
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/* && corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web/package.json apps/web/
RUN pnpm install --filter @apps/web... --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/web ./apps/web
# Build UI referenced project first (project references requirement)
RUN pnpm --filter @repo/ui build
# Build with env variable passed at build time (override at runtime by templating if needed)
ARG VITE_API_URL="http://localhost:3000"
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @apps/web build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html
# Remove default nginx static assets
RUN rm -rf ./*
COPY --from=build /app/apps/web/dist .
# nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# Healthcheck simple
HEALTHCHECK CMD wget -qO- http://localhost/ || exit 1
