#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Ensure that the build using cmake and the "Unix Makefiles" generator is not
# broken.
git clean -xffd
cmake -G "Unix Makefiles" ..
make -j "${THREADS}" all check
