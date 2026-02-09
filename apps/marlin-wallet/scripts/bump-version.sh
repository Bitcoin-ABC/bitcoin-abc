#!/usr/bin/env bash
# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C.UTF-8

set -euo pipefail

usage() {
    cat <<EOF
Usage: $0 [-y] <patch|minor|major>
  -y    Run non-interactively (skip confirmation prompt)
EOF
    exit 1
}

NON_INTERACTIVE=false
BUMP_TYPE=""

# Parse arguments
while [ $# -gt 0 ]; do
    case "$1" in
        -y)
            NON_INTERACTIVE=true
            shift
            ;;
        patch|minor|major)
            if [ -n "$BUMP_TYPE" ]; then
                echo "Error: Multiple bump types specified"
                usage
            fi
            BUMP_TYPE="$1"
            shift
            ;;
        *)
            echo "Error: Unknown option '$1'"
            usage
            ;;
    esac
done

if [ -z "$BUMP_TYPE" ]; then
    echo "Error: Bump type (patch|minor|major) is required"
    usage
fi


TOPLEVEL=$(git rev-parse --show-toplevel)

pushd "${TOPLEVEL}/apps/marlin-wallet"

# Bump the version of the Marlin Wallet

# Get the current version. Use the android/build.gradle file to get the version name and version code
VERSION_NAME=$(grep "versionName" android/build.gradle | sed 's/.*versionName = "\(.*\)".*/\1/')
VERSION_CODE=$(grep "baseVersionCode" android/build.gradle | sed 's/.*baseVersionCode = \([0-9]*\).*/\1/')

# Sanity check the version is consistent across the files
PACKAGE_JSON_VERSION=$(grep '"version"' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
if [ "${VERSION_NAME}" != "${PACKAGE_JSON_VERSION}" ]; then
    echo "Version name is inconsistent between android/build.gradle and package.json (${VERSION_NAME} != ${PACKAGE_JSON_VERSION})"
    exit 1
fi
WEB_PACKAGE_JSON_VERSION=$(grep '"version"' web/package.json | sed 's/.*"version": "\(.*\)".*/\1/')
if [ "${VERSION_NAME}" != "${WEB_PACKAGE_JSON_VERSION}" ]; then
    echo "Version name is inconsistent between android/build.gradle and web/package.json (${VERSION_NAME} != ${WEB_PACKAGE_JSON_VERSION})"
    exit 1
fi

# Split version name into major, minor, and patch
MAJOR=${VERSION_NAME%%.*}
REMAINDER=${VERSION_NAME#*.}
MINOR=${REMAINDER%%.*}
PATCH=${REMAINDER#*.}

# Bump the version
BUMPED_MAJOR=${MAJOR}
BUMPED_MINOR=${MINOR}
BUMPED_PATCH=${PATCH}
case "${BUMP_TYPE}" in
    patch)
        BUMPED_PATCH=$((PATCH + 1))
        ;;
    minor)
        BUMPED_MINOR=$((MINOR + 1))
        BUMPED_PATCH=0
        ;;
    major)
        BUMPED_MAJOR=$((MAJOR + 1))
        BUMPED_MINOR=0
        BUMPED_PATCH=0
        ;;
esac

# Also increment the version code
BUMPED_CODE=$((VERSION_CODE + 1))

# Ask for user validation before proceeding (unless -y flag is set)
if [ "$NON_INTERACTIVE" = false ]; then
    read -p "Are you sure you want to bump the version from ${VERSION_NAME} (${VERSION_CODE}) to ${BUMPED_MAJOR}.${BUMPED_MINOR}.${BUMPED_PATCH} (${BUMPED_CODE})? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting..."
        exit 2
    fi
fi

# Update the version name and version code in the android/build.gradle file
sed -i "s/versionName = \"${VERSION_NAME}\"/versionName = \"${BUMPED_MAJOR}.${BUMPED_MINOR}.${BUMPED_PATCH}\"/g" android/build.gradle
sed -i "s/baseVersionCode = ${VERSION_CODE}/baseVersionCode = ${BUMPED_CODE}/g" android/build.gradle
# Update the version in the package.json file
sed -i "s/version\": \"${VERSION_NAME}\"/version\": \"${BUMPED_MAJOR}.${BUMPED_MINOR}.${BUMPED_PATCH}\"/g" package.json
# Update the version in the web/package.json file
sed -i "s/version\": \"${VERSION_NAME}\"/version\": \"${BUMPED_MAJOR}.${BUMPED_MINOR}.${BUMPED_PATCH}\"/g" web/package.json

echo "Version bumped to ${BUMPED_MAJOR}.${BUMPED_MINOR}.${BUMPED_PATCH} (${BUMPED_CODE})"
exit 0
