#!/usr/bin/env bash

export LC_ALL=C

set -euo pipefail

DEFAULT_PPA="bitcoin-abc"
DPUT_CONFIG_FILE=~/".dput.cf"

help_message() {
  echo "Build and sign Debian packages and push to a PPA."
  echo "Usage: $0 <options> signer"
  echo
  echo "Example usage: $0 \"Jason B. Cox <jasonbcox@bitcoinabc.org>\""
  echo
  echo "signer must be of the form: 'YOUR NAME <your-email@domain.com>'"
  echo
  echo "Note: This script will prompt you to sign with your PGP key."
  echo
  echo "-d, --dry-run             Build and sign the packages, but do not push them to the PPA."
  echo "-h, --help                Display this help message."
  echo "-p, --ppa <ppa-name>      PPA hostname. Defaults to: '${DEFAULT_PPA}'. If no config file exists at ${DPUT_CONFIG_FILE}"
  echo "                            then one will be created using '${DEFAULT_PPA}'. Setting this option to a hostname other than"
  echo "                            the default will require that you add the necessary settings to the config file."
  echo "-v, --version <version>   Set the package version. Defaults to the version returned by 'bitcoind --version'."
  echo "                            If set, version must be of the form: MAJOR.MINOR.REVISION[.OPTIONALPATCH]"
  echo "                            OPTIONALPATCH may be necessary when source files have changed but the version revision has not,"
  echo "                            as the PPA will reject source archives of the same name."
}

DRY_RUN="false"
NUM_EXPECTED_ARGUMENTS=1
PACKAGE_VERSION=""
PPA="${DEFAULT_PPA}"

# Parse command line arguments
while [[ $# -ne 0 ]]; do
case $1 in
  -d|--dry-run)
    DRY_RUN="true"
    shift # shift past argument
    ;;
  -h|--help)
    help_message
    exit 0
    ;;
  -p|--ppa)
    PPA="$2"
    shift # shift past argument
    shift # shift past value
    ;;
  -v|--version)
    PACKAGE_VERSION="$2"
    echo "${PACKAGE_VERSION}" | grep -E "[0-9]+\.[0-9]+\.[0-9]+(\.[0-9]+)?" || {
      echo "Error: package_version is not formatted correctly"
      echo
      help_message
      exit 20
    }
    shift # shift past argument
    shift # shift past value
    ;;
  *)
    if [ "$#" -le "${NUM_EXPECTED_ARGUMENTS}" ]; then
      break
    fi
    echo "Unknown argument: $1"
    help_message
    exit 1
    ;;
esac
done

# Check for dependencies
if ! command -v dput > /dev/null; then
  echo "Error: 'dput' is not installed."
  exit 10
fi
if ! command -v debuild > /dev/null; then
  echo "Error: 'debuild' is not installed."
  exit 11
fi

if [ "$#" -ne "${NUM_EXPECTED_ARGUMENTS}" ]; then
  echo "Error: Expects ${NUM_EXPECTED_ARGUMENTS} arguments"
  echo
  help_message
  exit 20
fi

SIGNER="$1"
echo "Signer:"
echo "${SIGNER}" | grep ".* <.*@.*>" || {
  echo "Error: signer is not formatted correctly"
  echo
  help_message
  exit 21
}

# Generate default dput config file if none exists
if [ ! -f ${DPUT_CONFIG_FILE} ]; then
  echo "Info: No dput config file exists. Creating ${DPUT_CONFIG_FILE} now..."
  cat > ${DPUT_CONFIG_FILE} <<EOF
[${DEFAULT_PPA}]
fqdn = ppa.launchpad.net
method = ftp
incoming = ~bitcoin-abc/ubuntu/ppa/
login = anonymous
allow_unsigned_uploads = 0
EOF
fi

# Check that the requested PPA hostname exists
grep "\[${PPA}\]" ${DPUT_CONFIG_FILE} || {
  echo "Error: PPA hostname does not exist in ${DPUT_CONFIG_FILE}"
  exit 30
}

# Build package source archive
TOPLEVEL="$(git rev-parse --show-toplevel)"
"${TOPLEVEL}"/contrib/devtools/build_cmake.sh
pushd "${TOPLEVEL}"/build
ninja package_source

# Get package version if one wasn't explicitly set
if [ -z "${PACKAGE_VERSION}" ]; then
  PACKAGE_VERSION=$(./src/bitcoind --version | grep -Eo "[0-9]+\.[0-9]+\.[0-9]+")
fi
echo "Package version: ${PACKAGE_VERSION}"

# Unpack the package source
SOURCE_VERSION=$(echo "${PACKAGE_VERSION}" | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")
SOURCE_BASE_NAME="bitcoin-abc-${SOURCE_VERSION}"
SOURCE_ARCHIVE="${SOURCE_BASE_NAME}.tar.gz"
tar -zxf "${SOURCE_ARCHIVE}"

# Rename the package source archive. debuild is picky about the naming.
CONTROL_SOURCE_NAME=$(grep "Source: " "${TOPLEVEL}"/contrib/debian/control | cut -c 9-)
PACKAGE_BASE_NAME="${CONTROL_SOURCE_NAME}_${PACKAGE_VERSION}"
PACKAGE_ARCHIVE="${PACKAGE_BASE_NAME}.orig.tar.gz"
mv "${SOURCE_ARCHIVE}" "${PACKAGE_ARCHIVE}"

# Build package files for each supported distribution
DATE=$(date -R)
package() {
  DISTRO="$1"
  PACKAGE_NAME="${PACKAGE_BASE_NAME}-${DISTRO}"

  pushd "${SOURCE_BASE_NAME}"
  cp -r "${TOPLEVEL}"/contrib/debian .

# Generate the changelog for this package
# TODO: Incorporate release notes into this changelog
  cat > debian/changelog <<EOF
${CONTROL_SOURCE_NAME} (${PACKAGE_VERSION}-${DISTRO}) ${DISTRO}; urgency=medium

  * New upstream release.

 -- ${SIGNER}  ${DATE}
EOF

  debuild -S
  rm -rf debian
  popd

  if [ "${DRY_RUN}" == "false" ]; then
    dput "${PPA}" "${PACKAGE_NAME}_source.changes"
  else
    echo "Info: Dry run. Skipping upload to PPA for '${DISTRO}'."
  fi
}

# Xenial: Ubuntu 16.04
package "xenial"
# Bionic: Ubuntu 18.04 (latest LTS release)
package "bionic"
# Eoan: Ubuntu 19.10 (latest release)
package "eoan"

popd
