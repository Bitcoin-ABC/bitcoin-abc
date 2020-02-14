#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"
: "${BUILD_DIR:=${TOPLEVEL}/build}"

# Default to nothing
: "${CMAKE_FLAGS:=}"

cd ${BUILD_DIR}
git clean -xffd

read -a CMAKE_FLAGS <<< "${CMAKE_FLAGS}"
cmake -GNinja .. -DENABLE_CLANG_TIDY=OFF "${CMAKE_FLAGS[@]}"

# Run build
ninja
