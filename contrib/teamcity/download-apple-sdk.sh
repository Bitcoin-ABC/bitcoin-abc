#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

: "${SDK_DL_REMOTE:=}"

usage() {
  echo "Usage: download-apple-sdk.sh dest_dir"
  echo "The SDK_DL_REMOTE environment variable should be set to a URL pointing to the folder containing the SDK archive, with no trailing /."
  echo "Output: prints the SDK file name"
}

if [ -z "${SDK_DL_REMOTE}" ] || [ $# -ne 1 ]; then
  usage
  exit 1
fi

DEST_DIR="$1"

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"

OSX_SDK="Xcode-15.0-15A240d-extracted-SDK-with-libcxx-headers.tar.gz"
OSX_SDK_SHA256="c0c2e7bb92c1fee0c4e9f3a485e4530786732d6c6dd9e9f418c282aa6892f55d"

pushd "${DEST_DIR}" > /dev/null
if ! echo "${OSX_SDK_SHA256}  ${OSX_SDK}" | sha256sum --quiet -c > /dev/null 2>&1; then
  rm -f "${OSX_SDK}"
  wget -q "${SDK_DL_REMOTE}/${OSX_SDK}"
  echo "${OSX_SDK_SHA256}  ${OSX_SDK}" | sha256sum --quiet -c
fi
popd > /dev/null

echo "${OSX_SDK}"
