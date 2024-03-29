#!/usr/bin/env python3

import sys

from electrumabc.address import Address
from electrumabc.json_util import json_encode
from electrumabc.network import Network
from electrumabc.printerror import print_msg

try:
    addr = sys.argv[1]
except Exception:
    print("usage: get_history.py <bitcoin_address>")
    sys.exit(1)

n = Network()
n.start()
sh = Address.from_string(addr).to_scripthash_hex()
h = n.synchronous_get(("blockchain.scripthash.get_history", [sh]))
print_msg(json_encode(h))
