#!/usr/bin/env python3
#
# Copyright (c) 2021 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from cirrus import Cirrus


def instance():
    cirrus = Cirrus(base_url="https://test.api.cirrus-ci.com/graphql")

    return cirrus
