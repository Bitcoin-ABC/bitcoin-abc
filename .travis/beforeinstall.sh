#!/usr/bin/env bash

export LC_ALL=C.UTF-8

BEGIN_FOLD () {
  echo ""
  CURRENT_FOLD_NAME=$1
  echo "travis_fold:start:${CURRENT_FOLD_NAME}"
}

END_FOLD () {
  RET=$?
  echo "travis_fold:end:${CURRENT_FOLD_NAME}"
  if [ $RET != 0 ]; then
    echo "${CURRENT_FOLD_NAME} failed with status code ${RET}"
  fi
}

