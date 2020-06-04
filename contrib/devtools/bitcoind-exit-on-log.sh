#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

# Do not leave any dangling subprocesses when this script exits
trap "kill 0" SIGINT

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
  exit 2
fi

# Make sure the debug log exists so that tail does not fail
touch "${LOG_FILE}"

# Launch bitcoind using custom parameters
read -a BITCOIND_PARAMS <<< "${BITCOIND_PARAMS}"

BITCOIND_PID_FILE=/tmp/bitcoind-exit-on-log.pid
# Make sure the PID file doesn't already exist for some reason
rm -f "${BITCOIND_PID_FILE}"
BITCOIND_PARAMS+=("-pid=${BITCOIND_PID_FILE}")
BITCOIND_PARAMS+=("-daemon")

START_TIME=$(date +%s)
"${BITCOIND}" "${BITCOIND_PARAMS[@]}"

# The PID file will not exist immediately, so wait for it
PID_WAIT_COUNT=0
while [ ! -e "${BITCOIND_PID_FILE}" ]; do
  ((PID_WAIT_COUNT+=1))
  if [ "${PID_WAIT_COUNT}" -gt 10 ]; then
    echo "Timed out waiting for bitcoind PID file"
    exit 10
  fi
  sleep 0.5
done
BITCOIND_PID=$(cat "${BITCOIND_PID_FILE}")

# Wait for log checking to finish and kill the daemon
(
  # When this subshell finishes, kill bitcoind
  log_subshell_cleanup() {
    echo "Cleaning up bitcoin daemon (PID: ${BITCOIND_PID})."
    kill ${BITCOIND_PID}
  }
  trap "log_subshell_cleanup" EXIT

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

# Wait for bitcoind to exit, whether it exited on its own or the log subshell finished
set +x
while [ -e "${BITCOIND_PID_FILE}" ]; do sleep 0.5; done
set -x

# If the log subshell is still running, then GREP_PATTERN was not found
if [ -e /proc/${LOG_PID} ]; then
  echo "bitcoind exited unexpectedly. See '${LOG_FILE}' for details."
  exit 20
fi

# Get the exit code for the log subshell, which should have exited already
# if GREP_PATTERN was found
wait ${LOG_PID}
LOG_EXIT_CODE=$?

# The log subshell should only exit with a non-zero code if the callback
# failed.
if [ "${LOG_EXIT_CODE}" -ne "0" ]; then
  echo "Log subshell failed with code: ${LOG_EXIT_CODE}"
  exit ${LOG_EXIT_CODE}
fi
