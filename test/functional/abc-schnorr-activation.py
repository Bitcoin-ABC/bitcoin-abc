#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Copyright (c) 2017-2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This tests the activation of Schnorr transaction signatures:
- rejection prior to upgrade both in mempool and blocks.
- acceptance after upgrade both in mempool and blocks.
- check non-banning for peers who send txns that would be valid on the
  other side of the upgrade. (e.g., if we are still before upgrade and
  peer is post-upgrade)
- optional: tests of valid 64-byte DER signatures (same length as Schnorr).
  This requires a temporary patch to bitcoind; see fakeDER64 comment below.
- advance and rewind mempool drop tests.

Derived from abc-replay-protection.py with improvements borrowed from
abc-segwit-recovery-activation.py.
"""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error, sync_blocks
from test_framework.comptool import TestManager, TestInstance, RejectResult
from test_framework.blocktools import *
from test_framework.key import CECKey
from test_framework import schnorr
from test_framework.script import *

# far into the future
GREAT_WALL_START_TIME = 2000000000

# First blocks (initial coinbases, pre-fork test blocks) happen 1 day before.
FIRST_BLOCK_TIME = GREAT_WALL_START_TIME - 86400

# If we don't do this, autoreplay protection will activate simultaneous with
# great_wall and all our sigs will mysteriously fail.
REPLAY_PROTECTION_START_TIME = GREAT_WALL_START_TIME * 2


# A mandatory (bannable) error occurs when people pass Schnorr signatures
# into OP_CHECKMULTISIG. The precise error cause changes before/after upgrade
# (DER / BADLENGTH) so we just match the start of the error.
RPC_SCHNORR_MULTISIG_ERROR = '16: mandatory-script-verify-flag-failed'

# These non-mandatory (forgiven) errors occur when your signature isn't valid
# now, but would be valid on the other side of the upgrade.
# Error due to passing a Schnorr signature to CHECKSIG before upgrade, but it
# would have been valid after.
EARLY_SCHNORR_ERROR = b'upgrade-conditional-script-failure (Non-canonical DER signature)'
RPC_EARLY_SCHNORR_ERROR = '16: ' + \
    EARLY_SCHNORR_ERROR.decode('utf8')
# Error due to passing a 65-byte ECDSA CHECKSIG to mempool after upgrade, but
# it would have been valid before.
LATE_DER64_CHECKSIG_ERROR = b'upgrade-conditional-script-failure (Signature must be zero for failed CHECK(MULTI)SIG operation)'
RPC_LATE_DER64_CHECKSIG_ERROR = '16: ' + \
    LATE_DER64_CHECKSIG_ERROR.decode('utf8')
# Error due to passing a 65-byte ECDSA CHECKMULTISIG to mempool after upgrade,
# but it would have been valid before.
LATE_DER64_CHECKMULTISIG_ERROR = b'upgrade-conditional-script-failure (Signature cannot be 65 bytes in CHECKMULTISIG)'
RPC_LATE_DER64_CHECKMULTISIG_ERROR = '16: ' + \
    LATE_DER64_CHECKMULTISIG_ERROR.decode('utf8')


# For normal test running:
fakeDER64 = b''

# To properly test activation, we need to make txes with 64 byte DER sigs.
# (total 65 bytes with the appended hashtype byte, as in CHECKSIG/MULTISIG)
# The easiest way to do this is to fake them, and then temporarily modify
# VerifySignature in src/script/interpreter.cpp to always `return true;`
# for ECDSA sigs, instead of `return pubkey.VerifyECDSA(sighash, vchSig);`
# Once that patch is done, you can uncomment the following and tests should
# pass.
# fakeDER64 = bytes.fromhex('303e021d44444444444444444444444444444444444444444'
#                           '44444444444444444021d4444444444444444444444444444'
#                           '444444444444444444444444444444')

assert len(fakeDER64) in [0, 64]


class PreviousSpendableOutput(object):

    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        self.n = n


class SchnorrActivationTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        self.extra_args = [['-whitelist=127.0.0.1',
                            "-greatwallactivationtime={}".format(
                                GREAT_WALL_START_TIME),
                            "-replayprotectionactivationtime={}".format(
                                REPLAY_PROTECTION_START_TIME)],
                           ["-greatwallactivationtime={}".format(
                               GREAT_WALL_START_TIME),
                            "-replayprotectionactivationtime={}".format(
                                REPLAY_PROTECTION_START_TIME)]]

    def run_test(self):
        for node in self.nodes:
            node.setmocktime(GREAT_WALL_START_TIME)
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
            block_time = FIRST_BLOCK_TIME
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

        # Check we are not banned when sending a txn that node_ban rejects.
        def check_for_no_ban_on_rejected_tx(tx, reject_code, reject_reason):
            # Grab the first connection
            p2p = node_ban.p2p
            assert(p2p.state == 'connected')

            # The P2PConnection stores a public counter for each message type
            # and the last receive message of each type. We use this counter to
            # identify that we received a new reject message.
            with mininode_lock:
                rejects_count = p2p.message_count['reject']

            # Send the transaction directly. We use a ping for synchronization:
            # if we have been banned, the pong message won't be received, a
            # timeout occurs and the test fails.
            p2p.send_message(msg_tx(tx))
            p2p.sync_with_ping()

            # Check we haven't been disconnected
            assert(p2p.state == 'connected')

            # Check the reject message matches what we expected
            with mininode_lock:
                assert(p2p.message_count['reject'] ==
                       rejects_count + 1)
                reject_msg = p2p.last_message['reject']
                assert(reject_msg.code == reject_code and
                       reject_msg.reason == reject_reason and
                       reject_msg.data == tx.sha256)

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
        if fakeDER64:
            fund, DER64checksigtx = create_fund_and_spend_tx(
                out[5], sig=fakeDER64)
            fundings.append(fund)
            fund, DER64multisigtx = create_fund_and_spend_tx(
                out[6], multi=True, sig=fakeDER64)
            fundings.append(fund)

        for fund in fundings:
            send_transaction_to_mempool(fund)
        block(1, transactions=fundings)
        yield accepted()

        # we're now set up for the various spends; make sure the other node
        # is set up, too.
        sync_blocks(self.nodes)

        # We are before the upgrade, no Schnorrs get in the mempool.
        assert_raises_rpc_error(-26, RPC_EARLY_SCHNORR_ERROR,
                                node.sendrawtransaction, ToHex(schnorrchecksigtx))
        assert_raises_rpc_error(-26, RPC_SCHNORR_MULTISIG_ERROR,
                                node.sendrawtransaction, ToHex(schnorrmultisigtx))

        # And blocks containing them are rejected as well.
        block(2, transactions=[schnorrchecksigtx])
        yield rejected(RejectResult(16, b'blk-bad-inputs'))
        # Rewind bad block
        tip(1)

        block(3, transactions=[schnorrmultisigtx])
        yield rejected(RejectResult(16, b'blk-bad-inputs'))
        # Rewind bad block
        tip(1)

        # So far we were creating blocks well in advance of activation.
        # Now, start creating blocks that will move mediantime up to near
        # activation.
        bfork = block(5555, nTime=GREAT_WALL_START_TIME - 1)
        yield accepted()

        sync_blocks(self.nodes)

        # Create 5 more blocks with timestamps from GREAT_WALL_START_TIME+0 to +4
        for i in range(5):
            block(5200 + i)
            test.blocks_and_transactions.append([self.tip, True])
        yield test

        # Check we are just before the activation time.
        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     GREAT_WALL_START_TIME - 1)

        # We are just before the upgrade, still no Schnorrs get in the mempool,
        assert_raises_rpc_error(-26, RPC_EARLY_SCHNORR_ERROR,
                                node.sendrawtransaction, ToHex(schnorrchecksigtx))
        assert_raises_rpc_error(-26, RPC_SCHNORR_MULTISIG_ERROR,
                                node.sendrawtransaction, ToHex(schnorrmultisigtx))
        # ... nor in blocks.
        block(10, transactions=[schnorrchecksigtx])
        yield rejected(RejectResult(16, b'blk-bad-inputs'))
        # Rewind bad block
        tip(5204)
        block(11, transactions=[schnorrmultisigtx])
        yield rejected(RejectResult(16, b'blk-bad-inputs'))
        # Rewind bad block
        tip(5204)

        # Ensure that sending future-valid schnorr txns is *non-bannable*.
        check_for_no_ban_on_rejected_tx(
            schnorrchecksigtx, 16, EARLY_SCHNORR_ERROR)
        # Ensure that sending schnorrs in multisig *is* bannable.
        check_for_ban_on_rejected_tx(schnorrmultisigtx)

        if fakeDER64:
            # Throw a couple of "valid" 65-byte ECDSA signatures into the
            # mempool just prior to the activation.
            faked_checksig_tx_id = send_transaction_to_mempool(DER64checksigtx)
            faked_multisig_tx_id = send_transaction_to_mempool(DER64multisigtx)

        # Put a proper ECDSA transaction into the mempool but it won't
        # be mined...
        ecdsa_tx_id = send_transaction_to_mempool(ecdsachecksigtx)

        # Activate the Schnorr!
        forkblock = block(5556)
        yield accepted()

        # We have exactly hit the activation time.
        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     GREAT_WALL_START_TIME)

        # Make sure ECDSA is still in -- we don't want to lose uninvolved txns
        # when the upgrade happens.
        assert ecdsa_tx_id in set(node.getrawmempool())

        if fakeDER64:
            # The 64-byte DER sigs must be ejected.
            assert faked_checksig_tx_id not in set(node.getrawmempool())
            assert faked_multisig_tx_id not in set(node.getrawmempool())

            # If we try to re-add them, they fail with non-banning errors.
            # In CHECKSIG it's invalid Schnorr and hence NULLFAIL.
            assert_raises_rpc_error(-26, RPC_LATE_DER64_CHECKSIG_ERROR,
                                    node.sendrawtransaction, ToHex(DER64checksigtx))
            # In CHECKMULTISIG it's invalid length and hence BAD_LENGTH.
            assert_raises_rpc_error(-26, RPC_LATE_DER64_CHECKMULTISIG_ERROR,
                                    node.sendrawtransaction, ToHex(DER64multisigtx))
            # And they can't be mined either...
            block(14, transactions=[DER64checksigtx])
            yield rejected(RejectResult(16, b'blk-bad-inputs'))
            # Rewind bad block
            tip(5556)
            block(15, transactions=[DER64multisigtx])
            yield rejected(RejectResult(16, b'blk-bad-inputs'))
            # Rewind bad block
            tip(5556)

            # Ensure that sending past-valid DER64 txns is *non-bannable*.
            check_for_no_ban_on_rejected_tx(
                DER64checksigtx, 16, LATE_DER64_CHECKSIG_ERROR)
            check_for_no_ban_on_rejected_tx(
                DER64multisigtx, 16, LATE_DER64_CHECKMULTISIG_ERROR)

        # The multisig throws a different error now
        assert_raises_rpc_error(-26, RPC_SCHNORR_MULTISIG_ERROR,
                                node.sendrawtransaction, ToHex(schnorrmultisigtx))
        # And it still can't be mined
        block(16, transactions=[schnorrmultisigtx])
        yield rejected(RejectResult(16, b'blk-bad-inputs'))
        # Rewind bad block
        tip(5556)

        # Sending schnorrs in multisig is STILL bannable.
        check_for_ban_on_rejected_tx(schnorrmultisigtx)

        # The Schnorr CHECKSIG is now valid
        schnorr_tx_id = send_transaction_to_mempool(schnorrchecksigtx)
        # It can also be mined
        postforkblock = block(
            21, transactions=[schnorrchecksigtx, ecdsachecksigtx])
        yield accepted()
        # (we mined the ecdsa tx too)
        assert schnorr_tx_id not in set(node.getrawmempool())
        assert ecdsa_tx_id not in set(node.getrawmempool())

        # Ok, now we check if a rewind works properly accross the activation.
        # First, rewind the normal post-fork block.
        node.invalidateblock(postforkblock.hash)
        # txes popped back into mempool
        assert schnorr_tx_id in set(node.getrawmempool())
        assert ecdsa_tx_id in set(node.getrawmempool())

        # Deactivating upgrade.
        node.invalidateblock(forkblock.hash)
        # This should kick out the Schnorr sig, but not the valid ECDSA sig.
        assert schnorr_tx_id not in set(node.getrawmempool())
        assert ecdsa_tx_id in set(node.getrawmempool())

        # Check that we also do it properly on deeper rewind.
        node.reconsiderblock(forkblock.hash)
        node.reconsiderblock(postforkblock.hash)
        node.invalidateblock(forkblock.hash)
        assert schnorr_tx_id not in set(node.getrawmempool())
        assert ecdsa_tx_id in set(node.getrawmempool())

        # Try an actual reorg (deactivates then activates upgrade in one step)
        node.reconsiderblock(forkblock.hash)
        node.reconsiderblock(postforkblock.hash)
        tip(5204)
        test = TestInstance(sync_every_block=False)
        for i in range(3):
            block(5900 + i)
            test.blocks_and_transactions.append([self.tip, True])
        # Perform the reorg
        yield test
        # reorg finishes after the fork
        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     GREAT_WALL_START_TIME+2)
        # Schnorr didn't get lost!
        assert schnorr_tx_id in set(node.getrawmempool())
        assert ecdsa_tx_id in set(node.getrawmempool())


if __name__ == '__main__':
    SchnorrActivationTest().main()
