#!/usr/bin/env bash
# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)

CODE_DIR="${TOPLEVEL}/web/explorer/explorer-server/code"
pushd "${CODE_DIR}"

mapfile -t FILES_TO_HASH < <(find . -name "*.css" -o -name "*.js")
declare -A HASH_MAP
for file_to_hash in "${FILES_TO_HASH[@]}"; do
    HASH_MAP["${file_to_hash#./}"]="$(sha256sum ${file_to_hash} | head -c 10)"
done

popd

TEMPLATES_DIR="${TOPLEVEL}/web/explorer/explorer-server/templates"
pushd "${TEMPLATES_DIR}"

# Search for all /code/**/*.js?hash=* references and update the hash to the file
# hash.
mapfile -t TEMPLATES < <(find . -name "*.html")

for template in "${TEMPLATES[@]}"; do
    echo "Updating file ${template}"
    for hashed_file in "${!HASH_MAP[@]}"; do
        sed -ri "s#\"/code/${hashed_file}\?hash=(.+)\"#\"/code/${hashed_file}\?hash=${HASH_MAP[${hashed_file}]}\"#g" "${template}"
    done
done

popd
