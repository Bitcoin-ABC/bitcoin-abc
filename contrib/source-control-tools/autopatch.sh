#!/usr/bin/env bash
# Copyright (c) 2019-2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euxo pipefail

# --force is necessary to skip the "sanity check" step, which conflicts with
# stacked revisions that contain already-landed dependencies.
DEFAULT_PATCH_ARGS="--skip-dependencies --force --nobranch"
DEFAULT_REMOTE="origin"
DEFAULT_BRANCH="master"

help_message() {
  cat <<EOF
Apply a patch from Phabricator cleanly on latest master.

Options:
  -b, --branch              The git branch to fetch and rebase onto. Default: '${DEFAULT_BRANCH}'
  -h, --help                Display this help message.
  -o, --remote              The git remote to fetch latest from. Default: '${DEFAULT_REMOTE}'
  -p, --patch-args          Args to pass to 'arc patch'. Default: '${DEFAULT_PATCH_ARGS}'
  -r, --revision            The Differential revision ID used in Phabricator that you want to land. (ex: D1234)
                              This argument is required if --patch-args does not specify a revision or diff ID.
EOF
}

BRANCH="${DEFAULT_BRANCH}"
PATCH_ARGS="${DEFAULT_PATCH_ARGS}"
REMOTE="${DEFAULT_REMOTE}"
REVISION=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
case $1 in
  -b|--branch)
    BRANCH="$2"
    shift # shift past argument
    shift # shift past value
    ;;
  -h|--help)
    help_message
    exit 0
    shift # shift past argument
    ;;
  -o|--remote)
    REMOTE="$2"
    shift # shift past argument
    shift # shift past value
    ;;
  -p|--patch-args)
    PATCH_ARGS="$2"
    shift # shift past argument
    shift # shift past value
    ;;
  -r|--revision)
    REVISION="$2"
    shift # shift past argument
    shift # shift past value
    ;;
  *)
    echo "Unknown argument: $1"
    help_message
    exit 1
    shift # shift past argument
    ;;
esac
done

PATCH_ARGS="${REVISION} ${PATCH_ARGS}"

# Make sure there are no unstaged changes, just in case this script is being run locally
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: The source tree has unexpected changes. Clean up any changes (try 'git stash') and try again."
  exit 10
fi

# Fetch and checkout latest changes, bailing if the branch isn't an ancestor of the remote branch.
REMOTE_AND_BRANCH="${REMOTE}/${BRANCH}"
git fetch "${REMOTE}" "${BRANCH}"
git checkout "${BRANCH}"
git merge-base --is-ancestor "${BRANCH}" "${REMOTE_AND_BRANCH}" || {
  echo "Error: Branch '${BRANCH}' is not an ancestor of '${REMOTE_AND_BRANCH}'"
  exit 11
}
git pull "${REMOTE}" "${BRANCH}"

(
  # If arc fails, there may be a dangling branch. Clean it up before exiting.
  cleanup() {
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git checkout "${BRANCH}"
    git branch -D "${CURRENT_BRANCH}" || true
  }
  trap "cleanup" ERR

  # Note: `: | arc ...` pipes an empty string to stdin incase arcanist prompts
  # for user input. This fails and is treated as an error.
  : | arc patch ${PATCH_ARGS}
)

git rebase "${BRANCH}"
