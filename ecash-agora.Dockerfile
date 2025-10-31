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
RUN ECLIB_VERSION=$(npm view ecash-lib version) \
    && CCLIENT_VERSION=$(npm view chronik-client version) \
    && EWALLET_VERSION=$(npm view ecash-wallet version) \
    && echo "Latest versions from npm:" \
    && echo "  ecash-lib: $ECLIB_VERSION" \
    && echo "  chronik-client: $CCLIENT_VERSION" \
    && echo "  ecash-wallet: $EWALLET_VERSION" \
    && npm pkg set dependencies.ecash-lib=$ECLIB_VERSION \
    && npm pkg set dependencies.chronik-client=$CCLIENT_VERSION \
    && npm pkg set dependencies.ecash-wallet=$EWALLET_VERSION \
    && echo "Updated package.json dependencies:" \
    && cat package.json | grep -A 5 '"dependencies"'

# Clean existing lockfile that may contain local file: refs, then install and build
RUN rm -f package-lock.json \
    && npm install \
    && npm run build

# Publish ecash-agora
CMD [ "npm", "publish" ]
