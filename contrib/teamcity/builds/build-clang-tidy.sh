#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

CMAKE_FLAGS=(
  "-DCMAKE_EXPORT_COMPILE_COMMANDS=ON"
)
build_with_cmake --clang

# Set the default for debian but allow the user to override, as the name is
# not standard across distributions (and it's not always in the PATH).
: "${CLANG_TIDY_DIFF_SCRIPT:=clang-tidy-diff-8.py}"
CLANG_TIDY_WARNING_FILE="${BUILD_DIR}/clang-tidy-warnings.txt"

pushd "${TOPLEVEL}"
git diff -U0 HEAD^ | "${CLANG_TIDY_DIFF_SCRIPT}" \
  -clang-tidy-binary "$(command -v clang-tidy-8)" \
  -path "${BUILD_DIR}/compile_commands.json" \
  -p1 > "${CLANG_TIDY_WARNING_FILE}"

if [ $(wc -l < "${CLANG_TIDY_WARNING_FILE}") -gt 1 ]; then
  echo "clang-tidy found issues !"
  cat "${CLANG_TIDY_WARNING_FILE}"
  exit 1
fi
popd
