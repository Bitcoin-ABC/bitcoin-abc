#!/usr/bin/env bash
# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Build and install local workspace dependencies required for Cashtab.
# Keep in sync with the module install/build order in cashtab.Dockerfile.

export LC_ALL=C.UTF-8
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Installing Cashtab dependencies..."
echo "Repository root: $REPO_ROOT"

echo "Building ecash-lib-wasm..."
pushd "$REPO_ROOT/modules/ecash-lib-wasm" > /dev/null
./dockerbuild.sh
popd > /dev/null

pushd "$REPO_ROOT" > /dev/null

echo "Installing workspace dependencies..."
pnpm fetch --frozen-lockfile
pnpm install --frozen-lockfile --filter b58-ts...
pnpm install --frozen-lockfile --filter ecashaddrjs...
pnpm install --frozen-lockfile --filter chronik-client...
pnpm install --frozen-lockfile --filter mock-chronik-client...
pnpm install --frozen-lockfile --filter ecash-lib...
pnpm install --frozen-lockfile --filter ecash-wallet...
pnpm install --frozen-lockfile --filter ecash-agora...
pnpm install --frozen-lockfile --filter ecash-parse...
pnpm install --frozen-lockfile --filter cashtab... --include-workspace-root

echo "Building local modules..."
pnpm --filter b58-ts run build
pnpm --filter ecashaddrjs run build
pnpm --filter chronik-client run build
pnpm --filter mock-chronik-client run build
pnpm --filter ecash-lib run build
pnpm --filter ecash-wallet run build
pnpm --filter ecash-agora run build
pnpm --filter ecash-parse run build

popd > /dev/null

echo "All dependencies installed and built successfully!"
echo "You can now run 'pnpm start' from the cashtab directory"
