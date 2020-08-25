#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"
: "${BUILD_DIR:=${TOPLEVEL}/build}"

DEVTOOLS_DIR="${TOPLEVEL}/contrib/devtools"

# It is valid to call the function with no argument, so ignore SC2120
# shellcheck disable=SC2120
build_with_cmake() {
  CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_cmake.sh "$@"
}

run_ibd() {
  "${TOPLEVEL}"/contrib/teamcity/ibd.sh "$@"
}

build_static_dependencies() {
  "${DEVTOOLS_DIR}"/build_depends.sh "$@"
}
