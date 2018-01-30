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
make -j ${THREADS}
make install

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Run tests
./src/test/test_bitcoin --log_format=JUNIT > test_bitcoin.xml

mkdir -p output/

if [[ ! -z "${DISABLE_WALLET}" ]]; then
	echo "Skipping rpc testing due to disabled wallet functionality."
elif [[ "${BRANCH}" == "master" ]]; then
	./test/functional/test_runner.py --extended --tmpdirprefix=output
else
	./test/functional/test_runner.py --tmpdirprefix=output
fi

