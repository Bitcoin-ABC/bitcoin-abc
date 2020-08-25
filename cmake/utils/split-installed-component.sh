#!/bin/sh

export LC_ALL=C.UTF-8

SPLIT_SCRIPT="$1"
INSTALL_MANIFEST="$2"
shift 2

should_strip() {
  FILE="$1"
  shift

  if [ -L "${FILE}" ]
  then
    return 1
  fi

  for DIR in "$@"
  do
    if [ "$(basename $(dirname "${FILE}"))" = "${DIR}" ]
    then
      return 0
    fi
  done

  return 2
}

while IFS= read -r FILE || [ -n "$FILE" ]
do
  if should_strip "${FILE}" "$@"
  then
    echo "Splitting debug symbols out of ${FILE}"
    "${SPLIT_SCRIPT}" "${FILE}" "${FILE}" "${FILE}.dbg" > /dev/null 2>&1
  fi
done < "${INSTALL_MANIFEST}"
