#!/usr/bin/env python3
# Copyright (c) 2014-2015 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#
# Test txindex generation and fetching
#

import time
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import *
from test_framework.script import *
from test_framework.mininode import *
import binascii
from test_framework.blocktools import *
from test_framework.key import CECKey

UAHF_START_TIME = 2000000000


class TxIndexTest(BitcoinTestFramework):

    def setup_chain(self):
        print("Initializing test directory "+self.options.tmpdir)
        initialize_chain_clean(self.options.tmpdir, 4)

    def setup_network(self):
        self.nodes = []
        # Nodes 0/1 are "wallet" nodes
        self.nodes.append(start_node(0, self.options.tmpdir, ["-debug", "-uahfstarttime=%d" % UAHF_START_TIME]))
        self.nodes.append(start_node(1, self.options.tmpdir, ["-debug", "-txindex", "-uahfstarttime=%d" % UAHF_START_TIME]))
        # Nodes 2/3 are used for testing
        self.nodes.append(start_node(2, self.options.tmpdir, ["-debug", "-txindex", "-uahfstarttime=%d" % UAHF_START_TIME]))
        self.nodes.append(start_node(3, self.options.tmpdir, ["-debug", "-txindex", "-uahfstarttime=%d" % UAHF_START_TIME]))

        # Mock the time so that block activating the HF will be accepted
        self.nodes[0].setmocktime(UAHF_START_TIME)
        self.nodes[1].setmocktime(UAHF_START_TIME)
        self.nodes[2].setmocktime(UAHF_START_TIME)
        self.nodes[3].setmocktime(UAHF_START_TIME)

        connect_nodes(self.nodes[0], 1)
        connect_nodes(self.nodes[0], 2)
        connect_nodes(self.nodes[0], 3)

        self.is_network_split = False
        self.sync_all()

    def run_test(self):
        print("First block at UAHF start time...")
        base_block_hash = int(self.nodes[0].getbestblockhash(), 16)
        block_time = UAHF_START_TIME
        height = 1
        coinbase_key = CECKey()
        coinbase_key.set_secretbytes(b"fatstacks")
        coinbase_pubkey = coinbase_key.get_pubkey()
        coinbase = create_coinbase(height, coinbase_pubkey)
        block = create_block(base_block_hash, coinbase, block_time)
        block.solve()
        self.nodes[0].submitblock(ToHex(block))
        self.sync_all()

        print("Mining blocks...")
        self.nodes[0].generate(104)
        self.sync_all()

        chain_height = self.nodes[1].getblockcount()
        assert_equal(chain_height, 105)

        print("Testing transaction index...")

        privkey = "cSdkPxkAjA4HDr5VHgsebAPDEh9Gyub4HK8UJr2DFGGqKKy4K5sG"
        address = "mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW"
        addressHash = bytes([11,47,10,12,49,191,224,64,107,12,204,19,129,253,190,49,25,70,218,220])
        scriptPubKey = CScript([OP_DUP, OP_HASH160, addressHash, OP_EQUALVERIFY, OP_CHECKSIG])
        unspent = self.nodes[0].listunspent()
        tx = CTransaction()
        amount = int(unspent[0]["amount"] * 10000000)
        tx.vin = [CTxIn(COutPoint(int(unspent[0]["txid"], 16), unspent[0]["vout"]))]
        tx.vout = [CTxOut(amount, scriptPubKey)]
        tx.rehash()

        signed_tx = self.nodes[0].signrawtransaction(binascii.hexlify(tx.serialize()).decode("utf-8"))
        txid = self.nodes[0].sendrawtransaction(signed_tx["hex"], True)
        self.nodes[0].generate(1)
        self.sync_all()

        # Check verbose raw transaction results
        verbose = self.nodes[3].getrawtransaction(unspent[0]["txid"], 1)
        assert_equal(verbose["vout"][0]["valueSat"], 5000000000);
        assert_equal(verbose["vout"][0]["value"], 50);

        print("Passed\n")


if __name__ == '__main__':
    TxIndexTest().main()
