# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Stage 1 - rust machine for building ecash-lib-wasm
FROM rust:1.76.0 AS WasmBuilder

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

# Copy ecash-lib and ecash-lib-wasm files to same directory structure as monorepo
WORKDIR /app/modules/ecash-lib
COPY modules/ecash-lib .
WORKDIR /app/modules/ecash-lib-wasm
COPY modules/ecash-lib-wasm .

# Build web assembly for ecash-lib
RUN ./build-wasm.sh

# Stage 2 - Node image for running npm publish
FROM node:20-buster-slim

# Copy static assets from WasmBuilder stage (ecash-lib-wasm and ecash-lib, with wasm built in place)
WORKDIR /app/modules
COPY --from=WasmBuilder /app/modules .

# Build out local dependencies of ecash-lib

# chronik-client
WORKDIR /app/modules/chronik-client
COPY modules/chronik-client/ .
RUN npm ci
RUN npm run build

# Build ecash-lib
WORKDIR /app/modules/ecash-lib
RUN npm ci
RUN npm run build

# Publish ecash-lib
CMD [ "npm", "publish" ]
