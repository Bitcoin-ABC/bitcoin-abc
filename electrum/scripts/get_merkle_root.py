#!/usr/bin/env python3
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2023 The Bitcoin developers
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
"""Print the block verification merkle root for a specified block height or for
the 50th block before the server tip if no height is specified.
"""

import argparse
import json
import sys
import time

from util import get_interfaces

from electrumabc.printerror import set_verbosity

MAX_MESSAGE_BYTES = 1024 * 1024 * 32

TIMEOUT = 10

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "height",
    nargs="?",
    type=int,
    help=(
        "Optional block height for the checkpoint. If not specified, get the merkle "
        "root for 50 blocks before the server's tip."
    ),
)
parser.add_argument("-s", "--server", default="electrum.bitcoinabc.org:50002:s")
parser.add_argument(
    "--json-output",
    help="Path to output file. If specified, write the checkpoint height and merkle root to this file.",
)
parser.add_argument(
    "-v",
    "--verbose",
    action="count",
    default=0,
    help="Set verbosity level (0, 1 or 2).",
)
args = parser.parse_args(sys.argv[1:])


def print_if_verbose(msg: str):
    if not args.verbose:
        return
    print(msg)


# Define if we want to see Electrum ABC's verbose logs
set_verbosity(args.verbose >= 2)

interfaces = get_interfaces([args.server])
if not interfaces:
    print_if_verbose(f"Failed to connect to {args.server}")
    sys.exit(1)

interface = interfaces[args.server]

# Send our (client version, protocol version) for the handshake
params = ["5.2.11", "1.4"]
interface.queue_request("server.version", params, 0)
if args.height is not None:
    checkpoint = args.height
else:
    interface.queue_request("blockchain.headers.subscribe", [], 1)
    checkpoint = None

assert interface.send_requests()

now = time.time()
while checkpoint is None and time.time() < now + TIMEOUT:
    time.sleep(1)
    for request, response in interface.get_responses():
        method = ""
        if request:
            method, params, message_id = request
            print_if_verbose(
                f"Received response to {method} {params}, message id {message_id}"
            )

        if method == "blockchain.headers.subscribe":
            tip = response["result"]["height"]
            print_if_verbose(f"Server tip is block#{tip}")
            checkpoint = tip - 50

if checkpoint is None:
    raise TimeoutError("timed out while waiting for server tip")

print_if_verbose(f"Requesting merkle root for block height {checkpoint}")
interface.queue_request("blockchain.block.header", [checkpoint, checkpoint], 2)
assert interface.send_requests()

merkle_root = None
now = time.time()
while merkle_root is None and time.time() < now + TIMEOUT:
    time.sleep(1)
    for request, response in interface.get_responses():
        method, params = "", []
        if request:
            method, params, message_id = request
            print_if_verbose(
                f"Received response to {method} {params}, message id {message_id}"
            )

        if method == "blockchain.block.header" and params == [checkpoint, checkpoint]:
            merkle_root = response["result"]["root"]

if merkle_root is None:
    raise TimeoutError("timed out while waiting for header")

print_if_verbose(f"Found merkle root for block height {checkpoint}:")
print(merkle_root)

if args.json_output is not None:
    with open(args.json_output, "w", encoding="utf-8") as f:
        json.dump({"height": checkpoint, "merkle_root": merkle_root}, f)
