# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Dockerfile for deploying metachronik with Railway in CI/CD

FROM node:22-bookworm-slim

WORKDIR /app/apps/metachronik
COPY apps/metachronik .
# Install chronik-client from npm, so that railway can build without monorepo context
RUN npm install chronik-client@latest
RUN npm ci

# Build metachronik
RUN npm run build
