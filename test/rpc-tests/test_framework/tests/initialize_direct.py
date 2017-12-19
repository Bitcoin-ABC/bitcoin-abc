#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test the initialize_chain function.
"""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import start_node, stop_nodes, initialize_chain


# number of nodes to launch
NUM_NODES = 4


class Direct_Initialize_Test (BitcoinTestFramework):
    '''
    This tests the direct use of the initialize function.
    '''

    def __init__(self):
        super(Direct_Initialize_Test, self).__init__()
        self.num_nodes = NUM_NODES
        # Do not set up chain - we will call initialize_chain to do it.
        self.setup_clean_chain = True

    def setup_chain(self):
        print("Setting up chain")
        initialize_chain(self.options.tmpdir, self.num_nodes,
                         self.options.cachedir)

    def run_test(self):
        # Stop nodes which have been started by default
        stop_nodes(self.nodes)

        # Start them up again because test framework tries to stop
        # nodes at end of test, and will deliver error messages
        # if none are running.
        for i in range(NUM_NODES):
            self.nodes[i] = start_node(i, self.options.tmpdir)

if __name__ == '__main__':
    Direct_Initialize_Test().main()
