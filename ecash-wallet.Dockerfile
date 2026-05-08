# Copyright (c) 2025-2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
#
# Multi-stage:
# 1) Rust image builds ecash-lib WASM (same layout as cashtab.Dockerfile)
# 2) Node image installs local file: deps, builds modules, publishes ecash-wallet

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

# Stage 2 - Node image for building and publishing ecash-wallet
FROM node:22-trixie-slim

# Install pnpm
RUN npm install -g pnpm@11.0.8

# Copy ecash-wallet and local dependencies (ecash-lib comes from wasmbuilder with WASM built)
WORKDIR /app

# We need the workspace file to install the workspace dependencies
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

COPY modules/ecash-wallet ./modules/ecash-wallet

COPY modules/ecashaddrjs ./modules/ecashaddrjs
COPY modules/b58-ts ./modules/b58-ts
COPY modules/chronik-client ./modules/chronik-client
COPY modules/mock-chronik-client ./modules/mock-chronik-client
COPY --from=wasmbuilder /app/modules/ecash-lib ./modules/ecash-lib

# Install deps (--ignore-scripts avoids pnpm blocked lifecycle scripts on registry packages).
# Local packages still need their dist/ output; install+build each in dependency order.
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build the dependencies in order, then ecash-wallet
RUN pnpm \
  --filter ecashaddrjs \
  --filter b58-ts \
  --filter chronik-client \
  --filter ecash-lib \
  --filter mock-chronik-client \
  --filter ecash-wallet \
  run build

# Publish ecash-wallet
CMD [ "pnpm", "--filter", "ecash-wallet", "publish" ]
