#!/usr/bin/env bash

export LC_ALL=C

set -euo pipefail

help_message() {
  (cat <<EOF
Output sha256sums from GUIX build output.
Usage: $0 AssetDirectory Prefix > sha256sums
Prefix will be matched in the manifest and then removed from the final output.
EOF
)
}

case $1 in
  -h|--help)
    help_message
    exit 0
    ;;
esac

if [ "$#" -ne 2 ]; then
  echo "Error: Expects 2 arguments"
  echo
  help_message
  exit 1
fi

ASSET_DIR="$1"
PREFIX="$2"

# Trim off preceding whitespace that exists in the manifest
trim() {
  sed 's/^\s*//'
}

# Get the hash of the source tarball and output that first
cat "${ASSET_DIR}"/linux/bitcoin-abc-*linux-res.yml | grep -E "bitcoin-abc-[0-9.]+.tar.gz" | trim

strip_prefix() {
  sed -E "s/ $1.?bitcoin-/ bitcoin-/"
}

# Output hashes of all of the binaries
cat "${ASSET_DIR}"/linux/bitcoin-abc-*linux-res.yml | \
  grep -E "${PREFIX}.?bitcoin-abc-[0-9.]+.*-linux-.*.tar.gz" | \
  strip_prefix "${PREFIX}" | trim

cat "${ASSET_DIR}"/osx/bitcoin-abc-*osx-res.yml | \
  grep -E -- "${PREFIX}.?bitcoin-abc-[0-9.]+-osx.*.(zip|tar.gz)" | \
  strip_prefix "${PREFIX}" | trim

cat "${ASSET_DIR}"/win/bitcoin-abc-*win-res.yml | \
  grep -E -- "${PREFIX}.?bitcoin-abc-[0-9.]+-win.*.(exe|tar.gz|zip)" | \
  strip_prefix "${PREFIX}" | trim
