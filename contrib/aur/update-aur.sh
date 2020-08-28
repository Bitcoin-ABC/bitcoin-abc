#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

# The nobody user is a default on Archlinux. It has no login and no home
# directory, its main use is for running unprivileged commands in scripts, which
# is exactly what we need for running makepkg which can't run as root.
run_as_nobody() {
  su -l nobody -s /bin/bash -c "cd ${PWD} && $1"
}

PACKAGES=(
  bitcoin-abc
  bitcoin-abc-qt
)

for PACKAGE in "${PACKAGES[@]}"
do
  # Give write permission to the nobody user
  # This is required as makepkg cannot be run as root
  chmod -R o+w "${PACKAGE}"
  pushd "${PACKAGE}"

  # Get the data from the PKGBUILD
  # shellcheck source=bitcoin-abc/PKGBUILD
  source PKGBUILD

  # Install the dependencies
  pacman -S --needed --noconfirm "${depends[@]}" "${makedepends[@]}"

  # Copy the common files
  for f in "${source[@]}"
  do
    if [ -f "../common/$f" ]
    then
      cp "../common/$f" .
    fi
  done

  # Add the checksums to the PKGBUILD. Enforce SHA256.
  echo "sha256sums=()" >> PKGBUILD
  run_as_nobody "updpkgsums PKGBUILD"

  # Generate the .SRCINFO
  run_as_nobody "makepkg --printsrcinfo > .SRCINFO"

  popd

  # Clone the upstream repository
  git clone "https://aur.archlinux.org/${PACKAGE}.git" "${PACKAGE}-upstream"

  # Copy our modified files to the upstream repository
  cp -R "${PACKAGE}"/* "${PACKAGE}-upstream"

  # Give write permission to the nobody user
  # This is required as makepkg cannot be run as root
  chmod -R o+w "${PACKAGE}-upstream"
  pushd "${PACKAGE}-upstream"

  # The package is ready, let's check it works
  run_as_nobody "makepkg --clean"

  # Cleanup the output files from the build
  git clean -xffd

  # Commit the version change
  git commit -a -m "Update to version ${pkgver} release ${pkgrel}"

  # Push the changes upstream
  git push origin master

  popd
done
