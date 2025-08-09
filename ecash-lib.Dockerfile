# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

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

# Stage 2 - Node image for running npm publish
FROM node:22-bookworm-slim

# Copy static assets from wasmbuilder stage (ecash-lib-wasm and ecash-lib, with wasm built in place)
WORKDIR /app/modules
COPY --from=wasmbuilder /app/modules .

# Build ecash-lib
WORKDIR /app/modules/ecash-lib
# Install b58-ts from npm, so that module users install it automatically
RUN npm install b58-ts@latest
# Install ecashaddrjs from npm, so that module users install it automatically
RUN npm install ecashaddrjs@latest
# Install chronik-client from npm, so that module users install it automatically
RUN npm install -D chronik-client@latest
RUN npm ci
RUN npm run build

# Publish ecash-lib
CMD [ "npm", "publish" ]
