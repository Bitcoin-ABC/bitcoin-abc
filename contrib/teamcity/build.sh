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
: ${CONFIGURE_FLAGS:=}

CONFIGURE_FLAGS=($CONFIGURE_FLAGS "--prefix=`pwd`")
if [[ ! -z "${DISABLE_WALLET}" ]]; then
	echo "*** Building without wallet"
	CONFIGURE_FLAGS+=("--disable-wallet")
fi

../configure "${CONFIGURE_FLAGS[@]}"

# Base directories for sanitizer related files 
SAN_SUPP_DIR="${TOPLEVEL}/test/sanitizer_suppressions"
SAN_LOG_DIR="${BUILD_DIR}/sanitizer_logs"

# Create the log directory if it doesn't exist and clear it
mkdir -p "${SAN_LOG_DIR}"
rm -rf "${SAN_LOG_DIR}"/*

# Sanitizers options, not used if sanitizers are not enabled
export ASAN_OPTIONS="log_path=${SAN_LOG_DIR}/asan.log"
export LSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/lsan:log_path=${SAN_LOG_DIR}/lsan.log"
export TSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/tsan:log_path=${SAN_LOG_DIR}/tsan.log"
export UBSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/ubsan:print_stacktrace=1:halt_on_error=1:log_path=${SAN_LOG_DIR}/ubsan.log"

function print_sanitizers_log() {
	for log in "${SAN_LOG_DIR}"/*.log.*
	do
		echo "*** Output of ${log} ***"
		cat "${log}"
	done
}

# Run build
make -j ${THREADS}

# Default to nothing
: ${DISABLE_TESTS:=}

# If DISABLE_TESTS is unset (default), run the tests
if [[ -z "${DISABLE_TESTS}" ]]; then
	echo "*** Running tests"

	# Run unit tests
	make -j ${THREADS} check || (print_sanitizers_log && exit 1)

	mkdir -p output/
	BRANCH=$(git rev-parse --abbrev-ref HEAD)
	JUNIT_DEFAULT="junit_results_default.xml"
	JUNIT_NEXT_UPGRADE="junit_results_next_upgrade.xml"

	if [[ ! -z "${DISABLE_WALLET}" ]]; then
		echo "Skipping rpc testing due to disabled wallet functionality."
	elif [[ "${BRANCH}" == "master" ]]; then
		./test/functional/test_runner.py -J="${JUNIT_DEFAULT}" --cutoff=600 --tmpdirprefix=output
		./test/functional/test_runner.py -J="${JUNIT_NEXT_UPGRADE}" --cutoff=600 --tmpdirprefix=output --with-gravitonactivation
	else
		./test/functional/test_runner.py -J="${JUNIT_DEFAULT}" --tmpdirprefix=output
		./test/functional/test_runner.py -J="${JUNIT_NEXT_UPGRADE}" --tmpdirprefix=output --with-gravitonactivation
	fi
else
	echo "*** Tests have been skipped"
fi

