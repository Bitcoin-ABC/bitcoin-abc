#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Build. This also generates doc/Doxyfile
build_with_cmake bitcoind bitcoin-cli

./src/bitcoind -regtest &
BITCOIND_PID=$!
cleanup() {
  kill "${BITCOIND_PID}"
}
trap "cleanup" EXIT

echo "Waiting for bitcoind to spin up..."
READY="no"
for _ in {1..5}; do
  if ./src/bitcoin-cli -regtest help > /dev/null ; then
    READY="yes"
    break
  fi
  sleep 1
  echo "."
done

if [ "${READY}" != "yes" ]; then
  echo "Error: bitcoind is not ready or was not started"
  exit 1
fi

# Generate RPC documentation
ninja doc-rpc
