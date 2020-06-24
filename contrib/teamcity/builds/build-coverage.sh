#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

CMAKE_FLAGS=(
  "-DENABLE_COVERAGE=ON"
  "-DENABLE_BRANCH_COVERAGE=ON"
)
build_with_cmake --gcc coverage-check-extended

# Publish the coverage report in a format that Teamcity understands
pushd check-extended.coverage
# Run from the coverage directory to prevent tar from creating a top level
# folder in the generated archive.
tar -czf ../coverage.tar.gz -- *
popd
