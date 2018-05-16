#!/bin/bash

set -eu

TOPLEVEL=`git rev-parse --show-toplevel`
if [[ -z "${TOPLEVEL}" ]]; then
	echo "No .git directory found, assuming pwd"
	TOPLEVEL=`pwd -P`
fi

BUILD_DIR="${TOPLEVEL}/build"
mkdir -p ${BUILD_DIR}

## Generate necessary autoconf files
cd ${TOPLEVEL}
./autogen.sh
cd ${BUILD_DIR}

rm -f build.status test_bitcoin.xml

## Determine the number of build threads
THREADS=$(nproc || sysctl -n hw.ncpu)

# Default to nothing
: ${DISABLE_WALLET:=}

CONFIGURE_FLAGS=("--prefix=`pwd`")
if [[ ! -z "${DISABLE_WALLET}" ]]; then
	echo "*** Building without wallet"
	CONFIGURE_FLAGS+=("--disable-wallet")
fi

../configure "${CONFIGURE_FLAGS[@]}"

# Run unit tests
make check

# Run util tests
./test/util/bitcoin-util-test.py

mkdir -p output/
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! -z "${DISABLE_WALLET}" ]]; then
	echo "Skipping rpc testing due to disabled wallet functionality."
elif [[ "${BRANCH}" == "master" ]]; then
	./test/functional/test_runner.py --extended --jobs=${THREADS} --tmpdirprefix=output
else
	./test/functional/test_runner.py --jobs=${THREADS} --tmpdirprefix=output
fi

