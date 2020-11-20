#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)
CHAINPARAMS_SCRIPTS_DIR="${TOPLEVEL}"/contrib/devtools/chainparams

# ARGS should be triplets of network, mainnet port, testnet port, ...
ARGS=("$@")
if [ "$#" == 0 ]; then
  ARGS=("abc" 8332 18332)
fi

# Assumes bitcoind instances are already running on mainnet and testnet
pushd "${CHAINPARAMS_SCRIPTS_DIR}"
INDEX=0
while [ "${INDEX}" -lt "${#ARGS[@]}" ]; do
  NETWORK="${ARGS[${INDEX}]}"
  ((INDEX+=1))
  MAINNET_PORT="${ARGS[${INDEX}]}"
  ((INDEX+=1))
  TESTNET_PORT="${ARGS[${INDEX}]}"
  ((INDEX+=1))

  CHAINPARAMS_MAINNET_TXT="${NETWORK}/chainparams_main.txt"
  ./make_chainparams.py -a 127.0.0.1:"${MAINNET_PORT}"> "${CHAINPARAMS_MAINNET_TXT}"
  git add "${CHAINPARAMS_MAINNET_TXT}"

  CHAINPARAMS_TESTNET_TXT="${NETWORK}/chainparams_test.txt"
  ./make_chainparams.py -a 127.0.0.1:"${TESTNET_PORT}" > "${CHAINPARAMS_TESTNET_TXT}"
  git add "${CHAINPARAMS_TESTNET_TXT}"

  CHAINPARAMS_CONSTANTS="${TOPLEVEL}"/src/networks/"${NETWORK}"/chainparamsconstants.cpp
  ./generate_chainparams_constants.py "${NETWORK}" > "${CHAINPARAMS_CONSTANTS}"
  git add "${CHAINPARAMS_CONSTANTS}"
done
popd

git commit -m "[Automated] Update chainparams"
