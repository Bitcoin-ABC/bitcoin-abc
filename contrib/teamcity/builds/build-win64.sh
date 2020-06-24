#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

build_static_dependencies

CMAKE_FLAGS=(
  "-DCMAKE_TOOLCHAIN_FILE=${CMAKE_PLATFORMS_DIR}/Win64.cmake"
  "-DBUILD_BITCOIN_SEEDER=OFF"
  "-DCPACK_STRIP_FILES=ON"
)
build_with_cmake

# Build all the targets that are not built as part of the default target
ninja test_bitcoin test_bitcoin-qt

ninja package

# Running the tests with wine and jemalloc is causing deadlocks, so disable
# jemalloc prior running the tests.
# FIXME figure out what is causing the deadlock. Example output:
#   01fe:err:ntdll:RtlpWaitForCriticalSection section 0x39e081b0 "?" wait
#   timed out in thread 01fe, blocked by 01cd, retrying (60 sec)
CMAKE_FLAGS+=(
  "-DUSE_JEMALLOC=OFF"
)
build_with_cmake test_bitcoin

# Run the tests. Not all will run with wine, so exclude them
find src -name "libbitcoinconsensus*.dll" -exec cp {} src/test/ \;
wine ./src/test/test_bitcoin.exe --run_test=\!radix_tests,rcu_tests
