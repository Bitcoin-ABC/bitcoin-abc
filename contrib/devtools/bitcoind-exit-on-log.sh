#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)
DEFAULT_BITCOIND="${TOPLEVEL}/build/src/bitcoind"
DEFAULT_LOG_FILE=~/".bitcoin/debug.log"

help_message() {
  set +x
  echo "Run bitcoind until a given log message is encountered, then kill bitcoind."
  echo ""
  echo "Example usages:"
  echo "$0 --grep 'progress=1.000000' --params \"-datadir=~/.bitcoin\" --callback mycallback"
  echo ""
  echo "Options:"
  echo "-h, --help            Display this help message."
  echo ""
  echo "-g, --grep            (required) The grep pattern to look for."
  echo ""
  echo "-c, --callback        (optional) Bash command to execute as a callback. This is useful for interacting with bitcoind before it is killed (to run tests, for example)."
  echo "-p, --params          (optional) Parameters to provide to bitcoind."
  echo ""
  echo "Environment Variables:"
  echo "BITCOIND              Default: ${DEFAULT_BITCOIND}"
  echo "LOG_FILE              Default: ${DEFAULT_LOG_FILE}"
  set -x
}

: "${BITCOIND:=${DEFAULT_BITCOIND}}"
: "${LOG_FILE:=${DEFAULT_LOG_FILE}}"
GREP_PATTERN=""
CALLBACK=""
BITCOIND_PARAMS=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
case $1 in
  -h|--help)
    help_message
    exit 0
    ;;

  # Required params
  -g|--grep)
    GREP_PATTERN="$2"
    shift # shift past argument
    shift # shift past value
    ;;

  # Optional params
  -c|--callback)
    CALLBACK="$2"
    shift # shift past argument
    shift # shift past value
    ;;
  -p|--params)
    BITCOIND_PARAMS="$2"
    shift # shift past argument
    shift # shift past value
    ;;

  *)
    echo "Unknown argument: $1"
    help_message
    exit 1
    ;;
esac
done

if [ -z "${GREP_PATTERN}" ]; then
  echo "Error: A grep pattern was not specified."
  echo ""
  help_message
  exit 1
fi

# Make sure the debug log exists so that tail does not fail
touch "${LOG_FILE}"

# Launch bitcoind using custom parameters
read -a BITCOIND_PARAMS <<< "${BITCOIND_PARAMS}"
START_TIME=$(date +%s)
if [ "${#BITCOIND_PARAMS[@]}" -gt 0 ]; then
  "${BITCOIND}" "${BITCOIND_PARAMS[@]}" &
else
  "${BITCOIND}" &
fi
BITCOIND_PID=$!

# Wait for log checking to finish and kill the daemon
(
  (
    # Ignore the broken pipe when tail tries to write pipe closed by grep
    set +o pipefail
    tail -f "${LOG_FILE}" | grep -m 1 "${GREP_PATTERN}"
  )

  END_TIME=$(date +%s)
  RUNTIME=$((END_TIME - START_TIME))
  HUMAN_RUNTIME=$(eval "echo $(date -ud "@${RUNTIME}" "+\$((%s/3600)) hours, %M minutes, %S seconds")")

  echo "Grep pattern '${GREP_PATTERN}' found after ${HUMAN_RUNTIME}."

  # Optional callback for interacting with bitcoind before it's killed
  if [ -n "${CALLBACK}" ]; then
    "${CALLBACK}"
  fi
) &
LOG_PID=$!

# When the log subshell finishes, kill bitcoind
(
  # Disable verbosity to avoid bloating the output with sleep prints
  set +x
  while [ -e /proc/${LOG_PID} ]; do sleep 0.1; done
  set -x

  echo "Cleaning up bitcoin daemon (PID: ${BITCOIND_PID})."
  kill ${BITCOIND_PID}
) &

# Wait for bitcoind to exit, whether it exited on its own or the log subshell finished
wait ${BITCOIND_PID}
BITCOIND_EXIT_CODE=$?

if [ "${BITCOIND_EXIT_CODE}" -ne "0" ]; then
  echo "bitcoind exited unexpectedly with code: ${BITCOIND_EXIT_CODE}"
  exit ${BITCOIND_EXIT_CODE}
fi

# Get the exit code for the log subshell, which should have exited already
wait ${LOG_PID}
LOG_EXIT_CODE=$?

# The log subshell should only exit with a non-zero code if the callback
# failed.
if [ "${LOG_EXIT_CODE}" -ne "0" ]; then
  echo "Log subshell failed with code: ${LOG_EXIT_CODE}"
  exit ${LOG_EXIT_CODE}
fi
