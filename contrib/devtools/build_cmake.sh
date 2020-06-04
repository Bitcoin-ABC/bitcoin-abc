#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"
: "${BUILD_DIR:=${TOPLEVEL}/build}"

function usage() {
  echo "Usage: $0 [--Werror] [targets]"
  echo "Build the targets using cmake and ninja."
  echo "If no target is provided the default (all) target is built."
  echo
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

TARGETS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --Werror)
      CMAKE_FLAGS+=(
        "-DCMAKE_C_FLAGS=-Werror"
        "-DCMAKE_CXX_FLAGS=-Werror"
      )
      shift
      ;;
    *)
      TARGETS+=("$1")
      shift
      ;;
  esac
done

cmake -GNinja .. "${CMAKE_FLAGS[@]}"

# If valid targets are given, use them, otherwise default to "all".
if [ ${#TARGETS[@]} -eq 0 ]; then
  TARGETS=("all")
else
  mapfile -t VALID_TARGETS < <(ninja -t targets all | cut -d ':' -f 1)
  # "all" is not part of the targets exported by ninja, so add it.
  VALID_TARGETS+=("all")
  IFS=" "
  for TARGET in "${TARGETS[@]}"
  do
    # The array prints as a space delimited word list, surround the target with
    # spaces to avoid partial match.
    if [[ ! " ${VALID_TARGETS[*]} " =~ \ ${TARGET}\  ]]; then
      echo "Trying to build an invalid target: ${TARGET}"
      exit 2
    fi
  done
fi

# Run build
ninja "${TARGETS[@]}"
