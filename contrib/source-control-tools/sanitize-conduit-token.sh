#!/usr/bin/env bash
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euo pipefail

# NOTE: This script must be sourced in order to work correctly

# Temporarily stop verbose logging to prevent leaking CONDUIT_TOKEN
set +x

: "${CONDUIT_TOKEN:=}"
# Remove export property from CONDUIT_TOKEN so it is not accidentally logged
export -n CONDUIT_TOKEN
if [ -z "${CONDUIT_TOKEN}" ]; then
  echo "Error: CONDUIT_TOKEN was not set"
  exit 1
fi

# Resume verbose logging
set -x
