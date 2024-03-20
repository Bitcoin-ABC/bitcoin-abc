#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"
: "${BUILD_DIR:=${TOPLEVEL}/build-guix}"

cd "${TOPLEVEL}"

# Cleanup but exclude our own build dir
GUIX_CLEAN_EXTRA_EXCLUDES="--exclude=$(realpath --relative-to=${TOPLEVEL} ${BUILD_DIR})" ./contrib/guix/guix-clean

if [[ "${HOSTS[*]}" =~ .*darwin.* ]]; then
  OSX_SDK_DIR=~/.abc-build-cache/osx-sdk
  mkdir -p "${OSX_SDK_DIR}"

  OSX_SDK=$("${TOPLEVEL}/contrib/teamcity/download-apple-sdk.sh" "${OSX_SDK_DIR}")

  # guix-clean doesn't remove the SDK (as expected), so do it here to make sure
  # we don't keep the old versions forever. The cost of untarring the archive is
  # low enough that we can do it unconditionally.
  rm -rf depends/SDKs
  mkdir -p depends/SDKs
  tar -C depends/SDKs/ -xzf "${OSX_SDK_DIR}/${OSX_SDK}"
fi

OUTDIR_BASE="${BUILD_DIR}/guix-results" ./contrib/guix/guix-build
