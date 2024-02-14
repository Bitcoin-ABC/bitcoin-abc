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
        failed_parsings=[],
        token_info=None,
    ):
        tx.rehash()
        self.tx = tx
        self.txid = tx.hash
        self.status = status
        self.entries = entries
        self.inputs = inputs
        self.outputs = outputs
        self.failed_parsings = failed_parsings
        self.token_info = token_info

    def send(self, chronik, error=None):
        raw_tx = self.tx.serialize()
        proto_tx = chronik.validate_tx(raw_tx).ok()
        self.test_tx(proto_tx)
        request = chronik.broadcast_tx(raw_tx)
        if error is None:
            request.ok()
        else:
            actual_error = request.err(400)
            assert_equal(actual_error.msg, error)
            chronik.broadcast_tx(raw_tx, skip_token_checks=True).ok()

    def test(self, chronik, block_hash=None):
        proto_tx = chronik.tx(self.txid).ok()
        self.test_tx(proto_tx, block_hash)
        if self.token_info is not None:
            proto_token = chronik.token_info(self.txid).ok()
            self.test_token_info(proto_token, block_hash)
        else:
            chronik.token_info(self.txid).err(404)

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

    def test_token_info(self, proto_token, block_hash=None):
        import chronik_pb2 as pb

        assert_equal(proto_token.token_id, self.token_info.token_id)
        assert_equal(proto_token.token_type, self.token_info.token_type)
        assert_equal(proto_token.genesis_info, self.token_info.genesis_info)
        if block_hash is not None:
            assert_equal(proto_token.block.hash, bytes.fromhex(block_hash)[::-1])
        else:
            assert_equal(proto_token.block, pb.BlockMetadata())
