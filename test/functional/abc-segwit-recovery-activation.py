#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Copyright (c) 2017-2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks activation of the SCRIPT_ALLOW_SEGWIT_RECOVERY flag
"""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.comptool import RejectResult, TestInstance, TestManager
from test_framework.messages import (
    COIN,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    msg_tx,
    ToHex,
)
from test_framework.mininode import (
    mininode_lock,
    network_thread_start,
    P2PInterface,
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
    assert_equal,
    assert_raises_rpc_error,
    sync_blocks,
)

# far into the future
GREAT_WALL_START_TIME = 2000000000

# First blocks (initial coinbases, pre-fork test blocks) happen 1 day before.
FIRST_BLOCK_TIME = GREAT_WALL_START_TIME - 86400

# Error due to non clean stack
CLEANSTACK_ERROR = b'non-mandatory-script-verify-flag (Script did not clean its stack)'
RPC_CLEANSTACK_ERROR = "64: " + \
    CLEANSTACK_ERROR.decode("utf-8")
EVAL_FALSE_ERROR = b'non-mandatory-script-verify-flag (Script evaluated without error but finished with a false/empty top stack elem'
RPC_EVAL_FALSE_ERROR = "64: " + \
    EVAL_FALSE_ERROR.decode("utf-8")


class PreviousSpendableOutput(object):

    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        self.n = n


class SegwitRecoveryActivationTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        # We have 2 nodes:
        # 1) node_nonstd (nodes[0]) accepts non-standard txns. It's used to
        #    test the activation itself via TestManager.
        # 2) node_std (nodes[1]) doesn't accept non-standard txns and
        #    doesn't have us whitelisted. It's used to test for bans, as we
        #    connect directly to it via mininode and send a segwit spending
        #    txn. This transaction is non-standard and, before activation,
        #    also invalid. We check, before and after activation, that
        #    sending this transaction doesn't result in a ban.
        # Nodes are connected to each other, so node_std receives blocks and
        # transactions that node_nonstd has accepted. Since we are checking
        # that segwit spending txn are not resulting in bans, node_nonstd
        # doesn't get banned when forwarding this kind of transactions to
        # node_std.
        self.extra_args = [['-whitelist=127.0.0.1',
                            "-acceptnonstdtxn",
                            "-greatwallactivationtime={}".format(
                                GREAT_WALL_START_TIME),
                            "-replayprotectionactivationtime={}".format(
                                2 * GREAT_WALL_START_TIME)],
                           ["-acceptnonstdtxn=0",
                            "-greatwallactivationtime={}".format(
                                GREAT_WALL_START_TIME),
                            "-replayprotectionactivationtime={}".format(
                                2 * GREAT_WALL_START_TIME)]]

    def run_test(self):
        # Move the mocktime up to activation
        for node in self.nodes:
            node.setmocktime(GREAT_WALL_START_TIME)
        test = TestManager(self, self.options.tmpdir)
        # TestManager only connects to node_nonstd (nodes[0])
        test.add_all_connections([self.nodes[0]])
        # We connect directly to node_std (nodes[1])
        self.nodes[1].add_p2p_connection(P2PInterface())
        network_thread_start()
        test.run()

    def next_block(self, number):
        if self.tip == None:
            base_block_hash = self.genesis_hash
            block_time = FIRST_BLOCK_TIME
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

    def get_tests(self):
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

        # returns a test case that asserts that the current tip was accepted
        def accepted():
            return TestInstance([[self.tip, True]])

        # returns a test case that asserts that the current tip was rejected
        def rejected(reject=None):
            if reject is None:
                return TestInstance([[self.tip, False]])
            else:
                return TestInstance([[self.tip, reject]])

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
                # To make sure we'll be able to recover coins sent to segwit addresses,
                # we test using historical recoveries from btc.com:
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

        # Check we are not banned when sending a txn that node_nonstd rejects.
        def check_for_no_ban_on_rejected_tx(tx, reject_code, reject_reason):
            # Check that our connection to node_std is open
            assert(node_std.p2p.state == 'connected')

            # The P2PConnection stores a public counter for each message type
            # and the last receive message of each type. We use this counter to
            # identify that we received a new reject message.
            with mininode_lock:
                rejects_count = node_std.p2p.message_count['reject']

            # Send the transaction directly. We use a ping for synchronization:
            # if we have been banned, the pong message won't be received, a
            # timeout occurs and the test fails.
            node_std.p2p.send_message(msg_tx(tx))
            node_std.p2p.sync_with_ping()

            # Check we haven't been disconnected
            assert(node_std.p2p.state == 'connected')

            # Check the reject message matches what we expected
            with mininode_lock:
                assert(node_std.p2p.message_count['reject'] ==
                       rejects_count + 1)
                reject_msg = node_std.p2p.last_message['reject']
                assert(reject_msg.code == reject_code and
                       reject_msg.reason == reject_reason and
                       reject_msg.data == tx.sha256)

        # Create a new block
        block(0)
        save_spendable_output()
        yield accepted()

        # Now we need that block to mature so we can spend the coinbase.
        test = TestInstance(sync_every_block=False)
        for i in range(100):
            block(5000 + i)
            test.blocks_and_transactions.append([self.tip, True])
            save_spendable_output()
        yield test

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(100):
            out.append(get_spendable_output())

        # Create segwit funding and spending transactions
        txfund, txspend = create_segwit_fund_and_spend_tx(out[0])
        txfund_case0, txspend_case0 = create_segwit_fund_and_spend_tx(
            out[1], True)

        # Create blocks to get closer to activate the fork.
        # Mine txfund, as it can't go into node_std mempool because it's
        # nonstandard.
        b = block(5555)
        b.nTime = GREAT_WALL_START_TIME - 1
        update_block(5555, [txfund, txfund_case0])
        yield accepted()

        for i in range(5):
            block(5100 + i)
            test.blocks_and_transactions.append([self.tip, True])
        yield test

        # Since the TestManager is not connected to node_std, we must check
        # both nodes are synchronized before continuing.
        sync_blocks(self.nodes)

        # Check we are just before the activation time
        assert_equal(node_nonstd.getblockheader(
            node_nonstd.getbestblockhash())['mediantime'], GREAT_WALL_START_TIME - 1)
        assert_equal(node_std.getblockheader(
            node_std.getbestblockhash())['mediantime'], GREAT_WALL_START_TIME - 1)

        # Before the fork, segwit spending txns are rejected.
        assert_raises_rpc_error(-26, RPC_CLEANSTACK_ERROR,
                                node_nonstd.sendrawtransaction, ToHex(txspend))
        assert_raises_rpc_error(-26, RPC_CLEANSTACK_ERROR,
                                node_std.sendrawtransaction, ToHex(txspend))
        assert_raises_rpc_error(-26, RPC_EVAL_FALSE_ERROR,
                                node_nonstd.sendrawtransaction, ToHex(txspend_case0))
        assert_raises_rpc_error(-26, RPC_EVAL_FALSE_ERROR,
                                node_std.sendrawtransaction, ToHex(txspend_case0))

        # Blocks containing segwit spending txns are rejected as well.
        block(2)
        update_block(2, [txspend, txspend_case0])
        yield rejected(RejectResult(16, b'blk-bad-inputs'))

        # Rewind bad block
        tip(5104)

        # Check that non-upgraded nodes checking for standardness are not
        # banning nodes sending segwit spending txns.
        check_for_no_ban_on_rejected_tx(txspend, 64, CLEANSTACK_ERROR)
        check_for_no_ban_on_rejected_tx(txspend_case0, 64, EVAL_FALSE_ERROR)

        # Activate the fork in both nodes!
        forkblock = block(5556)
        yield accepted()
        sync_blocks(self.nodes)

        # Check we just activated the fork
        assert_equal(node_nonstd.getblockheader(
            node_nonstd.getbestblockhash())['mediantime'], GREAT_WALL_START_TIME)
        assert_equal(node_std.getblockheader(
            node_std.getbestblockhash())['mediantime'], GREAT_WALL_START_TIME)

        # Check that upgraded nodes checking for standardness are not banning
        # nodes sending segwit spending txns.
        check_for_no_ban_on_rejected_tx(txspend, 64, CLEANSTACK_ERROR)
        check_for_no_ban_on_rejected_tx(txspend_case0, 64, EVAL_FALSE_ERROR)

        # Segwit spending txns are accepted in the mempool of nodes not checking
        # for standardness, but rejected in nodes that check.
        node_nonstd.sendrawtransaction(ToHex(txspend))
        node_nonstd.sendrawtransaction(ToHex(txspend_case0))
        check_mempool_equal(node_nonstd, [txspend, txspend_case0])
        assert_raises_rpc_error(-26, RPC_CLEANSTACK_ERROR,
                                node_std.sendrawtransaction, ToHex(txspend))
        assert_raises_rpc_error(-26, RPC_EVAL_FALSE_ERROR,
                                node_std.sendrawtransaction, ToHex(txspend_case0))

        # Blocks containing segwit spending txns are now accepted in both
        # nodes.
        block(5)
        postforkblock = update_block(5, [txspend, txspend_case0])
        yield accepted()
        sync_blocks(self.nodes)

        # Ok, now we check if a reorg work properly accross the activation.
        node_nonstd.invalidateblock(postforkblock.hash)
        check_mempool_equal(node_nonstd, [txspend, txspend_case0])

        # Also check that nodes checking for standardness don't return a segwit
        # spending txn into the mempool when disconnecting a block.
        node_std.invalidateblock(postforkblock.hash)
        assert(len(node_std.getrawmempool()) == 0)

        # Deactivate the fork. The spending tx has been evicted from the
        # mempool
        node_nonstd.invalidateblock(forkblock.hash)
        assert(len(node_nonstd.getrawmempool()) == 0)


if __name__ == '__main__':
    SegwitRecoveryActivationTest().main()
