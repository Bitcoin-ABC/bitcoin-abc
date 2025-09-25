# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test whether Chronik indexes the avalanche state correctly."""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.messages import (
    AvalancheVoteError,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
)
from test_framework.script import OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

QUORUM_NODE_COUNT = 16
THE_FUTURE = 2100000000
REPLAY_PROTECTION = THE_FUTURE + 100000000


class ChronikAvalancheTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-chronik",
                "-persistavapeers=0",
                f"-shibusawaactivationtime={THE_FUTURE}",
                f"-replayprotectionactivationtime={REPLAY_PROTECTION}",
            ],
        ]
        self.supports_cli = False
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        # Activate the shibusawa upgrade
        now = THE_FUTURE
        node.setmocktime(now)
        self.generate(node, 6)
        assert node.getinfo()["avalanche_preconsensus"]

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        # Generate us a coin
        coinblockhash = self.generatetoaddress(
            node, 1, ADDRESS_ECREG_P2SH_OP_TRUE, sync_fun=self.no_op
        )[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        # Mature coin
        self.generatetoaddress(
            node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE, sync_fun=self.no_op
        )

        # Pick one node from the quorum for polling.
        quorum = get_quorum()

        assert node.getavalancheinfo()["ready_to_poll"] is True

        # Finalize the tip so we don't get extra polls
        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_tip(tip))

        # Build tx to finalize in a block
        coinvalue = 5000000000
        tx = CTransaction()
        tx.nVersion = 2
        tx.vin = [
            CTxIn(
                outpoint=COutPoint(int(cointx, 16), 0),
                scriptSig=SCRIPTSIG_OP_TRUE,
                nSequence=0xFFFFFFFF,
            )
        ]
        tx.vout = [
            CTxOut(
                nValue=coinvalue - 10000, scriptPubKey=CScript([OP_RETURN, bytes(100)])
            )
        ]

        # Add to mempool
        txid = node.sendrawtransaction(tx.serialize().hex())

        # Tx not finalized
        assert_equal(chronik.tx(txid).ok().is_final, False)

        # Block not finalized
        assert_equal(chronik.tx(txid).ok().block.is_final, False)

        def finalize_tx(txid):
            def vote_until_final():
                can_find_inv_in_poll(
                    quorum, int(txid, 16), other_response=AvalancheVoteError.UNKNOWN
                )
                return node.isfinaltransaction(txid)

            self.wait_until(vote_until_final)

        # Finalize the tx via preconsensus
        finalize_tx(txid)
        assert_equal(chronik.tx(txid).ok().block.is_final, False)
        assert_equal(chronik.tx(txid).ok().is_final, True)

        # Mine a block to confirm the tx
        tip = self.generate(node, 1, sync_fun=self.no_op)[-1]
        assert_equal(node.getrawmempool(), [])

        # The block is not finalized yet but the tx is still finalized
        assert_equal(chronik.block(tip).ok().block_info.is_final, False)
        assert_equal(chronik.tx(txid).ok().block.is_final, False)
        assert_equal(chronik.tx(txid).ok().is_final, True)

        def chronik_wait_for_block_final(block_hash):
            self.wait_until(lambda: chronik.block(tip).ok().block_info.is_final)

        def chronik_wait_for_tx_block_final(txid):
            self.wait_until(lambda: chronik.tx(txid).ok().block.is_final)

        # After we wait, both block and tx are finalized
        self.wait_until(lambda: has_finalized_tip(tip))
        chronik_wait_for_block_final(tip)
        chronik_wait_for_tx_block_final(txid)

        # Confirmation that the tx is finalized.
        assert_equal(chronik.tx(txid).ok().is_final, True)

        # Restarting "wipes" the finalization status of blocks...
        self.restart_node(
            0, self.extra_args[0] + ["-chronikreindex", f"-mocktime={now}"]
        )
        assert_equal(chronik.block(tip).ok().block_info.is_final, False)
        assert_equal(chronik.tx(txid).ok().block.is_final, False)
        assert_equal(chronik.tx(txid).ok().is_final, False)

        # ...so we establish a new quorum and poll again
        quorum = get_quorum()
        self.wait_until(lambda: has_finalized_tip(tip))
        chronik_wait_for_block_final(tip)
        chronik_wait_for_tx_block_final(txid)
        assert_equal(chronik.tx(txid).ok().is_final, True)

        # Generate 10 blocks to invalidate, wait for Avalanche
        new_block_hashes = self.generate(node, 10, sync_fun=self.no_op)
        self.wait_until(lambda: has_finalized_tip(new_block_hashes[-1]))
        for block_hash in new_block_hashes:
            chronik_wait_for_block_final(block_hash)

        # After invalidation, blocks not found
        node.invalidateblock(new_block_hashes[0])
        node.syncwithvalidationinterfacequeue()
        for block_hash in new_block_hashes:
            chronik.block(block_hash).err(404)

        # After reconsidering, blocks are not final again
        node.reconsiderblock(new_block_hashes[-1])
        node.syncwithvalidationinterfacequeue()
        for block_hash in new_block_hashes:
            assert_equal(chronik.block(block_hash).ok().block_info.is_final, False)

        # Have to mine another block until avalanche considers reconsidering
        self.generate(node, 1, sync_fun=self.no_op)
        self.wait_until(lambda: has_finalized_tip(new_block_hashes[-1]))
        for block_hash in new_block_hashes:
            chronik_wait_for_block_final(block_hash)
            assert_equal(chronik.tx(txid).ok().is_final, True)


if __name__ == "__main__":
    ChronikAvalancheTest().main()
