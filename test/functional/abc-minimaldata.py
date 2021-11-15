# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This tests the MINIMALDATA consensus rule.
- test rejection in mempool, with error changing before/after activation.
- test acceptance in blocks before activation, and rejection after.
- check non-banning for peers who send invalid txns that would have been valid
on the other side of the upgrade.

Derived from abc-schnorr.py
"""

from test_framework.blocktools import (
    COINBASE_MATURITY,
    create_block,
    create_coinbase,
    create_tx_with_script,
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
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_ADD, OP_TRUE, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_raises_rpc_error

# Minimal push violations in mempool are rejected with a bannable error.
MINIMALPUSH_ERROR = (
    "mandatory-script-verify-flag-failed (Data push larger than necessary)"
)

# Blocks with invalid scripts give this error:
BADINPUTS_ERROR = "blk-bad-inputs"


class MinimaldataTest(BitcoinTestFramework):
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

        def create_fund_and_spend_tx():
            spendfrom = spendable_outputs.pop()

            script = CScript([OP_ADD])

            value = spendfrom.vout[0].nValue

            # Fund transaction
            txfund = create_tx_with_script(
                spendfrom, 0, b"", amount=value, script_pub_key=script
            )
            txfund.rehash()
            fundings.append(txfund)

            # Spend transaction
            txspend = CTransaction()
            txspend.vout.append(CTxOut(value - 1000, CScript([OP_TRUE])))
            txspend.vin.append(CTxIn(COutPoint(txfund.sha256, 0), b""))

            # Sign the transaction
            txspend.vin[0].scriptSig = CScript(b"\x01\x01\x51")  # PUSH1(0x01) OP_1
            pad_tx(txspend)
            txspend.rehash()

            return txspend

        # Non minimal tx are invalid.
        nonminimaltx = create_fund_and_spend_tx()

        tip = self.build_block(tip, fundings)
        node.p2ps[0].send_blocks_and_test([tip], node)

        self.log.info("Trying to mine a minimaldata violation.")
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [nonminimaltx]), BADINPUTS_ERROR
        )
        self.log.info("If we try to submit it by mempool or RPC we are banned")
        assert_raises_rpc_error(
            -26, MINIMALPUSH_ERROR, node.sendrawtransaction, ToHex(nonminimaltx)
        )
        self.check_for_ban_on_rejected_tx(nonminimaltx, MINIMALPUSH_ERROR)

        self.log.info("Mine a normal block")
        tip = self.build_block(tip)
        node.p2ps[0].send_blocks_and_test([tip], node)


if __name__ == "__main__":
    MinimaldataTest().main()
