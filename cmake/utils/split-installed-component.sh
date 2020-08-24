#!/bin/sh

export LC_ALL=C.UTF-8

SPLIT_SCRIPT="$1"
INSTALL_MANIFEST="$2"

while IFS= read -r FILE || [ -n "$FILE" ]
do
  if [ ! -L "${FILE}" ] && [ -x "${FILE}" ]
  then
    echo "Splitting debug symbols out of ${FILE}"
    "${SPLIT_SCRIPT}" "${FILE}" "${FILE}" "${FILE}.dbg" > /dev/null 2>&1
  fi
done < "${INSTALL_MANIFEST}"
