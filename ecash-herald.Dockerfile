# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Multi-stage
# 1) rust image for ecash-lib
# 2) Node image for prod deployment of ecash-lib

# 1) rust image for ecash-lib
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

# 2) Node image for prod deployment of token-server

# Node image for prod deployment of ecash-herald

FROM node:22-bookworm-slim

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
COPY modules/ecashaddrjs/package.json ./modules/ecashaddrjs/
COPY modules/chronik-client/package.json ./modules/chronik-client/
COPY modules/b58-ts/package.json ./modules/b58-ts/
COPY modules/ecash-lib/package.json ./modules/ecash-lib/
COPY modules/ecash-wallet/package.json ./modules/ecash-wallet/
COPY modules/ecash-agora/package.json ./modules/ecash-agora/
COPY modules/mock-chronik-client/package.json ./modules/mock-chronik-client/
COPY apps/ecash-herald/package.json ./apps/ecash-herald/

# Fetch dependencies (pnpm best practice for Docker)
RUN pnpm fetch --frozen-lockfile

# Copy source files
COPY modules/ecashaddrjs/ ./modules/ecashaddrjs/
COPY modules/chronik-client/ ./modules/chronik-client/
COPY modules/b58-ts/ ./modules/b58-ts/
COPY modules/ecash-lib/ ./modules/ecash-lib/
COPY modules/ecash-wallet/ ./modules/ecash-wallet/
COPY modules/ecash-agora/ ./modules/ecash-agora/
COPY modules/mock-chronik-client/ ./modules/mock-chronik-client/
COPY apps/ecash-herald/ ./apps/ecash-herald/

# Install dependencies for local modules first
RUN pnpm install --frozen-lockfile --offline --filter b58-ts...
RUN pnpm install --frozen-lockfile --offline --filter ecashaddrjs...
RUN pnpm install --frozen-lockfile --offline --filter chronik-client...
RUN pnpm install --frozen-lockfile --offline --filter ecash-lib...
RUN pnpm install --frozen-lockfile --offline --filter ecash-wallet...
RUN pnpm install --frozen-lockfile --offline --filter ecash-agora...
RUN pnpm install --frozen-lockfile --offline --filter mock-chronik-client...

# Build local modules
RUN pnpm --filter b58-ts run build
RUN pnpm --filter ecashaddrjs run build
RUN pnpm --filter chronik-client run build
RUN pnpm --filter ecash-lib run build
RUN pnpm --filter ecash-wallet run build
RUN pnpm --filter ecash-agora run build
RUN pnpm --filter mock-chronik-client run build

# Install dependencies for ecash-herald (now that local modules are built)
RUN pnpm install --frozen-lockfile --offline --filter ecash-herald...

# Build ecash-herald from monorepo root
RUN pnpm --filter ecash-herald run build

# ecash-herald runs with "node dist/index.js"
CMD [ "node", "dist/index.js" ]
