FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
# better-sqlite3 compila binario nativo: precisa de toolchain na imagem de build.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && pnpm install --frozen-lockfile --filter api... \
    && rm -rf /var/lib/apt/lists/*

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 3333
CMD ["node", "src/index.ts"]
