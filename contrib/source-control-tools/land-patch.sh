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
Land a commit on master after running any necessary scripts and sanity checks.

The patch is assumed to have been reviewed or generated from a trusted sourece.

Options:
  -d, --dry-run           Dry run. Does everything but actually landing the change.
  -h, --help              Display this help message.

Environment Variables (for testing):
  SANITY_CHECKS_COMMAND   The command to override sanity checks (smoke tests).
  GIT_COMMAND             The command to override 'git' calls.
EOF
}

DRY_RUN=no
GIT_ARGS=()

# Parse command line arguments
while [[ $# -gt 0 ]]; do
case $1 in
  -d|--dry-run)
    DRY_RUN=yes
    GIT_ARGS+=("--dry-run")
    shift # shift past argument
    ;;
  -h|--help)
    help_message
    exit 0
    ;;
  *)
    echo "Error: Unrecognized argument: '$1'"
    help_message
    exit 1
    ;;
esac
done

if [[ ${DRY_RUN} == "no" ]] && [[ "$(git rev-parse --abbrev-ref HEAD)" != "master" ]]; then
  echo "Error: This script assumes the commit to land is on master"
  exit 10
fi

TOPLEVEL=$(git rev-parse --show-toplevel)

# Sanity checks
: "${SANITY_CHECKS_COMMAND:=${TOPLEVEL}/contrib/devtools/smoke-tests.sh}"
${SANITY_CHECKS_COMMAND}

# Push the change. Phabricator will automatically close the associated revision.
: "${GIT_COMMAND:=git}"
${GIT_COMMAND} push "${GIT_ARGS[@]}" origin master
