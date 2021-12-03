#!/usr/bin/env bash

export LC_ALL=C

set -euo pipefail

# Build the generated marker without having this script being marked as
# generated itself.
AT=@
AT_GENERATED="${AT}generated"

TOPLEVEL=$(git rev-parse --show-toplevel)

# Note that this won't work if the with files containing a space in their name.
# This can be solved by using a null char delimiter (-d '\0') for read in
# combination with find's option -print0 to get a compatible output, but this is
# not supported by all find variants so we'll do without it for now.
find "${TOPLEVEL}/web/cashtab/src" -name "*.test.js.snap" | while read i; do
  # It is possible to avoid the grep and have sed do it all, but:
  #  1. This is a more complex sed usage
  #  2. It will add the generated mark in files that have it already on another
  #     line.
  if ! grep -q "${AT_GENERATED}" "${i}"; then
    # The -i.bak option tells sed to do in-place replacement and create a backup
    # file with a .bak suffix. This is mandatory for BSD/OSX compatibility.
    sed -i.bak "1 s/$/ ${AT_GENERATED}/" "${i}" && rm -f "${i}.bak"
  fi
done
