#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test BIP65 (CHECKLOCKTIMEVERIFY).

Test that the CHECKLOCKTIMEVERIFY soft-fork activates at (regtest) block height
1351.
"""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import *
from test_framework.mininode import *
from test_framework.blocktools import create_coinbase, create_block
from test_framework.script import CScript, CScriptNum, OP_1NEGATE, OP_CHECKLOCKTIMEVERIFY, OP_DROP, OP_TRUE
from test_framework.txtools import pad_tx

CLTV_HEIGHT = 1351

# Reject codes that we might receive in this test
REJECT_INVALID = 16
REJECT_OBSOLETE = 17
REJECT_NONSTANDARD = 64


def cltv_lock_to_height(node, tx, height=-1):
    '''Modify the scriptPubKey to add an OP_CHECKLOCKTIMEVERIFY

    This transforms the script to anyone can spend (OP_TRUE) if the lock time
    condition is valid.

    Default height is -1 which leads CLTV to fail

    TODO: test more ways that transactions using CLTV could be invalid (eg
    locktime requirements fail, sequence time requirements fail, etc).
    '''
    height_op = OP_1NEGATE
    if(height > 0):
        tx.vin[0].nSequence = 0
        tx.nLockTime = height
        height_op = CScriptNum(height)

    tx.vout[0].scriptPubKey = CScript(
        [height_op, OP_CHECKLOCKTIMEVERIFY, OP_DROP, OP_TRUE])
    tx.rehash()

    signed_result = node.signrawtransaction(ToHex(tx))

    new_tx = FromHex(CTransaction(), signed_result['hex'])
    pad_tx(new_tx)
    new_tx.rehash()

    return new_tx


def spend_from_coinbase(node, coinbase, to_address, amount):
    from_txid = node.getblock(coinbase)['tx'][0]
    inputs = [{"txid": from_txid, "vout": 0}]
    outputs = {to_address: amount}
    rawtx = node.createrawtransaction(inputs, outputs)
    signresult = node.signrawtransaction(rawtx)
    tx = FromHex(CTransaction(), signresult['hex'])
    return tx


class BIP65Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            ['-promiscuousmempoolflags=1', '-whitelist=127.0.0.1']]
        self.setup_clean_chain = True

    def run_test(self):
        self.nodes[0].add_p2p_connection(P2PInterface())

        network_thread_start()

        # wait_for_verack ensures that the P2P connection is fully up.
        self.nodes[0].p2p.wait_for_verack()

        self.log.info("Mining {} blocks".format(CLTV_HEIGHT - 2))
        self.coinbase_blocks = self.nodes[0].generate(CLTV_HEIGHT - 2)
        self.nodeaddress = self.nodes[0].getnewaddress()

        self.log.info(
            "Test that an invalid-according-to-CLTV transaction can still appear in a block")

        spendtx = spend_from_coinbase(self.nodes[0], self.coinbase_blocks[0],
                                      self.nodeaddress, 50.0)
        spendtx = cltv_lock_to_height(self.nodes[0], spendtx)

        # Make sure the tx is valid
        self.nodes[0].sendrawtransaction(ToHex(spendtx))

        tip = self.nodes[0].getbestblockhash()
        block_time = self.nodes[0].getblockheader(tip)['mediantime'] + 1
        block = create_block(int(tip, 16), create_coinbase(
            CLTV_HEIGHT - 1), block_time)
        block.nVersion = 3
        block.vtx.append(spendtx)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()

        self.nodes[0].p2p.send_and_ping(msg_block(block))
        assert_equal(self.nodes[0].getbestblockhash(), block.hash)

        self.log.info("Test that blocks must now be at least version 4")
        tip = block.sha256
        block_time += 1
        block = create_block(tip, create_coinbase(CLTV_HEIGHT), block_time)
        block.nVersion = 3
        block.solve()
        self.nodes[0].p2p.send_and_ping(msg_block(block))
        assert_equal(int(self.nodes[0].getbestblockhash(), 16), tip)

        wait_until(lambda: "reject" in self.nodes[0].p2p.last_message.keys(),
                   lock=mininode_lock)
        with mininode_lock:
            assert_equal(
                self.nodes[0].p2p.last_message["reject"].code, REJECT_OBSOLETE)
            assert_equal(
                self.nodes[0].p2p.last_message["reject"].reason, b'bad-version(0x00000003)')
            assert_equal(
                self.nodes[0].p2p.last_message["reject"].data, block.sha256)
            del self.nodes[0].p2p.last_message["reject"]

        self.log.info(
            "Test that invalid-according-to-cltv transactions cannot appear in a block")
        block.nVersion = 4

        spendtx = spend_from_coinbase(self.nodes[0], self.coinbase_blocks[1],
                                      self.nodeaddress, 49.99)
        spendtx = cltv_lock_to_height(self.nodes[0], spendtx)

        # First we show that this tx is valid except for CLTV by getting it
        # accepted to the mempool (which we can achieve with
        # -promiscuousmempoolflags).
        self.nodes[0].p2p.send_and_ping(msg_tx(spendtx))
        assert spendtx.hash in self.nodes[0].getrawmempool()

        # Mine a block containing the funding transaction
        block.vtx.append(spendtx)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()

        self.nodes[0].p2p.send_and_ping(msg_block(block))
        # This block is valid
        assert_equal(self.nodes[0].getbestblockhash(), block.hash)

        # But a block containing a transaction spending this utxo is not
        rawspendtx = self.nodes[0].decoderawtransaction(ToHex(spendtx))
        inputs = [{
            "txid": rawspendtx['txid'],
            "vout": rawspendtx['vout'][0]['n']
        }]
        output = {self.nodeaddress: 49.98}

        rejectedtx_raw = self.nodes[0].createrawtransaction(inputs, output)
        rejectedtx_signed = self.nodes[0].signrawtransaction(rejectedtx_raw)

        # Couldn't complete signature due to CLTV
        assert(rejectedtx_signed['errors'][0]['error'] == 'Negative locktime')

        rejectedtx = FromHex(CTransaction(), rejectedtx_signed['hex'])
        pad_tx(rejectedtx)
        rejectedtx.rehash()

        tip = block.hash
        block_time += 1
        block = create_block(
            block.sha256, create_coinbase(CLTV_HEIGHT+1), block_time)
        block.nVersion = 4
        block.vtx.append(rejectedtx)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()

        self.nodes[0].p2p.send_and_ping(msg_block(block))
        # This block is invalid
        assert_equal(self.nodes[0].getbestblockhash(), tip)

        wait_until(lambda: "reject" in self.nodes[0].p2p.last_message.keys(),
                   lock=mininode_lock)
        with mininode_lock:
            assert self.nodes[0].p2p.last_message["reject"].code in [
                REJECT_INVALID, REJECT_NONSTANDARD]
            assert_equal(
                self.nodes[0].p2p.last_message["reject"].data, block.sha256)
            if self.nodes[0].p2p.last_message["reject"].code == REJECT_INVALID:
                # Generic rejection when a block is invalid
                assert_equal(
                    self.nodes[0].p2p.last_message["reject"].reason, b'blk-bad-inputs')
            else:
                assert b'Negative locktime' in self.nodes[0].p2p.last_message["reject"].reason

        self.log.info(
            "Test that a version 4 block with a valid-according-to-CLTV transaction is accepted")
        spendtx = spend_from_coinbase(self.nodes[0], self.coinbase_blocks[2],
                                      self.nodeaddress, 49.99)
        spendtx = cltv_lock_to_height(self.nodes[0], spendtx, CLTV_HEIGHT - 1)

        # Modify the transaction in the block to be valid against CLTV
        block.vtx.pop(1)
        block.vtx.append(spendtx)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()

        self.nodes[0].p2p.send_and_ping(msg_block(block))
        # This block is now valid
        assert_equal(self.nodes[0].getbestblockhash(), block.hash)

        # A block containing a transaction spending this utxo is also valid
        # Build this transaction
        rawspendtx = self.nodes[0].decoderawtransaction(ToHex(spendtx))
        inputs = [{
            "txid": rawspendtx['txid'],
            "vout": rawspendtx['vout'][0]['n'],
            "sequence": 0
        }]
        output = {self.nodeaddress: 49.98}

        validtx_raw = self.nodes[0].createrawtransaction(
            inputs, output, CLTV_HEIGHT)

        validtx = FromHex(CTransaction(), validtx_raw)

        # Signrawtransaction won't sign a non standard tx.
        # But the prevout being anyone can spend, scriptsig can be left empty
        validtx.vin[0].scriptSig = CScript()
        pad_tx(validtx)
        validtx.rehash()

        tip = block.sha256
        block_time += 1
        block = create_block(tip, create_coinbase(CLTV_HEIGHT+3), block_time)
        block.nVersion = 4
        block.vtx.append(validtx)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()

        self.nodes[0].p2p.send_and_ping(msg_block(block))
        # This block is valid
        assert_equal(self.nodes[0].getbestblockhash(), block.hash)


if __name__ == '__main__':
    BIP65Test().main()
