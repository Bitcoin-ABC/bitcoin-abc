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

# Default to nothing
: ${ENABLE_DEBUG:=}

if [[ ! -z "${ENABLE_DEBUG}" ]]; then
	echo "*** Building with debug"
	CONFIGURE_FLAGS+=("--enable-debug")
fi

../configure "${CONFIGURE_FLAGS[@]}"

# Run build
make -j ${THREADS}

# Default to nothing
: ${DISABLE_TESTS:=}

# If DISABLE_TESTS is unset (default), run the tests
if [[ -z "${DISABLE_TESTS}" ]]; then
	echo "*** Running tests"

	# Run unit tests
	make -j ${THREADS} check

	# FIXME Remove when the functional tests are running with debug enabled
	if [[ -z "${ENABLE_DEBUG}" ]]; then
		mkdir -p output/
		BRANCH=$(git rev-parse --abbrev-ref HEAD)
		if [[ ! -z "${DISABLE_WALLET}" ]]; then
			echo "Skipping rpc testing due to disabled wallet functionality."
		elif [[ "${BRANCH}" == "master" ]]; then
			./test/functional/test_runner.py --cutoff=600 --tmpdirprefix=output
			./test/functional/test_runner.py --cutoff=600 --tmpdirprefix=output --with-greatwallactivation
		else
			./test/functional/test_runner.py --tmpdirprefix=output
			./test/functional/test_runner.py --tmpdirprefix=output --with-greatwallactivation
		fi
	else
		echo "*** Functional tests have been skipped"
	fi
else
	echo "*** Tests have been skipped"
fi

