#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euo pipefail

# Usage: BITCOIN_DATA=<datadir> copy_plugin_files <bitcoin abc root>

DATADIR="${BITCOIN_DATA}"

PROJECT_ROOT="${1}"
shift 1

SRC="${PROJECT_ROOT}/modules/ecash-agora/agora.py"
DST="${DATADIR}/plugins/agora.py"
NO_OVERRIDE="${DATADIR}/plugins/.nooverride"

# Let the user overrides the config files
if [ -f "${DATADIR}/bitcoin.conf" ]; then
  echo "The bitcoin.conf file already exist"
else
  echo "Creating default bitcoin.conf file"
  echo "chronik=1" > "${DATADIR}/bitcoin.conf"
fi

if [ -f "${DATADIR}/plugins.toml" ]; then
  echo "The plugins.toml file already exist"
else
  echo "Creating default plugins.toml file"
  echo "plugin.agora = {}" > "${DATADIR}/plugins.toml"
fi

mkdir -p "${DATADIR}/plugins"

if [ -f "${NO_OVERRIDE}" ]; then
  echo "Skipping agora.py install (${NO_OVERRIDE} present). Remove this file and restart to install the latest agora.py version."
else
  EXISTING_HASH=""
  UPDATE_REASON="missing"

  if [ -f "${DST}" ]; then
    EXISTING_HASH="$(sha256sum "${DST}")"
    EXISTING_HASH="${EXISTING_HASH%% *}"
    echo "Current agora.py sha256: ${EXISTING_HASH}"
    UPDATE_REASON="outdated"
  fi

  SRC_HASH="$(sha256sum "${SRC}")"
  SRC_HASH="${SRC_HASH%% *}"
  if [ "${SRC_HASH}" != "${EXISTING_HASH}" ]; then
    echo "The agora.py file is ${UPDATE_REASON}, updating"
    cp "${SRC}" "${DST}"
    echo "Installed agora.py sha256: ${SRC_HASH}"
  else
    echo "The agora.py file is up-to-date"
  fi
  echo "Note: if you don't want agora.py to be overwritten upon restart, create an empty ${NO_OVERRIDE} file"
fi

echo ""
echo "Continue with '$*'"
echo "-----------"
echo ""
echo ""
echo ""

exec "$@"
