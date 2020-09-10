#!/usr/bin/env bash
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euxo pipefail

DEFAULT_CURL_COMMAND=curl

help_message() {
  cat <<EOF
Usage:
$0 [options] revision_id
Return success if the given revision has been accepted in code review.

revision_id               The Phabricator revision ID (ex: D1234)

Options:
  -h, --help              Display this help message.

Environment Variables:
  CONDUIT_TOKEN           (required) Conduit token to use for fetching revision status.
  CURL_COMMAND            (optional) Override the curl call used to fetch the revision status.
                            Default: ${DEFAULT_CURL_COMMAND}
EOF
}

if [ $# -ne 1 ]; then
  echo "Error: Expected one argument"
  help_message
  exit 1
fi

REVISION="$1"
case ${REVISION} in
  -h|--help)
    help_message
    exit 0
    ;;
esac

: "${CURL_COMMAND:=${DEFAULT_CURL_COMMAND}}"

TOPLEVEL=$(git rev-parse --show-toplevel)
# shellcheck source=sanitize-conduit-token.sh
source "${TOPLEVEL}"/contrib/source-control-tools/sanitize-conduit-token.sh

# Temporarily stop verbose logging to prevent leaking CONDUIT_TOKEN
set +x
# Fetch the revision and check its review status
REVISION_RESULT=$("${CURL_COMMAND}" "https://reviews.bitcoinabc.org/api/differential.revision.search" \
  -d "api.token=${CONDUIT_TOKEN}" \
  -d "constraints[ids][0]=${REVISION:1}") || {
    echo "Error: Failed to fetch revision '${REVISION}'"
    echo "curl output:"
    echo "${REVISION_RESULT}"
    exit 20
}
set -x

ERROR_INFO=$(echo "${REVISION_RESULT}" | jq '.error_info')
if [ "${ERROR_INFO}" != "null" ]; then
  echo "Conduit error while fetching '${REVISION}': ${ERROR_INFO}"
  exit 21
fi

REVIEW_STATUS=$(echo "${REVISION_RESULT}" | jq '.result.data[].fields.status.value') || {
  echo "Error: Failed to fetch review status of revision '${REVISION}'"
  echo "The 'status' fields may be missing or malformed."
  exit 22
}

# We only trust code that has been accepted
if [ "${REVIEW_STATUS}" != "\"accepted\"" ]; then
  echo "Error: Revision '${REVISION}' is not accepted. Review status is: ${REVIEW_STATUS}"
  exit 23
fi
