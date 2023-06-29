#!/usr/bin/env bash

export LC_ALL=C
set -euo pipefail

if [ -e secp256k1 ]; then
    echo secp256k1 already exist in the current directory.
    exit 1
fi

# Find the source repository's location.
pushd "$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_DIR=$(git rev-parse --show-toplevel)
popd

git clone "file://${REPO_DIR}" secp256k1 -b master

pushd secp256k1
git filter-repo --path src/secp256k1 --path cmake --path-rename src/secp256k1/:
git remote add github https://github.com/Bitcoin-ABC/secp256k1.git
git pull github master --rebase
git gc --prune=now
popd
