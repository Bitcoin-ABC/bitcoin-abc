# Multi-stage
# 1) rust image for ecash-lib
# 2) Node image for building and running the app

# Stage 1 - rust machine for building ecash-lib-wasm
FROM rust:1.87.0 AS wasmbuilder

RUN apt-get update \
  && apt-get install clang binaryen -y \
  && rustup target add wasm32-unknown-unknown \
  && cargo install -f --locked wasm-bindgen-cli@0.2.92

# Copy Cargo.toml
WORKDIR /app/
COPY Cargo.toml .

# Copy chronik to same directory structure as monorepo
# This needs to be in place to run ./build-wasm
WORKDIR /app/chronik/
COPY chronik/ .

# explorer must be in place to to run ./build-wasm as it is a workspace member
WORKDIR /app/web/explorer
COPY web/explorer/ .

# bitcoinsuite-chronik-client must be in place to to run ./build-wasm as it is a workspace member
WORKDIR /app/modules/bitcoinsuite-chronik-client
COPY modules/bitcoinsuite-chronik-client/ .

# avalanche-lib-wasm must be in place to to run ./build-wasm as it is a workspace member
WORKDIR /app/modules/avalanche-lib-wasm
COPY modules/avalanche-lib-wasm/ .

# proof-manager-cli must be in place to to run ./build-wasm as it is a workspace member
WORKDIR /app/apps/proof-manager-cli
COPY apps/proof-manager-cli/ .

# Copy secp256k1 to same directory structure as monorepo
WORKDIR /app/src/secp256k1
COPY src/secp256k1/ .

# Copy ecash-secp256k1, ecash-lib and ecash-lib-wasm files to same directory structure as monorepo
WORKDIR /app/modules/ecash-secp256k1
COPY modules/ecash-secp256k1 .
WORKDIR /app/modules/ecash-lib
COPY modules/ecash-lib .
WORKDIR /app/modules/ecash-lib-wasm
COPY modules/ecash-lib-wasm .

# Build web assembly for ecash-lib
RUN CC=clang ./build-wasm.sh

# Stage 2
FROM node:22-trixie-slim AS builder

# Install pnpm
RUN npm install -g pnpm@10.34.5

# Set working directory to monorepo root
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

# Copy static assets from wasmbuilder stage (ecash-lib-wasm and ecash-lib, with wasm built in place)
COPY --from=wasmbuilder /app/modules ./modules

# Copy package.json files for dependency resolution
COPY modules/b58-ts/package.json ./modules/b58-ts/
COPY modules/chronik-client/package.json ./modules/chronik-client/
COPY modules/ecashaddrjs/package.json ./modules/ecashaddrjs/
COPY modules/ecash-lib/package.json ./modules/ecash-lib/
COPY modules/ecash-price/package.json ./modules/ecash-price/
COPY modules/ecash-wallet/package.json ./modules/ecash-wallet/
COPY modules/mock-chronik-client/package.json ./modules/mock-chronik-client/

COPY apps/marlin-wallet/package.json ./apps/marlin-wallet/
COPY apps/marlin-wallet/web/package.json ./apps/marlin-wallet/web/

# Fetch dependencies (pnpm best practice for Docker)
RUN pnpm fetch --frozen-lockfile

# Copy source files
COPY modules/b58-ts/ ./modules/b58-ts/
COPY modules/chronik-client/ ./modules/chronik-client/
COPY modules/ecashaddrjs/ ./modules/ecashaddrjs/
COPY modules/ecash-lib/ ./modules/ecash-lib/
COPY modules/ecash-price/ ./modules/ecash-price/
COPY modules/ecash-wallet/ ./modules/ecash-wallet/
COPY modules/mock-chronik-client/ ./modules/mock-chronik-client/

COPY apps/marlin-wallet/ ./apps/marlin-wallet/

# From this point dependencies ordering matters
# Install dependencies for local modules first
RUN pnpm install --frozen-lockfile --offline --filter b58-ts...
RUN pnpm install --frozen-lockfile --offline --filter ecashaddrjs...
RUN pnpm install --frozen-lockfile --offline --filter chronik-client...
RUN pnpm install --frozen-lockfile --offline --filter mock-chronik-client...
RUN pnpm install --frozen-lockfile --offline --filter ecash-lib...
RUN pnpm install --frozen-lockfile --offline --filter ecash-wallet...
RUN pnpm install --frozen-lockfile --offline --filter ecash-price...

# Build local modules
RUN pnpm --filter b58-ts run build
RUN pnpm --filter ecashaddrjs run build
RUN pnpm --filter chronik-client run build
RUN pnpm --filter mock-chronik-client run build
RUN pnpm --filter ecash-lib run build
RUN pnpm --filter ecash-wallet run build
RUN pnpm --filter ecash-price run build

# Install dependencies for marlin-wallet-web (now that local modules are built)
RUN pnpm install --frozen-lockfile --offline --filter marlin-wallet-web... --include-workspace-root

# Run marlin-wallet-web from monorepo root
CMD ["pnpm", "--filter", "MarlinWallet", "run", "web"]
