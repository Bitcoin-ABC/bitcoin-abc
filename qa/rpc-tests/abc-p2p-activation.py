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
from test_framework.util import *
from test_framework.comptool import TestManager, TestInstance, RejectResult
from test_framework.blocktools import *
import time
from test_framework.key import CECKey
from test_framework.script import *
from test_framework.cdefs import *

# Error for illegal use of SIGHASH_FORKID
SIGHASH_FORKID_ERROR = b'mandatory-script-verify-flag-failed (Illegal use of SIGHASH_FORKID)'
RPC_SIGHASH_FORKID_ERROR = "16: " + SIGHASH_FORKID_ERROR.decode("utf-8")

# far into the future
UAHF_START_TIME = 2000000000

class PreviousSpendableOutput(object):
    def __init__(self, tx = CTransaction(), n = -1):
        self.tx = tx
        self.n = n  # the output we're spending


class FullBlockTest(ComparisonTestFramework):

    # Can either run this test as 1 node with expected answers, or two and compare them.
    # Change the "outcome" variable from each TestInstance object to only do the comparison.
    def __init__(self):
        super().__init__()
        self.num_nodes = 1
        self.block_heights = {}
        self.coinbase_key = CECKey()
        self.coinbase_key.set_secretbytes(b"fatstacks")
        self.coinbase_pubkey = self.coinbase_key.get_pubkey()
        self.forkid_key = CECKey()
        self.forkid_key.set_secretbytes(b"forkid")
        self.forkid_pubkey = self.forkid_key.get_pubkey()
        self.tip = None
        self.blocks = {}

    def setup_network(self):
        self.extra_args = [['-debug',
                            '-norelaypriority',
                            "-uahfstarttime=%d" % UAHF_START_TIME,
                            '-whitelist=127.0.0.1',
                            '-par=1' ]]
        self.nodes = start_nodes(self.num_nodes, self.options.tmpdir,
                                 self.extra_args,
                                 binary=[self.options.testbinary])

    def add_options(self, parser):
        super().add_options(parser)
        parser.add_option("--runbarelyexpensive", dest="runbarelyexpensive", default=True)

    def run_test(self):
        self.test = TestManager(self, self.options.tmpdir)
        self.test.add_all_connections(self.nodes)
        # Start up network handling in another thread
        NetworkThread().start()
        # Mock the time so that block activating the HF will be accepted
        self.nodes[0].setmocktime(UAHF_START_TIME)
        self.test.run()

    def add_transactions_to_block(self, block, tx_list):
        [ tx.rehash() for tx in tx_list ]
        block.vtx.extend(tx_list)

    # this is a little handier to use than the version in blocktools.py
    def create_tx(self, spend_tx, n, value, script=CScript([OP_TRUE])):
        tx = create_transaction(spend_tx, n, b"", value, script)
        return tx

    # sign a transaction, using the key we know about
    # this signs input 0 in tx, which is assumed to be spending output n in spend_tx
    def sign_tx(self, tx, spend_tx, n):
        scriptPubKey = bytearray(spend_tx.vout[n].scriptPubKey)
        if (scriptPubKey[0] == OP_TRUE):  # an anyone-can-spend
            tx.vin[0].scriptSig = CScript()
            return
        (sighash, err) = SignatureHash(spend_tx.vout[n].scriptPubKey, tx, 0, SIGHASH_ALL)
        tx.vin[0].scriptSig = CScript([self.coinbase_key.sign(sighash) + bytes(bytearray([SIGHASH_ALL]))])

    def create_and_sign_transaction(self, spend_tx, n, value, script=CScript([OP_TRUE])):
        tx = self.create_tx(spend_tx, n, value, script)
        self.sign_tx(tx, spend_tx, n)
        tx.rehash()
        return tx

    def next_block(self, number, spend=None, additional_coinbase_value=0, script=None, extra_sigops=0, block_size=0, solve=True):
        """
        Create a block on top of self.tip, and advance self.tip to point to the new block
        if spend is specified, then 1 satoshi will be spent from that to an anyone-can-spend
        output, and rest will go to fees.
        """
        if self.tip == None:
            base_block_hash = self.genesis_hash
            block_time = int(time.time())+1
        else:
            base_block_hash = self.tip.sha256
            block_time = self.tip.nTime + 1
        # First create the coinbase
        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height, self.coinbase_pubkey)
        coinbase.vout[0].nValue += additional_coinbase_value
        if (spend != None):
            coinbase.vout[0].nValue += spend.tx.vout[spend.n].nValue - 1 # all but one satoshi to fees
        coinbase.rehash()
        block = create_block(base_block_hash, coinbase, block_time)
        spendable_output = None
        if (spend != None):
            tx = CTransaction()
            tx.vin.append(CTxIn(COutPoint(spend.tx.sha256, spend.n), b"", 0xffffffff))  # no signature yet
            # This copies the java comparison tool testing behavior: the first
            # txout has a garbage scriptPubKey, "to make sure we're not
            # pre-verifying too much" (?)
            tx.vout.append(CTxOut(0, CScript([random.randint(0,255), height & 255])))
            if script == None:
                tx.vout.append(CTxOut(1, CScript([OP_TRUE])))
            else:
                tx.vout.append(CTxOut(1, script))
            spendable_output = PreviousSpendableOutput(tx, 0)

            # Now sign it if necessary
            scriptSig = b""
            scriptPubKey = bytearray(spend.tx.vout[spend.n].scriptPubKey)
            if (scriptPubKey[0] == OP_TRUE):  # looks like an anyone-can-spend
                scriptSig = CScript([OP_TRUE])
            else:
                # We have to actually sign it
                (sighash, err) = SignatureHash(spend.tx.vout[spend.n].scriptPubKey, tx, 0, SIGHASH_ALL)
                scriptSig = CScript([self.coinbase_key.sign(sighash) + bytes(bytearray([SIGHASH_ALL]))])
            tx.vin[0].scriptSig = scriptSig
            # Now add the transaction to the block
            self.add_transactions_to_block(block, [tx])
            block.hashMerkleRoot = block.calc_merkle_root()
        if spendable_output != None and block_size > 0:
            while len(block.serialize()) < block_size:
                tx = CTransaction()
                script_length = block_size - len(block.serialize()) - 79
                if script_length > 510000:
                    script_length = 500000
                tx_sigops = min(extra_sigops, script_length, MAX_TX_SIGOPS_COUNT)
                extra_sigops -= tx_sigops
                script_pad_len = script_length - tx_sigops
                script_output = CScript([b'\x00' * script_pad_len] + [OP_CHECKSIG] * tx_sigops)
                tx.vout.append(CTxOut(0, CScript([OP_TRUE])))
                tx.vout.append(CTxOut(0, script_output))
                tx.vin.append(CTxIn(COutPoint(spendable_output.tx.sha256, spendable_output.n)))
                spendable_output = PreviousSpendableOutput(tx, 0)
                self.add_transactions_to_block(block, [tx])
            block.hashMerkleRoot = block.calc_merkle_root()
            # Make sure the math above worked out to produce the correct block size
            # (the math will fail if there are too many transactions in the block)
            assert_equal(len(block.serialize()), block_size)
            # Make sure all the requested sigops have been included
            assert_equal(extra_sigops, 0)
        if solve:
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
        def rejected(reject = None):
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
            self.add_transactions_to_block(block, new_transactions)
            old_sha256 = block.sha256
            block.hashMerkleRoot = block.calc_merkle_root()
            block.solve()
            # Update the internal state just like in next_block
            self.tip = block
            if block.sha256 != old_sha256:
                self.block_heights[block.sha256] = self.block_heights[old_sha256]
                del self.block_heights[old_sha256]
            self.blocks[block_number] = block
            return block

        # shorthand for functions
        block = self.next_block
        node = self.nodes[0]

        # Create a new block
        block(0, block_size=LEGACY_MAX_BLOCK_SIZE)
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

        # block up to LEGACY_MAX_BLOCK_SIZE are accepted.
        block(1, spend=out[0], block_size=LEGACY_MAX_BLOCK_SIZE)
        yield accepted()

        # bigger block are reject as the fork isn't activated yet.
        block(2, spend=out[1], block_size=LEGACY_MAX_BLOCK_SIZE + 1)
        yield rejected(RejectResult(16, b'bad-blk-length'))

        # Rewind bad block
        tip(1)

        # Create a transaction that we will use to test SIGHASH_FORID
        script_forkid = CScript([self.forkid_pubkey, OP_CHECKSIG])
        tx_forkid = self.create_and_sign_transaction(out[1].tx, out[1].n, 1, script_forkid)

        # Create a block that would activate the HF. We also add the
        # transaction that will allow us to test SIGHASH_FORKID
        b03 = block(3)
        b03.nTime = UAHF_START_TIME
        update_block(3, [tx_forkid])
        yield accepted()

        # Pile up 4 blocks on top to get to the point just before activation.
        block(4, spend=out[2])
        yield accepted()
        block(5, spend=out[3])
        yield accepted()
        block(6, spend=out[4])
        yield accepted()
        block(7, spend=out[5])
        yield accepted()

        # bigger block are still rejected as the fork isn't activated yet.
        block(8, spend=out[6], block_size=LEGACY_MAX_BLOCK_SIZE + 1)
        yield rejected(RejectResult(16, b'bad-blk-length'))

        # Rewind bad block
        tip(7)

        # build a transaction using SIGHASH_FORKID
        tx_spend = self.create_tx(tx_forkid, 0, 1, CScript([OP_TRUE]))
        sighash_spend = SignatureHashForkId(script_forkid, tx_spend, 0, SIGHASH_FORKID | SIGHASH_ALL, 1)
        sig_forkid = self.forkid_key.sign(sighash_spend)
        tx_spend.vin[0].scriptSig = CScript([sig_forkid + bytes(bytearray([SIGHASH_FORKID | SIGHASH_ALL]))])
        tx_spend.rehash()

        # This transaction can't get into the mempool yet
        try:
            node.sendrawtransaction(ToHex(tx_spend))
        except JSONRPCException as exp:
            assert_equal(exp.error["message"], RPC_SIGHASH_FORKID_ERROR)
        else:
            assert(False)

        # The transaction is rejected, so the mempool should still be empty
        assert_equal(set(node.getrawmempool()), set())

        # check that SIGHASH_FORKID transaction are still rejected
        b09 = block(9)
        update_block(9, [tx_spend])
        yield rejected(RejectResult(16, SIGHASH_FORKID_ERROR))

        # Rewind bad block
        tip(7)

        # Pile up another block, to activate. OP_RETURN anti replay
        # outputs are still considered valid.
        antireplay_script=CScript([OP_RETURN, ANTI_REPLAY_COMMITMENT])
        block(10, spend=out[6], script=antireplay_script)
        yield accepted()

        # Now that the HF is activated, replay protected tx are
        # accepted in the mempool
        tx_spend_id = node.sendrawtransaction(ToHex(tx_spend))
        assert_equal(set(node.getrawmempool()), {tx_spend_id})

        # HF is active now, we MUST create a big block.
        block(11, spend=out[7], block_size=LEGACY_MAX_BLOCK_SIZE);
        yield rejected(RejectResult(16, b'bad-blk-too-small'))

        # Rewind bad block
        tip(10)

        # HF is active, now we can create bigger blocks and use
        # SIGHASH_FORKID replay protection.
        block(12, spend=out[7], block_size=LEGACY_MAX_BLOCK_SIZE + 1)
        update_block(12, [tx_spend])
        yield accepted()

        # We save this block id to test reorg
        fork_block_id = node.getbestblockhash()

        # The transaction has been mined, it's not in the mempool anymore
        assert_equal(set(node.getrawmempool()), set())

        # Test OP_RETURN replay protection
        block(13, spend=out[8], script=antireplay_script)
        yield rejected(RejectResult(16, b'bad-txn-replay'))

        # Rewind bad block
        tip(12)

        # Check that only the first block has to be > 1MB
        block(14, spend=out[8])
        yield accepted()

        # Now we reorg just when the HF activated. The
        # SIGHASH_FORKID transaction is back in the mempool
        node.invalidateblock(fork_block_id)
        assert(tx_spend_id in set(node.getrawmempool()))

        # And now just before when the HF activated. The
        # SIGHASH_FORKID should be kicked out the mempool
        node.invalidateblock(node.getbestblockhash())
        assert(tx_spend_id not in set(node.getrawmempool()))


if __name__ == '__main__':
    FullBlockTest().main()
