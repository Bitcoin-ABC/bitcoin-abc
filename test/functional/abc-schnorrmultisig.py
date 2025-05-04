# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This tests the  CHECKMULTISIG mode that uses Schnorr transaction signatures and
repurposes the dummy element to indicate which signatures are being checked.
- acceptance both in mempool and blocks.
- check non-banning for peers who send invalid txns that would have been valid
on the other side of the upgrade.
- check banning of peers for some fully-invalid transactions.

Derived from abc-schnorr.py
"""

from test_framework.blocktools import (
    COINBASE_MATURITY,
    create_block,
    create_coinbase,
    create_tx_with_script,
)
from test_framework.key import ECKey
from test_framework.messages import (
    CBlock,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    FromHex,
    ToHex,
)
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_0, OP_1, OP_CHECKMULTISIG, OP_TRUE, CScript
from test_framework.signature_hash import (
    SIGHASH_ALL,
    SIGHASH_FORKID,
    SignatureHashForkId,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error

# ECDSA checkmultisig with non-null dummy are invalid since the new mode
# refuses ECDSA.
ECDSA_NULLDUMMY_ERROR = (
    "mandatory-script-verify-flag-failed (Only Schnorr signatures allowed in this"
    " operation)"
)

# A mandatory (bannable) error occurs when people pass Schnorr signatures into
# legacy OP_CHECKMULTISIG.
SCHNORR_LEGACY_MULTISIG_ERROR = (
    "mandatory-script-verify-flag-failed (Signature cannot be 65 bytes in"
    " CHECKMULTISIG)"
)

# Blocks with invalid scripts give this error:
BADINPUTS_ERROR = "blk-bad-inputs"


class SchnorrMultisigTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.block_heights = {}
        self.extra_args = [["-acceptnonstdtxn=1"]]

    def reconnect_p2p(self):
        """Tear down and bootstrap the P2P connection to the node.

        The node gets disconnected several times in this test. This helper
        method reconnects the p2p and restarts the network thread."""
        self.nodes[0].disconnect_p2ps()
        self.nodes[0].add_p2p_connection(P2PDataStore())

    def getbestblock(self, node):
        """Get the best block. Register its height so we can use build_block."""
        block_height = node.getblockcount()
        blockhash = node.getblockhash(block_height)
        block = FromHex(CBlock(), node.getblock(blockhash, 0))
        block.calc_sha256()
        self.block_heights[block.sha256] = block_height
        return block

    def build_block(self, parent, transactions=(), nTime=None):
        """Make a new block with an OP_1 coinbase output.

        Requires parent to have its height registered."""
        parent.calc_sha256()
        block_height = self.block_heights[parent.sha256] + 1
        block_time = (parent.nTime + 1) if nTime is None else nTime

        block = create_block(
            parent.sha256,
            create_coinbase(block_height),
            block_time,
            txlist=transactions,
        )
        block.solve()
        self.block_heights[block.sha256] = block_height
        return block

    def check_for_ban_on_rejected_tx(self, tx, reject_reason=None):
        """Check we are disconnected when sending a txn that the node rejects.

        (Can't actually get banned, since bitcoind won't ban local peers.)"""
        self.nodes[0].p2ps[0].send_txs_and_test(
            [tx],
            self.nodes[0],
            success=False,
            expect_disconnect=True,
            reject_reason=reject_reason,
        )
        self.reconnect_p2p()

    def check_for_ban_on_rejected_block(self, block, reject_reason=None):
        """Check we are disconnected when sending a block that the node rejects.

        (Can't actually get banned, since bitcoind won't ban local peers.)"""
        self.nodes[0].p2ps[0].send_blocks_and_test(
            [block],
            self.nodes[0],
            success=False,
            reject_reason=reject_reason,
            expect_disconnect=True,
        )
        self.reconnect_p2p()

    def run_test(self):
        (node,) = self.nodes

        self.nodes[0].add_p2p_connection(P2PDataStore())

        tip = self.getbestblock(node)

        self.log.info("Create some blocks with OP_1 coinbase for spending.")
        blocks = []
        for _ in range(10):
            tip = self.build_block(tip)
            blocks.append(tip)
        node.p2ps[0].send_blocks_and_test(blocks, node, success=True)
        spendable_outputs = [block.vtx[0] for block in blocks]

        self.log.info("Mature the blocks and get out of IBD.")
        self.generate(node, COINBASE_MATURITY, sync_fun=self.no_op)

        tip = self.getbestblock(node)

        self.log.info("Setting up spends to test and mining the fundings.")
        fundings = []

        # Generate a key pair
        private_key = ECKey()
        private_key.set(b"Schnorr!" * 4, True)
        # get uncompressed public key serialization
        public_key = private_key.get_pubkey().get_bytes()

        def create_fund_and_spend_tx(dummy=OP_0, sigtype="ecdsa"):
            spendfrom = spendable_outputs.pop()

            script = CScript([OP_1, public_key, OP_1, OP_CHECKMULTISIG])

            value = spendfrom.vout[0].nValue

            # Fund transaction
            txfund = create_tx_with_script(
                spendfrom, 0, b"", amount=value, script_pub_key=script
            )
            fundings.append(txfund)

            # Spend transaction
            txspend = CTransaction()
            txspend.vout.append(CTxOut(value - 1000, CScript([OP_TRUE])))
            txspend.vin.append(CTxIn(COutPoint(txfund.sha256, 0), b""))

            # Sign the transaction
            sighashtype = SIGHASH_ALL | SIGHASH_FORKID
            hashbyte = bytes([sighashtype & 0xFF])
            sighash = SignatureHashForkId(script, txspend, 0, sighashtype, value)
            if sigtype == "schnorr":
                txsig = private_key.sign_schnorr(sighash) + hashbyte
            elif sigtype == "ecdsa":
                txsig = private_key.sign_ecdsa(sighash) + hashbyte
            txspend.vin[0].scriptSig = CScript([dummy, txsig])

            return txspend

        # This is valid.
        ecdsa0tx = create_fund_and_spend_tx(OP_0, "ecdsa")

        # This is invalid.
        ecdsa1tx = create_fund_and_spend_tx(OP_1, "ecdsa")

        # This is invalid.
        schnorr0tx = create_fund_and_spend_tx(OP_0, "schnorr")

        # This is valid.
        schnorr1tx = create_fund_and_spend_tx(OP_1, "schnorr")

        tip = self.build_block(tip, fundings)
        node.p2ps[0].send_blocks_and_test([tip], node)

        self.log.info("Send a legacy ECDSA multisig into mempool.")
        node.p2ps[0].send_txs_and_test([ecdsa0tx], node)
        assert_equal(node.getrawmempool(), [ecdsa0tx.hash])

        self.log.info("Trying to mine a non-null-dummy ECDSA.")
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [ecdsa1tx]), BADINPUTS_ERROR
        )
        self.log.info(
            "If we try to submit it by mempool or RPC, it is rejected and we are banned"
        )
        assert_raises_rpc_error(
            -26, ECDSA_NULLDUMMY_ERROR, node.sendrawtransaction, ToHex(ecdsa1tx)
        )
        self.check_for_ban_on_rejected_tx(ecdsa1tx, ECDSA_NULLDUMMY_ERROR)

        self.log.info("Submitting a Schnorr-multisig via net, and mining it in a block")
        node.p2ps[0].send_txs_and_test([schnorr1tx], node)
        assert_equal(set(node.getrawmempool()), {ecdsa0tx.hash, schnorr1tx.hash})
        tip = self.build_block(tip, [schnorr1tx])
        node.p2ps[0].send_blocks_and_test([tip], node)

        self.log.info("That legacy ECDSA multisig is still in mempool, let's mine it")
        assert_equal(node.getrawmempool(), [ecdsa0tx.hash])
        tip = self.build_block(tip, [ecdsa0tx])
        node.p2ps[0].send_blocks_and_test([tip], node)
        assert_equal(node.getrawmempool(), [])

        self.log.info("Trying Schnorr in legacy multisig is invalid and banworthy.")
        self.check_for_ban_on_rejected_tx(schnorr0tx, SCHNORR_LEGACY_MULTISIG_ERROR)
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [schnorr0tx]), BADINPUTS_ERROR
        )


if __name__ == "__main__":
    SchnorrMultisigTest().main()
