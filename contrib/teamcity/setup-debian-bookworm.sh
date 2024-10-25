#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

TEAMCITY_DIR=$(dirname "$0")

# Install all the build dependencies
"${TEAMCITY_DIR}"/../utils/install-dependencies-bookworm.sh

# Set default git config so that any git operations requiring authoring,
# rebasing, or cherry-picking of commits just work out of the box.
git config --global user.name "abc-bot"
git config --global user.email "no-email-abc-bot@bitcoinabc.org"

# npm uses ssh to connect to github by default, use https instead
git config --global url."https://github.com".insteadOf ssh://git@github.com
