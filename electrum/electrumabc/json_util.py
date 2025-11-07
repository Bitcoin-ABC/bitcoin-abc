# Electrum ABC - lightweight eCash client
# Copyright (C) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import json
from datetime import datetime
from decimal import Decimal

from .transaction import Transaction


class MyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Transaction):
            return obj.as_dict()
        if isinstance(obj, datetime):
            return obj.isoformat(" ")[:-3]
        if isinstance(obj, set):
            return list(obj)
        return super(MyEncoder, self).default(obj)


def json_encode(obj):
    try:
        s = json.dumps(obj, sort_keys=True, indent=4, cls=MyEncoder)
    except TypeError:
        s = repr(obj)
    return s


def json_decode(x):
    try:
        return json.loads(x, parse_float=Decimal)
    except Exception:
        return x
