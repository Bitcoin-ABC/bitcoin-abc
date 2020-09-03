#!/usr/bin/env python3
#
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.


from enum import Enum


class Deployment(Enum):
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"
