# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Dockerfile for deploying charts.e.cash with Vercel in CI/CD

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
COPY web/charts.e.cash/package.json ./web/charts.e.cash/

# Copy vercel.json from app subdir to root (necessary for our pnpm CI)
COPY web/charts.e.cash/vercel.json ./vercel.json

# Fetch dependencies (pnpm best practice for Docker)
RUN pnpm fetch --frozen-lockfile

# Copy source files
COPY web/charts.e.cash/ ./web/charts.e.cash/

# Install dependencies offline (using cached packages) - only for charts-e-cash and its dependencies
RUN pnpm install --frozen-lockfile --offline --filter charts-e-cash...

# Vercel production deploy
CMD ["sh", "-c", " \
  npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN && \
  npx vercel build --token=$VERCEL_TOKEN --prod && \
  npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN \
  "]
