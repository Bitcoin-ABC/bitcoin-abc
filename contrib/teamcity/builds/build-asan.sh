#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Build with the address sanitizer, then run unit tests and functional tests.
CMAKE_FLAGS=(
  "-DCMAKE_CXX_FLAGS=-DARENA_DEBUG"
  "-DCMAKE_BUILD_TYPE=Debug"
  # ASAN does not support assembly code: https://github.com/google/sanitizers/issues/192
  # This will trigger a segfault if the SSE4 implementation is selected for SHA256.
  # Disabling the assembly works around the issue.
  "-DCRYPTO_USE_ASM=OFF"
  "-DENABLE_SANITIZERS=address"
)
build_with_cmake --Werror --clang

run_test_bitcoin "with address sanitizer"

ninja check check-secp256k1

ninja check-functional
