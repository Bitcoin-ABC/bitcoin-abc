#!/usr/bin/env python3

import sys
import time

from electrumabc.address import Address
from electrumabc.json_util import json_encode
from electrumabc.network import Network
from electrumabc.printerror import print_msg
from electrumabc.simple_config import SimpleConfig


def callback(response):
    print_msg(json_encode(response.get("result")))


try:
    addr = Address.from_string(sys.argv[1])
except Exception:
    print("usage: watch_address.py <bitcoin_address>")
    sys.exit(1)

# start network
c = SimpleConfig()
network = Network(c)
network.start()

# wait until connected
while network.is_connecting():
    time.sleep(0.1)

if not network.is_connected():
    print_msg("daemon is not connected")
    sys.exit(1)

# 2. send the subscription
sh = addr.to_scripthash_hex()
network.send([("blockchain.scripthash.subscribe", [sh])], callback)

# 3. wait for results
while network.is_connected():
    time.sleep(1)
