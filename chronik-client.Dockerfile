# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Node image for running npm publish

FROM node:20-bookworm-slim

# Build chronik-client
WORKDIR /app/modules/chronik-client

# Copy all project files as they are required for building
COPY modules/chronik-client .
# Install ecashaddrjs from npm, so that module users install it automatically
RUN npm install ecashaddrjs@2.0.0
RUN npm ci

# Publish the module
# Note this will also npm run build, as this is the prepublish script
CMD [ "npm", "publish" ]
