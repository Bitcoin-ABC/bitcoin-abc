#!/usr/bin/env bash

# Note: Any bot running this script must have the appropriate permissions to
# push commits upstream. When running locally, this script will git push in a
# dry run by default.

export LC_ALL=C.UTF-8

set -euxo pipefail

: "${COMMIT_TYPE:=}"
if [ -z "${COMMIT_TYPE}" ]; then
  echo "Error: Environment variable COMMIT_TYPE must be set"
  exit 1
fi

echo "Building automated commit '${COMMIT_TYPE}'..."

BOT_PREFIX="[Automated]"
TOPLEVEL=$(git rev-parse --show-toplevel)

CHAINPARAMS_SCRIPTS_DIR="${TOPLEVEL}"/contrib/devtools/chainparams
TEAMCITY_SCRIPTS_DIR="${TOPLEVEL}"/contrib/teamcity

# Make sure tree is clean
git checkout master
git reset --hard origin/master

case "${COMMIT_TYPE}" in
  update-chainparams)
    # Assumes bitcoind instances are already running on mainnet and testnet
    pushd "${CHAINPARAMS_SCRIPTS_DIR}"
    CHAINPARAMS_MAINNET_TXT="chainparams_main.txt"
    ./make_chainparams.py > "${CHAINPARAMS_MAINNET_TXT}"
    git add "${CHAINPARAMS_MAINNET_TXT}"

    CHAINPARAMS_TESTNET_TXT="chainparams_test.txt"
    ./make_chainparams.py -a 127.0.0.1:18332 > "${CHAINPARAMS_TESTNET_TXT}"
    git add "${CHAINPARAMS_TESTNET_TXT}"

    CHAINPARAMS_CONSTANTS="${TOPLEVEL}"/src/chainparamsconstants.h
    ./generate_chainparams_constants.py . > "${CHAINPARAMS_CONSTANTS}"
    git add "${CHAINPARAMS_CONSTANTS}"
    popd

    # Sanity check that the new chainparams build
    ABC_BUILD_NAME=build-werror "${TEAMCITY_SCRIPTS_DIR}"/build-configurations.sh

    git commit -m "${BOT_PREFIX} Update chainparams"
    ;;

  *)
    echo "Error: Invalid commit name '${COMMIT_TYPE}'"
    exit 2
    ;;
esac

echo "Sanity checks..."

LINT_OUTPUT=$(arc lint --never-apply-patches)
LINT_EXIT_CODE=$?
# If there is more than one line of output, then lint advice lines are likely present.
# We treat these as errors because code generators should always produce lint-free code.
LINT_NUM_LINES=$(echo ${LINT_OUTPUT} | wc -l)
if [ "${LINT_EXIT_CODE}" -ne 0 ] || [ "${LINT_NUM_LINES}" -gt 1 ]; then
  echo "Error: The linter found issues with the automated commit. Correct the issue in the code generator and try again."
  exit 3
fi

echo "Pushing automated commit '${COMMIT_TYPE}'..."

GIT_PUSH_OPTIONS=("--verbose")

case ${DRY_RUN:=yes} in
  no|NO|false|FALSE)
    # Do nothing
    ;;
  *)
    GIT_PUSH_OPTIONS+=("--dry-run")
    ;;
esac

# Make sure master is up-to-date. If there is a merge conflict, this script
# will not attempt to resolve it and simply fail.
git fetch origin master
git rebase origin/master

git push "${GIT_PUSH_OPTIONS[@]}" origin master
