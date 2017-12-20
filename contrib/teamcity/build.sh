#!/bin/bash

set -eu

TOPLEVEL=`git rev-parse --show-toplevel`
if [[ -z "${TOPLEVEL}" ]]; then
	echo "No .git directory found, assuming pwd"
	TOPLEVEL=`pwd -P`
fi

BUILD_DIR="${TOPLEVEL}/build"
mkdir -p ${BUILD_DIR}
## Configure and build
cd ${BUILD_DIR}

rm -f build.status test_bitcoin.xml

#
## Configure and run build
THREADS=$(nproc || sysctl -n hw.ncpu)

pushd ..
./autogen.sh
popd

../configure --prefix=`pwd`
make -j ${THREADS}

# Run unit tests
./src/test/test_bitcoin --log_format=JUNIT > test_bitcoin.xml

./test/functional/test_runner.py

make install