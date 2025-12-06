# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Node image for running npm publish

FROM node:22-bookworm-slim

# Install pnpm
RUN npm install -g pnpm

# Build chronik-client
WORKDIR /app/modules/chronik-client

# Copy all project files as they are required for building
COPY modules/chronik-client .
# Install ecashaddrjs from npm, so that module users install it automatically
RUN pnpm add ecashaddrjs@latest
# Install dependencies (no --frozen-lockfile since pnpm add modified package.json)
RUN pnpm install

# Publish the module
# Note this will also pnpm run build, as this is the prepublish script
CMD [ "pnpm", "publish" ]
