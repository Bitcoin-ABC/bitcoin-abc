#!/usr/bin/env bash

export LC_ALL=C

set -euo pipefail

help_message() {
  echo "Output sha256sums from Gitian build output."
  echo "Usage: $0 AssetDirectory > sha256sums"
}

if [ "$#" -ne 1 ]; then
  echo "Error: Expects 1 argument: AssetDirectory"
  exit 1
fi

case $1 in
  -h|--help)
    help_message
    exit 0
    ;;
esac

# Trim off preceding whitespace that exists in the manifest
trim() {
  sed 's/^\s*//'
}

# Get the hash of the source tarball and output that first
cat "$1"/linux/bitcoin-abc-*linux-res.yml | grep -E "bitcoin-abc-[0-9.]+.tar.gz" | trim

# Output hashes of all of the binaries
cat "$1"/linux/bitcoin-abc-*linux-res.yml | grep -E "bitcoin-abc-[0-9.]+.*-linux-.*.tar.gz" | trim
cat "$1"/win/bitcoin-abc-*win-res.yml | grep -E -- "bitcoin-abc-[0-9.]+-win.*.(exe|tar.gz|zip)" | trim
cat "$1"/osx/bitcoin-abc-*osx-res.yml | grep -E -- "bitcoin-abc-[0-9.]+-osx.*.(dmg|tar.gz)" | trim
