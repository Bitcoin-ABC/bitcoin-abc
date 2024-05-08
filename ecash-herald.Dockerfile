# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Node image for prod deployment of ecash-herald

FROM node:20-buster-slim

# Build all local ecash-herald dependencies

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

# ecash-script
WORKDIR /app/modules/ecash-script
COPY modules/ecash-script/ .
RUN npm ci

# Now that local dependencies are ready, build ecash-herald
WORKDIR /app/apps/ecash-herald

# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY apps/ecash-herald/package.json .
COPY apps/ecash-herald/package-lock.json .
RUN npm ci

# Copy the rest of the project files
COPY apps/ecash-herald/ .

# ecash-herald runs with "node index.js"
CMD [ "node", "index.js" ]
