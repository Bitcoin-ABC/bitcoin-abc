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
  mkdir -p "${BUILD_DIR}"
  BUILD_DIR=$(cd "${BUILD_DIR}"; pwd)
  export BUILD_DIR

  cd "${BUILD_DIR}"

  # Determine the number of build threads
  THREADS=$(nproc || sysctl -n hw.ncpu)
  export THREADS

  # Base directories for sanitizer related files 
  SAN_SUPP_DIR="${TOPLEVEL}/test/sanitizer_suppressions"
  SAN_LOG_DIR="/tmp/sanitizer_logs"

  # Create the log directory if it doesn't exist and clear it
  mkdir -p "${SAN_LOG_DIR}"
  rm -rf "${SAN_LOG_DIR:?}"/*

  # Sanitizers options, not used if sanitizers are not enabled
  export ASAN_OPTIONS="malloc_context_size=0:log_path=${SAN_LOG_DIR}/asan.log"
  export LSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/lsan:log_path=${SAN_LOG_DIR}/lsan.log"
  export TSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/tsan:log_path=${SAN_LOG_DIR}/tsan.log"
  export UBSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/ubsan:print_stacktrace=1:halt_on_error=1:log_path=${SAN_LOG_DIR}/ubsan.log"

  # Unit test logger parameters
  UNIT_TESTS_JUNIT_LOG_LEVEL=message
}

run_test_bitcoin() {
  # Usage: run_test_bitcoin "Context as string" [arguments...]
  ninja test_bitcoin

  TEST_BITCOIN_JUNIT="junit_results_unit_tests${1:+_${1// /_}}.xml"
  TEST_BITCOIN_SUITE_NAME="Bitcoin ABC unit tests${1:+ $1}"

  ./src/test/test_bitcoin \
    --logger=HRF:JUNIT,${UNIT_TESTS_JUNIT_LOG_LEVEL},${TEST_BITCOIN_JUNIT} \
    -- \
    -testsuitename="${TEST_BITCOIN_SUITE_NAME}" \
    "${@:2}"
}

# Facility to print out sanitizer log outputs to the build log console
print_sanitizers_log() {
  for log in "${SAN_LOG_DIR}"/*.log.*
  do
    echo "*** Output of ${log} ***"
    cat "${log}"
  done
}
trap "print_sanitizers_log" ERR

CI_SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
DEVTOOLS_DIR="${TOPLEVEL}"/contrib/devtools
setup

case "$ABC_BUILD_NAME" in
  build-asan)
    # Build with the address sanitizer, then run unit tests and functional tests.
    CMAKE_FLAGS=(
      "-DCMAKE_CXX_FLAGS=-DARENA_DEBUG"
      "-DCMAKE_BUILD_TYPE=Debug"
      # ASAN does not support assembly code: https://github.com/google/sanitizers/issues/192
      # This will trigger a segfault if the SSE4 implementation is selected for SHA256.
      # Disabling the assembly works around the issue.
      "-DCRYPTO_USE_ASM=OFF"
      "-DENABLE_SANITIZERS=address"
      "-DCCACHE=OFF"
      "-DCMAKE_C_COMPILER=clang"
      "-DCMAKE_CXX_COMPILER=clang++"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_cmake.sh

    run_test_bitcoin "with address sanitizer"

    # Libs and utils tests
    ninja \
      check-bitcoin-qt \
      check-bitcoin-seeder \
      check-bitcoin-util \

    ninja check-functional
    ;;

  build-ubsan)
    # Build with the undefined sanitizer, then run unit tests and functional tests.
    CMAKE_FLAGS=(
      "-DCMAKE_BUILD_TYPE=Debug"
      "-DENABLE_SANITIZERS=undefined"
      "-DCCACHE=OFF"
      "-DCMAKE_C_COMPILER=clang"
      "-DCMAKE_CXX_COMPILER=clang++"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_cmake.sh

    run_test_bitcoin "with undefined sanitizer"

    # Libs and utils tests
    ninja \
      check-bitcoin-qt \
      check-bitcoin-seeder \
      check-bitcoin-util \

    ninja check-functional
    ;;

  build-tsan)
    # Build with the thread sanitizer, then run unit tests and functional tests.
    CMAKE_FLAGS=(
      "-DCMAKE_BUILD_TYPE=Debug"
      "-DENABLE_SANITIZERS=thread"
      "-DCCACHE=OFF"
      "-DCMAKE_C_COMPILER=clang"
      "-DCMAKE_CXX_COMPILER=clang++"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_cmake.sh

    run_test_bitcoin "with thread sanitizer"

    # Libs and utils tests
    ninja \
      check-bitcoin-qt \
      check-bitcoin-seeder \
      check-bitcoin-util \

    ninja check-functional
    ;;

  build-diff)
    # Build, run unit tests and functional tests.
    CMAKE_FLAGS=(
      "-DSECP256K1_ENABLE_MODULE_ECDH=ON"
      "-DSECP256K1_ENABLE_JNI=ON"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_cmake.sh

    # Unit tests
    run_test_bitcoin
    run_test_bitcoin "with next upgrade activated" -phononactivationtime=1575158400

    # Libs and tools tests
    # The leveldb tests need to run alone or they will sometimes fail with
    # garbage output, see:
    # https://build.bitcoinabc.org/viewLog.html?buildId=29713&guest=1
    ninja check-leveldb
    ninja \
      check-bitcoin-qt \
      check-bitcoin-seeder \
      check-bitcoin-util \
      check-devtools \
      check-rpcauth \
      check-secp256k1 \
      check-univalue \

    # Functional tests
    ninja check-functional
    ninja check-functional-upgrade-activated
    ;;

  build-master)
    # Build, run unit tests and extended functional tests.
    CMAKE_FLAGS=(
      "-DSECP256K1_ENABLE_MODULE_ECDH=ON"
      "-DSECP256K1_ENABLE_JNI=ON"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_cmake.sh

    # Unit tests
    run_test_bitcoin
    run_test_bitcoin "with next upgrade activated" -phononactivationtime=1575158400

    # Libs and tools tests
    # The leveldb tests need to run alone or they will sometimes fail with
    # garbage output, see:
    # https://build.bitcoinabc.org/viewLog.html?buildId=29713&guest=1
    ninja check-leveldb
    ninja \
      check-bitcoin-qt \
      check-bitcoin-seeder \
      check-bitcoin-util \
      check-devtools \
      check-rpcauth \
      check-secp256k1 \
      check-univalue \

    # Functional tests
    ninja check-functional-extended
    ninja check-functional-upgrade-activated-extended
    ;;

  build-without-wallet)
    # Build without wallet and run the unit tests.
    CMAKE_FLAGS=(
      "-DBUILD_BITCOIN_WALLET=OFF"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_cmake.sh

    ninja check-bitcoin-qt
    ninja check-functional

    run_test_bitcoin "without wallet"
    ;;

  build-ibd)
    "${DEVTOOLS_DIR}"/build_cmake.sh
    "${CI_SCRIPTS_DIR}"/ibd.sh -disablewallet -debug=net
    ;;

  build-ibd-no-assumevalid-checkpoint)
    "${DEVTOOLS_DIR}"/build_cmake.sh
    "${CI_SCRIPTS_DIR}"/ibd.sh -disablewallet -assumevalid=0 -checkpoints=0 -debug=net
    ;;

  build-werror)
    # Build with variable-length-array and thread-safety-analysis treated as errors
    CMAKE_FLAGS=(
      "-DENABLE_WERROR=ON"
      "-DCMAKE_C_COMPILER=clang"
      "-DCMAKE_CXX_COMPILER=clang++"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_cmake.sh
    ;;

  build-autotools)
    # Ensure that the build using autotools is not broken
    "${DEVTOOLS_DIR}"/build_autotools.sh
    make -j "${THREADS}" check
    ;;

  build-bench)
    # Build and run the benchmarks.
    CMAKE_FLAGS=(
      "-DBUILD_BITCOIN_WALLET=ON"
      "-DSECP256K1_ENABLE_MODULE_ECDH=ON"
      "-DSECP256K1_ENABLE_MODULE_MULTISET=ON"
      "-DSECP256K1_ENABLE_MODULE_RECOVERY=ON"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_cmake.sh
    ninja bench-bitcoin
    ninja bench-secp256k1
    ;;

  build-make-generator)
    # Ensure that the build using cmake and the "Unix Makefiles" generator is
    # not broken.
    cd ${BUILD_DIR}
    git clean -xffd
    cmake -G "Unix Makefiles" ..
    make -j "${THREADS}" all check
    ;;

  check-seeds)
    "${DEVTOOLS_DIR}"/build_cmake.sh
    # Run on different ports to avoid a race where the rpc port used in the
    # first run may not be closed in time for the second to start.
    SEEDS_DIR="${TOPLEVEL}"/contrib/seeds
    RPC_PORT=18832 "${SEEDS_DIR}"/check-seeds.sh main 80
    RPC_PORT=18833 "${SEEDS_DIR}"/check-seeds.sh test 70
    ;;

  *)
    echo "Error: Invalid build name '${ABC_BUILD_NAME}'"
    exit 2
    ;;
esac
