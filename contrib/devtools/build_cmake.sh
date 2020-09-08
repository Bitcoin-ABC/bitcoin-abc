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
  echo "  --clang: build with clang/clang++"
  echo "  --gcc: build with gcc/g++"
  echo "  --junit: enable Junit reports generation"
  echo "  --no-build: Only run the configuration step and skip the build"
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
git clean -xffd || true

read -a CMAKE_FLAGS <<< "${CMAKE_FLAGS}"

BUILD="yes"
TARGETS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --clang)
      CMAKE_FLAGS+=(
        "-DCMAKE_C_COMPILER=clang"
        "-DCMAKE_CXX_COMPILER=clang++"
      )
      shift
      ;;
    --gcc)
      CMAKE_FLAGS+=(
        "-DCMAKE_C_COMPILER=gcc"
        "-DCMAKE_CXX_COMPILER=g++"
      )
      shift
      ;;
    --junit)
      CMAKE_FLAGS+=(
        "-DENABLE_JUNIT_REPORT=ON"
      )
      shift
      ;;
    --no-build)
      BUILD="no"
      shift
      ;;
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

# If cross building for OSX, the python library needs to be added to the python
# library path.
export PYTHONPATH="${TOPLEVEL}/depends/x86_64-apple-darwin16/native/lib/python3/dist-packages:${PYTHONPATH:-}"

cmake -GNinja "${TOPLEVEL}" "${CMAKE_FLAGS[@]}"

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
if [ "${BUILD}" == "yes" ]
then
  ninja "${TARGETS[@]}"
fi
