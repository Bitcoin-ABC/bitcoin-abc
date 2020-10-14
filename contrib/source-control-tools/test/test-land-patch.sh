#!/usr/bin/env bash
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euxo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)
SOURCE_CONTROL_TOOLS="${TOPLEVEL}"/contrib/source-control-tools

mock_smoke_tests() {
  echo 'Mock smoke tests passed'
}
export -f mock_smoke_tests
export SANITY_CHECKS_COMMAND=mock_smoke_tests

# Successful git push works as expected
mock_git_push_success() {
  echo 'Mock git push succeeded'
}
export -f mock_git_push_success
GIT_COMMAND=mock_git_push_success "${SOURCE_CONTROL_TOOLS}"/land-patch.sh --dry-run

# Unsuccessful git push fails to land
mock_git_push_fail() {
  echo 'Mock git push failed'
  exit 1
}
export -f mock_git_push_fail

# shellcheck disable=SC2015
GIT_COMMAND=mock_git_push_fail "${SOURCE_CONTROL_TOOLS}"/land-patch.sh --dry-run && {
  echo "Error: A git push failure is expected to fail"
  exit 1
} || true

echo "PASSED"
