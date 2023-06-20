#!/bin/sh

export LC_ALL=C.UTF-8

set -e

APPDIR="$(dirname "$(readlink -e "$0")")"
. "$APPDIR"/common.sh

exec "$PYTHON" -s "${APPDIR}/usr/bin/electrum-abc" "$@"
