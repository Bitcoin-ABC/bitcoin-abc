#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)

# shellcheck source=../../utils/compare-version.sh
source "${TOPLEVEL}"/contrib/utils/compare-version.sh
RELEASE_NOTES_FILE="${TOPLEVEL}/doc/release-notes.md"
RELEASE_NOTES_VERSION=$(sed -n "1s/^Bitcoin ABC version \([0-9]\+\.[0-9]\+\.[0-9]\+\).\+$/\1/p" "${RELEASE_NOTES_FILE}")
RELEASE_NOTES_ARCHIVE="${TOPLEVEL}/doc/release-notes/release-notes-${RELEASE_NOTES_VERSION}.md"

CURRENT_VERSION=""
get_current_version CURRENT_VERSION

# Compare the versions. We only want to archive the release notes if the
# current version is greater the our release notes version.
if version_less_equal "${CURRENT_VERSION}" "${RELEASE_NOTES_VERSION}"
then
  echo "Current version ${CURRENT_VERSION} <= release-notes version ${RELEASE_NOTES_VERSION}, skip the update"
  exit 0
fi

# Archive the release notes
cp "${RELEASE_NOTES_FILE}" "${RELEASE_NOTES_ARCHIVE}"

# Generate a fresh blank release notes file for the new version
PROJECT_VERSION="${CURRENT_VERSION}" envsubst < "${TOPLEVEL}/doc/release-notes/release-notes.md.in" > "${RELEASE_NOTES_FILE}"

git add "${RELEASE_NOTES_FILE}" "${RELEASE_NOTES_ARCHIVE}"
