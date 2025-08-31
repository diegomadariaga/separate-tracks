# syntax=docker/dockerfile:1

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# Install dependencies only (monorepo) and build API
FROM base AS build
COPY pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api/package.json apps/api/
RUN pnpm install --filter @apps/api... --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter @apps/api build

# Runtime image
FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
# Copy lock & workspace metadata for tooling (optional)
COPY pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml ./
# Copy built dist and needed node_modules for prod
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
# Directory for uploads
RUN mkdir -p /data/uploads
VOLUME ["/data/uploads"]
ENV UPLOADS_DIR=/data/uploads
EXPOSE 3000
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
