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
# Workaround for CVE-2026-111943 (eMudhra CA Key Compromise).
# See https://discuss.python.org/t/information-for-python-users-regarding-emudhra-emsign-ca-certificate-security-incident/109576
python3 -m pip install "pip @ https://files.pythonhosted.org/packages/3f/06/3e4420302363fbb71be3c7f35ce042f54bfca330e3e66b3a2e3c4cca579f/pip-26.2.2-py3-none-any.whl#sha256=fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70"
python3 -m pip install --upgrade pip
python3 -m pip install --upgrade setuptools
python3 -m pip install --upgrade requests

# the below prints its own info message
contrib/make_linux_sdist

popd
