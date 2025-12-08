# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Node image for running npm publish

FROM node:22-bookworm-slim

# Install pnpm
RUN npm install -g pnpm

# Set CI environment variable to avoid pnpm TTY prompts
ENV CI=true

# Set working directory to monorepo root
WORKDIR /app

# Copy workspace files (required for pnpm workspace)
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

# Copy module package.json for dependency resolution
COPY modules/mock-chronik-client/package.json ./modules/mock-chronik-client/

# Copy module source files
COPY modules/mock-chronik-client/ ./modules/mock-chronik-client/

# Install ecashaddrjs from npm, so that module users install it automatically
RUN pnpm add ecashaddrjs@latest --filter mock-chronik-client
# Install chronik-client from npm, so that module users install it automatically
# Note that in practice any user of chronik-client probably already has chronik-client installed
# So it won't really be bloating their node_modules
RUN pnpm add chronik-client@latest --filter mock-chronik-client
# Install dependencies (no --frozen-lockfile since pnpm add modified package.json)
RUN pnpm install --filter mock-chronik-client...
RUN pnpm --filter mock-chronik-client run build

# Publish the module (from monorepo root using filter)
CMD [ "pnpm", "--filter", "mock-chronik-client", "publish" ]
