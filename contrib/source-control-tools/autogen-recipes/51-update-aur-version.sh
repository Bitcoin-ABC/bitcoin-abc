#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# Common script to update the AUR packages.
# Usage: update-aur-version <package_name>

TOPLEVEL=$(git rev-parse --show-toplevel)
# shellcheck source=../../utils/compare-version.sh
source "${TOPLEVEL}"/contrib/utils/compare-version.sh

CURRENT_VERSION=""
get_current_version CURRENT_VERSION

update-aur-version() {
  PACKAGE="$1"

  # Get the current version of the AUR package
  PKGBUILD="${TOPLEVEL}"/contrib/aur/${PACKAGE}/PKGBUILD
  # shellcheck source=../../aur/bitcoin-abc/PKGBUILD
  source "${PKGBUILD}"

  # Compare the versions. We only want to update if
  # (software version > package version) to prevent downgrades.
  if version_less_equal "${CURRENT_VERSION}" "${pkgver}"
  then
    echo "Current version ${CURRENT_VERSION} <= ${PACKAGE} AUR package version ${pkgver}, skip the update"
    return 0
  fi

  # Reset the release version to 0 and update the package version in the
  # PKGBUILD file.
  # Note that this pattern is very safe: because of the shell script syntax,
  # no whitespace can occur and we have the original value as a variable.
  sed -i "s/pkgrel=${pkgrel}/pkgrel=0/" "${PKGBUILD}"
  sed -i "s/pkgver=${pkgver}/pkgver=${CURRENT_VERSION}/" "${PKGBUILD}"

  git add "${PKGBUILD}"
}

update-aur-version "bitcoin-abc"
update-aur-version "bitcoin-abc-qt"
