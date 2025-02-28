# Multi-stage
# 1) rust image for ecash-lib
# 2) Node image for building frontend assets
# 3) nginx stage to serve frontend assets

# Stage 1 - rust machine for building ecash-lib-wasm
FROM rust:1.76.0 AS wasmbuilder

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

# Stage 2
FROM node:20-bookworm-slim AS builder

# Copy static assets from wasmbuilder stage (ecash-lib-wasm and ecash-lib, with wasm built in place)
WORKDIR /app/modules
COPY --from=wasmbuilder /app/modules .

# Build all local Cashtab dependencies

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

# mock-chronik-client
WORKDIR /app/modules/mock-chronik-client
COPY modules/mock-chronik-client/ .
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

# ecash-agora
WORKDIR /app/modules/ecash-agora
COPY modules/ecash-agora/ .
RUN npm ci
RUN npm run build

# ecash-script
WORKDIR /app/modules/ecash-script
COPY modules/ecash-script/ .
RUN npm ci

# Now that local dependencies are ready, build cashtab
WORKDIR /app/cashtab
# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY cashtab/package.json .
COPY cashtab/package-lock.json .

# Docker should not rebuild deps just because package.json version bump
# So, always keep package.json and package-lock.json at 1.0.0 in the docker image
# Note: it will be overwritten before npm run build by the latest package.json
RUN npm version --allow-same-version 1.0.0
RUN npm ci

# Copy the rest of the project files and build
COPY cashtab/ .
RUN npm run build

# Stage 3
FROM nginx

ARG NGINX_CONF=nginx.conf

COPY cashtab/$NGINX_CONF /etc/nginx/conf.d/default.conf
# Set working directory to nginx asset directory
# Copy static assets from builder stage
COPY --from=builder /app/cashtab/build /usr/share/nginx/html/
# Containers run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]
