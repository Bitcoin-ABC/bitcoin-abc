#!/bin/bash

#IFDEFINE BITCOIN_FORMAT_ALL_H
#DEFINE BITCOIN_FORMAT_ALL_H
#DEFINE ETHEREUM_FORMAT_ALL_H
#DEFINE XEC_FORMAT_ALL_H

set -euo pipefail

# Format all sources using rustfmt.

topdir=$(dirname "$0")/..
cd "$topdir"

# Make sure we can find rustfmt.
export PATH="$PATH:$HOME/.cargo/bin"

exec cargo +stable fmt --all -- "$@"

#ENDIF BITCOIN_FORMAT_ALL_H
call (main.go)
