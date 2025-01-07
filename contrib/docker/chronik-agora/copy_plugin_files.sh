#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euo pipefail

# Usage: BITCOIN_DATA=<datadir> copy_plugin_files <bitcoin abc root>

DATADIR="${BITCOIN_DATA}"

PROJECT_ROOT="${1}"
shift 1

# Let the user overrides the config files
if [ -f "${DATADIR}/bitcoin.conf" ]; then
  echo "The bitcoin.conf file already exist"
else
  echo "Creating default bitcoin.conf file"
  echo "chronik=1" > "${DATADIR}/bitcoin.conf"
fi

if [ -d "${DATADIR}/plugins" ]; then
  echo "The plugins directory already exist"
else
  echo "Creating default plugins directory"
  mkdir "${DATADIR}/plugins"
  cp ${PROJECT_ROOT}/modules/ecash-agora/agora.py "${DATADIR}/plugins/"
fi

if [ -f "${DATADIR}/plugins.toml" ]; then
  echo "The plugins.toml file already exist"
else
  echo "Creating default plugins.toml file"
  echo "plugin.agora = {}" > "${DATADIR}/plugins.toml"
fi

echo ""
echo "Continue with '$*'"
echo "-----------"
echo ""
echo ""
echo ""

exec "$@"
