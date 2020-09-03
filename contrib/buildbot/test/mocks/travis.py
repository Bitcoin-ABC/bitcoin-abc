#!/usr/bin/env python3
#
# Copyright (c) 2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import mock
import requests
from travis import Travis


def instance():
    travis = Travis(base_url="https://test.travis-ci.org")
    travis.session = mock.Mock()
    travis.session.send = mock.Mock()
    travis.session.send.return_value.status_code = requests.codes.ok

    return travis
