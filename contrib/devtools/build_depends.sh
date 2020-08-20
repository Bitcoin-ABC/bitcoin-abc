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

  find . -maxdepth 1 -type d -name "MacOSX*" -exec rm -rf {} \;

  SDK_ARCHIVE_NAME="MacOSX10.14.sdk.tar.gz"
  OSX_SDK_SHA256="2322086a96349db832abbcadea493b79db843553a2e604163238d99fa058a286"

  OSX_SDK="${SDK_ARCHIVE_DIR}/${SDK_ARCHIVE_NAME}"
  if ! echo "${OSX_SDK_SHA256}  ${OSX_SDK}" | sha256sum -c; then
    rm -f "${OSX_SDK}"
    wget https://storage.googleapis.com/27cd7b2a42a430926cc621acdc3bda72a8ed2b0efc080e3/"${SDK_ARCHIVE_NAME}" -O "${OSX_SDK}"
    echo "${OSX_SDK_SHA256}  ${OSX_SDK}" | sha256sum -c
  fi

  tar -xzf "${OSX_SDK}"

  popd
fi

make "build-${DEPENDS_BUILD_TARGET}"

popd
