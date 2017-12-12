#!/bin/bash

set -eu

TOPLEVEL=`git rev-parse --show-toplevel`
if [[ -z "${TOPLEVEL}" ]]; then
	echo "No .git directory found, assuming pwd"
	TOPLEVEL=`pwd -P`
fi

# Report build status to phabricator
report() {
	EXIT_CODE=$?

	set +e

	if [[ ${EXIT_CODE} != 0 ]]; then 
		echo "failure" > build.status
	else 
		echo "success" > build.status
	fi

	cd ${TOPLEVEL}
	./contrib/teamcity/teamcitybot.py "${BUILD_DIR}/build.status" "${BUILD_DIR}/test_bitcoin.xml"
	exit $EXIT_CODE
}

BUILD_DIR="${TOPLEVEL}/build"
mkdir -p ${BUILD_DIR}
## Configure and build
cd ${BUILD_DIR}

rm -f build.status test_bitcoin.xml

# Trap exit for reporting
trap report EXIT
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

make install