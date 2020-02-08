#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin Developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test activation of per-input sigchecks limit standardness rule
"""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.messages import (
    CBlock,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    FromHex,
    ToHex,
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
from test_framework.util import assert_equal, assert_raises_rpc_error
from collections import deque

# Set test to run with sigchecks activation far in the future.
SIGCHECKS_ACTIVATION_TIME = 2000000000

# If we don't do this, autoreplay protection will activate before graviton and
# all our sigs will mysteriously fail.
REPLAY_PROTECTION_START_TIME = SIGCHECKS_ACTIVATION_TIME * 2

TX_INPUT_SIGCHECKS_ERROR = "non-mandatory-script-verify-flag (Input SigChecks limit exceeded) (code 64)"


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
    ctx.vout.append(
        CTxOut(0, bytes([OP_TRUE])))
    ctx.vout.append(customout)
    pad_tx(ctx)

    fee = len(ctx.serialize())
    ctx.vout[0].nValue = spendfrom.vout[0].nValue - customout.nValue - fee
    ctx.rehash()

    return ctx


def check_for_no_ban_on_rejected_tx(node, tx, reject_reason=None):
    """Check we are not disconnected when sending a txn that the node rejects."""
    node.p2p.send_txs_and_test(
        [tx], node, success=False, reject_reason=reject_reason)


class InputSigChecksActivationTest(BitcoinTestFramework):

    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.block_heights = {}
        self.extra_args = [["-phononactivationtime={}".format(
            SIGCHECKS_ACTIVATION_TIME),
            "-replayprotectionactivationtime={}".format(
            REPLAY_PROTECTION_START_TIME), ]]

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
        (node,) = self.nodes
        node.add_p2p_connection(P2PDataStore())
        # Get out of IBD
        node.generatetoaddress(1, node.get_deterministic_priv_key().address)

        tip = self.getbestblock(node)

        self.log.info("Create some blocks with OP_1 coinbase for spending.")
        blocks = []
        for _ in range(20):
            tip = self.build_block(tip)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node)
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

        fundings = []

        def make_spend(scriptpubkey, scriptsig):
            # Add a funding tx to fundings, and return a tx spending that using
            # scriptsig.
            self.log.debug(
                "Gen tx with locking script {} unlocking script {} .".format(
                    scriptpubkey.hex(), scriptsig.hex()))

            # get funds locked with OP_1
            sourcetx = self.spendable_outputs.popleft()
            # make funding that forwards to scriptpubkey
            fundtx = create_transaction(sourcetx, scriptpubkey)
            fundings.append(fundtx)

            # make the spending
            tx = CTransaction()
            tx.vin.append(CTxIn(COutPoint(fundtx.sha256, 1), scriptsig))
            tx.vout.append(CTxOut(0, CScript([OP_RETURN])))
            pad_tx(tx)
            tx.rehash()
            return tx

        self.log.info("Generating txes used in this test")

        # "Good" txns that pass our rule:

        goodtxes = [
            # most dense allowed input -- 2 sigchecks with a 26-byte scriptsig.
            make_spend(CScript([cds_message,
                                cds_pubkey,
                                OP_3DUP,
                                OP_CHECKDATASIGVERIFY,
                                OP_CHECKDATASIGVERIFY]),
                       CScript([b'x' * 16,
                                cds_signature])),

            # 4 sigchecks with a 112-byte scriptsig, just at the limit for this
            # sigchecks count.
            make_spend(CScript([cds_message,
                                cds_pubkey,
                                OP_3DUP,
                                OP_CHECKDATASIGVERIFY,
                                OP_3DUP,
                                OP_CHECKDATASIGVERIFY,
                                OP_3DUP,
                                OP_CHECKDATASIGVERIFY,
                                OP_CHECKDATASIGVERIFY]),
                       CScript([b'x' * 101,
                                cds_signature])),

            # "nice" transaction - 1 sigcheck with 9-byte scriptsig.
            make_spend(CScript([cds_message, cds_pubkey, OP_CHECKDATASIG]), CScript(
                [cds_signature])),

            # 1 sigcheck with 0-byte scriptsig.
            make_spend(CScript([cds_signature, cds_message,
                                cds_pubkey, OP_CHECKDATASIG]), CScript([])),
        ]

        badtxes = [
            # "Bad" txns:
            # 2 sigchecks with a 25-byte scriptsig, just 1 byte too short.
            make_spend(CScript([cds_message,
                                cds_pubkey,
                                OP_3DUP,
                                OP_CHECKDATASIGVERIFY,
                                OP_CHECKDATASIGVERIFY]),
                       CScript([b'x' * 15,
                                cds_signature])),

            # 4 sigchecks with a 111-byte scriptsig, just 1 byte too short.
            make_spend(CScript([cds_message,
                                cds_pubkey,
                                OP_3DUP,
                                OP_CHECKDATASIGVERIFY,
                                OP_3DUP,
                                OP_CHECKDATASIGVERIFY,
                                OP_3DUP,
                                OP_CHECKDATASIGVERIFY,
                                OP_CHECKDATASIGVERIFY]),
                       CScript([b'x' * 100,
                                cds_signature])),
        ]

        goodtxids = set(t.hash for t in goodtxes)
        badtxids = set(t.hash for t in badtxes)

        self.log.info("Funding the txes")
        tip = self.build_block(tip, fundings)
        node.p2p.send_blocks_and_test([tip], node)

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

        self.log.info("Send all the transactions just before upgrade")

        node.p2p.send_txs_and_test(goodtxes, node)
        node.p2p.send_txs_and_test(badtxes, node)

        assert_equal(set(node.getrawmempool()), goodtxids | badtxids)

        # ask the node to mine a block, it should include the bad txes.
        [blockhash] = node.generatetoaddress(
            1, node.get_deterministic_priv_key().address)
        assert_equal(set(node.getblock(blockhash, 1)[
                     'tx'][1:]), goodtxids | badtxids)
        assert_equal(node.getrawmempool(), [])

        # discard that block
        node.invalidateblock(blockhash)
        assert_equal(set(node.getrawmempool()), goodtxids | badtxids)

        self.log.info("Mine the activation block itself")
        tip = self.build_block(tip)
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info("We have activated!")
        assert_equal(node.getblockchaininfo()[
                     'mediantime'], SIGCHECKS_ACTIVATION_TIME)

        self.log.info(
            "The high-sigchecks transactions got evicted but the good ones are still around")
        assert_equal(set(node.getrawmempool()), goodtxids)

        self.log.info(
            "Now the high-sigchecks transactions are rejected from mempool.")
        # try sending some of the bad txes again after the upgrade
        for tx in badtxes:
            check_for_no_ban_on_rejected_tx(node, tx, TX_INPUT_SIGCHECKS_ERROR)
            assert_raises_rpc_error(-26, TX_INPUT_SIGCHECKS_ERROR,
                                    node.sendrawtransaction, ToHex(tx))

        self.log.info("But they can still be mined!")

        # now make a block with all the txes, they still are accepted in
        # blocks!
        tip = self.build_block(tip, goodtxes + badtxes)
        node.p2p.send_blocks_and_test([tip], node)

        assert_equal(node.getbestblockhash(), tip.hash)


if __name__ == '__main__':
    InputSigChecksActivationTest().main()
