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
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${CI_SCRIPTS_DIR}"/build_cmake.sh
    ninja check check-functional
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
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${CI_SCRIPTS_DIR}"/build_cmake.sh
    ninja check check-functional
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
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${CI_SCRIPTS_DIR}"/build_cmake.sh
    ninja check check-functional
    ;;

  build-diff)
    # Build, run unit tests and functional tests.
    CMAKE_FLAGS=(
      "-DSECP256K1_ENABLE_MODULE_ECDH=ON"
      "-DSECP256K1_ENABLE_JNI=ON"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${CI_SCRIPTS_DIR}"/build_cmake.sh
    ninja check-all check-upgrade-activated
    ;;

  build-master)
    # Build, run unit tests and extended functional tests.
    CMAKE_FLAGS=(
      "-DSECP256K1_ENABLE_MODULE_ECDH=ON"
      "-DSECP256K1_ENABLE_JNI=ON"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${CI_SCRIPTS_DIR}"/build_cmake.sh
    ninja check-extended check-upgrade-activated-extended
    ;;

  build-without-wallet)
    # Build without wallet and run the unit tests.
    CMAKE_FLAGS=(
      "-DBUILD_BITCOIN_WALLET=OFF"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${CI_SCRIPTS_DIR}"/build_cmake.sh
    ninja check
    ;;

  build-ibd)
    "${CI_SCRIPTS_DIR}"/build_cmake.sh
    "${CI_SCRIPTS_DIR}"/ibd.sh -disablewallet -debug=net
    ;;

  build-ibd-no-assumevalid-checkpoint)
    "${CI_SCRIPTS_DIR}"/build_cmake.sh
    "${CI_SCRIPTS_DIR}"/ibd.sh -disablewallet -assumevalid=0 -checkpoints=0 -debug=net
    ;;

  build-werror)
    # Build with variable-length-array and thread-safety-analysis treated as errors
    CMAKE_FLAGS=(
      "-DENABLE_WERROR=ON"
      "-DCMAKE_C_COMPILER=clang"
      "-DCMAKE_CXX_COMPILER=clang++"
    )
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${CI_SCRIPTS_DIR}"/build_cmake.sh
    ;;

  build-autotools)
    # Ensure that the build using autotools is not broken
    "${CI_SCRIPTS_DIR}"/build_autotools.sh
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
    CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${CI_SCRIPTS_DIR}"/build_cmake.sh
    ninja bench-bitcoin
    ninja bench-secp256k1
    ;;

  check-seeds-mainnet)
    "${CI_SCRIPTS_DIR}"/build_cmake.sh
    "${CI_SCRIPTS_DIR}"/check-seeds.sh main 80
    ;;

  check-seeds-testnet)
    "${CI_SCRIPTS_DIR}"/build_cmake.sh
    "${CI_SCRIPTS_DIR}"/check-seeds.sh test 70
    ;;

  *)
    echo "Error: Invalid build name '${ABC_BUILD_NAME}'"
    exit 2
    ;;
esac
