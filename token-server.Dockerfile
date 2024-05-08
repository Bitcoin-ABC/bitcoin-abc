# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Node image for prod deployment of token-server

FROM node:20-buster-slim

# Build all local token-server dependencies

# ecashaddrjs
WORKDIR /app/modules/ecashaddrjs
COPY modules/ecashaddrjs/ .
RUN npm ci
RUN npm run build

# chronik-client
WORKDIR /app/modules/chronik-client
COPY modules/chronik-client/ .
RUN npm ci
RUN npm run build

# ecash-coinselect
WORKDIR /app/modules/ecash-coinselect
COPY modules/ecash-coinselect/ .
RUN npm ci

# Now that local dependencies are ready, build token-server
WORKDIR /app/apps/token-server

# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY apps/token-server/package.json .
COPY apps/token-server/package-lock.json .
RUN npm ci

# Copy the rest of the project files
COPY apps/token-server/ .

# Compile typescript. Outputs to dist/ dir
RUN npm run build

# token-server runs with "node dist/index.js"
CMD [ "node", "dist/index.js" ]
