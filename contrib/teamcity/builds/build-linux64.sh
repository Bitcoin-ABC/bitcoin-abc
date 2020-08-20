#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

build_static_dependencies

# Build, run unit tests and functional tests.
CMAKE_FLAGS=(
  "-DCMAKE_TOOLCHAIN_FILE=${CMAKE_PLATFORMS_DIR}/Linux64.cmake"
)
build_with_cmake --junit

ninja -k0 check check-secp256k1 check-functional
