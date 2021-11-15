# Copyright (c) 2015-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test BIP65 (CHECKLOCKTIMEVERIFY).

Test that the CHECKLOCKTIMEVERIFY soft-fork activates at (regtest) block height
1351.
"""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    create_tx_with_script,
    make_conform_to_ctor,
)
from test_framework.messages import msg_block, msg_tx
from test_framework.p2p import P2PInterface
from test_framework.script import (
    OP_1NEGATE,
    OP_CHECKLOCKTIMEVERIFY,
    OP_DROP,
    OP_TRUE,
    CScript,
    CScriptNum,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet

CLTV_HEIGHT = 1351


def cltv_lock_to_height(fundtx, height=-1):
    """Modify the scriptPubKey to add an OP_CHECKLOCKTIMEVERIFY, and make
    a transaction that spends it.

    This transforms the output script to anyone can spend (OP_TRUE) if the
    lock time condition is valid.

    Default height is -1 which leads CLTV to fail

    TODO: test more ways that transactions using CLTV could be invalid (eg
    locktime requirements fail, sequence time requirements fail, etc).
    """
    assert_equal(len(fundtx.vin), 1)
    height_op = OP_1NEGATE
    if height > 0:
        fundtx.vin[0].nSequence = 0
        fundtx.nLockTime = height
        height_op = CScriptNum(height)

    fundtx.vout[0].scriptPubKey = CScript(
        [height_op, OP_CHECKLOCKTIMEVERIFY, OP_DROP, OP_TRUE]
    )
    pad_tx(fundtx)

    spendtx = create_tx_with_script(
        fundtx,
        0,
        amount=(fundtx.vout[0].nValue - 10000),
        script_pub_key=CScript([OP_TRUE]),
    )

    return fundtx, spendtx


class BIP65Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-par=1",  # Use only one script thread to get the exact reject reason for testing
                "-acceptnonstdtxn=1",  # cltv_invalidate is nonstandard
            ]
        ]
        self.setup_clean_chain = True
        self.rpc_timeout = 480

    def run_test(self):
        peer = self.nodes[0].add_p2p_connection(P2PInterface())
        wallet = MiniWallet(self.nodes[0])

        self.log.info(f"Mining {CLTV_HEIGHT - 2} blocks")
        self.generate(wallet, 10)
        self.generate(self.nodes[0], CLTV_HEIGHT - 2 - 10)

        self.log.info(
            "Test that an invalid-according-to-CLTV transaction can still appear in a"
            " block"
        )

        fundtx = wallet.create_self_transfer()["tx"]
        fundtx, spendtx = cltv_lock_to_height(fundtx)

        tip = self.nodes[0].getbestblockhash()
        block_time = self.nodes[0].getblockheader(tip)["mediantime"] + 1
        block = create_block(
            int(tip, 16),
            create_coinbase(CLTV_HEIGHT - 1),
            block_time,
            version=3,
            txlist=[fundtx, spendtx],
        )
        block.solve()

        peer.send_and_ping(msg_block(block))
        # This block is valid
        assert_equal(self.nodes[0].getbestblockhash(), block.hash)

        self.log.info("Test that blocks must now be at least version 4")
        tip = block.sha256
        block_time += 1
        block = create_block(tip, create_coinbase(CLTV_HEIGHT), block_time, version=3)
        block.solve()

        with self.nodes[0].assert_debug_log(
            expected_msgs=[f"{block.hash}, bad-version(0x00000003)"]
        ):
            peer.send_and_ping(msg_block(block))
            assert_equal(int(self.nodes[0].getbestblockhash(), 16), tip)
            peer.sync_with_ping()

        self.log.info(
            "Test that invalid-according-to-cltv transactions cannot appear in a block"
        )
        block.nVersion = 4

        fundtx = wallet.create_self_transfer()["tx"]
        fundtx, spendtx = cltv_lock_to_height(fundtx)

        # The funding tx only has unexecuted bad CLTV, in scriptpubkey; this is
        # valid.
        peer.send_and_ping(msg_tx(fundtx))
        assert fundtx.hash in self.nodes[0].getrawmempool()

        # Mine a block containing the funding transaction
        block.vtx.append(fundtx)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()

        peer.send_and_ping(msg_block(block))
        # This block is valid
        assert_equal(self.nodes[0].getbestblockhash(), block.hash)

        # We show that this tx is invalid due to CLTV by getting it
        # rejected from the mempool for exactly that reason.
        assert_equal(
            [
                {
                    "txid": spendtx.hash,
                    "allowed": False,
                    "reject-reason": (
                        "non-mandatory-script-verify-flag (Negative locktime)"
                    ),
                }
            ],
            self.nodes[0].testmempoolaccept(
                rawtxs=[spendtx.serialize().hex()], maxfeerate=0
            ),
        )

        tip = block.hash
        block_time += 1
        block = create_block(
            block.sha256,
            create_coinbase(CLTV_HEIGHT + 1),
            block_time,
            version=4,
            txlist=[spendtx],
        )
        block.solve()

        with self.nodes[0].assert_debug_log(
            expected_msgs=[f"ConnectBlock {block.hash} failed, blk-bad-inputs"]
        ):
            peer.send_and_ping(msg_block(block))
            assert_equal(self.nodes[0].getbestblockhash(), tip)
            peer.sync_with_ping()

        self.log.info(
            "Test that a version 4 block with a valid-according-to-CLTV transaction is"
            " accepted"
        )

        fundtx = wallet.create_self_transfer()["tx"]
        fundtx, spendtx = cltv_lock_to_height(fundtx, height=CLTV_HEIGHT)

        # make sure sequence is nonfinal and locktime is good
        spendtx.vin[0].nSequence = 0xFFFFFFFE
        spendtx.nLockTime = CLTV_HEIGHT

        # both transactions are fully valid
        self.nodes[0].testmempoolaccept(
            rawtxs=[fundtx.serialize().hex(), spendtx.serialize().hex()]
        )

        # Modify the transactions in the block to be valid against CLTV
        block.vtx.pop(1)
        block.vtx.append(fundtx)
        block.vtx.append(spendtx)
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()

        peer.send_and_ping(msg_block(block))
        # This block is now valid
        assert_equal(self.nodes[0].getbestblockhash(), block.hash)


if __name__ == "__main__":
    BIP65Test().main()
