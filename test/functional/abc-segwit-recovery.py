# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks that blocks containing segwit recovery transactions will be accepted,
that segwit recovery transactions are rejected from mempool acceptance (even with
-acceptnonstdtxn=1), and that segwit recovery transactions don't result in bans.
"""

import time
from typing import Optional, Sequence

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.hash import hash160
from test_framework.messages import (
    COIN,
    CBlock,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    ToHex,
)
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_EQUAL, OP_HASH160, OP_TRUE, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_raises_rpc_error

TEST_TIME = int(time.time())

# Error due to non clean stack
CLEANSTACK_ERROR = (
    "non-mandatory-script-verify-flag (Stack size must be exactly one after execution)"
)
RPC_CLEANSTACK_ERROR = CLEANSTACK_ERROR
EVAL_FALSE_ERROR = (
    "non-mandatory-script-verify-flag (Script evaluated without error but finished with"
    " a false/empty top stack elem"
)
RPC_EVAL_FALSE_ERROR = f"{EVAL_FALSE_ERROR}ent)"


class PreviousSpendableOutput(object):
    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        self.n = n


class SegwitRecoveryTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True
        self.tip_height = 0
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
        self.extra_args = [
            ["-whitelist=noban@127.0.0.1", "-acceptnonstdtxn"],
            ["-acceptnonstdtxn=0"],
        ]

    def make_block(self, base_block: Optional[CBlock]) -> CBlock:
        """
        Build a new block and return it.
        Increment the tip_height counter.

        If base_block is None, use the genesis block as base block.
        """
        if base_block is None:
            base_block_hash = self.genesis_hash
            block_time = TEST_TIME
        else:
            base_block_hash = base_block.sha256
            block_time = base_block.nTime + 1
        # First create the coinbase
        self.tip_height += 1
        coinbase = create_coinbase(self.tip_height)
        block = create_block(base_block_hash, coinbase, block_time)

        # Do PoW, which is cheap on regnet
        block.solve()
        return block

    def run_test(self):
        self.genesis_hash = int(self.nodes[0].getbestblockhash(), 16)
        spendable_outputs = []

        # shorthand
        node_nonstd = self.nodes[0]
        node_std = self.nodes[1]

        peer_nonstd = node_nonstd.add_p2p_connection(P2PDataStore())
        peer_std = node_std.add_p2p_connection(P2PDataStore())

        # adds transactions to the block and updates state
        def update_block(block: CBlock, new_transactions: Sequence[CTransaction]):
            block.vtx.extend(new_transactions)
            make_conform_to_ctor(block)
            block.hashMerkleRoot = block.calc_merkle_root()
            block.solve()

        # Returns 2 transactions:
        # 1) txfund: create outputs in segwit addresses
        # 2) txspend: spends outputs from segwit addresses
        def create_segwit_fund_and_spend_tx(spend, case0=False):
            if not case0:
                # Spending from a P2SH-P2WPKH coin,
                #   txhash:a45698363249312f8d3d93676aa714be59b0bd758e62fa054fb1ea6218480691
                redeem_script0 = bytearray.fromhex(
                    "0014fcf9969ce1c98a135ed293719721fb69f0b686cb"
                )
                # Spending from a P2SH-P2WSH coin,
                #   txhash:6b536caf727ccd02c395a1d00b752098ec96e8ec46c96bee8582be6b5060fa2f
                redeem_script1 = bytearray.fromhex(
                    "0020fc8b08ed636cb23afcb425ff260b3abd03380a2333b54cfa5d51ac52d803baf4"
                )
            else:
                redeem_script0 = bytearray.fromhex("51020000")
                redeem_script1 = bytearray.fromhex("53020080")
            redeem_scripts = [redeem_script0, redeem_script1]

            # Fund transaction to segwit addresses
            txfund = CTransaction()
            txfund.vin = [CTxIn(COutPoint(spend.tx.txid_int, spend.n))]
            amount = (50 * COIN - 1000) // len(redeem_scripts)
            for redeem_script in redeem_scripts:
                txfund.vout.append(
                    CTxOut(
                        amount, CScript([OP_HASH160, hash160(redeem_script), OP_EQUAL])
                    )
                )

            # Segwit spending transaction
            # We'll test if a node that checks for standardness accepts this
            # txn. It should fail exclusively because of the restriction in
            # the scriptSig (non clean stack..), so all other characteristcs
            # must pass standardness checks. For this reason, we create
            # standard P2SH outputs.
            txspend = CTransaction()
            for i in range(len(redeem_scripts)):
                txspend.vin.append(
                    CTxIn(COutPoint(txfund.txid_int, i), CScript([redeem_scripts[i]]))
                )
            txspend.vout = [
                CTxOut(
                    50 * COIN - 2000,
                    CScript([OP_HASH160, hash160(CScript([OP_TRUE])), OP_EQUAL]),
                )
            ]

            return txfund, txspend

        # Create a new block
        block = self.make_block(base_block=None)
        spendable_outputs.append(block)
        peer_nonstd.send_blocks_and_test([block], node_nonstd)

        # Now we need that block to mature so we can spend the coinbase.
        matureblocks = []
        for _ in range(199):
            block = self.make_block(block)
            matureblocks.append(block)
            spendable_outputs.append(block)
        peer_nonstd.send_blocks_and_test(matureblocks, node_nonstd)

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for _ in range(100):
            out.append(PreviousSpendableOutput(spendable_outputs.pop(0).vtx[0], 0))

        # Create segwit funding and spending transactions
        txfund, txspend = create_segwit_fund_and_spend_tx(out[0])
        txfund_case0, txspend_case0 = create_segwit_fund_and_spend_tx(out[1], True)

        # Mine txfund, as it can't go into node_std mempool because it's
        # nonstandard.
        block = self.make_block(block)
        update_block(block, [txfund, txfund_case0])
        peer_nonstd.send_blocks_and_test([block], node_nonstd)

        # Check both nodes are synchronized before continuing.
        self.sync_blocks()

        # Check that upgraded nodes checking for standardness are not banning
        # nodes sending segwit spending txns.
        peer_nonstd.send_txs_and_test(
            [txspend], node_nonstd, success=False, reject_reason=CLEANSTACK_ERROR
        )
        peer_nonstd.send_txs_and_test(
            [txspend_case0], node_nonstd, success=False, reject_reason=EVAL_FALSE_ERROR
        )
        peer_std.send_txs_and_test(
            [txspend], node_std, success=False, reject_reason=CLEANSTACK_ERROR
        )
        peer_std.send_txs_and_test(
            [txspend_case0], node_std, success=False, reject_reason=EVAL_FALSE_ERROR
        )

        # Segwit recovery txns are never accepted into the mempool,
        # as they are included in standard flags.
        assert_raises_rpc_error(
            -26, RPC_CLEANSTACK_ERROR, node_nonstd.sendrawtransaction, ToHex(txspend)
        )
        assert_raises_rpc_error(
            -26,
            RPC_EVAL_FALSE_ERROR,
            node_nonstd.sendrawtransaction,
            ToHex(txspend_case0),
        )
        assert_raises_rpc_error(
            -26, RPC_CLEANSTACK_ERROR, node_std.sendrawtransaction, ToHex(txspend)
        )
        assert_raises_rpc_error(
            -26, RPC_EVAL_FALSE_ERROR, node_std.sendrawtransaction, ToHex(txspend_case0)
        )

        # Blocks containing segwit spending txns are accepted in both nodes.
        block = self.make_block(block)
        update_block(block, [txspend, txspend_case0])
        peer_nonstd.send_blocks_and_test([block], node_nonstd)
        self.sync_blocks()


if __name__ == "__main__":
    SegwitRecoveryTest().main()
