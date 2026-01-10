# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

FROM node:22-trixie-slim

# Install pnpm
RUN npm install -g pnpm

# Set working directory to monorepo root
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

# Copy package.json files for dependency resolution
COPY modules/ecashaddrjs/package.json ./modules/ecashaddrjs/
COPY modules/chronik-client/package.json ./modules/chronik-client/
COPY apps/metachronik/package.json ./apps/metachronik/

# Fetch dependencies (pnpm best practice for Docker)
RUN pnpm fetch --frozen-lockfile

# Copy source files
COPY modules/ecashaddrjs/ ./modules/ecashaddrjs/
COPY modules/chronik-client/ ./modules/chronik-client/
COPY apps/metachronik/ ./apps/metachronik/

# Install dependencies for local modules first
RUN pnpm install --frozen-lockfile --offline --filter ecashaddrjs...
RUN pnpm install --frozen-lockfile --offline --filter chronik-client...

# Build local modules (dependencies first)
RUN pnpm --filter ecashaddrjs run build
RUN pnpm --filter chronik-client run build

# Install dependencies for metachronik (now that local modules are built)
RUN pnpm install --frozen-lockfile --offline --filter metachronik...

# Build metachronik from monorepo root
RUN pnpm --filter metachronik run build

# metachronik runs with "node --max-old-space-size=4096 dist/index.js" from the app directory
# It uses .env file for configuration (DATABASE_URL, CHRONIK_URL, etc.)
WORKDIR /app/apps/metachronik
CMD [ "node", "--max-old-space-size=4096", "dist/index.js" ]
