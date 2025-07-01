# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Dockerfile for deploying charts.e.cash with Vercel in CI/CD

FROM node:20-alpine

WORKDIR /app

COPY web/charts.e.cash/package*.json ./
RUN npm ci
COPY web/charts.e.cash .

CMD ["sh", "-c", "\
  npx vercel pull --yes --environment=$VERCEL_ENVIRONMENT --token=$VERCEL_TOKEN && \
  if [ $VERCEL_ENVIRONMENT = production ]; then \
    npx vercel build --token=$VERCEL_TOKEN --prod && \
    npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN; \
  else \
    npx vercel build --token=$VERCEL_TOKEN && \
    npx vercel deploy --prebuilt --token=$VERCEL_TOKEN; \
  fi \
"]
