#!/usr/bin/env bash

export LC_ALL=C
set -euo pipefail

if [ -e secp256k1 ]; then
    echo secp256k1 already exist in the current directory.
    exit 1
fi

WORKDIR=$(mktemp -d)
function cleanup {
    echo Deleting workdir ${WORKDIR}
    rm -rf "${WORKDIR}"
}
trap cleanup EXIT

echo Using workdir ${WORKDIR}

# Find the source repository's location.
pushd "$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_DIR=$(git rev-parse --show-toplevel)
popd

git clone "file://${REPO_DIR}" "${WORKDIR}" -b master

pushd "${WORKDIR}"
# shellcheck disable=SC1004
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch \
    --index-filter 'git ls-files \
                        | grep -v "^cmake\|^src/secp256k1" \
                        | xargs git rm -q --cached;
                    git ls-files -s \
                        | sed "s%src/secp256k1/%%" \
                        | git update-index --index-info;
                    git rm -rq --cached --ignore-unmatch src/secp256k1' \
    --prune-empty -- --all
popd

# filter-branch is full of gotcha and can leave the repo is a strange state,
# so we make a fresh new one.
git clone "file://${WORKDIR}" secp256k1

pushd secp256k1
git remote add github https://github.com/Bitcoin-ABC/secp256k1.git
git pull github master --rebase
git gc --prune=now

