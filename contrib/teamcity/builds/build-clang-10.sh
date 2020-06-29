#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Use clang-10 for this build instead of the default clang-8.
# This allow for checking that no warning is introduced for newer versions
# of the compiler
CMAKE_FLAGS=(
  "-DCMAKE_C_COMPILER=clang-10"
  "-DCMAKE_CXX_COMPILER=clang++-10"
)
build_with_cmake --Werror

ninja check check-secp256k1

# TODO do the same with the latest GCC
