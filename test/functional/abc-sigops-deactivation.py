#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin Developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test deactivation of sigops counting

based on abc-schnorrmultisig-activation.py (D3736).
"""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.cdefs import (
    ONE_MEGABYTE,
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
from test_framework.mininode import (
    P2PDataStore,
)
from test_framework.script import (
    CScript,
    hash160,
    OP_CHECKMULTISIG,
    OP_CHECKDATASIG,
    OP_ENDIF,
    OP_EQUAL,
    OP_FALSE,
    OP_HASH160,
    OP_IF,
    OP_RETURN,
    OP_TRUE,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import (
    assert_equal,
    assert_raises_rpc_error,
    sync_blocks,
)
from decimal import Decimal
from collections import deque

SATOSHI = Decimal('0.00000001')

# Set test to run with sigops deactivation far in the future.
SIGOPS_DEACTIVATION_TIME = 2000000000

# If we don't do this, autoreplay protection will activate before graviton and
# all our sigs will mysteriously fail.
REPLAY_PROTECTION_START_TIME = SIGOPS_DEACTIVATION_TIME * 2

# Transactions for mempool with too many sigops give this error:
MEMPOOL_TXSIGOPS_ERROR = 'bad-txns-too-many-sigops'
MEMPOOL_P2SH_SIGOPS_ERROR = 'bad-txns-nonstandard-inputs'
# Blocks that have single txes with too many sigops give this error:
BLOCK_TXSIGOPS_ERROR = 'bad-txn-sigops'
# Blocks with too many sigops give this error:
BLOCK_TOTALSIGOPS_ERROR = 'bad-blk-sigops'


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


class SigopsDeactivationTest(BitcoinTestFramework):

    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.block_heights = {}
        timeargs = ["-phononactivationtime={}".format(
            SIGOPS_DEACTIVATION_TIME),
            "-replayprotectionactivationtime={}".format(
            REPLAY_PROTECTION_START_TIME)]
        # many standardness rules are actually enforced on regtest, except for
        # P2SH sigops.
        self.extra_args = [timeargs, timeargs + ['-acceptnonstdtxn=0']]

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
        (node, std_node) = self.nodes
        node.add_p2p_connection(P2PDataStore())
        std_node.add_p2p_connection(P2PDataStore())
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

        self.log.info("Generating some high-sigop transactions.")

        # Tx with 4001 sigops (valid but non standard)
        tx_4001 = create_transaction(self.spendable_outputs.popleft(), [
                                     OP_CHECKMULTISIG] * 200 + [OP_CHECKDATASIG])

        # Tx with 20001 sigops (consensus-invalid)
        tx_20001 = create_transaction(self.spendable_outputs.popleft(), [
                                      OP_CHECKMULTISIG] * 1000 + [OP_CHECKDATASIG])

        # P2SH tx with too many sigops (valid but nonstandard for std_node)
        redeem_script = bytes(
            [OP_IF, OP_CHECKMULTISIG, OP_ENDIF, OP_TRUE])
        p2sh_script = CScript([OP_HASH160, hash160(redeem_script), OP_EQUAL])
        tx_fundp2sh = create_transaction(
            self.spendable_outputs.popleft(), p2sh_script)
        tx_spendp2sh = CTransaction()
        tx_spendp2sh.vin.append(
            CTxIn(COutPoint(tx_fundp2sh.sha256, 1), CScript([OP_FALSE, redeem_script])))
        tx_spendp2sh.vout.append(
            CTxOut(0, CScript([OP_RETURN, b'pad' * 20])))
        tx_spendp2sh.rehash()

        # Chain of 10 txes with 2000 sigops each.
        txes_10x2000_sigops = []
        tx = self.spendable_outputs.popleft()
        for _ in range(10):
            tx = create_transaction(tx, [OP_CHECKMULTISIG] * 100)
            txes_10x2000_sigops.append(tx)

        def make_hightotalsigop_block():
            # 20001 total sigops
            return self.build_block(
                tip, txes_10x2000_sigops, cbextrascript=bytes([OP_CHECKDATASIG]))

        def make_highsigop_coinbase_block():
            # 60000 sigops in the coinbase
            return self.build_block(
                tip, cbextrascript=bytes([OP_CHECKMULTISIG] * 3000))

        self.log.info(
            "Try various high-sigop transactions in blocks / mempool before upgrade")

        # mempool refuses over 4001.
        check_for_no_ban_on_rejected_tx(node, tx_4001, MEMPOOL_TXSIGOPS_ERROR)
        # it used to be that exceeding 20000 would cause a ban, but it's
        # important that this causes no ban: we want that upgraded nodes
        # can't get themselves banned by relaying huge-sigops transactions.
        check_for_no_ban_on_rejected_tx(node, tx_20001, MEMPOOL_TXSIGOPS_ERROR)

        # the 20001 tx can't be mined
        check_for_ban_on_rejected_block(node, self.build_block(
            tip, [tx_20001]), BLOCK_TXSIGOPS_ERROR)

        self.log.info(
            "The P2SH script has too many sigops (20 > 15) for a standard node.")
        # Mine the P2SH funding first because it's nonstandard.
        tip = self.build_block(tip, [tx_fundp2sh])
        std_node.p2p.send_blocks_and_test([tip], node)
        assert_raises_rpc_error(-26, MEMPOOL_P2SH_SIGOPS_ERROR,
                                std_node.sendrawtransaction, ToHex(tx_spendp2sh))

        self.log.info(
            "A bunch of 2000-sigops txes can be put in mempool but not mined all at once.")
        # Send the 2000-sigop transactions, which are acceptable.
        for tx in txes_10x2000_sigops:
            node.sendrawtransaction(ToHex(tx))

        # They can't be mined all at once if the coinbase has a single sigop
        # (total 20001)
        check_for_ban_on_rejected_block(
            node, make_hightotalsigop_block(), BLOCK_TOTALSIGOPS_ERROR)

        # Activation tests

        self.log.info("Approach to just before upgrade activation")
        # Move our clock to the uprade time so we will accept such
        # future-timestamped blocks.
        node.setmocktime(SIGOPS_DEACTIVATION_TIME)
        std_node.setmocktime(SIGOPS_DEACTIVATION_TIME)
        # Mine six blocks with timestamp starting at SIGOPS_DEACTIVATION_TIME-1
        blocks = []
        for i in range(-1, 5):
            tip = self.build_block(tip, nTime=SIGOPS_DEACTIVATION_TIME + i)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node)
        assert_equal(node.getblockchaininfo()[
                     'mediantime'], SIGOPS_DEACTIVATION_TIME - 1)

        self.log.info(
            "The next block will activate, but the activation block itself must follow old rules")

        check_for_ban_on_rejected_block(node, self.build_block(
            tip, [tx_20001]), BLOCK_TXSIGOPS_ERROR)
        check_for_ban_on_rejected_block(
            node, make_hightotalsigop_block(), BLOCK_TOTALSIGOPS_ERROR)
        check_for_ban_on_rejected_block(
            node, make_highsigop_coinbase_block(), BLOCK_TXSIGOPS_ERROR)

        self.log.info("Mine the activation block itself")
        tip = self.build_block(tip)
        node.p2p.send_blocks_and_test([tip], node)
        sync_blocks(self.nodes)

        self.log.info("We have activated!")
        assert_equal(node.getblockchaininfo()[
                     'mediantime'], SIGOPS_DEACTIVATION_TIME)
        assert_equal(std_node.getblockchaininfo()[
                     'mediantime'], SIGOPS_DEACTIVATION_TIME)

        # save this tip for later
        upgrade_block = tip

        self.log.info(
            "The mempool is now a free-for-all, and we can get all the high-sigops transactions in")
        std_node.sendrawtransaction(ToHex(tx_spendp2sh))
        node.sendrawtransaction(ToHex(tx_spendp2sh))
        node.sendrawtransaction(ToHex(tx_4001))
        node.sendrawtransaction(ToHex(tx_20001))
        # resend the 2000-sigop transactions, which will have expired due to
        # setmocktime.
        for tx in txes_10x2000_sigops:
            node.sendrawtransaction(ToHex(tx))

        alltxes = set(tx.hash for tx in [
                      tx_spendp2sh, tx_4001, tx_20001] + txes_10x2000_sigops)
        assert_equal(set(node.getrawmempool()), alltxes)

        self.log.info(
            "The miner will include all the high-sigops transactions at once, without issue.")
        node.generatetoaddress(1, node.get_deterministic_priv_key().address)
        tip = self.getbestblock(node)
        assert_equal(set(tx.rehash() for tx in tip.vtx[1:]), alltxes)
        # even though it is far smaller than one megabyte, we got in something
        # like 44000 sigops
        assert len(tip.serialize()) < ONE_MEGABYTE

        # save this tip for later
        postupgrade_block = tip

        # Deactivation tests

        self.log.info(
            "Invalidating the post-upgrade block returns the transactions to mempool")
        node.invalidateblock(postupgrade_block.hash)
        assert_equal(set(node.getrawmempool()), alltxes)

        self.log.info("Test some weird alternative blocks")
        tip = upgrade_block
        self.log.info("A 40000-sigop coinbase is acceptable now")
        tip = make_highsigop_coinbase_block()
        node.p2p.send_blocks_and_test([tip], node)
        self.log.info("We can get in our 20001 sigop total block")
        tip = make_hightotalsigop_block()
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info(
            "Invalidating the upgrade block evicts the bad txes")
        goodtxes = alltxes - {tx_4001.hash, tx_20001.hash}
        # loose-rules node just evicts the too-many-sigops transactions
        node.invalidateblock(upgrade_block.hash)
        assert_equal(set(node.getrawmempool()), goodtxes)
        # std_node evicts everything as either nonstandard scriptpubkey or p2sh
        # too-many-sigops.
        std_node.invalidateblock(upgrade_block.hash)
        assert_equal(std_node.getrawmempool(), [])


if __name__ == '__main__':
    SigopsDeactivationTest().main()
