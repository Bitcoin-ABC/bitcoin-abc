# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Node image for running npm publish

FROM node:22-trixie-slim

# Install pnpm
RUN npm install -g pnpm@11.0.8

# Set working directory to monorepo root
WORKDIR /app

# Copy workspace files (required for pnpm workspace)
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

COPY modules/mock-chronik-client ./modules/mock-chronik-client

COPY modules/ecashaddrjs ./modules/ecashaddrjs
COPY modules/chronik-client ./modules/chronik-client

RUN pnpm install --frozen-lockfile --ignore-scripts

RUN pnpm \
  --filter ecashaddrjs \
  --filter chronik-client \
  --filter mock-chronik-client \
  run build

# Publish the module (from monorepo root using filter)
CMD [ "pnpm", "--filter", "mock-chronik-client", "publish" ]
