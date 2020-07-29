#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Build without bitcoin-cli
CMAKE_FLAGS=(
  "-DBUILD_BITCOIN_CLI=OFF"
)
build_with_cmake --Werror --junit

ninja check-functional
