#!/usr/bin/env python3
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks that blocks containing segwit recovery transactions will be accepted,
that segwit recovery transactions are rejected from mempool acceptance (even with 
-acceptnonstdtxn=1), and that segwit recovery transactions don't result in bans.
"""

import time

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.messages import (
    COIN,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    ToHex,
)
from test_framework.mininode import (
    P2PDataStore,
)
from test_framework.script import (
    CScript,
    hash160,
    OP_EQUAL,
    OP_HASH160,
    OP_TRUE,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_raises_rpc_error,
    sync_blocks,
)

TEST_TIME = int(time.time())

# Error due to non clean stack
CLEANSTACK_ERROR = 'non-mandatory-script-verify-flag (Script did not clean its stack)'
RPC_CLEANSTACK_ERROR = CLEANSTACK_ERROR + " (code 64)"
EVAL_FALSE_ERROR = 'non-mandatory-script-verify-flag (Script evaluated without error but finished with a false/empty top stack elem'
RPC_EVAL_FALSE_ERROR = EVAL_FALSE_ERROR + "ent) (code 64)"


class PreviousSpendableOutput(object):

    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        self.n = n


class SegwitRecoveryTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        # We have 2 nodes:
        # 1) node_nonstd (nodes[0]) accepts non-standard txns. It does not
        #    accept Segwit recovery transactions, since it is included in
        #    standard flags, and transactions that violate these flags are
        #    never accepted into the mempool.
        # 2) node_std (nodes[1]) doesn't accept non-standard txns and
        #    doesn't have us whitelisted. It's used to test for bans, as we
        #    connect directly to it via mininode and send a segwit spending
        #    txn. This transaction is non-standard. We check that sending
        #    this transaction doesn't result in a ban.
        # Nodes are connected to each other, so node_std receives blocks and
        # transactions that node_nonstd has accepted. Since we are checking
        # that segwit spending txn are not resulting in bans, node_nonstd
        # doesn't get banned when forwarding this kind of transactions to
        # node_std.
        self.extra_args = [['-whitelist=127.0.0.1',
                            "-acceptnonstdtxn"],
                           ["-acceptnonstdtxn=0"]]

    def next_block(self, number):
        if self.tip == None:
            base_block_hash = self.genesis_hash
            block_time = TEST_TIME
        else:
            base_block_hash = self.tip.sha256
            block_time = self.tip.nTime + 1
        # First create the coinbase
        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height)
        coinbase.rehash()
        block = create_block(base_block_hash, coinbase, block_time)

        # Do PoW, which is cheap on regnet
        block.solve()
        self.tip = block
        self.block_heights[block.sha256] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block

    def bootstrap_p2p(self, *, num_connections=1):
        """Add a P2P connection to the node.

        Helper to connect and wait for version handshake."""
        for node in self.nodes:
            for _ in range(num_connections):
                node.add_p2p_connection(P2PDataStore())

    def reconnect_p2p(self, **kwargs):
        """Tear down and bootstrap the P2P connection to the node.

        The node gets disconnected several times in this test. This helper
        method reconnects the p2p and restarts the network thread."""
        for node in self.nodes:
            node.disconnect_p2ps()
        self.bootstrap_p2p(**kwargs)

    def run_test(self):
        self.bootstrap_p2p()
        self.genesis_hash = int(self.nodes[0].getbestblockhash(), 16)
        self.block_heights[self.genesis_hash] = 0
        spendable_outputs = []

        # shorthand
        block = self.next_block
        node_nonstd = self.nodes[0]
        node_std = self.nodes[1]

        # save the current tip so it can be spent by a later block
        def save_spendable_output():
            spendable_outputs.append(self.tip)

        # get an output that we previously marked as spendable
        def get_spendable_output():
            return PreviousSpendableOutput(spendable_outputs.pop(0).vtx[0], 0)

        # submit current tip and check it was accepted
        def accepted(node):
            node.p2p.send_blocks_and_test([self.tip], node)

        # move the tip back to a previous block
        def tip(number):
            self.tip = self.blocks[number]

        # adds transactions to the block and updates state
        def update_block(block_number, new_transactions):
            block = self.blocks[block_number]
            block.vtx.extend(new_transactions)
            old_sha256 = block.sha256
            make_conform_to_ctor(block)
            block.hashMerkleRoot = block.calc_merkle_root()
            block.solve()
            # Update the internal state just like in next_block
            self.tip = block
            if block.sha256 != old_sha256:
                self.block_heights[
                    block.sha256] = self.block_heights[old_sha256]
                del self.block_heights[old_sha256]
            self.blocks[block_number] = block
            return block

        # checks the mempool has exactly the same txns as in the provided list
        def check_mempool_equal(node, txns):
            assert set(node.getrawmempool()) == set(tx.hash for tx in txns)

        # Returns 2 transactions:
        # 1) txfund: create outputs in segwit addresses
        # 2) txspend: spends outputs from segwit addresses
        def create_segwit_fund_and_spend_tx(spend, case0=False):
            if not case0:
                # Spending from a P2SH-P2WPKH coin,
                #   txhash:a45698363249312f8d3d93676aa714be59b0bd758e62fa054fb1ea6218480691
                redeem_script0 = bytearray.fromhex(
                    '0014fcf9969ce1c98a135ed293719721fb69f0b686cb')
                # Spending from a P2SH-P2WSH coin,
                #   txhash:6b536caf727ccd02c395a1d00b752098ec96e8ec46c96bee8582be6b5060fa2f
                redeem_script1 = bytearray.fromhex(
                    '0020fc8b08ed636cb23afcb425ff260b3abd03380a2333b54cfa5d51ac52d803baf4')
            else:
                redeem_script0 = bytearray.fromhex('51020000')
                redeem_script1 = bytearray.fromhex('53020080')
            redeem_scripts = [redeem_script0, redeem_script1]

            # Fund transaction to segwit addresses
            txfund = CTransaction()
            txfund.vin = [CTxIn(COutPoint(spend.tx.sha256, spend.n))]
            amount = (50 * COIN - 1000) // len(redeem_scripts)
            for redeem_script in redeem_scripts:
                txfund.vout.append(
                    CTxOut(amount, CScript([OP_HASH160, hash160(redeem_script), OP_EQUAL])))
            txfund.rehash()

            # Segwit spending transaction
            # We'll test if a node that checks for standardness accepts this
            # txn. It should fail exclusively because of the restriction in
            # the scriptSig (non clean stack..), so all other characteristcs
            # must pass standardness checks. For this reason, we create
            # standard P2SH outputs.
            txspend = CTransaction()
            for i in range(len(redeem_scripts)):
                txspend.vin.append(
                    CTxIn(COutPoint(txfund.sha256, i), CScript([redeem_scripts[i]])))
            txspend.vout = [CTxOut(50 * COIN - 2000,
                                   CScript([OP_HASH160, hash160(CScript([OP_TRUE])), OP_EQUAL]))]
            txspend.rehash()

            return txfund, txspend

        # Check we are not banned when sending a txn that is rejected.
        def check_for_no_ban_on_rejected_tx(node, tx, reject_reason):
            node.p2p.send_txs_and_test(
                [tx], node, success=False, reject_reason=reject_reason)

        # Create a new block
        block(0)
        save_spendable_output()
        accepted(node_nonstd)

        # Now we need that block to mature so we can spend the coinbase.
        matureblocks = []
        for i in range(199):
            block(5000 + i)
            matureblocks.append(self.tip)
            save_spendable_output()
        node_nonstd.p2p.send_blocks_and_test(matureblocks, node_nonstd)

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(100):
            out.append(get_spendable_output())

        # Create segwit funding and spending transactions
        txfund, txspend = create_segwit_fund_and_spend_tx(out[0])
        txfund_case0, txspend_case0 = create_segwit_fund_and_spend_tx(
            out[1], True)

        # Mine txfund, as it can't go into node_std mempool because it's
        # nonstandard.
        block(5555)
        update_block(5555, [txfund, txfund_case0])
        accepted(node_nonstd)

        # Check both nodes are synchronized before continuing.
        sync_blocks(self.nodes)

        # Check that upgraded nodes checking for standardness are not banning
        # nodes sending segwit spending txns.
        check_for_no_ban_on_rejected_tx(
            node_nonstd, txspend, CLEANSTACK_ERROR)
        check_for_no_ban_on_rejected_tx(
            node_nonstd, txspend_case0, EVAL_FALSE_ERROR)
        check_for_no_ban_on_rejected_tx(
            node_std, txspend, CLEANSTACK_ERROR)
        check_for_no_ban_on_rejected_tx(
            node_std, txspend_case0, EVAL_FALSE_ERROR)

        # Segwit recovery txns are never accepted into the mempool,
        # as they are included in standard flags.
        assert_raises_rpc_error(-26, RPC_CLEANSTACK_ERROR,
                                node_nonstd.sendrawtransaction, ToHex(txspend))
        assert_raises_rpc_error(-26, RPC_EVAL_FALSE_ERROR,
                                node_nonstd.sendrawtransaction, ToHex(txspend_case0))
        assert_raises_rpc_error(-26, RPC_CLEANSTACK_ERROR,
                                node_std.sendrawtransaction, ToHex(txspend))
        assert_raises_rpc_error(-26, RPC_EVAL_FALSE_ERROR,
                                node_std.sendrawtransaction, ToHex(txspend_case0))

        # Blocks containing segwit spending txns are accepted in both nodes.
        block(5)
        update_block(5, [txspend, txspend_case0])
        accepted(node_nonstd)
        sync_blocks(self.nodes)


if __name__ == '__main__':
    SegwitRecoveryTest().main()
