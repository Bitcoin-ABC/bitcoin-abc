# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Multi-stage
# 1) rust image for ecash-lib WASM build
# 2) Node image for prod deployment of the-overmind

# 1) rust image for ecash-lib
FROM rust:1.87.0 AS wasmbuilder

RUN apt-get update \
    && apt-get install clang binaryen -y \
    && rustup target add wasm32-unknown-unknown \
    && cargo install -f --locked wasm-bindgen-cli@0.2.92

# Copy entire monorepo - this makes us robust against future Rust dependency changes
# The Rust workspace often has changing context and we don't want that to break CI deployments
WORKDIR /app/
COPY . .

# Build web assembly for ecash-lib
WORKDIR /app/modules/ecash-lib-wasm
RUN CC=clang ./build-wasm.sh

# 2) Node image for prod deployment of the-overmind

FROM node:22-trixie-slim

# Install pnpm
RUN npm install -g pnpm

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
COPY modules/ecash-wallet/package.json ./modules/ecash-wallet/
COPY modules/ecashaddrjs/package.json ./modules/ecashaddrjs/
COPY apps/the-overmind/package.json ./apps/the-overmind/

# Fetch dependencies (pnpm best practice for Docker)
RUN pnpm fetch --frozen-lockfile

# Copy source files (ecash-lib already copied from wasmbuilder with WASM built in src/ffi)
COPY modules/b58-ts/ ./modules/b58-ts/
COPY modules/chronik-client/ ./modules/chronik-client/
COPY modules/ecash-lib/ ./modules/ecash-lib/
COPY modules/ecash-wallet/ ./modules/ecash-wallet/
COPY modules/ecashaddrjs/ ./modules/ecashaddrjs/
COPY apps/the-overmind/ ./apps/the-overmind/

# Install dependencies for local modules first
RUN pnpm install --frozen-lockfile --offline --filter b58-ts...
RUN pnpm install --frozen-lockfile --offline --filter chronik-client...
RUN pnpm install --frozen-lockfile --offline --filter ecash-wallet...
RUN pnpm install --frozen-lockfile --offline --filter ecashaddrjs...

# Build local modules
RUN pnpm --filter b58-ts run build
RUN pnpm --filter chronik-client run build
RUN pnpm --filter ecash-lib run build
RUN pnpm --filter ecash-wallet run build
RUN pnpm --filter ecashaddrjs run build

# Install dependencies for the-overmind (now that local modules are built)
RUN pnpm install --frozen-lockfile --offline --filter the-overmind...

# Build the-overmind from monorepo root
RUN pnpm --filter the-overmind run build

# the-overmind runs with "node dist/index.js" from the app directory
# It uses .env file for configuration (TELEGRAM_BOT_TOKEN, DATABASE_URL, etc.)
WORKDIR /app/apps/the-overmind
CMD [ "node", "dist/index.js" ]
