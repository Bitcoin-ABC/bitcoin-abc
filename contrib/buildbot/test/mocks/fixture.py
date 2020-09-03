#!/usr/bin/env python3
#
# Copyright (c) 2019-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from flask.json import JSONEncoder

# Dummy values to be specified in tests


class MockData:
    pass

# TODO: When Python3.7 becomes the minimum version, remove MockJSONEncoder and
# MockData base class.  Decorate data classes with @dataclass from package
# 'dataclasses' instead.


class MockJSONEncoder(JSONEncoder):
    def default(self, o):
        if isinstance(o, MockData):
            return o.__dict__
        return super(self).default(o)
