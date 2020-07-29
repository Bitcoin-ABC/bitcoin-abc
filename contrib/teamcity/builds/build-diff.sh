#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Build, run unit tests and functional tests.
build_with_cmake --Werror --junit

# Libs and tools tests
# The leveldb tests need to run alone or they will sometimes fail with
# garbage output, see:
# https://build.bitcoinabc.org/viewLog.html?buildId=29713&guest=1
ninja check-leveldb

ninja -k0 \
  check \
  check-secp256k1 \
  check-univalue \
  check-functional \
  check-upgrade-activated
