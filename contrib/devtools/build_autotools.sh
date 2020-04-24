#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"
: "${BUILD_DIR:=${TOPLEVEL}/build}"

# Default to nothing
: "${CONFIGURE_FLAGS:=}"
: "${THREADS:=$(nproc || sysctl -n hw.ncpu)}"

# Generate necessary autoconf files
cd ${TOPLEVEL}
./autogen.sh
mkdir -p "${BUILD_DIR}"
cd ${BUILD_DIR}

rm -f build.status test_bitcoin.xml

read -a CONFIGURE_FLAGS <<< "$CONFIGURE_FLAGS --prefix=$(pwd)"

../configure --enable-deprecated-build-system "${CONFIGURE_FLAGS[@]}"

# Run build
make -j "${THREADS}"
