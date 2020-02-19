#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin Developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test activation of block sigchecks limits
"""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.cdefs import (
    BLOCK_MAXBYTES_MAXSIGCHECKS_RATIO
)
from test_framework.messages import (
    CBlock,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    FromHex,
)
from test_framework.mininode import P2PDataStore
from test_framework.script import (
    CScript,
    OP_CHECKDATASIG,
    OP_CHECKDATASIGVERIFY,
    OP_3DUP,
    OP_RETURN,
    OP_TRUE,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal
from collections import deque

# Set test to run with sigops deactivation far in the future.
SIGCHECKS_ACTIVATION_TIME = 2000000000

# If we don't do this, autoreplay protection will activate before graviton and
# all our sigs will mysteriously fail.
REPLAY_PROTECTION_START_TIME = SIGCHECKS_ACTIVATION_TIME * 2

# We are going to use a tiny block size so we don't need to waste too much
# time with making transactions. (note -- minimum block size is 1000000)
# (just below a multiple, to test edge case)
MAXBLOCKSIZE = 8000 * BLOCK_MAXBYTES_MAXSIGCHECKS_RATIO - 1
assert MAXBLOCKSIZE == 1127999

# Blocks with too many sigchecks from cache give this error in log file:
BLOCK_SIGCHECKS_CACHED_ERROR = "blk-bad-inputs, CheckInputs exceeded SigChecks limit"
# Blocks with too many sigchecks discovered during parallel checks give
# this error in log file:
BLOCK_SIGCHECKS_PARALLEL_ERROR = "blk-bad-inputs, parallel script check failed"

MAX_TX_SIGCHECK = 3000


def create_transaction(spendfrom, custom_script, amount=None):
    # Fund and sign a transaction to a given output.
    # spendfrom should be a CTransaction with first output to OP_TRUE.

    # custom output will go on position 1, after position 0 which will be
    # OP_TRUE (so it can be reused).
    customout = CTxOut(0, bytes(custom_script))
    # set output amount to required dust if not given
    customout.nValue = amount or (len(customout.serialize()) + 148) * 3

    ctx = CTransaction()
    ctx.vin.append(CTxIn(COutPoint(spendfrom.sha256, 0), b''))
    ctx.vout.append(CTxOut(0, bytes([OP_TRUE])))
    ctx.vout.append(customout)
    pad_tx(ctx)

    fee = len(ctx.serialize())
    ctx.vout[0].nValue = spendfrom.vout[0].nValue - customout.nValue - fee
    ctx.rehash()

    return ctx


def check_for_ban_on_rejected_tx(node, tx, reject_reason=None):
    """Check we are disconnected when sending a txn that the node rejects,
    then reconnect after.

    (Can't actually get banned, since bitcoind won't ban local peers.)"""
    node.p2p.send_txs_and_test(
        [tx], node, success=False, expect_disconnect=True, reject_reason=reject_reason)
    node.disconnect_p2ps()
    node.add_p2p_connection(P2PDataStore())


def check_for_ban_on_rejected_block(node, block, reject_reason=None):
    """Check we are disconnected when sending a block that the node rejects,
    then reconnect after.

    (Can't actually get banned, since bitcoind won't ban local peers.)"""
    node.p2p.send_blocks_and_test(
        [block], node, success=False, reject_reason=reject_reason, expect_disconnect=True)
    node.disconnect_p2ps()
    node.add_p2p_connection(P2PDataStore())


def check_for_no_ban_on_rejected_tx(node, tx, reject_reason=None):
    """Check we are not disconnected when sending a txn that the node rejects."""
    node.p2p.send_txs_and_test(
        [tx], node, success=False, reject_reason=reject_reason)


class BlockSigChecksActivationTest(BitcoinTestFramework):

    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.block_heights = {}
        self.extra_args = [["-phononactivationtime={}".format(
            SIGCHECKS_ACTIVATION_TIME),
            "-replayprotectionactivationtime={}".format(
            REPLAY_PROTECTION_START_TIME),
            "-excessiveblocksize={}".format(MAXBLOCKSIZE),
            "-blockmaxsize={}".format(MAXBLOCKSIZE)]]

    def getbestblock(self, node):
        """Get the best block. Register its height so we can use build_block."""
        block_height = node.getblockcount()
        blockhash = node.getblockhash(block_height)
        block = FromHex(CBlock(), node.getblock(blockhash, 0))
        block.calc_sha256()
        self.block_heights[block.sha256] = block_height
        return block

    def build_block(self, parent, transactions=(),
                    nTime=None, cbextrascript=None):
        """Make a new block with an OP_1 coinbase output.

        Requires parent to have its height registered."""
        parent.calc_sha256()
        block_height = self.block_heights[parent.sha256] + 1
        block_time = (parent.nTime + 1) if nTime is None else nTime

        block = create_block(
            parent.sha256, create_coinbase(block_height), block_time)
        if cbextrascript is not None:
            block.vtx[0].vout.append(CTxOut(0, cbextrascript))
            block.vtx[0].rehash()
        block.vtx.extend(transactions)
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        self.block_heights[block.sha256] = block_height
        return block

    def run_test(self):
        [node] = self.nodes
        node.add_p2p_connection(P2PDataStore())
        # Get out of IBD
        node.generatetoaddress(1, node.get_deterministic_priv_key().address)

        tip = self.getbestblock(node)

        self.log.info("Create some blocks with OP_1 coinbase for spending.")
        blocks = []
        for _ in range(20):
            tip = self.build_block(tip)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node, success=True)
        self.spendable_outputs = deque(block.vtx[0] for block in blocks)

        self.log.info("Mature the blocks.")
        node.generatetoaddress(100, node.get_deterministic_priv_key().address)

        tip = self.getbestblock(node)

        # To make compact and fast-to-verify transactions, we'll use
        # CHECKDATASIG over and over with the same data.
        # (Using the same stuff over and over again means we get to hit the
        # node's signature cache and don't need to make new signatures every
        # time.)
        cds_message = b''
        # r=1 and s=1 ecdsa, the minimum values.
        cds_signature = bytes.fromhex('3006020101020101')
        # Recovered pubkey
        cds_pubkey = bytes.fromhex(
            '03089b476b570d66fad5a20ae6188ebbaf793a4c2a228c65f3d79ee8111d56c932')

        def minefunding2(n):
            """ Mine a block with a bunch of outputs that are very dense
            sigchecks when spent (2 sigchecks each); return the inputs that can
            be used to spend. """
            cds_scriptpubkey = CScript(
                [cds_message, cds_pubkey, OP_3DUP, OP_CHECKDATASIGVERIFY, OP_CHECKDATASIGVERIFY])
            # The scriptsig is carefully padded to have size 26, which is the
            # shortest allowed for 2 sigchecks for mempool admission.
            # The resulting inputs have size 67 bytes, 33.5 bytes/sigcheck.
            cds_scriptsig = CScript([b'x' * 16, cds_signature])
            assert_equal(len(cds_scriptsig), 26)

            self.log.debug("Gen {} with locking script {} unlocking script {} .".format(
                n, cds_scriptpubkey.hex(), cds_scriptsig.hex()))

            tx = self.spendable_outputs.popleft()
            usable_inputs = []
            txes = []
            for _ in range(n):
                tx = create_transaction(tx, cds_scriptpubkey)
                txes.append(tx)
                usable_inputs.append(
                    CTxIn(COutPoint(tx.sha256, 1), cds_scriptsig))
            newtip = self.build_block(tip, txes)
            node.p2p.send_blocks_and_test([newtip], node)
            return usable_inputs, newtip

        self.log.info("Funding special coins that have high sigchecks")

        # mine 5000 funded outputs (10000 sigchecks)
        # will be used pre-activation and post-activation
        usable_inputs, tip = minefunding2(5000)
        # assemble them into 50 txes with 100 inputs each (200 sigchecks)
        submittxes_1 = []
        while len(usable_inputs) >= 100:
            tx = CTransaction()
            tx.vin = [usable_inputs.pop() for _ in range(100)]
            tx.vout = [CTxOut(0, CScript([OP_RETURN]))]
            tx.rehash()
            submittxes_1.append(tx)

        # mine 5000 funded outputs (10000 sigchecks)
        # will be used post-activation
        usable_inputs, tip = minefunding2(5000)
        # assemble them into 50 txes with 100 inputs each (200 sigchecks)
        submittxes_2 = []
        while len(usable_inputs) >= 100:
            tx = CTransaction()
            tx.vin = [usable_inputs.pop() for _ in range(100)]
            tx.vout = [CTxOut(0, CScript([OP_RETURN]))]
            tx.rehash()
            submittxes_2.append(tx)

        # Check high sigcheck transactions
        self.log.info("Create transaction that have high sigchecks")

        fundings = []

        def make_spend(sigcheckcount):
            # Add a funding tx to fundings, and return a tx spending that using
            # scriptsig.
            self.log.debug(
                "Gen tx with {} sigchecks.".format(sigcheckcount))

            def get_script_with_sigcheck(count):
                return CScript([cds_message,
                                cds_pubkey] + (count - 1) * [OP_3DUP, OP_CHECKDATASIGVERIFY] + [OP_CHECKDATASIG])

            # get funds locked with OP_1
            sourcetx = self.spendable_outputs.popleft()
            # make funding that forwards to scriptpubkey
            last_sigcheck_count = ((sigcheckcount - 1) % 30) + 1
            fundtx = create_transaction(
                sourcetx, get_script_with_sigcheck(last_sigcheck_count))

            fill_sigcheck_script = get_script_with_sigcheck(30)

            remaining_sigcheck = sigcheckcount
            while remaining_sigcheck > 30:
                fundtx.vout[0].nValue -= 1000
                fundtx.vout.append(CTxOut(100, bytes(fill_sigcheck_script)))
                remaining_sigcheck -= 30

            fundtx.rehash()
            fundings.append(fundtx)

            # make the spending
            scriptsig = CScript([cds_signature])

            tx = CTransaction()
            tx.vin.append(CTxIn(COutPoint(fundtx.sha256, 1), scriptsig))

            input_index = 2
            remaining_sigcheck = sigcheckcount
            while remaining_sigcheck > 30:
                tx.vin.append(
                    CTxIn(
                        COutPoint(
                            fundtx.sha256,
                            input_index),
                        scriptsig))
                remaining_sigcheck -= 30
                input_index += 1

            tx.vout.append(CTxOut(0, CScript([OP_RETURN])))
            pad_tx(tx)
            tx.rehash()
            return tx

        # Create transactions with many sigchecks.
        good_tx = make_spend(MAX_TX_SIGCHECK)
        bad_tx = make_spend(MAX_TX_SIGCHECK + 1)

        tip = self.build_block(tip, fundings)
        node.p2p.send_blocks_and_test([tip], node)

        # Both tx are accepted before the activation.
        pre_activation_sigcheck_block = self.build_block(
            tip, [good_tx, bad_tx])
        node.p2p.send_blocks_and_test([pre_activation_sigcheck_block], node)
        node.invalidateblock(pre_activation_sigcheck_block.hash)

        # Activation tests

        self.log.info("Approach to just before upgrade activation")
        # Move our clock to the uprade time so we will accept such
        # future-timestamped blocks.
        node.setmocktime(SIGCHECKS_ACTIVATION_TIME + 10)
        # Mine six blocks with timestamp starting at
        # SIGCHECKS_ACTIVATION_TIME-1
        blocks = []
        for i in range(-1, 5):
            tip = self.build_block(tip, nTime=SIGCHECKS_ACTIVATION_TIME + i)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node)
        assert_equal(node.getblockchaininfo()[
                     'mediantime'], SIGCHECKS_ACTIVATION_TIME - 1)

        self.log.info(
            "The next block will activate, but the activation block itself must follow old rules")

        # Send the 50 txes and get the node to mine as many as possible (it should do all)
        # The node is happy mining and validating a 10000 sigcheck block before
        # activation.
        node.p2p.send_txs_and_test(submittxes_1, node)
        [blockhash] = node.generatetoaddress(
            1, node.get_deterministic_priv_key().address)
        assert_equal(set(node.getblock(blockhash, 1)["tx"][1:]), {
                     t.hash for t in submittxes_1})

        # We have activated, but let's invalidate that.
        assert_equal(node.getblockchaininfo()[
            'mediantime'], SIGCHECKS_ACTIVATION_TIME)
        node.invalidateblock(blockhash)

        # Try again manually and invalidate that too
        goodblock = self.build_block(tip, submittxes_1)
        node.p2p.send_blocks_and_test([goodblock], node)
        node.invalidateblock(goodblock.hash)

        # All transactions should be back in mempool.
        assert_equal(set(node.getrawmempool()), {t.hash for t in submittxes_1})

        self.log.info("Mine the activation block itself")
        tip = self.build_block(tip)
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info("We have activated!")
        assert_equal(node.getblockchaininfo()[
                     'mediantime'], SIGCHECKS_ACTIVATION_TIME)

        self.log.info(
            "Try a block with a transaction going over the limit (limit: {})".format(MAX_TX_SIGCHECK))
        bad_tx_block = self.build_block(tip, [bad_tx])
        check_for_ban_on_rejected_block(
            node, bad_tx_block, reject_reason=BLOCK_SIGCHECKS_PARALLEL_ERROR)

        self.log.info(
            "Try a block with a transaction just under the limit (limit: {})".format(MAX_TX_SIGCHECK))
        good_tx_block = self.build_block(tip, [good_tx])
        node.p2p.send_blocks_and_test([good_tx_block], node)
        node.invalidateblock(good_tx_block.hash)

        # save this tip for later
        # ~ upgrade_block = tip

        # Transactions still in pool:
        assert_equal(set(node.getrawmempool()), {t.hash for t in submittxes_1})

        self.log.info("Try sending 10000-sigcheck blocks after activation (limit: {})".format(
            MAXBLOCKSIZE // BLOCK_MAXBYTES_MAXSIGCHECKS_RATIO))
        # Send block with same txes we just tried before activation
        badblock = self.build_block(tip, submittxes_1)
        check_for_ban_on_rejected_block(
            node, badblock, reject_reason=BLOCK_SIGCHECKS_CACHED_ERROR)

        self.log.info(
            "There are too many sigchecks in mempool to mine in a single block. Make sure the node won't mine invalid blocks.")
        node.generatetoaddress(1, node.get_deterministic_priv_key().address)
        tip = self.getbestblock(node)
        # only 39 txes got mined.
        assert_equal(len(node.getrawmempool()), 11)

        self.log.info("Try sending 10000-sigcheck block with fresh transactions after activation (limit: {})".format(
            MAXBLOCKSIZE // BLOCK_MAXBYTES_MAXSIGCHECKS_RATIO))
        # Note: in the following tests we'll be bumping timestamp in order
        # to bypass any kind of 'bad block' cache on the node, and get a
        # fresh evaluation each time.

        # Try another block with 10000 sigchecks but all fresh transactions
        badblock = self.build_block(
            tip, submittxes_2, nTime=SIGCHECKS_ACTIVATION_TIME + 5)
        check_for_ban_on_rejected_block(
            node, badblock, reject_reason=BLOCK_SIGCHECKS_PARALLEL_ERROR)

        # Send the same txes again with different block hash. Currently we don't
        # cache valid transactions in invalid blocks so nothing changes.
        badblock = self.build_block(
            tip, submittxes_2, nTime=SIGCHECKS_ACTIVATION_TIME + 6)
        check_for_ban_on_rejected_block(
            node, badblock, reject_reason=BLOCK_SIGCHECKS_PARALLEL_ERROR)

        # Put all the txes in mempool, in order to get them cached:
        node.p2p.send_txs_and_test(submittxes_2, node)
        # Send them again, the node still doesn't like it. But the log
        # error message has now changed because the txes failed from cache.
        badblock = self.build_block(
            tip, submittxes_2, nTime=SIGCHECKS_ACTIVATION_TIME + 7)
        check_for_ban_on_rejected_block(
            node, badblock, reject_reason=BLOCK_SIGCHECKS_CACHED_ERROR)

        self.log.info("Try sending 8000-sigcheck block after activation (limit: {})".format(
            MAXBLOCKSIZE // BLOCK_MAXBYTES_MAXSIGCHECKS_RATIO))
        # redundant, but just to mirror the following test...
        node.setexcessiveblock(MAXBLOCKSIZE)
        badblock = self.build_block(
            tip, submittxes_2[:40], nTime=SIGCHECKS_ACTIVATION_TIME + 5)
        check_for_ban_on_rejected_block(
            node, badblock, reject_reason=BLOCK_SIGCHECKS_CACHED_ERROR)

        self.log.info("Bump the excessiveblocksize limit by 1 byte, and send another block with same txes (new sigchecks limit: {})".format(
            (MAXBLOCKSIZE + 1) // BLOCK_MAXBYTES_MAXSIGCHECKS_RATIO))
        node.setexcessiveblock(MAXBLOCKSIZE + 1)
        tip = self.build_block(
            tip, submittxes_2[:40], nTime=SIGCHECKS_ACTIVATION_TIME + 6)
        # It should succeed now since limit should be 8000.
        node.p2p.send_blocks_and_test([tip], node)


if __name__ == '__main__':
    BlockSigChecksActivationTest().main()
