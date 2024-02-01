#!/usr/bin/env python3

# A simple script that connects to a server and displays block headers

import sys
import time

from electrumabc.json_util import json_encode
from electrumabc.network import Network
from electrumabc.printerror import print_msg
from electrumabc.simple_config import SimpleConfig


def callback(response):
    print_msg(json_encode(response.get("result")))


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
network.send([("server.version", ["block_headers script", "1.2"])], callback)
network.send([("blockchain.headers.subscribe", [])], callback)

# 3. wait for results
while network.is_connected():
    time.sleep(1)
