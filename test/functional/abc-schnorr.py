#!/usr/bin/env python3
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This tests the treatment of Schnorr transaction signatures:
- acceptance both in mempool and blocks.
- check banning for peers who send txns with 64 byte ECDSA DER sigs.

Derived from a variety of functional tests.
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
    network_thread_join,
    network_thread_start,
    P2PDataStore,
)
from test_framework import schnorr
from test_framework.script import (
    CScript,
    OP_1,
    OP_CHECKMULTISIG,
    OP_CHECKSIG,
    OP_TRUE,
    SIGHASH_ALL,
    SIGHASH_FORKID,
    SignatureHashForkId,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_raises_rpc_error

# A mandatory (bannable) error occurs when people pass Schnorr signatures into OP_CHECKMULTISIG.
SCHNORR_MULTISIG_ERROR = dict(reject_code=16,
                              reject_reason=b'mandatory-script-verify-flag-failed (Signature cannot be 65 bytes in CHECKMULTISIG)')

# A mandatory (bannable) error occurs when people send invalid Schnorr sigs into OP_CHECKSIG.
NULLFAIL_ERROR = dict(reject_code=16,
                      reject_reason=b'mandatory-script-verify-flag-failed (Signature must be zero for failed CHECK(MULTI)SIG operation)')

# Blocks with invalid scripts give this error:
BADINPUTS_ERROR = dict(reject_code=16,
                       reject_reason=b'blk-bad-inputs')


def rpc_error(*, reject_code, reject_reason):
    # RPC indicates rejected items in a slightly different way than p2p.
    return '{:s} (code {:d})'.format(reject_reason.decode(), reject_code)


# This 64-byte signature is used to test exclusion & banning according to
# the above error messages.
# Tests of real 64 byte ECDSA signatures can be found in script_tests.
sig64 = b'\0'*64


class SchnorrTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.block_heights = {}

    def bootstrap_p2p(self, *, num_connections=1):
        """Add a P2P connection to the node.

        Helper to connect and wait for version handshake."""
        for _ in range(num_connections):
            self.nodes[0].add_p2p_connection(P2PDataStore())
        network_thread_start()
        self.nodes[0].p2p.wait_for_verack()

    def reconnect_p2p(self, **kwargs):
        """Tear down and bootstrap the P2P connection to the node.

        The node gets disconnected several times in this test. This helper
        method reconnects the p2p and restarts the network thread."""
        self.nodes[0].disconnect_p2ps()
        network_thread_join()
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

    def check_for_ban_on_rejected_tx(self, tx, reject_code=None, reject_reason=None):
        """Check we are disconnected when sending a txn that the node rejects.

        (Can't actually get banned, since bitcoind won't ban local peers.)"""
        self.nodes[0].p2p.send_txs_and_test(
            [tx], self.nodes[0], success=False, expect_disconnect=True, reject_code=reject_code, reject_reason=reject_reason)
        self.reconnect_p2p()

    def check_for_ban_on_rejected_block(self, block, reject_code=None, reject_reason=None):
        """Check we are disconnected when sending a block that the node rejects.

        (Can't actually get banned, since bitcoind won't ban local peers.)"""
        self.nodes[0].p2p.send_blocks_and_test(
            [block], self.nodes[0], success=False, reject_code=reject_code, reject_reason=reject_reason)
        self.nodes[0].p2p.wait_for_disconnect()
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

        def create_fund_and_spend_tx(multi=False, sig='schnorr'):
            spendfrom = spendable_outputs.pop()

            if multi:
                script = CScript([OP_1, public_key, OP_1, OP_CHECKMULTISIG])
            else:
                script = CScript([public_key, OP_CHECKSIG])

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
            if sig == 'schnorr':
                txsig = schnorr.sign(privkeybytes, sighash) + hashbyte
            elif sig == 'ecdsa':
                txsig = private_key.sign(sighash) + hashbyte
            elif isinstance(sig, bytes):
                txsig = sig + hashbyte
            if multi:
                txspend.vin[0].scriptSig = CScript([b'', txsig])
            else:
                txspend.vin[0].scriptSig = CScript([txsig])
            txspend.rehash()

            return txspend

        schnorrchecksigtx = create_fund_and_spend_tx()
        schnorrmultisigtx = create_fund_and_spend_tx(multi=True)
        ecdsachecksigtx = create_fund_and_spend_tx(sig='ecdsa')
        sig64checksigtx = create_fund_and_spend_tx(sig=sig64)
        sig64multisigtx = create_fund_and_spend_tx(multi=True, sig=sig64)

        tip = self.build_block(tip, fundings)
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info("Typical ECDSA and Schnorr CHECKSIG are valid.")
        node.p2p.send_txs_and_test([schnorrchecksigtx, ecdsachecksigtx], node)
        # They get mined as usual.
        node.generate(1)
        tip = self.getbestblock(node)
        # Make sure they are in the block, and mempool is now empty.
        txhashes = set([schnorrchecksigtx.hash, ecdsachecksigtx.hash])
        assert txhashes.issubset(tx.rehash() for tx in tip.vtx)
        assert not node.getrawmempool()

        self.log.info("Schnorr in multisig is rejected with mandatory error.")
        assert_raises_rpc_error(-26, rpc_error(**SCHNORR_MULTISIG_ERROR),
                                node.sendrawtransaction, ToHex(schnorrmultisigtx))
        # And it is banworthy.
        self.check_for_ban_on_rejected_tx(
            schnorrmultisigtx, **SCHNORR_MULTISIG_ERROR)
        # And it can't be mined
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [schnorrmultisigtx]), **BADINPUTS_ERROR)

        self.log.info("Bad 64-byte sig is rejected with mandatory error.")
        # In CHECKSIG it's invalid Schnorr and hence NULLFAIL.
        assert_raises_rpc_error(-26, rpc_error(**NULLFAIL_ERROR),
                                node.sendrawtransaction, ToHex(sig64checksigtx))
        # In CHECKMULTISIG it's invalid length and hence BAD_LENGTH.
        assert_raises_rpc_error(-26, rpc_error(**SCHNORR_MULTISIG_ERROR),
                                node.sendrawtransaction, ToHex(sig64multisigtx))
        # Sending these transactions is banworthy.
        self.check_for_ban_on_rejected_tx(sig64checksigtx, **NULLFAIL_ERROR)
        self.check_for_ban_on_rejected_tx(
            sig64multisigtx, **SCHNORR_MULTISIG_ERROR)
        # And they can't be mined either...
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [sig64checksigtx]), **BADINPUTS_ERROR)
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [sig64multisigtx]), **BADINPUTS_ERROR)


if __name__ == '__main__':
    SchnorrTest().main()
