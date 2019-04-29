#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

"""
This test checks the mempool coherence when changing validation rulesets,
which happens on (de)activations of network upgrades (forks).

We test the mempool coherence in 3 cases:
1) on activations, pre-fork-only transactions are evicted from the mempool,
   while always-valid transactions remain.
2) on deactivations, post-fork-only transactions (unconfirmed or once
   confirmed) are evicted from the mempool, while always-valid transactions
   are reincluded.
3) on a reorg to a chain that deactivates and reactivates the fork,
   post-fork-only and always-valid transactions (unconfirmed and/or once
   confirmed on the shorter chain) are kept or reincluded in the mempool.
"""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    create_transaction,
    make_conform_to_ctor,
)
from test_framework.comptool import TestInstance, TestManager
from test_framework.key import CECKey
from test_framework.messages import (
    COIN,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    ToHex,
)
from test_framework.mininode import network_thread_start
from test_framework.script import (
    CScript,
    OP_CHECKSIG,
    OP_TRUE,
    SIGHASH_ALL,
    SIGHASH_FORKID,
    SignatureHashForkId,
)
from test_framework.test_framework import ComparisonTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


# ---Code specific to the activation used for this test---

# It might change depending on the activation code currently existing in the
# client software. We use the replay protection activation for this test.
ACTIVATION_TIME = 2000000000
EXTRA_ARG = "-replayprotectionactivationtime={}".format(ACTIVATION_TIME)

# simulation starts before activation
FIRST_BLOCK_TIME = ACTIVATION_TIME - 86400

# Expected RPC error when trying to send an activation specific spend txn.
EXPECTED_ERROR = b'mandatory-script-verify-flag-failed (Signature must be zero for failed CHECK(MULTI)SIG operation)'
RPC_EXPECTED_ERROR = "16: " + \
    EXPECTED_ERROR.decode("utf-8")


def create_fund_and_activation_specific_spending_tx(spend, pre_fork_only):
    # Creates 2 transactions:
    # 1) txfund: create outputs to be used by txspend. Must be valid pre-fork.
    # 2) txspend: spending transaction that is specific to the activation
    #    being used and can be pre-fork-only or post-fork-only, depending on the
    #    function parameter.

    # This specific implementation uses the replay protection mechanism to
    # create transactions that are only valid before or after the fork.

    # Generate a key pair to test
    private_key = CECKey()
    private_key.set_secretbytes(b"replayprotection")
    public_key = private_key.get_pubkey()

    # Fund transaction
    script = CScript([public_key, OP_CHECKSIG])
    txfund = create_transaction(
        spend.tx, spend.n, b'', 50 * COIN, script)
    txfund.rehash()

    # Activation specific spending tx
    txspend = CTransaction()
    txspend.vout.append(CTxOut(50 * COIN - 1000, CScript([OP_TRUE])))
    txspend.vin.append(CTxIn(COutPoint(txfund.sha256, 0), b''))

    # Sign the transaction
    # Use forkvalues that create pre-fork-only or post-fork-only
    # transactions.
    forkvalue = 0 if pre_fork_only else 0xffdead
    sighashtype = (forkvalue << 8) | SIGHASH_ALL | SIGHASH_FORKID
    sighash = SignatureHashForkId(
        script, txspend, 0, sighashtype, 50 * COIN)
    sig = private_key.sign(sighash) + \
        bytes(bytearray([SIGHASH_ALL | SIGHASH_FORKID]))
    txspend.vin[0].scriptSig = CScript([sig])
    txspend.rehash()

    return txfund, txspend


def create_fund_and_pre_fork_only_tx(spend):
    return create_fund_and_activation_specific_spending_tx(spend, pre_fork_only=True)


def create_fund_and_post_fork_only_tx(spend):
    return create_fund_and_activation_specific_spending_tx(spend, pre_fork_only=False)


# ---Mempool coherence on activations test---


class PreviousSpendableOutput(object):

    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        self.n = n


