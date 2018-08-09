#!/usr/bin/env python3
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This tests the activation of the upgraded CHECKMULTISIG mode that uses
Schnorr transaction signatures and repurposes the dummy element to indicate
which signatures are being checked.
- acceptance both in mempool and blocks.
- check non-banning for peers who send invalid txns that would have been valid
on the other side of the upgrade.
- check banning of peers for some fully-invalid transactions.

Derived from abc-schnorr.py
"""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    create_transaction,
    make_conform_to_ctor,
)
from test_framework.key import CECKey
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
from test_framework import schnorr
from test_framework.script import (
    CScript,
    OP_0,
    OP_1,
    OP_CHECKMULTISIG,
    OP_TRUE,
    SIGHASH_ALL,
    SIGHASH_FORKID,
    SignatureHashForkId,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error

# the upgrade activation time, which we artificially set far into the future
GRAVITON_START_TIME = 2000000000

# If we don't do this, autoreplay protection will activate before graviton and
# all our sigs will mysteriously fail.
REPLAY_PROTECTION_START_TIME = GRAVITON_START_TIME * 2


# Before the upgrade, Schnorr checkmultisig is rejected but forgiven if it
# would have been valid after the upgrade.
PREUPGRADE_SCHNORR_MULTISIG_ERROR = 'upgrade-conditional-script-failure (Signature cannot be 65 bytes in CHECKMULTISIG)'

# Before the upgrade, ECDSA checkmultisig with non-null dummy are rejected with
# a non-mandatory error.
PREUPGRADE_ECDSA_NULLDUMMY_ERROR = 'non-mandatory-script-verify-flag (Dummy CHECKMULTISIG argument must be zero)'
# After the upgrade, ECDSA checkmultisig with non-null dummy are invalid since
# the new mode refuses ECDSA, but still do not result in ban.
POSTUPGRADE_ECDSA_NULLDUMMY_ERROR = 'upgrade-conditional-script-failure (Only Schnorr signatures allowed in this operation)'

# A mandatory (bannable) error occurs when people pass Schnorr signatures into
# legacy OP_CHECKMULTISIG; this is the case on both sides of the upgrade.
SCHNORR_LEGACY_MULTISIG_ERROR = 'mandatory-script-verify-flag-failed (Signature cannot be 65 bytes in CHECKMULTISIG)'

# Blocks with invalid scripts give this error:
BADINPUTS_ERROR = 'blk-bad-inputs'


# This 64-byte signature is used to test exclusion & banning according to
# the above error messages.
# Tests of real 64 byte ECDSA signatures can be found in script_tests.
sig64 = b'\0'*64


class SchnorrTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.block_heights = {}
        self.extra_args = [["-gravitonactivationtime={}".format(
            GRAVITON_START_TIME),
            "-replayprotectionactivationtime={}".format(
            REPLAY_PROTECTION_START_TIME)]]

    def bootstrap_p2p(self, *, num_connections=1):
        """Add a P2P connection to the node.

        Helper to connect and wait for version handshake."""
        for _ in range(num_connections):
            self.nodes[0].add_p2p_connection(P2PDataStore())

    def reconnect_p2p(self, **kwargs):
        """Tear down and bootstrap the P2P connection to the node.

        The node gets disconnected several times in this test. This helper
        method reconnects the p2p and restarts the network thread."""
        self.nodes[0].disconnect_p2ps()
        self.bootstrap_p2p(**kwargs)

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
            parent.sha256, create_coinbase(block_height), block_time)
        block.vtx.extend(transactions)
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        self.block_heights[block.sha256] = block_height
        return block

    def check_for_ban_on_rejected_tx(self, tx, reject_reason=None):
        """Check we are disconnected when sending a txn that the node rejects.

        (Can't actually get banned, since bitcoind won't ban local peers.)"""
        self.nodes[0].p2p.send_txs_and_test(
            [tx], self.nodes[0], success=False, expect_disconnect=True, reject_reason=reject_reason)
        self.reconnect_p2p()

    def check_for_no_ban_on_rejected_tx(self, tx, reject_reason):
        """Check we are not disconnected when sending a txn that the node rejects."""
        self.nodes[0].p2p.send_txs_and_test(
            [tx], self.nodes[0], success=False, reject_reason=reject_reason)

    def check_for_ban_on_rejected_block(self, block, reject_reason=None):
        """Check we are disconnected when sending a block that the node rejects.

        (Can't actually get banned, since bitcoind won't ban local peers.)"""
        self.nodes[0].p2p.send_blocks_and_test(
            [block], self.nodes[0], success=False, reject_reason=reject_reason, expect_disconnect=True)
        self.reconnect_p2p()

    def run_test(self):
        node, = self.nodes

        self.bootstrap_p2p()

        tip = self.getbestblock(node)

        self.log.info("Create some blocks with OP_1 coinbase for spending.")
        blocks = []
        for _ in range(10):
            tip = self.build_block(tip)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node, success=True)
        spendable_outputs = [block.vtx[0] for block in blocks]

        self.log.info("Mature the blocks and get out of IBD.")
        node.generate(100)

        tip = self.getbestblock(node)

        self.log.info("Setting up spends to test and mining the fundings.")
        fundings = []

        # Generate a key pair
        privkeybytes = b"Schnorr!" * 4
        private_key = CECKey()
        private_key.set_secretbytes(privkeybytes)
        # get uncompressed public key serialization
        public_key = private_key.get_pubkey()

        def create_fund_and_spend_tx(dummy=OP_0, sigtype='ecdsa'):
            spendfrom = spendable_outputs.pop()

            script = CScript([OP_1, public_key, OP_1, OP_CHECKMULTISIG])

            value = spendfrom.vout[0].nValue

            # Fund transaction
            txfund = create_transaction(spendfrom, 0, b'', value, script)
            txfund.rehash()
            fundings.append(txfund)

            # Spend transaction
            txspend = CTransaction()
            txspend.vout.append(
                CTxOut(value-1000, CScript([OP_TRUE])))
            txspend.vin.append(
                CTxIn(COutPoint(txfund.sha256, 0), b''))

            # Sign the transaction
            sighashtype = SIGHASH_ALL | SIGHASH_FORKID
            hashbyte = bytes([sighashtype & 0xff])
            sighash = SignatureHashForkId(
                script, txspend, 0, sighashtype, value)
            if sigtype == 'schnorr':
                txsig = schnorr.sign(privkeybytes, sighash) + hashbyte
            elif sigtype == 'ecdsa':
                txsig = private_key.sign(sighash) + hashbyte
            txspend.vin[0].scriptSig = CScript([dummy, txsig])
            txspend.rehash()

            return txspend

        # two of these transactions, which are valid both before and after upgrade.
        ecdsa0tx = create_fund_and_spend_tx(OP_0, 'ecdsa')
        ecdsa0tx_2 = create_fund_and_spend_tx(OP_0, 'ecdsa')

        # two of these, which are nonstandard before upgrade and invalid after.
        ecdsa1tx = create_fund_and_spend_tx(OP_1, 'ecdsa')
        ecdsa1tx_2 = create_fund_and_spend_tx(OP_1, 'ecdsa')

        # this one is always invalid.
        schnorr0tx = create_fund_and_spend_tx(OP_0, 'schnorr')

        # this one is only going to be valid after the upgrade.
        schnorr1tx = create_fund_and_spend_tx(OP_1, 'schnorr')

        tip = self.build_block(tip, fundings)
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info("Start preupgrade tests")

        self.log.info("Sending rejected transactions via RPC")
        assert_raises_rpc_error(-26, PREUPGRADE_ECDSA_NULLDUMMY_ERROR,
                                node.sendrawtransaction, ToHex(ecdsa1tx))
        assert_raises_rpc_error(-26, SCHNORR_LEGACY_MULTISIG_ERROR,
                                node.sendrawtransaction, ToHex(schnorr0tx))
        assert_raises_rpc_error(-26, PREUPGRADE_SCHNORR_MULTISIG_ERROR,
                                node.sendrawtransaction, ToHex(schnorr1tx))

        self.log.info(
            "Sending rejected transactions via net (banning depending on situation)")
        self.check_for_no_ban_on_rejected_tx(
            ecdsa1tx, PREUPGRADE_ECDSA_NULLDUMMY_ERROR)
        self.check_for_ban_on_rejected_tx(
            schnorr0tx, SCHNORR_LEGACY_MULTISIG_ERROR)
        self.check_for_no_ban_on_rejected_tx(
            schnorr1tx, PREUPGRADE_SCHNORR_MULTISIG_ERROR)

        self.log.info(
            "Sending invalid transactions in blocks (and get banned!)")
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [schnorr0tx]), BADINPUTS_ERROR)
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [schnorr1tx]), BADINPUTS_ERROR)

        self.log.info("Sending valid transaction via net, then mining it")
        node.p2p.send_txs_and_test([ecdsa0tx], node)
        assert_equal(node.getrawmempool(), [ecdsa0tx.hash])
        tip = self.build_block(tip, [ecdsa0tx])
        node.p2p.send_blocks_and_test([tip], node)
        assert_equal(node.getrawmempool(), [])

        # Activation tests

        self.log.info("Approach to just before upgrade activation")
        # Move our clock to the uprade time so we will accept such future-timestamped blocks.
        node.setmocktime(GRAVITON_START_TIME)
        # Mine six blocks with timestamp starting at GRAVITON_START_TIME-1
        blocks = []
        for i in range(-1, 5):
            tip = self.build_block(tip, nTime=GRAVITON_START_TIME + i)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node)
        assert_equal(node.getblockchaininfo()[
                     'mediantime'], GRAVITON_START_TIME - 1)

        self.log.info(
            "The next block will activate, but the activation block itself must follow old rules")
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [schnorr0tx]), BADINPUTS_ERROR)

        self.log.info(
            "Send a lecacy ECDSA multisig into mempool, we will check after upgrade to make sure it didn't get cleaned out unnecessarily.")
        node.p2p.send_txs_and_test([ecdsa0tx_2], node)
        assert_equal(node.getrawmempool(), [ecdsa0tx_2.hash])

        # save this tip for later
        preupgrade_block = tip

        self.log.info(
            "Mine the activation block itself, including a legacy nulldummy violation at the last possible moment")
        tip = self.build_block(tip, [ecdsa1tx])
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info("We have activated!")
        assert_equal(node.getblockchaininfo()[
                     'mediantime'], GRAVITON_START_TIME)
        assert_equal(node.getrawmempool(), [ecdsa0tx_2.hash])

        # save this tip for later
        upgrade_block = tip

        self.log.info(
            "Trying to mine a legacy nulldummy violation, but we are just barely too late")
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [ecdsa1tx_2]), BADINPUTS_ERROR)
        self.log.info(
            "If we try to submit it by mempool or RPC, the error code has changed but we still aren't banned")
        assert_raises_rpc_error(-26, POSTUPGRADE_ECDSA_NULLDUMMY_ERROR,
                                node.sendrawtransaction, ToHex(ecdsa1tx_2))
        self.check_for_no_ban_on_rejected_tx(
            ecdsa1tx_2, POSTUPGRADE_ECDSA_NULLDUMMY_ERROR)

        self.log.info(
            "Submitting a new Schnorr-multisig via net, and mining it in a block")
        node.p2p.send_txs_and_test([schnorr1tx], node)
        assert_equal(set(node.getrawmempool()), {
                     ecdsa0tx_2.hash, schnorr1tx.hash})
        tip = self.build_block(tip, [schnorr1tx])
        node.p2p.send_blocks_and_test([tip], node)

        # save this tip for later
        postupgrade_block = tip

        self.log.info(
            "That legacy ECDSA multisig is still in mempool, let's mine it")
        assert_equal(node.getrawmempool(), [ecdsa0tx_2.hash])
        tip = self.build_block(tip, [ecdsa0tx_2])
        node.p2p.send_blocks_and_test([tip], node)
        assert_equal(node.getrawmempool(), [])

        self.log.info(
            "Trying Schnorr in legacy multisig remains invalid and banworthy as ever")
        self.check_for_ban_on_rejected_tx(
            schnorr0tx, SCHNORR_LEGACY_MULTISIG_ERROR)
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [schnorr0tx]), BADINPUTS_ERROR)

        # Deactivation tests

        self.log.info(
            "Invalidating the post-upgrade blocks returns the transactions to mempool")
        node.invalidateblock(postupgrade_block.hash)
        assert_equal(set(node.getrawmempool()), {
                     ecdsa0tx_2.hash, schnorr1tx.hash})
        self.log.info(
            "Invalidating the upgrade block evicts the transactions valid only after upgrade")
        node.invalidateblock(upgrade_block.hash)
        assert_equal(set(node.getrawmempool()), {ecdsa0tx_2.hash})

        self.log.info("Return to our tip")
        node.reconsiderblock(upgrade_block.hash)
        node.reconsiderblock(postupgrade_block.hash)
        assert_equal(node.getbestblockhash(), tip.hash)
        assert_equal(node.getrawmempool(), [])

        self.log.info(
            "Create an empty-block reorg that forks from pre-upgrade")
        tip = preupgrade_block
        blocks = []
        for _ in range(10):
            tip = self.build_block(tip)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node)

        self.log.info("Transactions from orphaned blocks are sent into mempool ready to be mined again, including upgrade-dependent ones even though the fork deactivated and reactivated the upgrade.")
        assert_equal(set(node.getrawmempool()), {
                     ecdsa0tx_2.hash, schnorr1tx.hash})
        node.generate(1)
        tip = self.getbestblock(node)
        assert set(tx.rehash() for tx in tip.vtx).issuperset(
            {ecdsa0tx_2.hash, schnorr1tx.hash})


if __name__ == '__main__':
    SchnorrTest().main()
