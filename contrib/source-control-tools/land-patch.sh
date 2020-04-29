#!/usr/bin/env bash
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euxo pipefail

help_message() {
  cat <<EOF
Usage:
$0 [options]
Push a commit after running any necessary auto-gen scripts and sanity checks.

By default, the local commit(s) on master will be pushed (not yet supported).

Options:
  -d, --dry-run           Dry run. Does everything but actually landing the change.
  -h, --help              Display this help message.
  -r, --revision          Land a Differential patch instead of a local commit. This is the revision ID
                            used in Phabricator that you want to land. (ex: D1234)

Environment Variables:
  CONDUIT_TOKEN           Conduit token to use when landing the patch. This allows landing a patch as
                            a particular Phabricator user.  This must be set if -r|--revision is set.
EOF
}

ARC_LAND_ARGS=()
REVISION=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
case $1 in
  -d|--dry-run)
    ARC_LAND_ARGS+=("--hold")
    shift # shift past argument
    ;;
  -h|--help)
    help_message
    exit 0
    ;;
  -r|--revision)
    REVISION="$2"
    shift # shift past argument
    shift # shift past value
    ;;
  *)
    echo "Error: Unrecognized argument: '$1'"
    help_message
    exit 1
    ;;
esac
done

# Temporarily stop verbose logging to prevent leaking CONDUIT_TOKEN
set +x
: "${CONDUIT_TOKEN:=}"
# Remove export property from CONDUIT_TOKEN so it is not accidentally logged
export -n CONDUIT_TOKEN
if [ -n "${REVISION}" ] && [ -z "${CONDUIT_TOKEN}" ]; then
  echo "Error: CONDUIT_TOKEN was not set"
  exit 10
fi
set -x

TOPLEVEL=$(git rev-parse --show-toplevel)
DEVTOOLS_DIR="${TOPLEVEL}"/contrib/devtools
BUILD_DIR="${TOPLEVEL}"/build
mkdir -p "${BUILD_DIR}"
export BUILD_DIR

if [ -n "${REVISION}" ]; then
  # Pull the patch from Phabricator and rebase it on latest master
  "${TOPLEVEL}"/contrib/source-control-tools/autopatch.sh --revision "${REVISION}"
else
  # TODO: This will primarily be for scheduled, automated commits.
  echo "Error: Landing unreviewed patches is not supported yet."
  exit 20
fi

# TODO: Autogen (such as manpages, updating timings.json, copyright header, etc.)

# Sanity checks
"${DEVTOOLS_DIR}"/smoke-tests.sh

if [ -n "${REVISION}" ]; then
  echo "Landing revision '${REVISION}' with arcanist arguments: ${ARC_LAND_ARGS[*]}"
  # Stop logging verbosely to prevent leaking CONDUIT_TOKEN
  set +x
  # Land a commit using arcanist. This ensures the diff is reviewed and closed properly.
  : | arc land "${ARC_LAND_ARGS[@]}" --revision "${REVISION}" --conduit-token "${CONDUIT_TOKEN}"
  set -x
else
  # TODO: Push a git commit directly. This will primarily be for scheduled, automated commits.
  echo "Error: Pushing unreviewed patches is not supported yet."
  exit 30
fi
