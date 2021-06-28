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

OSX_SDK="Xcode-12.1-12A7403-extracted-SDK-with-libcxx-headers.tar.gz"
OSX_SDK_SHA256="12bd3827817f0c6b305e77140f440864eab29077e0b77b6627030e241dce76a4"

pushd "${DEST_DIR}" > /dev/null
if ! echo "${OSX_SDK_SHA256}  ${OSX_SDK}" | sha256sum --quiet -c > /dev/null 2>&1; then
  rm -f "${OSX_SDK}"
  wget -q "${SDK_DL_REMOTE}/${OSX_SDK}"
  echo "${OSX_SDK_SHA256}  ${OSX_SDK}" | sha256sum --quiet -c
fi
popd > /dev/null

echo "${OSX_SDK}"
