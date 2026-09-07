# Copyright (c) 2026 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

FROM node:22-trixie-slim
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@11.0.8

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

# Copy source files for local modules
COPY modules/ecashaddrjs/ ./modules/ecashaddrjs
COPY modules/chronik-client/ ./modules/chronik-client
# Copy source files
COPY web/e.cash/ ./web/e.cash

ARG PREVIEW_BUILD=next.config.ts
COPY web/e.cash/$PREVIEW_BUILD ./web/e.cash/next.config.ts

# Create the .env file if it doesn't exist
RUN if [ ! -f web/e.cash/.env ]; then cp web/e.cash/env.sample web/e.cash/.env; fi

RUN pnpm install --frozen-lockfile --ignore-scripts

# Build local modules (dependencies first)
RUN pnpm \
  --filter ecashaddrjs \
  --filter chronik-client \
  --filter e.cash \
  run build

EXPOSE 3000

CMD ["pnpm", "--filter", "e.cash", "start"]
