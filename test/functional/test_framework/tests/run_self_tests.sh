#!/bin/sh
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
#
# Executes the test framework self-tests located in
# qa/rpc-tests/test_framework/tests.
#
# You should be able to call this script from pretty much anywhere.
# It takes care of setting up the PYTHONPATH so tests can run.

export LC_ALL=C

# Enable exit on any error.
set -e

# Save folder from which script was called.
# We may need to return after looking for the base folder.
start_folder="$(pwd)"

if [ -d qa/rpc-tests ]
then
    # called from top level
    RPC_TESTS_DIR=$(pwd)/qa/rpc-tests
elif [ -d ../qa/rpc-tests ]
then
    # called from out of tree build
    RPC_TESTS_DIR=$(cd ../qa/rpc-tests && pwd)
else
    # chop off the script's filename to get path
    scriptpath=$(dirname $0)
    RPC_TESTS_DIR=$(cd $scriptpath/../.. && pwd)
fi

export PYTHONPATH="$PYTHONPATH:$RPC_TESTS_DIR"

# Go to where the tests are located
cd $RPC_TESTS_DIR/test_framework/tests

echo "Running test framework self-tests..."

# Run all the Python tests we find there.
for t in *.py
do
    echo "$(date -u): Starting self-test: $t"
    SRCDIR=$RPC_TESTS_DIR/../.. python3 ./$t
    echo "$(date -u): Finished self-test: $t"
    echo
done

# Return to calling folder

cd "$start_folder"

echo "Completed test framework self-tests."
