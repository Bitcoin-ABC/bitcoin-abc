#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

usage() {
  cat << EOF
Usage: $0 bitcoind binary manpage
  bitcoind: path to bitcoind executable
  binary: path to the binary to generate the man pages from
  manpage: output path for the man page
EOF
}

if [ $# -ne 3 ]
then
  usage
  exit 1
fi

if ! command -v help2man
then
  echo "help2man is required to run $0, please install it"
  exit 2
fi

BITCOIND="$1"
BIN="$2"
MANPAGE="$3"

if [ ! -x "${BITCOIND}" ]
then
  echo "${BITCOIND} not found or not executable."
  exit 3
fi
if [ ! -x "${BIN}" ]
then
  echo "${BIN} not found or not executable."
  exit 3
fi

mkdir -p "$(dirname ${MANPAGE})"

# The autodetected version git tag can screw up manpage output a little bit
read -r -a VERSION <<< "$(${BITCOIND} --version | head -n1 | awk -F'[ -]' '{ print $5, $6 }')"

# Create a footer file with copyright content.
# This gets autodetected fine for bitcoind if --version-string is not set,
# but has different outcomes for bitcoin-qt and bitcoin-cli.
FOOTER="$(basename ${BIN})_footer.h2m"
cleanup() {
  rm -f "${FOOTER}"
}
trap "cleanup" EXIT
echo "[COPYRIGHT]" > "${FOOTER}"
"${BITCOIND}" --version | sed -n '1!p' >> "${FOOTER}"

help2man -N --version-string="${VERSION[0]}" --include="${FOOTER}" -o "${MANPAGE}" "${BIN}"
sed -i "s/\\\-${VERSION[1]}//g" "${MANPAGE}"
