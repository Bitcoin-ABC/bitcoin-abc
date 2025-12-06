# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

FROM node:22-bookworm-slim

# Install pnpm
RUN npm install -g pnpm

# Set working directory to monorepo root
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

# Copy package.json files for dependency resolution
COPY apps/token-server/package.json ./apps/token-server/

# Fetch dependencies (pnpm best practice for Docker)
RUN pnpm fetch --frozen-lockfile

# Copy source files
COPY apps/token-server/ ./apps/token-server/

# Install dependencies for token-server
RUN pnpm install --frozen-lockfile --offline --filter token-server...

# Build token-server from monorepo root
RUN pnpm --filter token-server run build

# token-server runs with "node dist/index.js"
CMD [ "node", "dist/index.js" ]
