#!/usr/bin/env bash
# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8
set -euo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)

echo
echo "====== Building ecash-lib-wasm ======"
echo

pushd "${TOPLEVEL}/modules/ecash-lib-wasm" > /dev/null
./dockerbuild.sh
popd > /dev/null

pushd "${TOPLEVEL}" > /dev/null

echo
echo "====== Installing dependencies ======"
echo

pnpm fetch --frozen-lockfile
pnpm install --frozen-lockfile --offline --filter b58-ts...
pnpm install --frozen-lockfile --offline --filter ecashaddrjs...
pnpm install --frozen-lockfile --offline --filter chronik-client...
pnpm install --frozen-lockfile --offline --filter mock-chronik-client...
pnpm install --frozen-lockfile --offline --filter ecash-lib...
pnpm install --frozen-lockfile --offline --filter ecash-wallet...
pnpm install --frozen-lockfile --offline --filter ecash-agora...

echo
echo "====== Building local modules ======"
echo

pnpm --filter b58-ts run build
pnpm --filter ecashaddrjs run build
pnpm --filter chronik-client run build
pnpm --filter mock-chronik-client run build
pnpm --filter ecash-lib run build
pnpm --filter ecash-wallet run build
pnpm --filter ecash-agora run build

popd

echo
echo "====== Done ======"
