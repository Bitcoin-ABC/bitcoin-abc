# Copyright (c) 2024-present The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's electrum interface
"""
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, chronikelectrum_port


class ChronikElectrumBasic(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}",
                "-chronikscripthashindex=1",
            ]
        ]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        self.node = self.nodes[0]
        self.client = self.node.get_chronik_electrum_client()
        self.test_rpc_errors()
        self.test_success()
        # Run this last as it invalidates self.client
        self.test_init_errors()

    def test_rpc_errors(self):
        """Test adherence to the JSON RPC spec (error codes...)
        See https://www.jsonrpc.org/specification
        """
        response = self.client.foobar()
        assert_equal(response.result, None)
        assert_equal(response.error, {"code": -32600, "message": "Invalid request"})

        response = self.client.spam.foo.bar()
        assert_equal(response.result, None)
        assert_equal(response.error, {"code": -32601, "message": "Method not found"})

        response = self.client.server.ping("spam")
        assert_equal(
            response.error, {"code": -32602, "message": "Expected at most 0 parameters"}
        )

    def test_success(self):
        # This method return {... "result":null} which JSON-decodes to None
        response = self.client.server.ping()
        assert_equal(response.result, None)
        assert_equal(response.error, None)

    def test_init_errors(self):
        self.node.stop_node()
        self.node.assert_start_raises_init_error(
            ["-chronik", f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}"],
            "Error: The -chronikelectrumbind option requires -chronikscripthashindex to be true.",
        )
        self.node.stop_node()
        self.node.assert_start_raises_init_error(
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}",
                "-chronikscripthashindex=0",
            ],
            "Error: The -chronikelectrumbind option requires -chronikscripthashindex to be true.",
        )

        self.start_node(0, self.extra_args[0])


if __name__ == "__main__":
    ChronikElectrumBasic().main()
