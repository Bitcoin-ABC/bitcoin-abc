#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

: "${ABC_BUILD_NAME:=""}"

if [ $# -ge 1 ]; then
  ABC_BUILD_NAME="$1"
  shift
fi

if [ -z "${ABC_BUILD_NAME}" ]; then
  echo "Error: Environment variable ABC_BUILD_NAME must be set"
  exit 1
fi

echo "Running build configuration '${ABC_BUILD_NAME}'..."

TOPLEVEL=$(git rev-parse --show-toplevel)
export TOPLEVEL

# Use separate build dirs to get the most out of ccache and prevent crosstalk
: "${BUILD_DIR:=${TOPLEVEL}/${ABC_BUILD_NAME}}"
mkdir -p "${BUILD_DIR}"
BUILD_DIR=$(cd "${BUILD_DIR}"; pwd)
export BUILD_DIR
cd "${BUILD_DIR}"

# Determine the number of build threads
THREADS=$(nproc || sysctl -n hw.ncpu)
export THREADS

export CMAKE_PLATFORMS_DIR="${TOPLEVEL}/cmake/platforms"

# Check the script exists
SCRIPT_PATH="${TOPLEVEL}/contrib/teamcity/builds/${ABC_BUILD_NAME}.sh"
if [ ! -x "${SCRIPT_PATH}" ]; then
  echo "${SCRIPT_PATH} does not exist or is not executable"
  exit 1
fi

# Run the script
"${SCRIPT_PATH}"
