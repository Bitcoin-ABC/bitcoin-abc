# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

FROM node:20-bookworm-slim

# Note token-server has no local dependencies
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
