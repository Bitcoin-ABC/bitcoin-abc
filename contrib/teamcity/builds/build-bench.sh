#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Build and run the benchmarks.
CMAKE_FLAGS=(
  "-DBUILD_BITCOIN_WALLET=ON"
  "-DSECP256K1_ENABLE_MODULE_ECDH=ON"
  "-DSECP256K1_ENABLE_MODULE_MULTISET=ON"
)
build_with_cmake --Werror --junit

ninja bench-bitcoin
ninja bench-secp256k1
