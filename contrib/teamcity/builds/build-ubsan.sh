#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Build with the undefined sanitizer, then run unit tests and functional tests.
CMAKE_FLAGS=(
  "-DCMAKE_BUILD_TYPE=Debug"
  "-DENABLE_SANITIZERS=undefined"
)
build_with_cmake --Werror --clang

run_test_bitcoin "with undefined sanitizer"

# Libs and utils tests
ninja \
  check-bitcoin-qt \
  check-seeder \
  check-bitcoin-util \

ninja check-functional
