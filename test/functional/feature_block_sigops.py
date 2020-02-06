#!/usr/bin/env python3
# Copyright (c) 2015-2017 The Bitcoin Core developers
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test block processing of sigops.

Split out from feature_block.py . This tests a variety of funky corner cases of
sigops handling.
"""
import time

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    create_tx_with_script,
    get_legacy_sigopcount_block,
    make_conform_to_ctor,
)
from test_framework.cdefs import LEGACY_MAX_BLOCK_SIZE, MAX_BLOCK_SIGOPS_PER_MB
from test_framework.key import CECKey
from test_framework.messages import (
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
)
from test_framework.mininode import P2PDataStore
from test_framework.script import (
    CScript,
    hash160,
    MAX_SCRIPT_ELEMENT_SIZE,
    OP_2DUP,
    OP_CHECKMULTISIG,
    OP_CHECKMULTISIGVERIFY,
    OP_CHECKSIG,
    OP_CHECKSIGVERIFY,
    OP_EQUAL,
    OP_HASH160,
    OP_TRUE,
    SIGHASH_ALL,
    SIGHASH_FORKID,
    SignatureHashForkId,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal

# Set test to run with sigops deactivation far in the future.
SIGOPS_DEACTIVATION_TIME = 2000000000


class FullBlockSigOpsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.extra_args = [['-noparkdeepreorg', '-maxreorgdepth=-1',
                            '-phononactivationtime={}'.format(SIGOPS_DEACTIVATION_TIME)]]

    def run_test(self):
        self.bootstrap_p2p()  # Add one p2p connection to the node

        self.block_heights = {}
        self.coinbase_key = CECKey()
        self.coinbase_key.set_secretbytes(b"horsebattery")
        self.coinbase_pubkey = self.coinbase_key.get_pubkey()
        self.tip = None
        self.blocks = {}
        self.genesis_hash = int(self.nodes[0].getbestblockhash(), 16)
        self.block_heights[self.genesis_hash] = 0
        self.spendable_outputs = []

        # Create a new block
        b0 = self.next_block(0)
        self.save_spendable_output()
        self.sync_blocks([b0])

        # Allow the block to mature
        blocks = []
        for i in range(129):
            blocks.append(self.next_block(5000 + i))
            self.save_spendable_output()
        self.sync_blocks(blocks)

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(33):
            out.append(self.get_spendable_output())

        # Start by building a block on top.
        #     setup -> b13 (0)
        b13 = self.next_block(13, spend=out[0])
        self.save_spendable_output()
        self.sync_blocks([b13])

        # Add a block with MAX_BLOCK_SIGOPS_PER_MB and one with one more sigop
        #     setup -> b13 (0) -> b15 (5) -> b16 (6)
        self.log.info("Accept a block with lots of checksigs")
        lots_of_checksigs = CScript(
            [OP_CHECKSIG] * (MAX_BLOCK_SIGOPS_PER_MB - 1))
        self.move_tip(13)
        b15 = self.next_block(15, spend=out[5], script=lots_of_checksigs)
        self.save_spendable_output()
        self.sync_blocks([b15], True)

        self.log.info("Reject a block with too many checksigs")
        too_many_checksigs = CScript([OP_CHECKSIG] * (MAX_BLOCK_SIGOPS_PER_MB))
        b16 = self.next_block(16, spend=out[6], script=too_many_checksigs)
        self.sync_blocks([b16], success=False,
                         reject_reason='bad-blk-sigops', reconnect=True)

        self.move_tip(15)

        # ... skipped feature_block tests ...

        # b31 - b35 - check sigops of OP_CHECKMULTISIG / OP_CHECKMULTISIGVERIFY / OP_CHECKSIGVERIFY
        #
        #      setup -> ... b15 (5)   ->  b31 (8) -> b33 (9) -> b35 (10)
        #                                                                \-> b36 (11)
        #                                                    \-> b34 (10)
        #                                         \-> b32 (9)
        #

        # MULTISIG: each op code counts as 20 sigops.  To create the edge case,
        # pack another 19 sigops at the end.
        self.log.info(
            "Accept a block with the max number of OP_CHECKMULTISIG sigops")
        lots_of_multisigs = CScript(
            [OP_CHECKMULTISIG] * ((MAX_BLOCK_SIGOPS_PER_MB - 1) // 20) + [OP_CHECKSIG] * 19)
        b31 = self.next_block(31, spend=out[8], script=lots_of_multisigs)
        assert_equal(get_legacy_sigopcount_block(b31), MAX_BLOCK_SIGOPS_PER_MB)
        self.sync_blocks([b31], True)
        self.save_spendable_output()

        # this goes over the limit because the coinbase has one sigop
        self.log.info("Reject a block with too many OP_CHECKMULTISIG sigops")
        too_many_multisigs = CScript(
            [OP_CHECKMULTISIG] * (MAX_BLOCK_SIGOPS_PER_MB // 20))
        b32 = self.next_block(32, spend=out[9], script=too_many_multisigs)
        assert_equal(get_legacy_sigopcount_block(
            b32), MAX_BLOCK_SIGOPS_PER_MB + 1)
        self.sync_blocks([b32], success=False,
                         reject_reason='bad-blk-sigops', reconnect=True)

        # CHECKMULTISIGVERIFY
        self.log.info(
            "Accept a block with the max number of OP_CHECKMULTISIGVERIFY sigops")
        self.move_tip(31)
        lots_of_multisigs = CScript(
            [OP_CHECKMULTISIGVERIFY] * ((MAX_BLOCK_SIGOPS_PER_MB - 1) // 20) + [OP_CHECKSIG] * 19)
        b33 = self.next_block(33, spend=out[9], script=lots_of_multisigs)
        self.sync_blocks([b33], True)
        self.save_spendable_output()

        self.log.info(
            "Reject a block with too many OP_CHECKMULTISIGVERIFY sigops")
        too_many_multisigs = CScript(
            [OP_CHECKMULTISIGVERIFY] * (MAX_BLOCK_SIGOPS_PER_MB // 20))
        b34 = self.next_block(34, spend=out[10], script=too_many_multisigs)
        self.sync_blocks([b34], success=False,
                         reject_reason='bad-blk-sigops', reconnect=True)

        # CHECKSIGVERIFY
        self.log.info(
            "Accept a block with the max number of OP_CHECKSIGVERIFY sigops")
        self.move_tip(33)
        lots_of_checksigs = CScript(
            [OP_CHECKSIGVERIFY] * (MAX_BLOCK_SIGOPS_PER_MB - 1))
        b35 = self.next_block(35, spend=out[10], script=lots_of_checksigs)
        self.sync_blocks([b35], True)
        self.save_spendable_output()

        self.log.info("Reject a block with too many OP_CHECKSIGVERIFY sigops")
        too_many_checksigs = CScript(
            [OP_CHECKSIGVERIFY] * (MAX_BLOCK_SIGOPS_PER_MB))
        b36 = self.next_block(36, spend=out[11], script=too_many_checksigs)
        self.sync_blocks([b36], success=False,
                         reject_reason='bad-blk-sigops', reconnect=True)

        # ... skipped feature_block tests ...

        # Check P2SH SigOp counting
        #
        #
        #                                       ... -> b31 (8) -> b33 (9) -> b35 (10) -> b39 (11) -> b41 (12)
        #                                                                                        \-> b40 (12)
        #
        # b39 - create some P2SH outputs that will require 6 sigops to spend:
        #
        #           redeem_script = COINBASE_PUBKEY, (OP_2DUP+OP_CHECKSIGVERIFY) * 5, OP_CHECKSIG
        #           p2sh_script = OP_HASH160, ripemd160(sha256(script)), OP_EQUAL
        #
        self.log.info("Check P2SH SIGOPS are correctly counted")
        self.move_tip(35)
        b39 = self.next_block(39)
        b39_outputs = 0
        b39_sigops_per_output = 6

        # Build the redeem script, hash it, use hash to create the p2sh script
        redeem_script = CScript([self.coinbase_pubkey] + [
                                OP_2DUP, OP_CHECKSIGVERIFY] * 5 + [OP_CHECKSIG])
        redeem_script_hash = hash160(redeem_script)
        p2sh_script = CScript([OP_HASH160, redeem_script_hash, OP_EQUAL])

        # Create a transaction that spends one satoshi to the p2sh_script, the rest to OP_TRUE
        # This must be signed because it is spending a coinbase
        spend = out[11]
        tx = self.create_tx(spend, 0, 1, p2sh_script)
        tx.vout.append(CTxOut(spend.vout[0].nValue - 1, CScript([OP_TRUE])))
        self.sign_tx(tx, spend)
        tx.rehash()
        b39 = self.update_block(39, [tx])
        b39_outputs += 1

        # Until block is full, add tx's with 1 satoshi to p2sh_script, the rest
        # to OP_TRUE
        tx_new = None
        tx_last = tx
        tx_last_n = len(tx.vout) - 1
        total_size = len(b39.serialize())
        while(total_size < LEGACY_MAX_BLOCK_SIZE):
            tx_new = self.create_tx(tx_last, tx_last_n, 1, p2sh_script)
            tx_new.vout.append(
                CTxOut(tx_last.vout[tx_last_n].nValue - 1, CScript([OP_TRUE])))
            tx_new.rehash()
            total_size += len(tx_new.serialize())
            if total_size >= LEGACY_MAX_BLOCK_SIZE:
                break
            b39.vtx.append(tx_new)  # add tx to block
            tx_last = tx_new
            tx_last_n = len(tx_new.vout) - 1
            b39_outputs += 1

        b39 = self.update_block(39, [])
        self.sync_blocks([b39], True)
        self.save_spendable_output()

        # Test sigops in P2SH redeem scripts
        #
        # b40 creates 3333 tx's spending the 6-sigop P2SH outputs from b39 for a total of 19998 sigops.
        # The first tx has one sigop and then at the end we add 2 more to put us just over the max.
        #
        # b41 does the same, less one, so it has the maximum sigops permitted.
        #
        self.log.info("Reject a block with too many P2SH sigops")
        self.move_tip(39)
        b40 = self.next_block(40, spend=out[12])
        sigops = get_legacy_sigopcount_block(b40)
        numTxs = (MAX_BLOCK_SIGOPS_PER_MB - sigops) // b39_sigops_per_output
        assert_equal(numTxs <= b39_outputs, True)

        lastOutpoint = COutPoint(b40.vtx[1].sha256, 0)
        lastAmount = b40.vtx[1].vout[0].nValue
        new_txs = []
        for i in range(1, numTxs + 1):
            tx = CTransaction()
            tx.vout.append(CTxOut(1, CScript([OP_TRUE])))
            tx.vin.append(CTxIn(lastOutpoint, b''))
            # second input is corresponding P2SH output from b39
            tx.vin.append(CTxIn(COutPoint(b39.vtx[i].sha256, 0), b''))
            # Note: must pass the redeem_script (not p2sh_script) to the
            # signature hash function
            sighash = SignatureHashForkId(
                redeem_script, tx, 1, SIGHASH_ALL | SIGHASH_FORKID,
                lastAmount)
            sig = self.coinbase_key.sign(
                sighash) + bytes(bytearray([SIGHASH_ALL | SIGHASH_FORKID]))
            scriptSig = CScript([sig, redeem_script])

            tx.vin[1].scriptSig = scriptSig
            pad_tx(tx)
            tx.rehash()
            new_txs.append(tx)
            lastOutpoint = COutPoint(tx.sha256, 0)
            lastAmount = tx.vout[0].nValue

        b40_sigops_to_fill = MAX_BLOCK_SIGOPS_PER_MB - \
            (numTxs * b39_sigops_per_output + sigops) + 1
        tx = CTransaction()
        tx.vin.append(CTxIn(lastOutpoint, b''))
        tx.vout.append(CTxOut(1, CScript([OP_CHECKSIG] * b40_sigops_to_fill)))
        pad_tx(tx)
        tx.rehash()
        new_txs.append(tx)
        self.update_block(40, new_txs)
        self.sync_blocks([b40], success=False,
                         reject_reason='bad-blk-sigops', reconnect=True)

        # same as b40, but one less sigop
        self.log.info("Accept a block with the max number of P2SH sigops")
        self.move_tip(39)
        b41 = self.next_block(41, spend=None)
        self.update_block(41, [b40tx for b40tx in b40.vtx[1:] if b40tx != tx])
        b41_sigops_to_fill = b40_sigops_to_fill - 1
        tx = CTransaction()
        tx.vin.append(CTxIn(lastOutpoint, b''))
        tx.vout.append(CTxOut(1, CScript([OP_CHECKSIG] * b41_sigops_to_fill)))
        pad_tx(tx)
        self.update_block(41, [tx])
        self.sync_blocks([b41], True)

        # ... skipped feature_block tests ...

        b72 = self.next_block(72)
        self.save_spendable_output()
        self.sync_blocks([b72])

        # Test some invalid scripts and MAX_BLOCK_SIGOPS_PER_MB
        #
        #                                                                   ..... -> b72
        #                                                                                    \-> b** (22)
        #

        # b73 - tx with excessive sigops that are placed after an excessively large script element.
        #       The purpose of the test is to make sure those sigops are counted.
        #
        #       script is a bytearray of size 20,526
        #
        #       bytearray[0-19,998]     : OP_CHECKSIG
        #       bytearray[19,999]       : OP_PUSHDATA4
        #       bytearray[20,000-20,003]: 521  (max_script_element_size+1, in little-endian format)
        #       bytearray[20,004-20,525]: unread data (script_element)
        # bytearray[20,526]       : OP_CHECKSIG (this puts us over the limit)
        self.log.info(
            "Reject a block containing too many sigops after a large script element")
        self.move_tip(72)
        b73 = self.next_block(73)
        size = MAX_BLOCK_SIGOPS_PER_MB - 1 + MAX_SCRIPT_ELEMENT_SIZE + 1 + 5 + 1
        a = bytearray([OP_CHECKSIG] * size)
        a[MAX_BLOCK_SIGOPS_PER_MB - 1] = int("4e", 16)  # OP_PUSHDATA4

        element_size = MAX_SCRIPT_ELEMENT_SIZE + 1
        a[MAX_BLOCK_SIGOPS_PER_MB] = element_size % 256
        a[MAX_BLOCK_SIGOPS_PER_MB + 1] = element_size // 256
        a[MAX_BLOCK_SIGOPS_PER_MB + 2] = 0
        a[MAX_BLOCK_SIGOPS_PER_MB + 3] = 0

        tx = self.create_and_sign_transaction(out[22], 1, CScript(a))
        b73 = self.update_block(73, [tx])
        assert_equal(get_legacy_sigopcount_block(
            b73), MAX_BLOCK_SIGOPS_PER_MB + 1)
        self.sync_blocks([b73], success=False,
                         reject_reason='bad-blk-sigops', reconnect=True)

        # b74/75 - if we push an invalid script element, all prevous sigops are counted,
        #          but sigops after the element are not counted.
        #
        #       The invalid script element is that the push_data indicates that
        #       there will be a large amount of data (0xffffff bytes), but we only
        #       provide a much smaller number.  These bytes are CHECKSIGS so they would
        #       cause b75 to fail for excessive sigops, if those bytes were counted.
        #
        #       b74 fails because we put MAX_BLOCK_SIGOPS_PER_MB+1 before the element
        # b75 succeeds because we put MAX_BLOCK_SIGOPS_PER_MB before the
        # element
        self.log.info(
            "Check sigops are counted correctly after an invalid script element")
        self.move_tip(72)
        b74 = self.next_block(74)
        size = MAX_BLOCK_SIGOPS_PER_MB - 1 + \
            MAX_SCRIPT_ELEMENT_SIZE + 42  # total = 20,561
        a = bytearray([OP_CHECKSIG] * size)
        a[MAX_BLOCK_SIGOPS_PER_MB] = 0x4e
        a[MAX_BLOCK_SIGOPS_PER_MB + 1] = 0xfe
        a[MAX_BLOCK_SIGOPS_PER_MB + 2] = 0xff
        a[MAX_BLOCK_SIGOPS_PER_MB + 3] = 0xff
        a[MAX_BLOCK_SIGOPS_PER_MB + 4] = 0xff
        tx = self.create_and_sign_transaction(out[22], 1, CScript(a))
        b74 = self.update_block(74, [tx])
        self.sync_blocks([b74], success=False,
                         reject_reason='bad-blk-sigops', reconnect=True)

        self.move_tip(72)
        b75 = self.next_block(75)
        size = MAX_BLOCK_SIGOPS_PER_MB - 1 + MAX_SCRIPT_ELEMENT_SIZE + 42
        a = bytearray([OP_CHECKSIG] * size)
        a[MAX_BLOCK_SIGOPS_PER_MB - 1] = 0x4e
        a[MAX_BLOCK_SIGOPS_PER_MB] = 0xff
        a[MAX_BLOCK_SIGOPS_PER_MB + 1] = 0xff
        a[MAX_BLOCK_SIGOPS_PER_MB + 2] = 0xff
        a[MAX_BLOCK_SIGOPS_PER_MB + 3] = 0xff
        tx = self.create_and_sign_transaction(out[22], 1, CScript(a))
        b75 = self.update_block(75, [tx])
        self.sync_blocks([b75], True)
        self.save_spendable_output()

        # Check that if we push an element filled with CHECKSIGs, they are not
        # counted
        self.move_tip(75)
        b76 = self.next_block(76)
        size = MAX_BLOCK_SIGOPS_PER_MB - 1 + MAX_SCRIPT_ELEMENT_SIZE + 1 + 5
        a = bytearray([OP_CHECKSIG] * size)
        # PUSHDATA4, but leave the following bytes as just checksigs
        a[MAX_BLOCK_SIGOPS_PER_MB - 1] = 0x4e
        tx = self.create_and_sign_transaction(out[23], 1, CScript(a))
        b76 = self.update_block(76, [tx])
        self.sync_blocks([b76], True)
        self.save_spendable_output()

    # Helper methods
    ################

    def add_transactions_to_block(self, block, tx_list):
        [tx.rehash() for tx in tx_list]
        block.vtx.extend(tx_list)

    # this is a little handier to use than the version in blocktools.py
    def create_tx(self, spend_tx, n, value, script=CScript([OP_TRUE])):
        return create_tx_with_script(
            spend_tx, n, amount=value, script_pub_key=script)

    # sign a transaction, using the key we know about
    # this signs input 0 in tx, which is assumed to be spending output n in
    # spend_tx
    def sign_tx(self, tx, spend_tx):
        scriptPubKey = bytearray(spend_tx.vout[0].scriptPubKey)
        if (scriptPubKey[0] == OP_TRUE):  # an anyone-can-spend
            tx.vin[0].scriptSig = CScript()
            return
        sighash = SignatureHashForkId(
            spend_tx.vout[0].scriptPubKey, tx, 0, SIGHASH_ALL | SIGHASH_FORKID, spend_tx.vout[0].nValue)
        tx.vin[0].scriptSig = CScript(
            [self.coinbase_key.sign(sighash) + bytes(bytearray([SIGHASH_ALL | SIGHASH_FORKID]))])

    def create_and_sign_transaction(
            self, spend_tx, value, script=CScript([OP_TRUE])):
        tx = self.create_tx(spend_tx, 0, value, script)
        self.sign_tx(tx, spend_tx)
        tx.rehash()
        return tx

    def next_block(self, number, spend=None, additional_coinbase_value=0,
                   script=CScript([OP_TRUE]), solve=True):
        if self.tip is None:
            base_block_hash = self.genesis_hash
            block_time = int(time.time()) + 1
        else:
            base_block_hash = self.tip.sha256
            block_time = self.tip.nTime + 1
        # First create the coinbase
        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height, self.coinbase_pubkey)
        coinbase.vout[0].nValue += additional_coinbase_value
        coinbase.rehash()
        if spend is None:
            block = create_block(base_block_hash, coinbase, block_time)
        else:
            # all but one satoshi to fees
            coinbase.vout[0].nValue += spend.vout[0].nValue - 1
            coinbase.rehash()
            block = create_block(base_block_hash, coinbase, block_time)
            # spend 1 satoshi
            tx = self.create_tx(spend, 0, 1, script)
            self.sign_tx(tx, spend)
            self.add_transactions_to_block(block, [tx])
            block.hashMerkleRoot = block.calc_merkle_root()
        if solve:
            block.solve()
        self.tip = block
        self.block_heights[block.sha256] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block

    # save the current tip so it can be spent by a later block
    def save_spendable_output(self):
        self.log.debug("saving spendable output {}".format(self.tip.vtx[0]))
        self.spendable_outputs.append(self.tip)

    # get an output that we previously marked as spendable
    def get_spendable_output(self):
        self.log.debug("getting spendable output {}".format(
            self.spendable_outputs[0].vtx[0]))
        return self.spendable_outputs.pop(0).vtx[0]

    # move the tip back to a previous block
    def move_tip(self, number):
        self.tip = self.blocks[number]

    # adds transactions to the block and updates state
    def update_block(self, block_number, new_transactions, reorder=True):
        block = self.blocks[block_number]
        self.add_transactions_to_block(block, new_transactions)
        old_sha256 = block.sha256
        if reorder:
            make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        # Update the internal state just like in next_block
        self.tip = block
        if block.sha256 != old_sha256:
            self.block_heights[block.sha256] = self.block_heights[old_sha256]
            del self.block_heights[old_sha256]
        self.blocks[block_number] = block
        return block

    def bootstrap_p2p(self):
        """Add a P2P connection to the node.

        Helper to connect and wait for version handshake."""
        self.nodes[0].add_p2p_connection(P2PDataStore())
        # We need to wait for the initial getheaders from the peer before we
        # start populating our blockstore. If we don't, then we may run ahead
        # to the next subtest before we receive the getheaders. We'd then send
        # an INV for the next block and receive two getheaders - one for the
        # IBD and one for the INV. We'd respond to both and could get
        # unexpectedly disconnected if the DoS score for that error is 50.
        self.nodes[0].p2p.wait_for_getheaders(timeout=5)

    def reconnect_p2p(self):
        """Tear down and bootstrap the P2P connection to the node.

        The node gets disconnected several times in this test. This helper
        method reconnects the p2p and restarts the network thread."""
        self.nodes[0].disconnect_p2ps()
        self.bootstrap_p2p()

    def sync_blocks(self, blocks, success=True, reject_reason=None,
                    request_block=True, reconnect=False, timeout=60):
        """Sends blocks to test node. Syncs and verifies that tip has advanced to most recent block.

        Call with success = False if the tip shouldn't advance to the most recent block."""
        self.nodes[0].p2p.send_blocks_and_test(blocks, self.nodes[0], success=success,
                                               reject_reason=reject_reason, request_block=request_block, timeout=timeout, expect_disconnect=reconnect)

        if reconnect:
            self.reconnect_p2p()


if __name__ == '__main__':
    FullBlockSigOpsTest().main()
