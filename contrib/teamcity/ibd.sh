#!/bin/bash

set -euo pipefail

###
# Initial Block Download script.
#
# Runs a bitcoind process until initial block download is complete.
# Forwards the exit code from bitcoind onward.
###

MYPID=$$

# Setup
DATA_DIR="ibd"
mkdir -p "${DATA_DIR}"
DEBUG_LOG="${DATA_DIR}/debug.log"
touch "${DEBUG_LOG}"
chmod +x bitcoind

# Launch bitcoind using this script's parameters
./bitcoind "-datadir=${DATA_DIR}" $* &
BITCOIND_PID=$!

cleanup() {
  # Cleanup background processes spawned by this script.
  pkill -P ${MYPID} tail || true
}
trap "cleanup" EXIT

# Show some progress
tail -f "${DEBUG_LOG}" | grep 'UpdateTip' | awk 'NR % 10000 == 0' &

# Wait for IBD to finish and kill the daemon
(
  (
    # Ignore the broken pipe when tail tries to write pipe closed by grep
    set +o pipefail
    tail -f "${DEBUG_LOG}" | grep -m 1 'progress=1.000000'
  )
  echo "Initial block download complete."

  # TODO Add more checks to see if IBD completed as expected,
  # These checks will exit the subshell with a non-zero exit code.
) &
IBD_PID=$!

# When the IBD subshell finishes, kill bitcoind
(
  while [ -e /proc/${IBD_PID} ]; do sleep 0.1; done

  echo "Cleaning up bitcoin daemon (PID: ${BITCOIND_PID})."
  kill ${BITCOIND_PID}
) &

# Wait for bitcoind to exit, whether it exited on its own or IBD finished
wait ${BITCOIND_PID}
BITCOIND_EXIT_CODE=$?

if [ "${BITCOIND_EXIT_CODE}" -ne "0" ]; then
  echo "bitcoind exited unexpectedly with code: ${BITCOIND_EXIT_CODE}"
  exit ${BITCOIND_EXIT_CODE}
fi

# Get the exit code for the IBD subshell, which should have exited already
wait ${IBD_PID}
IBD_EXIT_CODE=$?

# The IBD subshell should only exit with a non-zero code if one of the tests
# failed.
if [ "${IBD_EXIT_CODE}" -ne "0" ]; then
  echo "IBD tests failed with code: ${IBD_EXIT_CODE}"
  exit ${IBD_EXIT_CODE}
fi
