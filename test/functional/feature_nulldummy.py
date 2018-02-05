#!/usr/bin/env python3
# Copyright (c) 2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test NULLDUMMY softfork.

Connect to a single node.
Generate 2 blocks (save the coinbases for later).
Generate 427 more blocks.
[Policy/Consensus] Check that NULLDUMMY compliant transactions are accepted in the 430th block.
[Policy] Check that non-NULLDUMMY transactions are rejected before activation.
[Consensus] Check that the new NULLDUMMY rules are not enforced on the 431st block.
[Policy/Consensus] Check that the new NULLDUMMY rules are enforced on the 432nd block.
"""

import time

from test_framework.blocktools import create_block, create_coinbase
from test_framework.messages import CTransaction, FromHex, ToHex
from test_framework.mininode import network_thread_start
from test_framework.script import CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error

NULLDUMMY_ERROR = "non-mandatory-script-verify-flag (Dummy CHECKMULTISIG argument must be zero) (code 64)"


def trueDummy(tx):
    scriptSig = CScript(tx.vin[0].scriptSig)
    newscript = []
    for i in scriptSig:
        if (len(newscript) == 0):
            assert(len(i) == 0)
            newscript.append(b'\x51')
        else:
            newscript.append(i)
    tx.vin[0].scriptSig = CScript(newscript)
    tx.rehash()


class NULLDUMMYTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.extra_args = [['-whitelist=127.0.0.1']]

    def run_test(self):
        self.address = self.nodes[0].getnewaddress()
        self.ms_address = self.nodes[0].addmultisigaddress(1, [self.address])[
            'address']

        network_thread_start()
        # Block 2
        self.coinbase_blocks = self.nodes[0].generate(2)
        coinbase_txid = []
        for i in self.coinbase_blocks:
            coinbase_txid.append(self.nodes[0].getblock(i)['tx'][0])
        # Block 429
        self.nodes[0].generate(427)
        self.lastblockhash = self.nodes[0].getbestblockhash()
        self.tip = int("0x" + self.lastblockhash, 0)
        self.lastblockheight = 429
        self.lastblocktime = int(time.time()) + 429

        self.log.info(
            "Test 1: NULLDUMMY compliant base transactions should be accepted to mempool and mined before activation [430]")
        test1txs = [self.create_transaction(
            self.nodes[0], coinbase_txid[0], self.ms_address, 49)]
        txid1 = self.nodes[0].sendrawtransaction(ToHex(test1txs[0]), True)
        test1txs.append(self.create_transaction(
            self.nodes[0], txid1, self.ms_address, 48))
        txid2 = self.nodes[0].sendrawtransaction(ToHex(test1txs[1]), True)
        self.block_submit(self.nodes[0], test1txs, True)

        self.log.info(
            "Test 2: Non-NULLDUMMY base multisig transaction should not be accepted to mempool before activation")
        test2tx = self.create_transaction(
            self.nodes[0], txid2, self.ms_address, 48)
        trueDummy(test2tx)
        assert_raises_rpc_error(-26, NULLDUMMY_ERROR,
                                self.nodes[0].sendrawtransaction, ToHex(test2tx), True)

        self.log.info(
            "Test 3: Non-NULLDUMMY base transactions should be accepted in a block before activation [431]")
        self.block_submit(self.nodes[0], [test2tx], True)

    def create_transaction(self, node, txid, to_address, amount):
        inputs = [{"txid": txid, "vout": 0}]
        outputs = {to_address: amount}
        rawtx = node.createrawtransaction(inputs, outputs)
        signresult = node.signrawtransactionwithwallet(rawtx)
        return FromHex(CTransaction(), signresult['hex'])

    def block_submit(self, node, txs, accept=False):
        block = create_block(self.tip, create_coinbase(
            self.lastblockheight + 1), self.lastblocktime + 1)
        block.nVersion = 4
        for tx in txs:
            tx.rehash()
            block.vtx.append(tx)
        block.vtx = [block.vtx[0]] + \
            sorted(block.vtx[1:], key=lambda tx: tx.get_id())
        block.hashMerkleRoot = block.calc_merkle_root()
        block.rehash()
        block.solve()
        node.submitblock(ToHex(block))
        if (accept):
            assert_equal(node.getbestblockhash(), block.hash)
            self.tip = block.sha256
            self.lastblockhash = block.hash
            self.lastblocktime += 1
            self.lastblockheight += 1
        else:
            assert_equal(node.getbestblockhash(), self.lastblockhash)


if __name__ == '__main__':
    NULLDUMMYTest().main()
