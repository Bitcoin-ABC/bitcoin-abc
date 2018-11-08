#!/bin/bash

set -euo pipefail

###
# Initial Block Download script.
# 
# Runs a bitcoind process until initial block download is complete.
# Forwards the exit code from bitcoind onward.
#

MYPID=$$

# Setup
mkdir -p ibd
touch ibd/debug.log
chmod +x bitcoind

cleanup() {
    echo "Terminating (pid: ${1})"
    pkill -P ${MYPID} tail || true
}

: ${PARAMS:=-disablewallet}

# Launch bitcoind
./bitcoind -datadir=ibd "${PARAMS}" &
bitcoin_pid=$!

trap "cleanup ${bitcoin_pid}" EXIT

# Wait for IBD to finish and kill the daemon
( 
    set +o pipefail
    tail -f ibd/debug.log | grep -m 1 'progress=1.000000'
    echo "Initial block download complete, killing bitcoin daemon."
    kill ${bitcoin_pid}
) &

# Show some progress 
tail -f ibd/debug.log | grep 'UpdateTip' | awk 'NR % 10000 == 0' &

# Wait for bitcoind to exit
wait ${bitcoin_pid}
exit $?
