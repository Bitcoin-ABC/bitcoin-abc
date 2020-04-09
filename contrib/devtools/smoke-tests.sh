#!/usr/bin/env bash
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Note: Smoke tests should focus on speed rather than coverage so they
# can be used as a quick sanity check. Do not put long-running tests
# in this script.

export LC_ALL=C.UTF-8

set -euxo pipefail

echo "Running smoke tests..."

# Lint checks
LINT_OUTPUT=$(arc lint --never-apply-patches)
LINT_EXIT_CODE=$?
# If there is more than one line of output, then lint advice lines are likely present.
# We treat these as errors since they appear as such during review anyway.
LINT_NUM_LINES=$(echo ${LINT_OUTPUT} | wc -l)
if [ "${LINT_EXIT_CODE}" -ne 0 ] || [ "${LINT_NUM_LINES}" -gt 1 ]; then
  echo "Error: There are lint issues."
  exit 1
fi

# Unit and functional test coverage
TOPLEVEL=$(git rev-parse --show-toplevel)
DEVTOOLS_DIR="${TOPLEVEL}"/contrib/devtools
BUILD_DIR="${TOPLEVEL}"/build
mkdir -p "${BUILD_DIR}"
export BUILD_DIR

pushd "${BUILD_DIR}"
"${DEVTOOLS_DIR}"/build_cmake.sh
ninja check-bitcoin check-functional
popd
