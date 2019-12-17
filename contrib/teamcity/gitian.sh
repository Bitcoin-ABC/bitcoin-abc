#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

cd "$(dirname "$0")"

COMMIT=$(git rev-parse HEAD)
export COMMIT
PROJECT_ROOT=$(git rev-parse --show-toplevel)
export PROJECT_ROOT
export USE_LXC=1
export GITIAN_HOST_IP=10.0.3.1
export LXC_BRIDGE=lxcbr0
export LXC_GUEST_IP=10.0.3.5

cd ~/gitian-builder

if [[ "${OS_NAME}" == "osx" ]]; then
  wget https://storage.googleapis.com/f4936e83b2dcbca742be51fb9692b153/MacOSX10.11.sdk.tar.gz
  echo "4732b52b5ebe300c8c91cbeed6d19d59c1ff9c56c7a1dd6cfa518b9c2c72abde  MacOSX10.11.sdk.tar.gz" | sha256sum -c
  mkdir -p inputs
  echo "Downloaded"
  mv MacOSX10.11.sdk.tar.gz inputs
fi

## Determine the number of build threads
THREADS=$(nproc || sysctl -n hw.ncpu)

RESULT_DIR="${PROJECT_ROOT}/gitian-results"
OS_DIR="${RESULT_DIR}/${OS_NAME}"
mkdir -p "${OS_DIR}"

move_log() {
  mv var/install.log "${RESULT_DIR}/"
  mv var/build.log "${RESULT_DIR}/"
}
trap "move_log" ERR

./bin/gbuild -j${THREADS} -m3500 --commit bitcoin=${COMMIT} --url bitcoin="${PROJECT_ROOT}" "${PROJECT_ROOT}/contrib/gitian-descriptors/gitian-${OS_NAME}.yml"

move_log
mv result/*.yml "${OS_DIR}/"
mv build/out/* "${OS_DIR}/"
