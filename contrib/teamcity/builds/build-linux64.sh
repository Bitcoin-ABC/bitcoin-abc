#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

build_static_dependencies

# Build, run unit tests and functional tests.
CMAKE_FLAGS=(
  "-DCMAKE_TOOLCHAIN_FILE=${CMAKE_PLATFORMS_DIR}/Linux64.cmake"
  "-DENABLE_PROPERTY_BASED_TESTS=ON"
)
build_with_cmake

# Unit tests
run_test_bitcoin "for Linux 64 bits"

ninja \
  check-bitcoin-qt \
  check-seeder \
  check-bitcoin-util \
  check-secp256k1

# Functional tests
ninja check-functional
