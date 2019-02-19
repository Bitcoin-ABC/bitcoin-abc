#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks activation of UAHF and the different consensus
related to this activation.
It is derived from the much more complex p2p-fullblocktest.
"""

from test_framework.test_framework import ComparisonTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error
from test_framework.comptool import TestManager, TestInstance, RejectResult
from test_framework.blocktools import *
import time
from test_framework.key import CECKey
from test_framework.script import *

# far into the future
REPLAY_PROTECTION_START_TIME = 2000000000

# Error due to invalid signature
INVALID_SIGNATURE_ERROR = b'mandatory-script-verify-flag-failed (Signature must be zero for failed CHECK(MULTI)SIG operation)'
RPC_INVALID_SIGNATURE_ERROR = "16: " + \
    INVALID_SIGNATURE_ERROR.decode("utf-8")


class PreviousSpendableOutput(object):

    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        self.n = n


class ReplayProtectionTest(ComparisonTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        self.extra_args = [['-whitelist=127.0.0.1',
                            "-replayprotectionactivationtime={}".format(REPLAY_PROTECTION_START_TIME)]]

    def run_test(self):
        self.test = TestManager(self, self.options.tmpdir)
        self.test.add_all_connections(self.nodes)
        network_thread_start()
        self.nodes[0].setmocktime(REPLAY_PROTECTION_START_TIME)
        self.test.run()

    def next_block(self, number):
        if self.tip == None:
            base_block_hash = self.genesis_hash
            block_time = int(time.time()) + 1
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

        # shorthand
        block = self.next_block
        node = self.nodes[0]

        # Create a new block
        block(0)
        save_spendable_output()
        yield accepted()

        # Now we need that block to mature so we can spend the coinbase.
        test = TestInstance(sync_every_block=False)
        for i in range(99):
            block(5000 + i)
            test.blocks_and_transactions.append([self.tip, True])
            save_spendable_output()
        yield test

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(100):
            out.append(get_spendable_output())

        # Generate a key pair to test P2SH sigops count
        private_key = CECKey()
        private_key.set_secretbytes(b"replayprotection")
        public_key = private_key.get_pubkey()

        # This is a little handier to use than the version in blocktools.py
        def create_fund_and_spend_tx(spend, forkvalue=0):
            # Fund transaction
            script = CScript([public_key, OP_CHECKSIG])
            txfund = create_transaction(
                spend.tx, spend.n, b'', 50 * COIN, script)
            txfund.rehash()

            # Spend transaction
            txspend = CTransaction()
            txspend.vout.append(CTxOut(50 * COIN - 1000, CScript([OP_TRUE])))
            txspend.vin.append(CTxIn(COutPoint(txfund.sha256, 0), b''))

            # Sign the transaction
            sighashtype = (forkvalue << 8) | SIGHASH_ALL | SIGHASH_FORKID
            sighash = SignatureHashForkId(
                script, txspend, 0, sighashtype, 50 * COIN)
            sig = private_key.sign(sighash) + \
                bytes(bytearray([SIGHASH_ALL | SIGHASH_FORKID]))
            txspend.vin[0].scriptSig = CScript([sig])
            txspend.rehash()

            return [txfund, txspend]

        def send_transaction_to_mempool(tx):
            tx_id = node.sendrawtransaction(ToHex(tx))
            assert(tx_id in set(node.getrawmempool()))
            return tx_id

        # Before the fork, no replay protection required to get in the mempool.
        txns = create_fund_and_spend_tx(out[0])
        send_transaction_to_mempool(txns[0])
        send_transaction_to_mempool(txns[1])

        # And txns get mined in a block properly.
        block(1)
        update_block(1, txns)
        yield accepted()

        # Replay protected transactions are rejected.
        replay_txns = create_fund_and_spend_tx(out[1], 0xffdead)
        send_transaction_to_mempool(replay_txns[0])
        assert_raises_rpc_error(-26, RPC_INVALID_SIGNATURE_ERROR,
                                node.sendrawtransaction, ToHex(replay_txns[1]))

        # And block containing them are rejected as well.
        block(2)
        update_block(2, replay_txns)
        yield rejected(RejectResult(16, b'blk-bad-inputs'))

        # Rewind bad block
        tip(1)

        # Create a block that would activate the replay protection.
        bfork = block(5555)
        bfork.nTime = REPLAY_PROTECTION_START_TIME - 1
        update_block(5555, [])
        yield accepted()

        for i in range(5):
            block(5100 + i)
            test.blocks_and_transactions.append([self.tip, True])
        yield test

        # Check we are just before the activation time
        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     REPLAY_PROTECTION_START_TIME - 1)

        # We are just before the fork, replay protected txns still are rejected
        assert_raises_rpc_error(-26, RPC_INVALID_SIGNATURE_ERROR,
                                node.sendrawtransaction, ToHex(replay_txns[1]))

        block(3)
        update_block(3, replay_txns)
        yield rejected(RejectResult(16, b'blk-bad-inputs'))

        # Rewind bad block
        tip(5104)

        # Send some non replay protected txns in the mempool to check
        # they get cleaned at activation.
        txns = create_fund_and_spend_tx(out[2])
        send_transaction_to_mempool(txns[0])
        tx_id = send_transaction_to_mempool(txns[1])

        # Activate the replay protection
        block(5556)
        yield accepted()

        # Check we just activated the replay protection
        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     REPLAY_PROTECTION_START_TIME)

        # Non replay protected transactions are not valid anymore,
        # so they should be removed from the mempool.
        assert(tx_id not in set(node.getrawmempool()))

        # Good old transactions are now invalid.
        send_transaction_to_mempool(txns[0])
        assert_raises_rpc_error(-26, RPC_INVALID_SIGNATURE_ERROR,
                                node.sendrawtransaction, ToHex(txns[1]))

        # They also cannot be mined
        block(4)
        update_block(4, txns)
        yield rejected(RejectResult(16, b'blk-bad-inputs'))

        # Rewind bad block
        tip(5556)

        # The replay protected transaction is now valid
        replay_tx0_id = send_transaction_to_mempool(replay_txns[0])
        replay_tx1_id = send_transaction_to_mempool(replay_txns[1])

        # Make sure the transaction are ready to be mined.
        tmpl = node.getblocktemplate()

        found_id0 = False
        found_id1 = False

        for txn in tmpl['transactions']:
            txid = txn['txid']
            if txid == replay_tx0_id:
                found_id0 = True
            elif txid == replay_tx1_id:
                found_id1 = True

        assert(found_id0 and found_id1)

        # And the mempool is still in good shape.
        assert(replay_tx0_id in set(node.getrawmempool()))
        assert(replay_tx1_id in set(node.getrawmempool()))

        # They also can also be mined
        b5 = block(5)
        update_block(5, replay_txns)
        yield accepted()

        # Ok, now we check if a reorg work properly accross the activation.
        postforkblockid = node.getbestblockhash()
        node.invalidateblock(postforkblockid)
        assert(replay_tx0_id in set(node.getrawmempool()))
        assert(replay_tx1_id in set(node.getrawmempool()))

        # Deactivating replay protection.
        forkblockid = node.getbestblockhash()
        node.invalidateblock(forkblockid)
        # The funding tx is not evicted from the mempool, since it's valid in
        # both sides of the fork
        assert(replay_tx0_id in set(node.getrawmempool()))
        assert(replay_tx1_id not in set(node.getrawmempool()))

        # Check that we also do it properly on deeper reorg.
        node.reconsiderblock(forkblockid)
        node.reconsiderblock(postforkblockid)
        node.invalidateblock(forkblockid)
        assert(replay_tx0_id in set(node.getrawmempool()))
        assert(replay_tx1_id not in set(node.getrawmempool()))


if __name__ == '__main__':
    ReplayProtectionTest().main()
