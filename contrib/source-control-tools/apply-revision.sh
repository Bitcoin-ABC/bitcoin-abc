#!/usr/bin/env bash
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euxo pipefail

help_message() {
  cat <<EOF
Usage:
$0 [options] revision_id
Apply a Differential revision to master and do various sanity checks to ensure
that it can be landed safely.

revision_id               The Differential revision ID (ex: D1234)

Options:
  -h, --help              Display this help message.

Environment Variables:
  CONDUIT_TOKEN           (required) Conduit token to use when landing the patch. This allows
                            landing a patch as a particular Phabricator user.
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
case $1 in
  -h|--help)
    help_message
    exit 0
    ;;
  *)
    if [ $# -gt 1 ]; then
      echo "Error: Unrecognized argument: '$1'"
      help_message
      exit 1
    fi
    break
    ;;
esac
done

REVISION="$1"

TOPLEVEL=$(git rev-parse --show-toplevel)
"${TOPLEVEL}"/contrib/source-control-tools/check-revision-accepted.sh "${REVISION}"

# IMPORTANT NOTE: The patch is trusted past this point because it has been reviewed
# and accepted. That includes any changes that may affect this script.

# shellcheck source=sanitize-conduit-token.sh
source "${TOPLEVEL}"/contrib/source-control-tools/sanitize-conduit-token.sh

# Pull the patch from Phabricator and rebase it on latest master
"${TOPLEVEL}"/contrib/source-control-tools/autopatch.sh --revision "${REVISION}"

# Stop logging verbosely to prevent leaking CONDUIT_TOKEN
set +x
# Check that the revision is ready to land (tests passed, etc.)
: | arc land --hold --revision "${REVISION}" --conduit-token "${CONDUIT_TOKEN}"
set -x

# `arc land --hold` still detaches the git HEAD. master should contain the
# changes we expect to land, so switch back to it.
if [ -n "$(git diff HEAD master)" ]; then
  echo "Error: Unexpected mismatch between HEAD and master"
  exit 10
fi
git checkout master --
