# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Multi-stage
# 1) rust image for ecash-lib
# 2) Node image for notifications-server

FROM rust:1.87.0 AS wasmbuilder

RUN apt-get update \
  && apt-get install clang binaryen -y \
  && rustup target add wasm32-unknown-unknown \
  && cargo install -f --locked wasm-bindgen-cli@0.2.92

WORKDIR /app/
COPY Cargo.toml .

WORKDIR /app/chronik/
COPY chronik/ .

WORKDIR /app/web/explorer
COPY web/explorer/ .

WORKDIR /app/modules/bitcoinsuite-chronik-client
COPY modules/bitcoinsuite-chronik-client/ .

WORKDIR /app/modules/avalanche-lib-wasm
COPY modules/avalanche-lib-wasm/ .

WORKDIR /app/apps/proof-manager-cli
COPY apps/proof-manager-cli/ .

WORKDIR /app/src/secp256k1
COPY src/secp256k1/ .

WORKDIR /app/modules/ecash-secp256k1
COPY modules/ecash-secp256k1 .
WORKDIR /app/modules/ecash-lib
COPY modules/ecash-lib .
WORKDIR /app/modules/ecash-lib-wasm
COPY modules/ecash-lib-wasm .

RUN CC=clang ./build-wasm.sh

FROM node:22-bookworm-slim

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

COPY --from=wasmbuilder /app/modules ./modules

COPY modules/ecashaddrjs/package.json ./modules/ecashaddrjs/
COPY modules/chronik-client/package.json ./modules/chronik-client/
COPY modules/b58-ts/package.json ./modules/b58-ts/
COPY modules/ecash-lib/package.json ./modules/ecash-lib/
COPY modules/ecash-agora/package.json ./modules/ecash-agora/
COPY modules/ecash-parse/package.json ./modules/ecash-parse/
COPY apps/notifications-server/package.json ./apps/notifications-server/

RUN pnpm fetch --frozen-lockfile

COPY modules/ecashaddrjs/ ./modules/ecashaddrjs/
COPY modules/chronik-client/ ./modules/chronik-client/
COPY modules/b58-ts/ ./modules/b58-ts/
COPY modules/ecash-lib/ ./modules/ecash-lib/
COPY modules/ecash-agora/ ./modules/ecash-agora/
COPY modules/ecash-parse/ ./modules/ecash-parse/
COPY apps/notifications-server/ ./apps/notifications-server/

RUN pnpm install --frozen-lockfile --offline \
  --filter b58-ts... \
  --filter ecashaddrjs... \
  --filter chronik-client... \
  --filter ecash-lib... \
  --filter ecash-agora... \
  --filter ecash-parse... \
  --filter notifications-server...

RUN pnpm \
  --filter b58-ts \
  --filter ecashaddrjs \
  --filter chronik-client \
  --filter ecash-lib \
  --filter ecash-agora \
  --filter ecash-parse \
  --filter notifications-server \
  run build

EXPOSE 3020

WORKDIR /app/apps/notifications-server
CMD [ "node", "dist/index.js" ]
