#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#
# Test the CHECKLOCKTIMEVERIFY (BIP65) soft-fork logic
#

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import *


class BIP65Test(BitcoinTestFramework):

    def __init__(self):
        super().__init__()
        self.num_nodes = 3
        self.setup_clean_chain = False
        self.extra_args = [[], ["-blockversion=3"], ["-blockversion=4"]]

    def setup_network(self):
        self.setup_nodes()
        connect_nodes(self.nodes[1], 0)
        connect_nodes(self.nodes[2], 0)
        self.sync_all()

    def run_test(self):
        cnt = self.nodes[0].getblockcount()

        # Mine some old-version blocks
        self.nodes[1].generate(200)
        cnt += 100
        self.sync_all()
        if (self.nodes[0].getblockcount() != cnt + 100):
            raise AssertionError("Failed to mine 100 version=3 blocks")

        # Mine 750 new-version blocks
        for i in range(15):
            self.nodes[2].generate(50)
        self.sync_all()
        if (self.nodes[0].getblockcount() != cnt + 850):
            raise AssertionError("Failed to mine 750 version=4 blocks")

        # TODO: check that new CHECKLOCKTIMEVERIFY rules are not enforced

        # Mine 1 new-version block
        self.nodes[2].generate(1)
        self.sync_all()
        if (self.nodes[0].getblockcount() != cnt + 851):
            raise AssertionError("Failed to mine a version=4 blocks")

        # TODO: check that new CHECKLOCKTIMEVERIFY rules are enforced

        # Mine 198 new-version blocks
        for i in range(2):
            self.nodes[2].generate(99)
        self.sync_all()
        if (self.nodes[0].getblockcount() != cnt + 1049):
            raise AssertionError("Failed to mine 198 version=4 blocks")

        # Mine 1 old-version block
        self.nodes[1].generate(1)
        self.sync_all()
        if (self.nodes[0].getblockcount() != cnt + 1050):
            raise AssertionError(
                "Failed to mine a version=3 block after 949 version=4 blocks")

        # Mine 1 new-version blocks
        self.nodes[2].generate(1)
        self.sync_all()
        if (self.nodes[0].getblockcount() != cnt + 1051):
            raise AssertionError("Failed to mine a version=4 block")

        # Mine 1 old-version blocks
        try:
            self.nodes[1].generate(1)
            raise AssertionError(
                "Succeeded to mine a version=3 block after 950 version=4 blocks")
        except JSONRPCException:
            pass
        self.sync_all()
        if (self.nodes[0].getblockcount() != cnt + 1051):
            raise AssertionError(
                "Accepted a version=3 block after 950 version=4 blocks")

        # Mine 1 new-version blocks
        self.nodes[2].generate(1)
        self.sync_all()
        if (self.nodes[0].getblockcount() != cnt + 1052):
            raise AssertionError("Failed to mine a version=4 block")

if __name__ == '__main__':
    BIP65Test().main()
