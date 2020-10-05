#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"
: "${DEPENDS_DIR:=${TOPLEVEL}/depends}"
: "${SDK_PATH:=${DEPENDS_DIR}/SDKs}"
: "${SDK_ARCHIVE_DIR:=${SDK_PATH}}"

DEPENDS_BUILD_TARGET="${1:-all}"

pushd "${DEPENDS_DIR}"

if [ "${DEPENDS_BUILD_TARGET}" = "osx" ]
then
  # Get the OSX SDK
  mkdir -p "${SDK_PATH}"
  pushd "${SDK_PATH}"

  OSX_SDK=$("${TOPLEVEL}/contrib/teamcity/download-apple-sdk.sh" "${SDK_PATH}")

  tar -xzf "${OSX_SDK}"

  popd
fi

make "build-${DEPENDS_BUILD_TARGET}"

popd
