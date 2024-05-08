# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Node image for running npm publish

FROM node:20-buster-slim

# Build all local dependencies

# ecashaddrjs
WORKDIR /app/modules/ecashaddrjs
COPY modules/ecashaddrjs/ .
RUN npm ci
RUN npm run build

# Build mock-chronik-client

WORKDIR /app/modules/mock-chronik-client

# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY modules/mock-chronik-client/package.json .
COPY modules/mock-chronik-client/package-lock.json .
RUN npm ci

# Copy the rest of the project files
COPY . .

# Publish the module
CMD [ "npm", "publish" ]
