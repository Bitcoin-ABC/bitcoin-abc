#!/usr/bin/env bash
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euxo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)
SOURCE_CONTROL_TOOLS="${TOPLEVEL}"/contrib/source-control-tools

mock_smoke_tests() {
  echo 'Mock smoke tests passed'
}
export -f mock_smoke_tests
export SANITY_CHECKS_COMMAND=mock_smoke_tests

# Successful git push works as expected
mock_git_push_success() {
  echo "Mock 'git $1' succeeded"
}
export -f mock_git_push_success
GIT_COMMAND=mock_git_push_success "${SOURCE_CONTROL_TOOLS}"/land-patch.sh --dry-run

# Unsuccessful git push fails to land
mock_git_push_fail() {
  case $1 in
    push)
      echo 'Mock git push failed'
      exit 1
      ;;
    *)
      echo "Mock 'git $1' succeeded"
      ;;
  esac
}
export -f mock_git_push_fail

# shellcheck disable=SC2015
GIT_COMMAND=mock_git_push_fail "${SOURCE_CONTROL_TOOLS}"/land-patch.sh --dry-run && {
  echo "Error: A git push failure is expected to fail"
  exit 1
} || true

# Unsuccessful git pull fails to land
mock_git_pull_rebase_fail() {
  case $1 in
    pull)
      echo 'Mock git pull & rebase failed'
      exit 1
      ;;
    *)
      echo "Mock 'git $1' succeeded"
      ;;
  esac
}
export -f mock_git_pull_rebase_fail

# shellcheck disable=SC2015
GIT_COMMAND=mock_git_pull_rebase_fail "${SOURCE_CONTROL_TOOLS}"/land-patch.sh --dry-run && {
  echo "Error: A git pull (and rebase) failure is expected to fail"
  exit 1
} || true

# non-fast-forwards eventually succeed
echo "0" > /tmp/abc-land-patch-temp-count
mock_git_push_nonff() {
  case $1 in
    push)
      COUNT=$(cat /tmp/abc-land-patch-temp-count)
      COUNT=$((COUNT + 1))
      echo "${COUNT}" > /tmp/abc-land-patch-temp-count
      case ${COUNT} in
        [12])
          echo 'To ssh://vcs@reviews.bitcoinabc.org:2221/source/bitcoin-abc.git ! refs/heads/master:refs/heads/master [rejected] (non-fast-forward) Done'
          exit 2
          ;;
        3)
          mock_git_push_success "$@"
          ;;
        *)
          mock_git_push_fail "$@"
          ;;
      esac
      ;;
    *)
      echo "Mock 'git $1' succeeded"
      ;;
  esac
}
export -f mock_git_push_nonff

# shellcheck disable=SC2015
GIT_COMMAND=mock_git_push_nonff "${SOURCE_CONTROL_TOOLS}"/land-patch.sh --dry-run

if [[ $(cat /tmp/abc-land-patch-temp-count) -ne 3 ]]; then
  echo "Error: git push did not succeed after a few non-fast-forward failures"
  exit 1
fi

echo "PASSED"
