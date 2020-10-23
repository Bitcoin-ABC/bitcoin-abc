#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

usage() {
  cat << EOF
Usage: $0 doxyfile
  Generate the doxygen documentation. Require doxygen and graphviz.
  doxyfile: path to the Doxyfile configuration
EOF
}

if [ $# -ne 1 ]
then
  usage
  exit 1
fi

SCRIPT_NAME="$0"
DOXYFILE="$1"

check_program() {
  if ! command -v "$1"
  then
    echo "${2:-$1} is required to run ${SCRIPT_NAME}, please install it"
    exit 2
  fi
}

check_program doxygen
check_program dot graphviz

doxygen "${DOXYFILE}"
