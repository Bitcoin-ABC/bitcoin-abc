FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

# Copy package.json files for dependency resolution
COPY modules/ecashaddrjs/package.json ./modules/ecashaddrjs/
COPY modules/chronik-client/package.json ./modules/chronik-client/
COPY web/e.cash/package.json ./web/e.cash/

# Fetch dependencies (pnpm best practice for Docker)
RUN pnpm fetch --frozen-lockfile

# Copy source files for local modules
COPY modules/ecashaddrjs/ ./modules/ecashaddrjs/
COPY modules/chronik-client/ ./modules/chronik-client/

# Install dependencies for local modules first
RUN pnpm install --frozen-lockfile --offline --filter ecashaddrjs...
RUN pnpm install --frozen-lockfile --offline --filter chronik-client...

# Build local modules (dependencies first)
RUN pnpm --filter ecashaddrjs run build
RUN pnpm --filter chronik-client run build

# Install dependencies for e.cash (now that local modules are built)
RUN pnpm install --frozen-lockfile --offline --filter e.cash...

# Copy source files
COPY web/e.cash/ ./web/e.cash/

ARG PREVIEW_BUILD=next.config.ts
COPY web/e.cash/$PREVIEW_BUILD web/e.cash/next.config.ts

# Build from monorepo root
RUN pnpm --filter e.cash run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

# Copy built files
COPY --from=builder /app/web/e.cash/.next ./web/e.cash/.next
COPY --from=builder /app/web/e.cash/public ./web/e.cash/public
COPY --from=builder /app/web/e.cash/package.json ./web/e.cash/package.json
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/web/e.cash
EXPOSE 3000
CMD ["pnpm", "start"]
