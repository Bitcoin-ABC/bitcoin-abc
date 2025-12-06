# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Stage 1 - Node image for running npm publish
# Note we do not need the wasmbuilder stage here
# as we pull ecash-lib from npmjs for publishing ecash-wallet
FROM node:22-bookworm-slim

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app/modules/ecash-wallet
COPY modules/ecash-wallet .
# Install ecash-lib from npm, so that module users install it automatically
RUN pnpm add ecash-lib@latest
# Install chronik-client from npm, so that module users install it automatically
RUN pnpm add chronik-client@latest
# Install the rest of dependencies (no --frozen-lockfile since pnpm add modified package.json)
RUN pnpm install
# Build ecash-wallet
RUN pnpm run build

# Publish ecash-wallet
CMD [ "pnpm", "publish" ]
