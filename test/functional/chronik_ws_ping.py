# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test whether Chronik sends regular WebSocket pings to keep connections open.
"""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikWsPingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.supports_cli = False

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        from test_framework.chronik.client import ChronikWs, pb

        class PingChronikWs(ChronikWs):
            got_ping = False

            def on_ping(self, ws, message):
                PingChronikWs.got_ping = True

        # Connect and subscribe to blocks.
        # Disable pinging from the testing framework, otherwise they cancel Chronik's ping timeout.
        ws = PingChronikWs(chronik, ping_interval=None, ping_timeout=None)
        ws.sub_to_blocks()

        # Sanity WS check: mine and expect a CONNECTED msg
        self.generate(node, 1)[-1]
        assert_equal(ws.recv().block.msg_type, pb.BLK_CONNECTED)

        # Wait for ping while doing nothing. Ping interval is 5s on regtest.
        # Note that interacting with the WS would reset the ping timer.
        self.wait_until(lambda: PingChronikWs.got_ping)

        # Another sanity WS check to ensure the connection is actually still open
        self.generate(node, 1)[-1]
        assert_equal(ws.recv().block.msg_type, pb.BLK_CONNECTED)

        ws.close()


if __name__ == "__main__":
    ChronikWsPingTest().main()
