# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test 63+sign-bit integers and upgrade behavior
"""

from typing import Optional

from test_framework.address import P2SH_OP_TRUE, SCRIPTSIG_OP_TRUE
from test_framework.blocktools import (
    COINBASE_MATURITY,
    create_block,
    create_coinbase,
    create_tx_with_script,
    make_conform_to_ctor,
)
from test_framework.hash import hash160
from test_framework.messages import CBlock, FromHex, ToHex
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_ADD, OP_EQUAL, OP_HASH160, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import (
    assert_equal,
    assert_greater_than_or_equal,
    assert_raises_rpc_error,
)

START_TIME = 1_900_000_000
ACTIVATION_TIME = 2_000_000_000

OVERFLOW_ERROR = "mandatory-script-verify-flag-failed (Integer overflow)"


class Script63BitIntsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.extra_args = [
            [
                f"-shibusawaactivationtime={ACTIVATION_TIME}",
                "-acceptnonstdtxn=0",
                "-whitelist=127.0.0.1",
            ]
        ]

    def run_test(self):
        self.block_heights = {}

        node = self.nodes[0]
        node.setmocktime(START_TIME)
        peer = node.add_p2p_connection(P2PDataStore())

        genesis = FromHex(CBlock(), node.getblock(node.getbestblockhash(), 0))

        redeem_script = CScript([0x10_0000_0000, OP_ADD, 0x21_0000_0000, OP_EQUAL])
        p2sh_script = CScript([OP_HASH160, hash160(redeem_script), OP_EQUAL])
        script_sig = CScript([0x11_0000_0000, bytes(redeem_script)])

        # Mine us some coins
        blocks = [genesis]
        num_spendable_txs = 30
        spendable_txs = []
        for i in range(COINBASE_MATURITY + num_spendable_txs):
            block = self.make_block(blocks[-1], coinbase_script=p2sh_script)
            if i < num_spendable_txs:
                spendable_txs.append(block.vtx[0])
            blocks.append(block)
        peer.send_blocks_and_test(blocks[1:], node, success=True)

        def test_mempool_accepts_63_bit():
            spendable_tx = spendable_txs.pop(0)
            good_tx = self.make_tx(spendable_tx, script_sig=script_sig)
            node.sendrawtransaction(ToHex(good_tx))
            return good_tx

        def test_mempool_rejects_63_bit():
            spendable_tx = spendable_txs.pop(0)
            bad_tx = self.make_tx(spendable_tx, script_sig=script_sig)
            assert_raises_rpc_error(
                -26,
                OVERFLOW_ERROR,
                node.sendrawtransaction,
                ToHex(bad_tx),
            )
            return bad_tx

        self.log.info("Before upgrade 63+sign-bit ops are not allowed in the mempool")
        bad_tx = test_mempool_rejects_63_bit()

        self.log.info("Before upgrade 63+sign-bit ops are not allowed in blocks")
        block = self.make_block(blocks[-1], txs=[bad_tx])
        peer.send_blocks_and_test(
            [block],
            node,
            success=False,
            reject_reason=OVERFLOW_ERROR,
        )

        self.log.info("Activate Shibusawa, mine 6 blocks starting at ACTIVATION_TIME")
        node.setmocktime(ACTIVATION_TIME)
        for offset in range(0, 6):
            block = self.make_block(blocks[-1], nTime=ACTIVATION_TIME + offset)
            peer.send_blocks_and_test([block], node, success=True)
            blocks.append(block)

        assert_equal(node.getblockchaininfo()["mediantime"], ACTIVATION_TIME)
        self.log.info("Shibusawa activated!")

        self.log.info("After activation, 63+sign-bit ops are allowed in the mempool")
        good_tx = test_mempool_accepts_63_bit()

        self.log.info("After activation, 63+sign-bit ops are allowed in blocks")
        block = self.make_block(blocks[-1], txs=[good_tx])
        peer.send_blocks_and_test([block], node, success=True)

        self.log.info("Undo activation")
        node.invalidateblock(blocks[-1].hash_hex)

        self.log.info("Mempool empty: good_tx is invalid before activation")
        assert_equal(node.getrawmempool(), [])

        assert node.getblockchaininfo()["mediantime"] < ACTIVATION_TIME

        self.log.info(
            "After undoing activation, 63+sign-bit ops aren't allowed in the mempool anymore"
        )
        bad_tx = test_mempool_rejects_63_bit()

        self.log.info("63+sign-bit ops aren't allowed in the activation block itself")
        block = self.make_block(blocks[-2], txs=[bad_tx])
        peer.send_blocks_and_test(
            [block],
            node,
            success=False,
            reject_reason=OVERFLOW_ERROR,
        )

    def make_tx(self, spend_tx, script_sig=None):
        value = spend_tx.vout[0].nValue - 1000
        assert_greater_than_or_equal(value, 546)
        tx = create_tx_with_script(
            spend_tx, 0, amount=value, script_pub_key=P2SH_OP_TRUE
        )
        tx.vin[0].scriptSig = script_sig or SCRIPTSIG_OP_TRUE
        pad_tx(tx)
        return tx

    def make_block(
        self,
        prev_block: CBlock,
        *,
        nTime: Optional[int] = None,
        coinbase_script=None,
        txs=None,
    ) -> CBlock:
        block_time = prev_block.nTime + 1 if nTime is None else nTime
        height = self.block_heights.get(prev_block.hash_int, 0) + 1
        coinbase = create_coinbase(height)
        coinbase.vout[0].scriptPubKey = coinbase_script or P2SH_OP_TRUE

        block = create_block(prev_block.hash_int, coinbase, block_time)
        if txs:
            block.vtx += txs
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        self.block_heights[block.hash_int] = height
        return block


if __name__ == "__main__":
    Script63BitIntsTest().main()
