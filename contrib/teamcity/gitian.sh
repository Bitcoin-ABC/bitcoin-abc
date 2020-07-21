#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"
: "${BUILD_DIR:=${TOPLEVEL}/build}"
: "${THREADS:=$(nproc || sysctl -n hw.ncpu)}"

COMMIT=$(git -C "${TOPLEVEL}" rev-parse HEAD)
export COMMIT
export USE_DOCKER=1

cd "${TOPLEVEL}/contrib/gitian-builder"

./bin/make-base-vm --docker --arch amd64 --distro debian --suite buster

if [[ "${OS_NAME}" == "osx" ]]; then
  OSX_SDK="MacOSX10.14.sdk.tar.gz"
  OSX_SDK_SHA256="2322086a96349db832abbcadea493b79db843553a2e604163238d99fa058a286"
  OSX_SDK_DIR=~/.abc-build-cache/osx-sdk
  mkdir -p "${OSX_SDK_DIR}"
  pushd "${OSX_SDK_DIR}"
  if ! echo "${OSX_SDK_SHA256}  ${OSX_SDK}" | sha256sum -c; then
    rm -f "${OSX_SDK}"
    wget https://storage.googleapis.com/27cd7b2a42a430926cc621acdc3bda72a8ed2b0efc080e3/"${OSX_SDK}"
    echo "${OSX_SDK_SHA256}  ${OSX_SDK}" | sha256sum -c
  fi
  popd

  mkdir -p inputs
  cp "${OSX_SDK_DIR}/${OSX_SDK}" inputs/"${OSX_SDK}"
fi

RESULT_DIR="${BUILD_DIR}/gitian-results"
OS_DIR="${RESULT_DIR}/${OS_NAME}"
mkdir -p "${OS_DIR}"

move_log() {
  mv var/install.log "${RESULT_DIR}/"
  mv var/build.log "${RESULT_DIR}/"
}
trap "move_log" ERR

./bin/gbuild -j${THREADS} -m3500 --commit bitcoin=${COMMIT} --url bitcoin="${TOPLEVEL}" "${TOPLEVEL}/contrib/gitian-descriptors/gitian-${OS_NAME}.yml"

move_log
mv result/*.yml "${OS_DIR}/"
mv build/out/* "${OS_DIR}/"
