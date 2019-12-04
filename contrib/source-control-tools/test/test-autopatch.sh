#!/usr/bin/env bash
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euxo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)
CURRENT_DIR=$(dirname $(readlink -f "$0"))
TEST_PATCH="${CURRENT_DIR}/test-commit.patch"
: "${REMOTE:=origin}"
: "${MASTER_BRANCH:=master}"
REMOTE_AND_BRANCH="${REMOTE}/${MASTER_BRANCH}"
LATEST_MASTER=$(git rev-parse "${MASTER_BRANCH}")

test_autopatch() {
  PATCH_FILE="$1"
  EXPECTED_EXIT_CODE="$2"
  PATCH_ARGS="--patch ${PATCH_FILE}"
  # Setting the remote to this repo allows us to simulate an upstream without
  # relying on external services for unit tests.
  export EDITOR="${CURRENT_DIR}/test-commit-message.sh"
  # Note: Do not use `-o ${REMOTE}` here because REMOTE may be on the local filesystem.
  EXIT_CODE=0
  "${CURRENT_DIR}/../autopatch.sh" -o testorigin -b "${MASTER_BRANCH}" --patch-args "${PATCH_ARGS}" || EXIT_CODE=$?
  if [ "${EXIT_CODE}" -ne "${EXPECTED_EXIT_CODE}" ]; then
    echo "Error: autopatch exited with '${EXIT_CODE}' when '${EXPECTED_EXIT_CODE}' was expected."
    exit 1
  fi

  # Autopatch failed as expected, so sanity checks are not necessary
  if [ "${EXPECTED_EXIT_CODE}" -ne 0 ]; then
    exit 0
  fi

  # Sanity checks
  if [ -n "$(git status --porcelain)" ]; then
    echo "Error: There should be no uncommitted changes."
    exit 10
  fi

  if [ "${LATEST_MASTER}" != "$(git rev-parse HEAD~)" ]; then
    echo "Error: Failed to patch on latest master."
    exit 11
  fi

  # Note: Remove 'index ...' line from 'git diff' as the SHA1 hash is unlikely
  # to match.
  DIFF_HEAD_AGAINST_PATCH="$(git diff HEAD~ | grep -v "^index " | diff - "${PATCH_FILE}" || :)"
  if [ -n "${DIFF_HEAD_AGAINST_PATCH}" ]; then
    echo "Error: Rebased changes do not match the given patch. Difference was:"
    echo "${DIFF_HEAD_AGAINST_PATCH}"
    exit 12
  fi
}

TEST_STATUS="FAILED"
final_cleanup() {
  # Cleanup the temporary test directory
  rm -rf "$1"

  # Nicely print the final test status
  set +x
  echo
  echo "${0}:"
  echo "${TEST_STATUS}"
}

TEMP_DIR=$(mktemp -d)
trap 'final_cleanup ${TEMP_DIR}' RETURN EXIT
cd "${TEMP_DIR}"
git init

# Set a temporary git config in case a global config isn't set
git config user.name "test-autopatch"
git config user.email "test@test.test"

git remote add testorigin "${TOPLEVEL}"
git pull testorigin "${REMOTE_AND_BRANCH}"

test_cleanup() {
  # Cleanup current branch so that arcanist doesn't run out of branch names
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  git checkout "${MASTER_BRANCH}"
  git reset --hard HEAD
  git branch -D "${CURRENT_BRANCH}" || true
}

(
  trap 'test_cleanup' RETURN ERR EXIT
  echo "TEST: Simply sanity check that autopatch fast-forwards as expected"
  git reset --hard HEAD~10
  test_autopatch "${TEST_PATCH}" 0
)

test_file_not_present() {
  if [ -n "$1" ] && [ -f "$1" ]; then
    echo "Error: '$1' file was found but not expected!"
    exit 51
  fi
}

(
  trap 'test_cleanup' RETURN ERR EXIT
  echo "TEST: Locally committed changes cause the script to bail"
  TEST_FILE="test-committed-changes"
  touch "${TEST_FILE}"
  git add "${TEST_FILE}"
  git commit -m "test local commit"

  test_autopatch "${TEST_PATCH}" 11
)

(
  trap 'test_cleanup' RETURN ERR EXIT
  echo "TEST: Staged changes are not included after autopatching"
  TEST_FILE="test-staged-changes"
  touch "${TEST_FILE}"
  git add "${TEST_FILE}"

  test_autopatch "${TEST_PATCH}" 10
  test_file_not_present "${TEST_FILE}"
)

(
  trap 'test_cleanup' RETURN ERR EXIT
  echo "TEST: Unstaged changes are not included after autopatching"
  TEST_FILE="test-unstaged-changes"
  touch "${TEST_FILE}"

  test_autopatch "${TEST_PATCH}" 10
  test_file_not_present "${TEST_FILE}"
)

TEST_STATUS="PASSED"
