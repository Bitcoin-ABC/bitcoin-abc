# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to test the ecash-lib js library
"""

import pathmagic  # noqa
from setup_framework import SetupFramework
from test_framework.address import ADDRESS_ECREG_P2SH_OP_TRUE, ADDRESS_ECREG_UNSPENDABLE


class EcashLibSetup(SetupFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        mocktime = 1300000000
        node.setmocktime(mocktime)

        self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        yield True


if __name__ == "__main__":
    EcashLibSetup().main()
