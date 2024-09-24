# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library chronikinfo() function
"""

import pathmagic  # noqa
from ipc import send_ipc_message
from setup_framework import SetupFramework
from test_framework.util import assert_equal, get_cli_version


class ChronikClient_ChronikInfo_Setup(SetupFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()
        self.skip_if_no_cli()

    def run_test(self):
        # Init
        node = self.nodes[0]

        send_ipc_message({"chronik_version": get_cli_version(self, node)})

        yield True

        self.log.info("Step 1: Initialized regtest chain")
        assert_equal(node.getblockcount(), 200)
        yield True


if __name__ == "__main__":
    ChronikClient_ChronikInfo_Setup().main()
