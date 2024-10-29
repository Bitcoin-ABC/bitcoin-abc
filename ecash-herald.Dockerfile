# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Multi-stage
# 1) rust image for ecash-lib
# 2) Node image for prod deployment of ecash-lib

# 1) rust image for ecash-lib
FROM rust:1.76.0 AS wasmbuilder

RUN apt-get update \
  && apt-get install clang binaryen -y \
  && rustup target add wasm32-unknown-unknown \
  && cargo install -f wasm-bindgen-cli@0.2.92

# Copy Cargo.toml
WORKDIR /app/
COPY Cargo.toml .

# Copy chronik to same directory structure as monorepo
# This needs to be in place to run ./build-wasm
WORKDIR /app/chronik/
COPY chronik/ .

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
RUN ./build-wasm.sh

# 2) Node image for prod deployment of token-server

# Node image for prod deployment of ecash-herald

FROM node:20-bookworm-slim

# Copy static assets from WasmBuilder stage (ecash-lib-wasm and ecash-lib, with wasm built in place)
WORKDIR /app/modules
COPY --from=WasmBuilder /app/modules .

# Build all local ecash-herald dependencies

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

# ecash-script
WORKDIR /app/modules/ecash-script
COPY modules/ecash-script/ .
RUN npm ci

# ecash-lib
WORKDIR /app/modules/ecash-lib
RUN npm ci
RUN npm run build

# ecash-agora
WORKDIR /app/modules/ecash-agora
COPY modules/ecash-agora/ .
RUN npm ci
RUN npm run build

# Now that local dependencies are ready, build ecash-herald
WORKDIR /app/apps/ecash-herald

# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY apps/ecash-herald/package.json .
COPY apps/ecash-herald/package-lock.json .
RUN npm ci

# Copy the rest of the project files
COPY apps/ecash-herald/ .

# ecash-herald runs with "node index.js"
CMD [ "node", "index.js" ]
