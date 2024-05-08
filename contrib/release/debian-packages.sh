#!/usr/bin/env bash

export LC_ALL=C

set -euo pipefail

DEFAULT_DISTROS=()
# Focal: Ubuntu 20.04 LTS
DEFAULT_DISTROS+=("focal")
# Jammy: Ubuntu 22.04 LTS
DEFAULT_DISTROS+=("jammy")

DEFAULT_PPA="bitcoin-abc"
DPUT_CONFIG_FILE=~/".dput.cf"
TOPLEVEL="$(git rev-parse --show-toplevel)"
KEYS_TXT="${TOPLEVEL}"/contrib/signing/keys.txt

help_message() {
cat <<EOF
Build and sign Debian packages and push to a PPA.
Usage: $0 <options> signer

Example usage: $0 jasonbcox

signer will be used to fetch the signing key fingerprint from '${KEYS_TXT}'
  That matching fingerprint will be used to fetch the correctly formatted name and email from GPG.
  signer must at least partially match the fingerprint or email in keys.txt

Note: This script will prompt you to sign with your PGP key.

-d, --dry-run             Build and sign the packages, but do not push them to the PPA.
-D, --distro <name>       Name of the distribution to package for. Can be supplied multiple times.
                            If supplied at least once, the defaults are ignored. Defaults to: '${DEFAULT_DISTROS[@]}'
-h, --help                Display this help message.
-p, --ppa <ppa-name>      PPA hostname. Defaults to: '${DEFAULT_PPA}'. If no config file exists at ${DPUT_CONFIG_FILE}
                            then one will be created using '${DEFAULT_PPA}'. Setting this option to a hostname other than
                            the default will require that you add the necessary settings to the config file.
-v, --version <version>   Set the package version. Defaults to the version returned by 'bitcoind --version'.
                            If set, version must be of the form: MAJOR.MINOR.REVISION[.OPTIONALPATCH]
                            OPTIONALPATCH may be necessary when source files have changed but the version revision has not,
                            as the PPA will reject source archives of the same name.
EOF
}

DISTROS=()
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
  -D|--distro)
    DISTROS+=("$2")
    shift # shift past argument
    shift # shift past value
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

# If no distributions are explicitly set, use the defaults
if [ "${#DISTROS[@]}" == 0 ]; then
  DISTROS=("${DEFAULT_DISTROS[@]}")
fi

SIGNER_FINGERPRINT=$(grep "$1" "${KEYS_TXT}" | cut -d' ' -f 1) || {
  echo "Error: Signer '$1' does not match any line in '${KEYS_TXT}'"
  exit 21
}
SIGNER_EMAIL=$(grep "$1" "${KEYS_TXT}" | cut -d' ' -f 2)
NUM_FINGERPRINT_MATCHES=$(echo "${SIGNER_FINGERPRINT}" | wc -l)
if [ "${NUM_FINGERPRINT_MATCHES}" -ne 1 ]; then
  echo "Error: '$1' is expected to match only one line in '${KEYS_TXT}'. Got '${NUM_FINGERPRINT_MATCHES}'"
  exit 22
fi

SIGNER=$(gpg --list-key "${SIGNER_FINGERPRINT}" | grep -o "\[ultimate\] .* <.*@.*>" | cut -d' ' -f 2- | grep "${SIGNER_EMAIL}")
echo "Signer: ${SIGNER}"
if [ -z "${SIGNER}" ]; then
  echo "Error: Signer key for '${SIGNER}' not found."
  exit 23
fi

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

for DISTRO in "${DISTROS[@]}"; do
  package "${DISTRO}"
done
popd
