#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

export PYTHONPATH="${TOPLEVEL}/depends/x86_64-apple-darwin16/native/lib/python3/dist-packages:${PYTHONPATH:-}"

build_static_dependencies osx

CMAKE_FLAGS=(
  "-DCMAKE_TOOLCHAIN_FILE=${CMAKE_PLATFORMS_DIR}/OSX.cmake"
)
build_with_cmake

# Build all the targets that are not built as part of the default target
ninja test_bitcoin test_bitcoin-qt test-seeder

ninja osx-dmg
