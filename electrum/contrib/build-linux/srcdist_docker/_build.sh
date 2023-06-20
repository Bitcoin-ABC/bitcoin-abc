#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -e

export GCC_STRIP_BINARIES="1"

. ../../base.sh

mkdir -p "$DISTDIR"

python3 --version || fail "No python"

pushd ${ELECTRUM_ROOT}

info "Setting up Python venv ..."
python3 -m venv env
source env/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install --upgrade setuptools
python3 -m pip install --upgrade requests

# the below prints its own info message
contrib/make_linux_sdist

popd
