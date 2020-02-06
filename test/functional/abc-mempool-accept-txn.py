#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

"""
This test checks acceptance of transactions by the mempool
It is derived from the much more complex p2p-fullblocktest.
"""

import time

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    create_tx_with_script,
)
from test_framework.cdefs import MAX_STANDARD_TX_SIGOPS
from test_framework.key import CECKey
from test_framework.messages import (
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
    OP_2DUP,
    OP_CHECKSIG,
    OP_CHECKSIGVERIFY,
    OP_DROP,
    OP_EQUAL,
    OP_HASH160,
    OP_TRUE,
    SIGHASH_ALL,
    SIGHASH_FORKID,
    SignatureHashForkId,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error

# Error for too many sigops in one TX
RPC_TXNS_TOO_MANY_SIGOPS_ERROR = "bad-txns-too-many-sigops"

# Set test to run with sigops deactivation far in the future.
SIGOPS_DEACTIVATION_TIME = 2000000000


class PreviousSpendableOutput():

    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        # The output we're spending
        self.n = n


class FullBlockTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.block_heights = {}
        self.coinbase_key = CECKey()
        self.coinbase_key.set_secretbytes(b"horsebattery")
        self.coinbase_pubkey = self.coinbase_key.get_pubkey()
        self.tip = None
        self.blocks = {}
        self.extra_args = [
            ['-phononactivationtime={}'.format(SIGOPS_DEACTIVATION_TIME)]]

    def add_options(self, parser):
        super().add_options(parser)
        parser.add_argument(
            "--runbarelyexpensive", dest="runbarelyexpensive", default=True)

    def add_transactions_to_block(self, block, tx_list):
        [tx.rehash() for tx in tx_list]
        block.vtx.extend(tx_list)
        block.vtx = [block.vtx[0]] + \
            sorted(block.vtx[1:], key=lambda tx: tx.get_id())

    # this is a little handier to use than the version in blocktools.py
    def create_tx(self, spend_tx, n, value, script=CScript([OP_TRUE])):
        tx = create_tx_with_script(spend_tx, n, b"", value, script)
        return tx

    # sign a transaction, using the key we know about
    # this signs input 0 in tx, which is assumed to be spending output n in
    # spend_tx
    def sign_tx(self, tx, spend_tx, n):
        scriptPubKey = bytearray(spend_tx.vout[n].scriptPubKey)
        if (scriptPubKey[0] == OP_TRUE):  # an anyone-can-spend
            tx.vin[0].scriptSig = CScript()
            return
        sighash = SignatureHashForkId(
            spend_tx.vout[n].scriptPubKey, tx, 0, SIGHASH_ALL | SIGHASH_FORKID, spend_tx.vout[n].nValue)
        tx.vin[0].scriptSig = CScript(
            [self.coinbase_key.sign(sighash) + bytes(bytearray([SIGHASH_ALL | SIGHASH_FORKID]))])

    def create_and_sign_transaction(
            self, spend_tx, n, value, script=CScript([OP_TRUE])):
        tx = self.create_tx(spend_tx, n, value, script)
        self.sign_tx(tx, spend_tx, n)
        tx.rehash()
        return tx

    def next_block(self, number, spend=None,
                   additional_coinbase_value=0, script=CScript([OP_TRUE])):
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
            coinbase.vout[0].nValue += spend.tx.vout[
                spend.n].nValue - 1
            coinbase.rehash()
            block = create_block(base_block_hash, coinbase, block_time)
            # spend 1 satoshi
            tx = create_tx_with_script(spend.tx, spend.n, b"", 1, script)
            self.sign_tx(tx, spend.tx, spend.n)
            self.add_transactions_to_block(block, [tx])
            block.hashMerkleRoot = block.calc_merkle_root()
        # Do PoW, which is very inexpensive on regnet
        block.solve()
        self.tip = block
        self.block_heights[block.sha256] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block

    def run_test(self):
        node = self.nodes[0]
        node.add_p2p_connection(P2PDataStore())

        self.genesis_hash = int(self.nodes[0].getbestblockhash(), 16)
        self.block_heights[self.genesis_hash] = 0
        spendable_outputs = []

        # save the current tip so it can be spent by a later block
        def save_spendable_output():
            spendable_outputs.append(self.tip)

        # get an output that we previously marked as spendable
        def get_spendable_output():
            return PreviousSpendableOutput(spendable_outputs.pop(0).vtx[0], 0)

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
                self.block_heights[
                    block.sha256] = self.block_heights[old_sha256]
                del self.block_heights[old_sha256]
            self.blocks[block_number] = block
            return block

        # shorthand for functions
        block = self.next_block

        # Create a new block
        block(0)
        save_spendable_output()
        node.p2p.send_blocks_and_test([self.tip], node)

        # Now we need that block to mature so we can spend the coinbase.
        maturity_blocks = []
        for i in range(99):
            block(5000 + i)
            maturity_blocks.append(self.tip)
            save_spendable_output()
        node.p2p.send_blocks_and_test(maturity_blocks, node)

        # Collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(33):
            out.append(get_spendable_output())

        # P2SH
        # Build the redeem script, hash it, use hash to create the p2sh script
        # Pad with extra bytes to make sure that the scriptsig length will be
        # >= 198 after signature is added, even if it's a schnorr sig; this
        # ensures a not-too-high density of sigchecks.
        redeem_script = CScript([b'X' * 51, OP_DROP, self.coinbase_pubkey] + [
                                OP_2DUP, OP_CHECKSIGVERIFY] * 5 + [OP_CHECKSIG])
        # should be this length since coinbase_pubkey is uncompressed.
        assert_equal(len(redeem_script), 130)
        redeem_script_hash = hash160(redeem_script)
        p2sh_script = CScript([OP_HASH160, redeem_script_hash, OP_EQUAL])

        # Creates a new transaction using a p2sh transaction as input
        def spend_p2sh_tx(p2sh_tx_to_spend, output_script=CScript([OP_TRUE])):
            # Create the transaction
            spent_p2sh_tx = CTransaction()
            spent_p2sh_tx.vin.append(
                CTxIn(COutPoint(p2sh_tx_to_spend.sha256, 0), b''))
            spent_p2sh_tx.vout.append(CTxOut(1000, output_script))
            # Sign the transaction using the redeem script
            sighash = SignatureHashForkId(
                redeem_script, spent_p2sh_tx, 0, SIGHASH_ALL | SIGHASH_FORKID, p2sh_tx_to_spend.vout[0].nValue)
            sig = self.coinbase_key.sign(
                sighash) + bytes(bytearray([SIGHASH_ALL | SIGHASH_FORKID]))
            spent_p2sh_tx.vin[0].scriptSig = CScript([sig, redeem_script])
            assert len(
                spent_p2sh_tx.vin[0].scriptSig) >= 198, "needs to pass input sigchecks limit"
            spent_p2sh_tx.rehash()
            return spent_p2sh_tx

        # P2SH tests
        # Create a p2sh transaction
        p2sh_tx = self.create_and_sign_transaction(
            out[0].tx, out[0].n, 10000, p2sh_script)

        # Add the transaction to the block
        block(1)
        update_block(1, [p2sh_tx])
        node.p2p.send_blocks_and_test([self.tip], node)

        # Sigops p2sh limit for the mempool test
        p2sh_sigops_limit_mempool = MAX_STANDARD_TX_SIGOPS - \
            redeem_script.GetSigOpCount(True)
        # Too many sigops in one p2sh script
        too_many_p2sh_sigops_mempool = CScript(
            [OP_CHECKSIG] * (p2sh_sigops_limit_mempool + 1))

        # A transaction with this output script can't get into the mempool
        assert_raises_rpc_error(-26, RPC_TXNS_TOO_MANY_SIGOPS_ERROR, node.sendrawtransaction,
                                ToHex(spend_p2sh_tx(p2sh_tx, too_many_p2sh_sigops_mempool)))

        # The transaction is rejected, so the mempool should still be empty
        assert_equal(set(node.getrawmempool()), set())

        # Max sigops in one p2sh txn
        max_p2sh_sigops_mempool = CScript(
            [OP_CHECKSIG] * (p2sh_sigops_limit_mempool))

        # A transaction with this output script can get into the mempool
        max_p2sh_sigops_txn = spend_p2sh_tx(p2sh_tx, max_p2sh_sigops_mempool)
        max_p2sh_sigops_txn_id = node.sendrawtransaction(
            ToHex(max_p2sh_sigops_txn))
        assert_equal(set(node.getrawmempool()), {max_p2sh_sigops_txn_id})

        # Mine the transaction
        block(2, spend=out[1])
        update_block(2, [max_p2sh_sigops_txn])
        node.p2p.send_blocks_and_test([self.tip], node)

        # The transaction has been mined, it's not in the mempool anymore
        assert_equal(set(node.getrawmempool()), set())


if __name__ == '__main__':
    FullBlockTest().main()
