# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Stage 1 - Node image for running npm publish
# Note we do not need the wasmbuilder stage here
# as we pull ecash-lib from npmjs for publishing ecash-agora
FROM node:20-bookworm-slim

WORKDIR /app/modules/ecash-agora
COPY modules/ecash-agora .
# Install ecash-lib from npm, so that module users install it automatically
RUN npm install ecash-lib@latest
# Install chronik-client from npm, so that module users install it automatically
RUN npm install chronik-client@latest
# Install the rest of dependencies
RUN npm ci
# Build ecash-agora
RUN npm run build

# Publish ecash-agora
CMD [ "npm", "publish" ]
