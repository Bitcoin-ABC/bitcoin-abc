#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Build with the thread sanitizer, then run unit tests and functional tests.
CMAKE_FLAGS=(
  "-DENABLE_SANITIZERS=thread"
)
build_with_cmake --Werror --clang --junit

# Libs and utils tests
ninja -k0 check check-functional
