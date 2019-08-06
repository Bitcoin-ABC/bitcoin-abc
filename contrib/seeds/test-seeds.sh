#!/usr/bin/env bash
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C

set -u

TOPLEVEL=$(git rev-parse --show-toplevel)
DEFAULT_BUILD_DIR="${TOPLEVEL}/build"

help_message() {
  echo "Test connecting to seed nodes. Outputs the seeds that were successfully connected to."
  echo ""
  echo "Example usages:"
  echo "Mainnet: $0 < nodes_main.txt"
  echo "Testnet: $0 --testnet < nodes_test.txt"
  echo ""
  echo "Options:"
  echo "-t, --testnet         Connect to testnet seeds (mainnet is default)."
  echo "-h, --help            Display this help message."
  echo ""
  echo "Environment Variables:"
  echo "BUILD_DIR             Default: ${DEFAULT_BUILD_DIR}"
  exit 0
}

: "${BUILD_DIR:=${DEFAULT_BUILD_DIR}}"
OPTION_TESTNET=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
case $1 in
  -t|--testnet)
    OPTION_TESTNET="--testnet"
    shift # shift past argument
    ;;
  -h|--help)
    help_message
    shift # shift past argument
    ;;
  *)
    echo "Unknown argument: $1"
    help_message
    shift # shift past argument
    ;;
esac
done

BITCOIND="${BUILD_DIR}/src/bitcoind"
BITCOIN_CLI="${BUILD_DIR}/src/bitcoin-cli"
if [ ! -x "${BITCOIND}" ]; then
  echo "${BITCOIND} does not exist or has incorrect permissions."
  exit 10
fi
if [ ! -x "${BITCOIN_CLI}" ]; then
  echo "${BITCOIN_CLI} does not exist or has incorrect permissions."
  exit 11
fi

BITCOIND="${BITCOIND} -connect=0 ${OPTION_TESTNET}"
BITCOIN_CLI="${BITCOIN_CLI} ${OPTION_TESTNET}"

>&2 echo "Spinning up bitcoind..."
${BITCOIND} &
BITCOIND_PID=$!
cleanup() {
  # Cleanup background processes spawned by this script.
  >&2 echo "Cleaning up bitcoin daemon (PID: ${BITCOIND_PID})."
  kill ${BITCOIND_PID}
}
trap "cleanup" EXIT

# Short sleep to make sure the RPC server is available
sleep 0.1
# Wait until bitcoind is fully spun up
WARMUP_TIMEOUT=60
for _ in $(seq 1 ${WARMUP_TIMEOUT}); do
  ${BITCOIN_CLI} getconnectioncount &> /dev/null
  RPC_READY=$?
  if [ "${RPC_READY}" -ne 0 ]; then
    >&2 printf "."
    sleep 1
  else
    break
  fi
done
>&2 echo ""

if [ "${RPC_READY}" -ne 0 ]; then
  >&2 echo "RPC was not ready after ${WARMUP_TIMEOUT} seconds."
  exit 20
fi

while read -r SEED; do
  >&2 echo "Testing seed '${SEED}'..."

  # Immediately connect to the seed peer
  ${BITCOIN_CLI} addnode "${SEED}" onetry

  # Fetch peer's connection status
  CONNECTION_COUNT=$(${BITCOIN_CLI} getconnectioncount)
  if [ "${CONNECTION_COUNT}" -eq 1 ]; then
    # Cleanup peer connection
    ${BITCOIN_CLI} disconnectnode "${SEED}"

    # Wait for peer to be disconnected
    CONNECTED_TIMEOUT=5
    for _ in $(seq 1 ${CONNECTED_TIMEOUT}); do
      CONNECTION_COUNT=$(${BITCOIN_CLI} getconnectioncount)
      if [ "${CONNECTION_COUNT}" -eq 0 ]; then
        break
      fi
      sleep 0.1
    done
    if [ "${CONNECTION_COUNT}" -ne 0 ]; then
      >&2 echo "Seed failed to disconnect. Something else could be wrong (check logs)."
      exit 30
    fi

    echo "${SEED}"
  else
    >&2 echo "Failed to connect to '${SEED}'"
  fi
done
