#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"
: "${BUILD_DIR:=${TOPLEVEL}/build}"

function usage() {
  echo "Usage: $0 [--Werror]"
  echo "Build the default target using cmake and ninja."
  echo "Options:"
  echo "  --Werror: add -Werror to the compiler flags"
  echo "Environment variables:"
  echo "  CMAKE_FLAGS: array of the CMAKE flags to use for the build"
  echo "  BUILD_DIR: the build directory, (default: ${BUILD_DIR}})"
  echo "  TOPLEVEL: the project root directory, (default: ${TOPLEVEL}})"
}

# Default to nothing
: "${CMAKE_FLAGS:=}"

mkdir -p "${BUILD_DIR}"
cd ${BUILD_DIR}
git clean -xffd

read -a CMAKE_FLAGS <<< "${CMAKE_FLAGS}"

case "$1" in
  "--Werror")
    CMAKE_FLAGS+=(
      "-DCMAKE_C_FLAGS=-Werror"
      "-DCMAKE_CXX_FLAGS=-Werror"
    )
    ;;
  *)
    usage
    exit 1
    ;;
esac

cmake -GNinja .. "${CMAKE_FLAGS[@]}"

# Run build
ninja
