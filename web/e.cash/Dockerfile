FROM node:22-bookworm-slim AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .
COPY web/e.cash/package.json ./web/e.cash/

# Fetch dependencies (pnpm best practice for Docker)
RUN pnpm fetch --frozen-lockfile

# Install dependencies
RUN pnpm install --frozen-lockfile --offline --filter e.cash...

FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY web/e.cash/ ./web/e.cash/

ARG PREVIEW_BUILD=next.config.ts
COPY web/e.cash/$PREVIEW_BUILD web/e.cash/next.config.ts

# Build from monorepo root
WORKDIR /app
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
