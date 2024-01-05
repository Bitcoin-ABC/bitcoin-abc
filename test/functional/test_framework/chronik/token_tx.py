#!/usr/bin/env python3
# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from test_framework.messages import CTransaction
from test_framework.util import assert_equal


class TokenTx:
    def __init__(
        self,
        *,
        tx: CTransaction,
        status=0,
        entries=[],
        inputs=[],
        outputs=[],
        failed_parsings=[]
    ):
        tx.rehash()
        self.tx = tx
        self.txid = tx.hash
        self.status = status
        self.entries = entries
        self.inputs = inputs
        self.outputs = outputs
        self.failed_parsings = failed_parsings

    def send(self, node):
        node.sendrawtransaction(self.tx.serialize().hex())

    def test(self, chronik, block_hash=None):
        proto_tx = chronik.tx(self.txid).ok()
        self.test_tx(proto_tx, block_hash)

    def test_tx(self, proto_tx, block_hash=None):
        import chronik_pb2 as pb

        assert_equal(proto_tx.token_status, self.status)
        assert_equal(list(proto_tx.token_entries), self.entries)
        assert_equal([tx_input.token for tx_input in proto_tx.inputs], self.inputs)
        assert_equal([tx_output.token for tx_output in proto_tx.outputs], self.outputs)
        if block_hash is None:
            assert_equal(proto_tx.block, pb.BlockMetadata())
        else:
            assert_equal(proto_tx.block.hash, bytes.fromhex(block_hash)[::-1])
        assert_equal(list(proto_tx.token_failed_parsings), self.failed_parsings)
