#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Build without wallet and run the unit tests.
CMAKE_FLAGS=(
  "-DBUILD_BITCOIN_WALLET=OFF"
)
build_with_cmake --Werror

ninja check-bitcoin-qt
ninja check-functional

run_test_bitcoin "without wallet"
