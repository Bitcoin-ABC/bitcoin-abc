#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Copyright (c) 2017-2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This tests the treatment of Schnorr transaction signatures:
- acceptance both in mempool and blocks.
- check banning for peers who send txns with 64 byte ECDSA DER sigs.

Derived from abc-replay-protection.py with improvements borrowed from
abc-segwit-recovery-activation.py. Later reduced down to this feature test.
"""

import time

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    create_transaction,
    make_conform_to_ctor,
)
from test_framework.comptool import RejectResult, TestInstance, TestManager
from test_framework.key import CECKey
from test_framework.messages import (
    COIN,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    msg_tx,
    ToHex,
)
from test_framework.mininode import (
    network_thread_start,
    P2PInterface,
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
from test_framework.util import assert_raises_rpc_error, sync_blocks

# A mandatory (bannable) error occurs when people pass Schnorr signatures into OP_CHECKMULTISIG.
RPC_SCHNORR_MULTISIG_ERROR = '16: mandatory-script-verify-flag-failed (Signature cannot be 65 bytes in CHECKMULTISIG)'

# A mandatory (bannable) error occurs when people send invalid Schnorr sigs into OP_CHECKSIG.
RPC_NULLFAIL_ERROR = '16: mandatory-script-verify-flag-failed (Signature must be zero for failed CHECK(MULTI)SIG operation)'

# This 64-byte signature is used to test exclusion & banning according to
# the above error messages.
# Tests of real 64 byte ECDSA signatures can be found in script_tests.
sig64 = b'\0'*64


class PreviousSpendableOutput(object):

    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        self.n = n


class SchnorrTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        self.extra_args = [['-whitelist=127.0.0.1'],
                           []]

    def run_test(self):
        test = TestManager(self, self.options.tmpdir)
        test.add_all_connections([self.nodes[0]])
        # We have made a second node for ban-testing, to which we connect
        # the mininode (but not test framework). We make multiple connections
        # since each disconnect event consumes a connection (and, after we
        # run network_thread_start() we can't make any more connections).
        for _ in range(3):
            self.nodes[1].add_p2p_connection(P2PInterface())
        network_thread_start()
        test.run()

    def next_block(self, number, transactions=None, nTime=None):
        if self.tip == None:
            base_block_hash = self.genesis_hash
            block_time = int(time.time()) + 1
        else:
            base_block_hash = self.tip.sha256
            block_time = self.tip.nTime + 1
        if nTime:
            block_time = nTime
        # First create the coinbase
        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height)
        coinbase.rehash()
        block = create_block(base_block_hash, coinbase, block_time)

        # add in transactions
        if transactions:
            block.vtx.extend(transactions)
            make_conform_to_ctor(block)
            block.hashMerkleRoot = block.calc_merkle_root()

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

        # shorthand
        block = self.next_block
        node = self.nodes[0]
        node_ban = self.nodes[1]

        # save the current tip so its coinbase can be spent by a later block
        def save_spendable_output():
            spendable_outputs.append(self.tip)

        # get a coinbase that we previously marked as spendable
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

        # Create a new block
        block(0)
        save_spendable_output()
        yield accepted()

        # Now we need that block to mature so we can spend the coinbase.
        test = TestInstance(sync_every_block=False)
        for i in range(199):
            block(5000 + i)
            test.blocks_and_transactions.append([self.tip, True])
            save_spendable_output()
        yield test

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(100):
            out.append(get_spendable_output())

        # Generate a key pair to test P2SH sigops count
        privkeybytes = b"Schnorr!" * 4
        private_key = CECKey()
        private_key.set_secretbytes(privkeybytes)
        # get uncompressed public key serialization
        public_key = private_key.get_pubkey()

        def create_fund_and_spend_tx(spend, multi=False, sig='schnorr'):
            if multi:
                script = CScript([OP_1, public_key, OP_1, OP_CHECKMULTISIG])
            else:
                script = CScript([public_key, OP_CHECKSIG])

            # Fund transaction
            txfund = create_transaction(
                spend.tx, spend.n, b'', 50 * COIN, script)
            txfund.rehash()

            # Spend transaction
            txspend = CTransaction()
            txspend.vout.append(
                CTxOut(50 * COIN - 1000, CScript([OP_TRUE])))
            txspend.vin.append(
                CTxIn(COutPoint(txfund.sha256, 0), b''))

            # Sign the transaction
            sighashtype = SIGHASH_ALL | SIGHASH_FORKID
            hashbyte = bytes([sighashtype & 0xff])
            sighash = SignatureHashForkId(
                script, txspend, 0, sighashtype, 50 * COIN)
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

            return txfund, txspend

        def send_transaction_to_mempool(tx):
            tx_id = node.sendrawtransaction(ToHex(tx))
            assert(tx_id in set(node.getrawmempool()))
            return tx_id

        # Check we are disconnected when sending a txn that node_ban rejects.
        # (Can't actually get banned, since bitcoind won't ban local peers.)
        def check_for_ban_on_rejected_tx(tx):
            # Take a connection
            p2p = node_ban.p2ps.pop()
            assert(p2p.state == 'connected')

            # make sure we can ping
            p2p.sync_with_ping()

            # send the naughty transaction
            p2p.send_message(msg_tx(tx))

            # if not "banned", this will timeout and raise exception.
            p2p.wait_for_disconnect()

        # Setup fundings
        fundings = []
        fund, schnorrchecksigtx = create_fund_and_spend_tx(out[0])
        fundings.append(fund)
        fund, schnorrmultisigtx = create_fund_and_spend_tx(out[1], multi=True)
        fundings.append(fund)
        fund, ecdsachecksigtx = create_fund_and_spend_tx(out[2], sig='ecdsa')
        fundings.append(fund)

        fund, sig64checksigtx = create_fund_and_spend_tx(
            out[5], sig=sig64)
        fundings.append(fund)
        fund, sig64multisigtx = create_fund_and_spend_tx(
            out[6], multi=True, sig=sig64)
        fundings.append(fund)

        for fund in fundings:
            send_transaction_to_mempool(fund)
        block(1, transactions=fundings)
        yield accepted()

        # we're now set up for the various spends; make sure the other node
        # is set up, too.
        sync_blocks(self.nodes)

        # Typical ECDSA and Schnorr CHECKSIG are valid
        schnorr_tx_id = send_transaction_to_mempool(schnorrchecksigtx)
        ecdsa_tx_id = send_transaction_to_mempool(ecdsachecksigtx)
        # It can also be mined
        block(2, transactions=[schnorrchecksigtx, ecdsachecksigtx])
        yield accepted()
        assert schnorr_tx_id not in set(node.getrawmempool())
        assert ecdsa_tx_id not in set(node.getrawmempool())

        # Schnorr in multisig is rejected with mandatory error.
        assert_raises_rpc_error(-26, RPC_SCHNORR_MULTISIG_ERROR,
                                node.sendrawtransaction, ToHex(schnorrmultisigtx))
        # And it is banworthy.
        check_for_ban_on_rejected_tx(schnorrmultisigtx)
        # And it can't be mined
        block(13, transactions=[schnorrmultisigtx])
        yield rejected(RejectResult(16, b'blk-bad-inputs'))
        # Rewind bad block
        tip(2)

        # If we try to submit a bad 64-byte sig, we fail with mandatory errors.
        # In CHECKSIG it's invalid Schnorr and hence NULLFAIL.
        assert_raises_rpc_error(-26, RPC_NULLFAIL_ERROR,
                                node.sendrawtransaction, ToHex(sig64checksigtx))
        # In CHECKMULTISIG it's invalid length and hence BAD_LENGTH.
        assert_raises_rpc_error(-26, RPC_SCHNORR_MULTISIG_ERROR,
                                node.sendrawtransaction, ToHex(sig64multisigtx))
        # Getting sent these transactions is banworthy.
        check_for_ban_on_rejected_tx(sig64checksigtx)
        check_for_ban_on_rejected_tx(sig64multisigtx)
        # And they can't be mined either...
        block(14, transactions=[sig64checksigtx])
        yield rejected(RejectResult(16, b'blk-bad-inputs'))
        # Rewind bad block
        tip(2)
        block(15, transactions=[sig64multisigtx])
        yield rejected(RejectResult(16, b'blk-bad-inputs'))
        # Rewind bad block
        tip(2)


if __name__ == '__main__':
    SchnorrTest().main()
