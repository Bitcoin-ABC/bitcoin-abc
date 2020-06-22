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

TOPLEVEL=$(git rev-parse --show-toplevel)
python3 "${TOPLEVEL}/contrib/teamcity/build-configurations.py" "${ABC_BUILD_NAME}"
