#!/usr/bin/env bash
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euxo pipefail

export CONDUIT_TOKEN=mock-conduit-token

TOPLEVEL=$(git rev-parse --show-toplevel)
SOURCE_CONTROL_TOOLS="${TOPLEVEL}"/contrib/source-control-tools


mock_curl_accepted() {
  echo '{"error_info":null,"result":{"data":[{"fields":{"status":{"value":"accepted"}}}]}}'
}
export -f mock_curl_accepted
CURL_COMMAND=mock_curl_accepted "${SOURCE_CONTROL_TOOLS}"/check-revision-accepted.sh D1234

mock_curl_rejected() {
  echo '{"error_info":null,"result":{"data":[{"fields":{"status":{"value":"needs-review"}}}]}}'
}
export -f mock_curl_rejected
# shellcheck disable=SC2015
CURL_COMMAND=mock_curl_rejected "${SOURCE_CONTROL_TOOLS}"/check-revision-accepted.sh D1234 && {
  echo "Error: Revision should be rejected"
  exit 1
} || true

echo "PASSED"
