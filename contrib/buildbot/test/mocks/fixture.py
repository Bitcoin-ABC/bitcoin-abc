#!/usr/bin/env python3
#
# Copyright (c) 2019-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import json
from typing import Union

from flask.json.provider import JSONProvider

# Dummy values to be specified in tests


class MockData:
    pass


# TODO: When Python3.7 becomes the minimum version, remove MockJSONEncoder and
# MockData base class.  Decorate data classes with @dataclass from package
# 'dataclasses' instead.


class MockJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, MockData):
            return o.__dict__
        return super(self).default(o)


class MockJSONProvider(JSONProvider):
    def dumps(self, obj, **kwargs):
        return json.dumps(obj, **kwargs, cls=MockJSONEncoder)

    def loads(self, s: Union[str, bytes], **kwargs):
        return json.loads(s, **kwargs)
