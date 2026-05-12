# Copyright (c) 2026 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
#
# Next.js documentation hub at web/docs.e.cash (same pattern as e.cash.Dockerfile).

FROM node:22-trixie-slim
WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

COPY modules/ecashaddrjs ./modules/ecashaddrjs
COPY modules/chronik-client ./modules/chronik-client
COPY web/docs.e.cash ./web/docs.e.cash
COPY CMakeLists.txt .

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY modules/ecashaddrjs/ ./modules/ecashaddrjs/
COPY modules/chronik-client/ ./modules/chronik-client/

RUN pnpm \
  --filter ecashaddrjs \
  --filter chronik-client \
  --filter docs.e.cash \
  run build

EXPOSE 3000

CMD ["pnpm", "--filter", "docs.e.cash", "start"]
