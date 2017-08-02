#!/bin/sh

TOPDIR=${TOPDIR:-$(git rev-parse --show-toplevel)}
SRCDIR=${SRCDIR:-$TOPDIR/src}
MANDIR=${MANDIR:-$TOPDIR/doc/man}

BITCOINABC=${BITCOINABC:-$SRCDIR/bitcoinabc}
BITCOINCLI=${BITCOINCLI:-$SRCDIR/bitcoin-cli}
BITCOINTX=${BITCOINTX:-$SRCDIR/bitcoin-tx}
BITCOINQT=${BITCOINQT:-$SRCDIR/qt/bitcoin-qt}

[ ! -x $BITCOINABC ] && echo "$BITCOINABC not found or not executable." && exit 1

# The autodetected version git tag can screw up manpage output a little bit
BTCVER=($($BITCOINCLI --version | head -n1 | awk -F'[ -]' '{ print $6, $7 }'))

# Create a footer file with copyright content.
# This gets autodetected fine for bitcoinabc if --version-string is not set,
# but has different outcomes for bitcoin-qt and bitcoin-cli.
echo "[COPYRIGHT]" > footer.h2m
$BITCOINABC --version | sed -n '1!p' >> footer.h2m

for cmd in $BITCOINABC $BITCOINCLI $BITCOINTX $BITCOINQT; do
  cmdname="${cmd##*/}"
  help2man -N --version-string=${BTCVER[0]} --include=footer.h2m -o ${MANDIR}/${cmdname}.1 ${cmd}
  sed -i "s/\\\-${BTCVER[1]}//g" ${MANDIR}/${cmdname}.1
done

rm -f footer.h2m
