#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)
CHAINPARAMS_SCRIPTS_DIR="${TOPLEVEL}"/contrib/devtools/chainparams

# Assumes bitcoind instances are already running on mainnet and testnet
pushd "${CHAINPARAMS_SCRIPTS_DIR}"
CHAINPARAMS_MAINNET_TXT="chainparams_main.txt"
./make_chainparams.py > "${CHAINPARAMS_MAINNET_TXT}"
git add "${CHAINPARAMS_MAINNET_TXT}"

CHAINPARAMS_TESTNET_TXT="chainparams_test.txt"
./make_chainparams.py -a 127.0.0.1:18332 > "${CHAINPARAMS_TESTNET_TXT}"
git add "${CHAINPARAMS_TESTNET_TXT}"

CHAINPARAMS_CONSTANTS="${TOPLEVEL}"/src/chainparamsconstants.h
./generate_chainparams_constants.py . > "${CHAINPARAMS_CONSTANTS}"
git add "${CHAINPARAMS_CONSTANTS}"
popd

git commit -m "[Automated] Update chainparams"