class MempoolCoherenceOnActivationsTest(ComparisonTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        self.extra_args = [['-whitelist=127.0.0.1',
                            EXTRA_ARG]]

    def run_test(self):
        self.test = TestManager(self, self.options.tmpdir)
        self.test.add_all_connections(self.nodes)
        network_thread_start()
        self.nodes[0].setmocktime(ACTIVATION_TIME)
        self.test.run()

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

        # send a txn to the mempool and check it was accepted
        def send_transaction_to_mempool(tx):
            tx_id = node.sendrawtransaction(ToHex(tx))
            assert(tx_id in node.getrawmempool())

        # checks the mempool has exactly the same txns as in the provided list
        def check_mempool_equal(txns):
            assert set(node.getrawmempool()) == set(tx.hash for tx in txns)

        # Create an always-valid chained transaction. It spends a
        # scriptPub=OP_TRUE coin into another. Returns the transaction and its
        # spendable output for further chaining.
        def create_always_valid_chained_tx(spend):
            tx = create_transaction(
                spend.tx, spend.n, b'', spend.tx.vout[0].nValue - 1000, CScript([OP_TRUE]))
            tx.rehash()
            return tx, PreviousSpendableOutput(tx, 0)

        # shorthand
        block = self.next_block
        node = self.nodes[0]

        # Create a new block
        block(0)
        save_spendable_output()
        yield accepted()

        # Now we need that block to mature so we can spend the coinbase.
        test = TestInstance(sync_every_block=False)
        for i in range(110):
            block(5000 + i)
            test.blocks_and_transactions.append([self.tip, True])
            save_spendable_output()
        yield test

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(100):
            out.append(get_spendable_output())

        # Create 2 pre-fork-only txns (tx_pre0, tx_pre1). Fund txns are valid
        # pre-fork, so we can mine them right away.
        txfund0, tx_pre0 = create_fund_and_pre_fork_only_tx(out[0])
        txfund1, tx_pre1 = create_fund_and_pre_fork_only_tx(out[1])

        # Create 2 post-fork-only txns (tx_post0, tx_post1). Fund txns are
        # valid pre-fork, so we can mine them right away.
        txfund2, tx_post0 = create_fund_and_post_fork_only_tx(out[2])
        txfund3, tx_post1 = create_fund_and_post_fork_only_tx(out[3])

        # Create blocks to activate the fork. Mine all funding transactions.
        bfork = block(5555)
        bfork.nTime = ACTIVATION_TIME - 1
        update_block(5555, [txfund0, txfund1, txfund2, txfund3])
        yield accepted()

        for i in range(5):
            block(5200 + i)
            test.blocks_and_transactions.append([self.tip, True])
        yield test

        # Check we are just before the activation time
        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     ACTIVATION_TIME - 1)

        # We are just before the fork. Pre-fork-only and always-valid chained
        # txns (tx_chain0, tx_chain1) are valid, post-fork-only txns are
        # rejected.
        send_transaction_to_mempool(tx_pre0)
        send_transaction_to_mempool(tx_pre1)
        tx_chain0, last_chained_output = create_always_valid_chained_tx(out[4])
        tx_chain1, last_chained_output = create_always_valid_chained_tx(
            last_chained_output)
        send_transaction_to_mempool(tx_chain0)
        send_transaction_to_mempool(tx_chain1)
        assert_raises_rpc_error(-26, RPC_EXPECTED_ERROR,
                                node.sendrawtransaction, ToHex(tx_post0))
        assert_raises_rpc_error(-26, RPC_EXPECTED_ERROR,
                                node.sendrawtransaction, ToHex(tx_post1))
        check_mempool_equal([tx_chain0, tx_chain1, tx_pre0, tx_pre1])

        # Activate the fork. Mine the 1st always-valid chained txn and a
        # pre-fork-only txn.
        block(5556)
        update_block(5556, [tx_chain0, tx_pre0])
        yield accepted()
        forkblockid = node.getbestblockhash()

        # Check we just activated the fork
        assert_equal(node.getblockheader(forkblockid)['mediantime'],
                     ACTIVATION_TIME)

        # Check mempool coherence when activating the fork. Pre-fork-only txns
        # were evicted from the mempool, while always-valid txns remain.
        # Evicted: tx_pre1
        check_mempool_equal([tx_chain1])

        # Post-fork-only and always-valid txns are accepted, pre-fork-only txn
        # are rejected.
        send_transaction_to_mempool(tx_post0)
        send_transaction_to_mempool(tx_post1)
        tx_chain2, _ = create_always_valid_chained_tx(last_chained_output)
        send_transaction_to_mempool(tx_chain2)
        assert_raises_rpc_error(-26, RPC_EXPECTED_ERROR,
                                node.sendrawtransaction, ToHex(tx_pre1))
        check_mempool_equal([tx_chain1, tx_chain2, tx_post0, tx_post1])

        # Mine the 2nd always-valid chained txn and a post-fork-only txn.
        block(5557)
        update_block(5557, [tx_chain1, tx_post0])
        yield accepted()
        postforkblockid = node.getbestblockhash()
        # The mempool contains the 3rd chained txn and a post-fork-only txn.
        check_mempool_equal([tx_chain2, tx_post1])

        # In the following we will testing block disconnections and reorgs.
        # - tx_chain2 will always be retained in the mempool since it is always
        #   valid. Its continued presence shows that we are never simply
        #   clearing the entire mempool.
        # - tx_post1 may be evicted from mempool if we land before the fork.
        # - tx_post0 is in a block and if 'de-mined', it will either be evicted
        #   or end up in mempool depending if we land before/after the fork.
        # - tx_pre0 is in a block and if 'de-mined', it will either be evicted
        #   or end up in mempool depending if we land after/before the fork.

        # First we do a disconnection of the post-fork block, which is a
        # normal disconnection that merely returns the block contents into
        # the mempool -- nothing is lost.
        node.invalidateblock(postforkblockid)
        # In old mempool: tx_chain2, tx_post1
        # Recovered from blocks: tx_chain1 and tx_post0.
        # Lost from blocks: NONE
        # Retained from old mempool: tx_chain2, tx_post1
        # Evicted from old mempool: NONE
        check_mempool_equal([tx_chain1, tx_chain2, tx_post0, tx_post1])

        # Now, disconnect the fork block. This is a special disconnection
        # that requires reprocessing the mempool due to change in rules.
        node.invalidateblock(forkblockid)
        # In old mempool: tx_chain1, tx_chain2, tx_post0, tx_post1
        # Recovered from blocks: tx_chain0, tx_pre0
        # Lost from blocks: NONE
        # Retained from old mempool: tx_chain1, tx_chain2
        # Evicted from old mempool: tx_post0, tx_post1
        check_mempool_equal([tx_chain0, tx_chain1, tx_chain2, tx_pre0])

        # Restore state
        node.reconsiderblock(postforkblockid)
        node.reconsiderblock(forkblockid)
        send_transaction_to_mempool(tx_post1)
        check_mempool_equal([tx_chain2, tx_post1])

        # Test a reorg that crosses the fork.

        # If such a reorg happens, most likely it will both start *and end*
        # after the fork. We will test such a case here and make sure that
        # post-fork-only transactions are not unnecessarily discarded from
        # the mempool in such a reorg. Pre-fork-only transactions however can
        # get lost.

        # Set up a longer competing chain that doesn't confirm any of our txns.
        # This starts after 5204, so it contains neither the forkblockid nor
        # the postforkblockid from above.
        tip(5204)
        test = TestInstance(sync_every_block=False)
        for i in range(3):
            block(5900 + i)
            test.blocks_and_transactions.append([self.tip, True])

        # Perform the reorg
        yield test
        # reorg finishes after the fork
        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     ACTIVATION_TIME+2)
        # In old mempool: tx_chain2, tx_post1
        # Recovered from blocks: tx_chain0, tx_chain1, tx_post0
        # Lost from blocks: tx_pre0
        # Retained from old mempool: tx_chain2, tx_post1
        # Evicted from old mempool: NONE
        check_mempool_equal(
            [tx_chain0, tx_chain1, tx_chain2, tx_post0, tx_post1])


if __name__ == '__main__':
    MempoolCoherenceOnActivationsTest().main()
