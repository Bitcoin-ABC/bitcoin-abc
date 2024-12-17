# Copyright (c) 2024-present The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's electrum interface
"""
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikElectrumBasic(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        self.client = self.nodes[0].get_chronik_electrum_client()
        self.test_errors()
        self.test_success()

    def test_errors(self):
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


if __name__ == "__main__":
    ChronikElectrumBasic().main()
