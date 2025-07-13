# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Multi-stage
# 1) rust image for ecash-lib
# 2) Node image for prod deployment of cashtab-faucet

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

# 2) Node image for prod deployment of cashtab-faucet

FROM node:20-bookworm-slim

# Copy static assets from wasmbuilder stage (ecash-lib-wasm and ecash-lib, with wasm built in place)
WORKDIR /app/modules
COPY --from=wasmbuilder /app/modules .

# Build all local cashtab-faucet dependencies

# ecashaddrjs
WORKDIR /app/modules/ecashaddrjs
COPY modules/ecashaddrjs/ .
RUN npm ci
RUN npm run build

# chronik-client
WORKDIR /app/modules/chronik-client
COPY modules/chronik-client/ .
RUN npm ci
RUN npm run build

# b58-ts (required for ecash-lib)
WORKDIR /app/modules/b58-ts
COPY modules/b58-ts .
RUN npm ci

# ecash-lib
WORKDIR /app/modules/ecash-lib
RUN npm ci
RUN npm run build

# Now that local dependencies are ready, build cashtab-faucet
WORKDIR /app/apps/cashtab-faucet

# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY apps/cashtab-faucet/package.json .
COPY apps/cashtab-faucet/package-lock.json .
RUN npm ci

# Copy the rest of the project files
COPY apps/cashtab-faucet/ .

# Compile typescript. Outputs to dist/ dir
RUN npm run build

# cashtab-faucet runs with "node dist/index.js"
CMD [ "node", "dist/index.js" ]
