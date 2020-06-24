#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

build_with_cmake bitcoind bitcoin-cli

# Run on different ports to avoid a race where the rpc port used in the first run
# may not be closed in time for the second to start.
SEEDS_DIR="${TOPLEVEL}"/contrib/seeds
RPC_PORT=18832 "${SEEDS_DIR}"/check-seeds.sh main 80
RPC_PORT=18833 "${SEEDS_DIR}"/check-seeds.sh test 70
