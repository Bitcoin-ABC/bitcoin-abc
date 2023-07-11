#!/usr/bin/env bash

export LC_ALL=C
set -euo pipefail

if [ -e electrumabc-mirror ]; then
    echo electrumabc-mirror already exist in the current directory.
    exit 1
fi

# Find the source repository's location.
pushd "$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_DIR=$(git rev-parse --show-toplevel)
popd

git clone "file://${REPO_DIR}" electrumabc-mirror -b master

pushd electrumabc-mirror
git filter-repo --path electrum --path-rename electrum/:
git remote add github https://github.com/Bitcoin-ABC/ElectrumABC.git
git pull github master --rebase --strategy-option=theirs
git gc --prune=now
popd
