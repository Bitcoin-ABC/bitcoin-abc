#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

MAINNET="main"
TESTNET="test"

help_message() {
  set +x
  echo "Test that at least some threshold of seed nodes can be connected to."
  echo "Usage: $0 <chain> <threshold>"
  echo "    Where <chain> is either '${MAINNET}' or '${TESTNET}'"
  echo "    Where <threshold> is an integer (0 - 100) representing the percentage of seeds that you expect to be online."
  set -x
}

if [ "$#" = 1 ]; then
  case $1 in
    -h|--help)
      help_message
      exit 0
      ;;
    "${MAINNET}"|"${TESTNET}")
      # Fallthrough to get caught by the following appropriate check for the
      # number of arguments, as this argument appears well formed.
      ;;
    *)
      echo "Unknown argument: $1"
      help_message
      exit 1
  esac
fi

if [ "$#" -ne 2 ]; then
  echo "Error: Expecting 2 arguments, got $#"
  help_message
  exit 2
fi

TOPLEVEL=$(git rev-parse --show-toplevel)
SEEDS_DIR="${TOPLEVEL}"/contrib/seeds

CHAIN="$1"
PERCENT_THRESHOLD="$2"
if [ "${CHAIN}" = "${MAINNET}" ]; then
  TEST_SEEDS_ARGS=""
elif [ "${CHAIN}" = "${TESTNET}" ]; then
  TEST_SEEDS_ARGS="--testnet"
else
  echo "Error: Expected chain is '${MAINNET}' or '${TESTNET}'. Got: '${CHAIN}'"
  exit 1
fi

SEED_NODES="${SEEDS_DIR}/nodes_${CHAIN}.txt"
TOTAL=$(wc -l < "${SEED_NODES}")
NUM=$("${SEEDS_DIR}"/test-seeds.sh ${TEST_SEEDS_ARGS} < "${SEED_NODES}" | wc -l)
PERCENT_NODES_UP=$((NUM * 100 / TOTAL))
echo "${PERCENT_NODES_UP}% of ${CHAIN}net seeds appear to be online."
if [ "${PERCENT_NODES_UP}" -lt "${PERCENT_THRESHOLD}" ]; then
  echo "Error: The number of online ${CHAIN}net seed nodes is below the expected threshold of ${PERCENT_THRESHOLD}%"
  exit 10
fi
