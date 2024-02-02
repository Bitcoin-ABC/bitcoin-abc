#!/usr/bin/env python3
import sys

import util

try:
    tx = sys.argv[1]
except Exception:
    print("usage: txradar.py txid")
    sys.exit(1)

peers = util.get_peers()
results = util.send_request(peers, "blockchain.transaction.get", [tx])

r1 = []
r2 = []

for k, v in results.items():
    (r1 if v else r2).append(k)

print("Received %d answers" % len(results))
print("Propagation rate: %.1f percent" % (len(r1) * 100.0 / (len(r1) + len(r2))))
