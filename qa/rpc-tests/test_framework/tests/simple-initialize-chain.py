#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test the initialize_chain function by setting up a normal chain.
This is just to exercise initialize_chain() and some of the node
start/stop machinery.
"""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import start_node, stop_nodes


# number of nodes to launch
NUM_NODES = 4


class Simple_Initialize_Test (BitcoinTestFramework):

    def __init__(self):
        super(Simple_Initialize_Test, self).__init__()
        self.num_nodes = NUM_NODES
        self.setup_clean_chain = True

    def run_test(self):
        # Stop nodes which have been started by default
        stop_nodes(self.nodes)

        # Start them up again because test framework tries to stop
        # nodes at end of test, and will deliver error messages
        # if none are running.
        for i in range(NUM_NODES):
            self.nodes[i] = start_node(i, self.options.tmpdir)

if __name__ == '__main__':
    Simple_Initialize_Test().main()
