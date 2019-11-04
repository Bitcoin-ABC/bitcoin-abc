#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

: "${ABC_BUILD_NAME:=""}"
if [ -z "$ABC_BUILD_NAME" ]; then
  echo "Error: Environment variable ABC_BUILD_NAME must be set"
  exit 1
fi

echo "Running build configuration '${ABC_BUILD_NAME}'..."

TOPLEVEL=$(git rev-parse --show-toplevel)
export TOPLEVEL

setup() {
  : "${BUILD_DIR:=${TOPLEVEL}/build}"
  mkdir -p "${BUILD_DIR}/output"
  BUILD_DIR=$(cd "${BUILD_DIR}"; pwd)
  export BUILD_DIR

  TEST_RUNNER_FLAGS="--tmpdirprefix=output"

  cd "${BUILD_DIR}"

  # Determine the number of build threads
  THREADS=$(nproc || sysctl -n hw.ncpu)
  export THREADS

  # Base directories for sanitizer related files 
  SAN_SUPP_DIR="${TOPLEVEL}/test/sanitizer_suppressions"
  SAN_LOG_DIR="${BUILD_DIR}/sanitizer_logs"

  # Create the log directory if it doesn't exist and clear it
  mkdir -p "${SAN_LOG_DIR}"
  rm -rf "${SAN_LOG_DIR:?}"/*

  # Sanitizers options, not used if sanitizers are not enabled
  export ASAN_OPTIONS="malloc_context_size=0:log_path=${SAN_LOG_DIR}/asan.log"
  export LSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/lsan:log_path=${SAN_LOG_DIR}/lsan.log"
  export TSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/tsan:log_path=${SAN_LOG_DIR}/tsan.log"
  export UBSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/ubsan:print_stacktrace=1:halt_on_error=1:log_path=${SAN_LOG_DIR}/ubsan.log"
}

# Facility to print out sanitizer log outputs to the build log console
print_sanitizers_log() {
  for log in "${SAN_LOG_DIR}"/*.log.*
  do
    echo "*** Output of ${log} ***"
    cat "${log}"
  done
}

CI_SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
setup

case "$ABC_BUILD_NAME" in
  build-asan)
    # Build with the address sanitizer, then run unit tests and functional tests.
    CONFIGURE_FLAGS="--enable-debug --with-sanitizers=address --disable-ccache" "${CI_SCRIPTS_DIR}"/build.sh
    make -j "${THREADS}" check
    # FIXME Remove when wallet_multiwallet works with asan after backporting at least the following PRs from Core and their dependencies: 13161, 12493, 14320, 14552, 14760, 11911.
    TEST_RUNNER_FLAGS="${TEST_RUNNER_FLAGS} --exclude=wallet_multiwallet"
    ./test/functional/test_runner.py -J=junit_results_asan.xml ${TEST_RUNNER_FLAGS}
    ;;

  build-ubsan)
    # Build with the undefined sanitizer, then run unit tests and functional tests.
    CONFIGURE_FLAGS="--enable-debug --with-sanitizers=undefined --disable-ccache CC=clang CXX=clang++" "${CI_SCRIPTS_DIR}"/build.sh
    make -j "${THREADS}" check
    # FIXME Remove when abc-p2p-compactblocks works with ubsan.
    TEST_RUNNER_FLAGS="${TEST_RUNNER_FLAGS} --exclude=abc-p2p-compactblocks"
    ./test/functional/test_runner.py -J=junit_results_ubsan.xml ${TEST_RUNNER_FLAGS}
    ;;

  build-default)
    # Build, run unit tests and functional tests (all extended tests if this is the master branch).
    "${CI_SCRIPTS_DIR}"/build.sh
    make -j "${THREADS}" check

    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [[ "${BRANCH}" == "master" ]]; then
      TEST_RUNNER_FLAGS="${TEST_RUNNER_FLAGS} --extended"
    fi
    ./test/functional/test_runner.py -J=junit_results_default.xml ${TEST_RUNNER_FLAGS}
    ./test/functional/test_runner.py -J=junit_results_next_upgrade.xml --with-gravitonactivation ${TEST_RUNNER_FLAGS}

    # Build secp256k1 and run the java tests.
    export TOPLEVEL="${TOPLEVEL}"/src/secp256k1
    export BUILD_DIR="${TOPLEVEL}"/build
    setup
    CONFIGURE_FLAGS="--enable-jni --enable-experimental --enable-module-ecdh" "${CI_SCRIPTS_DIR}"/build.sh
    make -j "${THREADS}" check-java
    ;;

  build-without-wallet)
    # Build without wallet and run the unit tests.
    CONFIGURE_FLAGS="--disable-wallet" "${CI_SCRIPTS_DIR}"/build.sh
    make -j "${THREADS}" check
    ;;

  build-ibd)
    "${CI_SCRIPTS_DIR}"/build.sh
    "${CI_SCRIPTS_DIR}"/ibd.sh -disablewallet -debug=net
    ;;

  build-ibd-no-assumevalid-checkpoint)
    "${CI_SCRIPTS_DIR}"/build.sh
    "${CI_SCRIPTS_DIR}"/ibd.sh -disablewallet -assumevalid=0 -checkpoints=0 -debug=net
    ;;

  build-werror)
    # Build with variable-length-array and thread-safety-analysis treated as errors
    CONFIGURE_FLAGS="--enable-debug --enable-werror CC=clang CXX=clang++" "${CI_SCRIPTS_DIR}"/build.sh
    ;;

  *)
    echo "Error: Invalid build name '${ABC_BUILD_NAME}'"
    exit 2
    ;;
esac
