# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Dockerfile for deploying charts.e.cash with Vercel in CI/CD

FROM node:20-bookworm-slim

WORKDIR /app

COPY web/charts.e.cash/package*.json ./
RUN npm ci
COPY web/charts.e.cash .
