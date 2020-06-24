#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"

DEVTOOLS_DIR="${TOPLEVEL}/contrib/devtools"

# Base directories for sanitizer related files
SAN_SUPP_DIR="${TOPLEVEL}/test/sanitizer_suppressions"
SAN_LOG_DIR="/tmp/sanitizer_logs"

# Create the log directory if it doesn't exist and clear it
mkdir -p "${SAN_LOG_DIR}"
rm -rf "${SAN_LOG_DIR:?}"/*

# Needed options are set by the build system, add the log path to all runs
export ASAN_OPTIONS="log_path=${SAN_LOG_DIR}/asan.log"
export LSAN_OPTIONS="log_path=${SAN_LOG_DIR}/lsan.log"
export TSAN_OPTIONS="log_path=${SAN_LOG_DIR}/tsan.log"
export UBSAN_OPTIONS="log_path=${SAN_LOG_DIR}/ubsan.log"

run_test_bitcoin() {
  # Usage: run_test_bitcoin "Context as string" [arguments...]
  ninja test_bitcoin

  TEST_BITCOIN_JUNIT="junit_results_unit_tests${1:+_${1// /_}}.xml"
  TEST_BITCOIN_SUITE_NAME="Bitcoin ABC unit tests${1:+ $1}"

  # More sanitizer options are needed to run the executable directly
  ASAN_OPTIONS="malloc_context_size=0:${ASAN_OPTIONS}" \
  LSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/lsan:${LSAN_OPTIONS}" \
  TSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/tsan:${TSAN_OPTIONS}" \
  UBSAN_OPTIONS="suppressions=${SAN_SUPP_DIR}/ubsan:print_stacktrace=1:halt_on_error=1:${UBSAN_OPTIONS}" \
  ./src/test/test_bitcoin \
    --logger=HRF:JUNIT,message,${TEST_BITCOIN_JUNIT} \
    -- \
    -testsuitename="${TEST_BITCOIN_SUITE_NAME}" \
    "${@:2}"
}

# Facility to print out sanitizer log outputs to the build log console
print_sanitizers_log() {
  for log in "${SAN_LOG_DIR}"/*.log.*
  do
    if [ -f "${log}" ]; then
      echo "*** Output of ${log} ***"
      cat "${log}"
    fi
  done
}
trap "print_sanitizers_log" ERR

# It is valid to call the function with no argument, so ignore SC2120
# shellcheck disable=SC2120
build_with_cmake() {
  CMAKE_FLAGS="${CMAKE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_cmake.sh "$@"
}

build_with_autotools() {
  CONFIGURE_FLAGS="${CONFIGURE_FLAGS[*]}" "${DEVTOOLS_DIR}"/build_autotools.sh "$@"
}

run_ibd() {
  "${TOPLEVEL}"/contrib/teamcity/ibd.sh "$@"
}

build_static_dependencies() {
  "${DEVTOOLS_DIR}"/build_depends.sh
}
