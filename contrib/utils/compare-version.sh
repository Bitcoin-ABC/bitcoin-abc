#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# Utility functions to compare version strings
version_greater_equal() {
  printf '%s\n%s\n' "$2" "$1" | sort -V -C
}
version_greater() {
  [ "$1" != "$2" ] && version_greater_equal "$1" "$2"
}
version_less_equal() {
  ! version_greater "$1" "$2"
}
version_less() {
  ! version_greater_equal "$1" "$2"
}
get_current_version() {
  local -n CURRENT_VERSION=$1

  TOPLEVEL=$(git rev-parse --show-toplevel)
  : "${BUILD_DIR:="${TOPLEVEL}/build"}"

  # Get the current version of the software
  BUILD_DIR="${BUILD_DIR}" "${TOPLEVEL}"/contrib/devtools/build_cmake.sh --no-build
  pushd "${BUILD_DIR}"
  # shellcheck disable=SC2034
  CURRENT_VERSION="$(ninja print-version | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$')"
  popd
}
