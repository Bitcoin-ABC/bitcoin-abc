#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

TEAMCITY_DIR=$(dirname "$0")

# Install all the build dependencies
"${TEAMCITY_DIR}"/../utils/install-dependencies.sh

# Python library for interacting with teamcity
pip3 install teamcity-messages
# Install Python dependencies for the build bot
# Note: Path should be relative to TEAMCITY_DIR since the base image build
# context may be different than the project root.
pip3 install -r "${TEAMCITY_DIR}"/../buildbot/requirements.txt

# Make sure clang-10 has highest priority
update-alternatives --install /usr/bin/clang clang "$(command -v clang-10)" 100
update-alternatives --install /usr/bin/clang++ clang++ "$(command -v clang++-10)" 100
update-alternatives --install /usr/bin/llvm-symbolizer llvm-symbolizer "$(command -v llvm-symbolizer-10)" 100

# Set default git config so that any git operations requiring authoring,
# rebasing, or cherry-picking of commits just work out of the box.
git config --global user.name "abc-bot"
git config --global user.email "no-email-abc-bot@bitcoinabc.org"

# npm uses ssh to connect to github by default, use https instead
git config --global url."https://github.com".insteadOf ssh://git@github.com
