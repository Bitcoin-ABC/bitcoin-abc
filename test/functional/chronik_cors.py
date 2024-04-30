# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test -chronikcors works properly.
"""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikCorsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        # By default we have no CORS headers
        cors_headers = chronik.blockchain_info().response.headers
        assert_equal(cors_headers["access-control-allow-origin"], None)
        assert_equal(cors_headers["vary"], None)

        self.restart_node(0, ["-chronik", "-chronikcors"])

        # With -chronikcors, CORS headers are added
        cors_headers = chronik.blockchain_info().response.headers
        assert_equal(cors_headers["access-control-allow-origin"], "*")
        vary_parts = {vary.strip() for vary in cors_headers["vary"].split(",")}
        assert "access-control-request-method" in vary_parts
        assert "access-control-request-headers" in vary_parts


if __name__ == "__main__":
    ChronikCorsTest().main()
