# Copyright (c) 2024-2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Node image for running npm publish

# Note we do not need the wasmbuilder stage here
# as we pull ecash-lib from npmjs for publishing ecash-agora
FROM node:22-bookworm-slim

WORKDIR /app/modules/ecash-agora
COPY modules/ecash-agora .

# Replace local file: dependencies with npm registry versions to avoid workspace/file resolution in Docker
RUN npm pkg set dependencies.ecash-lib=latest \
    && npm pkg set dependencies.chronik-client=latest \
    && npm pkg delete dependencies.ecash-wallet \
    && npm pkg set devDependencies.ecash-wallet=latest

# Clean existing lockfile that may contain local file: refs, then install and build
RUN rm -f package-lock.json \
    && npm install \
    && npm run build

# Publish ecash-agora
CMD [ "npm", "publish" ]
