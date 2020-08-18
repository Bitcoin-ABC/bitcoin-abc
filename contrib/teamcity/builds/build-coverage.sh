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

# Send some message to Teamcity containing the coverage data.
# This make it possible to track coverage variation and trigger events.
function extract_coverage() {
  SCOPE=$1

  case "${SCOPE}" in
    lines)
      KEY_LETTER="L"
      ;;
    functions)
      KEY_LETTER="M"
      ;;
    branches)
      KEY_LETTER="R"
      ;;
    *)
      echo "Unsupported coverage scope: ${SCOPE}"
      exit 1
  esac

  REGEX="([0-9]+) of ([0-9]+) ${SCOPE}"

  HIT=0
  TOTAL=0

  while IFS= read -r LINE
  do
    if [[ "${LINE}" =~ ${REGEX} ]]
    then
      HIT="${BASH_REMATCH[1]}"
      TOTAL="${BASH_REMATCH[2]}"
      break
    fi
  done < coverage-summary.txt

  echo "##teamcity[buildStatisticValue key='CodeCoverageAbs${KEY_LETTER}Covered' value='${HIT}']"
  echo "##teamcity[buildStatisticValue key='CodeCoverageAbs${KEY_LETTER}Total' value='${TOTAL}']"
}

# Lines hit/total
extract_coverage lines
# Functions hit/total
extract_coverage functions
# Branches hit/total
extract_coverage branches

# Run from the coverage directory to prevent tar from creating a top level
# folder in the generated archive.
tar -czf ../coverage.tar.gz -- *
popd
