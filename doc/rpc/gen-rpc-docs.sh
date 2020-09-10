#!/bin/sh

export LC_ALL=C.UTF-8

set -eu

if ! command -v go > /dev/null
then
  echo "Generating the RPC documentation requires 'go' to be installed"
  exit 1
fi

GENERATOR_SCRIPT="$1"
BITCOIND_COMMAND="$2"
BITCOIN_CLI_COMMAND="$3"

BITCOIND_PID_FILE="_bitcoind.pid"
"${BITCOIND_COMMAND}" -regtest -daemon -pid="${BITCOIND_PID_FILE}"

shutdown_bitcoind() {
  "${BITCOIN_CLI_COMMAND}" -regtest stop > /dev/null 2>&1

  # Waiting for bitcoind shut down
  PID_WAIT_COUNT=0
  while [ -e "${BITCOIND_PID_FILE}" ]
  do
    : $((PID_WAIT_COUNT+=1))
    if [ "${PID_WAIT_COUNT}" -gt 20 ]
    then
      echo "Timed out waiting for bitcoind to stop"
      exit 3
    fi
    sleep 0.5
  done
}
trap "shutdown_bitcoind" EXIT

# Waiting for bitcoind to spin up
RPC_HELP_WAIT_COUNT=0
while ! "${BITCOIN_CLI_COMMAND}" -regtest help > /dev/null 2>&1
do
  : $((RPC_HELP_WAIT_COUNT+=1))
  if [ "${RPC_HELP_WAIT_COUNT}" -gt 10 ]
  then
    echo "Timed out waiting for bitcoind to start"
    exit 2
  fi
  sleep 0.5
done

go run "${GENERATOR_SCRIPT}" -regtest
