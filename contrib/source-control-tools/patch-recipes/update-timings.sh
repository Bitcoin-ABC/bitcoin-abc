#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)
CMAKE_FLAGS="-DBUILD_CHRONIK=ON -DBUILD_CHRONIK_PLUGINS=ON" "${TOPLEVEL}"/contrib/devtools/build_cmake.sh
pushd "${BUILD_DIR}"
ninja check-functional-extended
TIMING_SRC_FILE="${TOPLEVEL}"/test/functional/timing.json
mv timing.json "${TIMING_SRC_FILE}"
popd

# Check that all tests are included in timing.json
pushd "${TOPLEVEL}"/test/functional
NON_TESTS=$(python3 -c 'from test_runner import NON_TESTS; print(" ".join(NON_TESTS))')
export NON_TESTS
EXTRA_PRIVILEGES_TESTS=$(python3 -c 'from test_runner import EXTRA_PRIVILEGES_TESTS; print(" ".join(EXTRA_PRIVILEGES_TESTS))')
export EXTRA_PRIVILEGES_TESTS

check_missing() {
  # Exclude non-tests from the check
  if [[ "${NON_TESTS}" =~ $1 ]] || [[ "${EXTRA_PRIVILEGES_TESTS}" =~ $1 ]]; then
    exit 0
  fi

  if ! grep -q $1 timing.json ; then
    echo "Error: Test file '$1' is missing from timing.json"
    exit 1
  fi
}
export -f check_missing
find . -maxdepth 1 -name '*.py' | cut -c 3- | xargs -I'{}' -n1 bash -c 'check_missing {}'
popd

git add "${TIMING_SRC_FILE}"

git commit -m "[Automated] Update timing.json"
