#!/bin/bash -e

cd "$(dirname "$0")"

export COMMIT=`git rev-parse HEAD`
export PROJECT_ROOT=`git rev-parse --show-toplevel`
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

./bin/gbuild -j${THREADS} -m3500 --commit bitcoin=${COMMIT} --url bitcoin="${PROJECT_ROOT}" "${PROJECT_ROOT}/contrib/gitian-descriptors/gitian-${OS_NAME}.yml"

RESULT_DIR="${PROJECT_ROOT}/gitian-results/${OS_NAME}"
mkdir -p "${RESULT_DIR}"
mv var/build.log "${PROJECT_ROOT}/gitian-results/"
mv result/*.yml "${RESULT_DIR}/"    
mv build/out/* "${RESULT_DIR}/"
rm -r "${RESULT_DIR}/src"
