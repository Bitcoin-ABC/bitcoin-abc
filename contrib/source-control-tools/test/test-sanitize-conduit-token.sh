#!/usr/bin/env bash
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euxo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)
SOURCE_CONTROL_TOOLS="${TOPLEVEL}"/contrib/source-control-tools

# Test with CONDUIT_TOKEN not set
# shellcheck source=../sanitize-conduit-token.sh disable=SC2015
(source "${SOURCE_CONTROL_TOOLS}"/sanitize-conduit-token.sh) && {
  echo "Error: Expected sanitize to fail with no CONDUIT_TOKEN set"
  exit 1
} || true

# Test visibility of CONDUIT_TOKEN to ensure it can be handled securely
# shellcheck disable=SC2031
export CONDUIT_TOKEN="my-conduit-token"
# shellcheck source=../sanitize-conduit-token.sh
source "${SOURCE_CONTROL_TOOLS}"/sanitize-conduit-token.sh

if [ "${CONDUIT_TOKEN}" != "my-conduit-token" ]; then
  echo "Error: CONDUIT_TOKEN is expected to be set correctly"
  exit 1
fi

# Setup a malicious script
TEMP_FILE=$(mktemp)
cleanup() {
  rm "${TEMP_FILE}"
}
trap "cleanup" EXIT
echo "echo \${CONDUIT_TOKEN}" > "${TEMP_FILE}"
chmod +x "${TEMP_FILE}"

# A malicious script should not be able to extract the CONDUIT_TOKEN
TOKEN=$("${TEMP_FILE}")
if [ -n "${TOKEN}" ]; then
  echo "Error: CONDUIT_TOKEN was leaked"
  exit 1
fi

echo "PASSED"
