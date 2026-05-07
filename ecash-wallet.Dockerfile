# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Stage 1 - Node image for running npm publish
# Note we do not need the wasmbuilder stage here
# as we pull ecash-lib from npmjs for publishing ecash-wallet
FROM node:22-trixie-slim

# Install pnpm and TypeScript (at version used in local ecash-wallet)for build step
RUN npm install -g pnpm@11.0.8 typescript@5.9.3

# Copy ecash-wallet and local dependencies
WORKDIR /app
COPY modules/ecash-wallet ./modules/ecash-wallet
COPY modules/ecash-lib ./modules/ecash-lib
COPY modules/chronik-client ./modules/chronik-client
COPY modules/ecashaddrjs ./modules/ecashaddrjs
COPY modules/b58-ts ./modules/b58-ts
COPY modules/mock-chronik-client ./modules/mock-chronik-client

WORKDIR /app/modules/ecash-wallet

# Install deps (--ignore-scripts avoids pnpm blocked lifecycle scripts on registry packages).
# Local packages still need their dist/ output; install+build each in dependency order.
RUN pnpm install --ignore-scripts

WORKDIR /app/modules/ecashaddrjs
RUN pnpm install --ignore-scripts && pnpm run build

WORKDIR /app/modules/b58-ts
RUN pnpm install --ignore-scripts && pnpm run build

WORKDIR /app/modules/chronik-client
RUN pnpm install --ignore-scripts && pnpm run build

WORKDIR /app/modules/ecash-lib
RUN pnpm install --ignore-scripts && pnpm run build

WORKDIR /app/modules/mock-chronik-client
RUN pnpm install --ignore-scripts && pnpm run build

WORKDIR /app/modules/ecash-wallet
RUN pnpm run build

# Rewrite dependencies to published packages for npm publish
RUN npm pkg set dependencies.ecash-lib='latest' \
    dependencies.chronik-client='latest' \
    devDependencies.mock-chronik-client='latest'

# Publish ecash-wallet
CMD [ "pnpm", "publish" ]
