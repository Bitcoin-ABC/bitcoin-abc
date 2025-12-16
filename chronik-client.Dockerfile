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

# Copy module source files
COPY modules/chronik-client/ ./modules/chronik-client/

# Install ecashaddrjs from npm, so that module users install it automatically
RUN pnpm add ecashaddrjs@latest --filter chronik-client
# Install dependencies (no --frozen-lockfile since pnpm add modified package.json)
RUN pnpm install --filter chronik-client...

# Build the module
RUN pnpm --filter chronik-client run build

# Publish the module (from monorepo root using filter)
CMD [ "pnpm", "--filter", "chronik-client", "publish" ]
