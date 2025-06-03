# Copyright (c) 2024-present The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's electrum interface: blockchain.* methods
"""
from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    SCRIPT_UNSPENDABLE,
)
from test_framework.blocktools import (
    GENESIS_BLOCK_HASH,
    GENESIS_BLOCK_HEADER,
    GENESIS_CB_SCRIPT_PUBKEY,
    GENESIS_CB_SCRIPT_SIG,
    GENESIS_CB_TXID,
    TIME_GENESIS_BLOCK,
)
from test_framework.hash import hex_be_sha256
from test_framework.merkle import merkle_root_and_branch
from test_framework.messages import (
    XEC,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    FromHex,
    ToHex,
)
from test_framework.script import OP_RETURN, OP_TRUE, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    chronikelectrum_port,
    hex_to_be_bytes,
)
from test_framework.wallet import MiniWallet

COINBASE_TX_HEX = (
    "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d"
    + GENESIS_CB_SCRIPT_SIG.hex()
    + "ffffffff0100f2052a0100000043"
    + GENESIS_CB_SCRIPT_PUBKEY.hex()
    + "00000000"
)

max_int32 = 2**31 - 1
max_int64 = 2**63 - 1


class ChronikElectrumBlockchain(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}:t",
            ]
        ]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        self.client = self.nodes[0].get_chronik_electrum_client(name="client")
        self.node = self.nodes[0]
        self.wallet = MiniWallet(self.node)

        self.test_invalid_params()
        self.test_transaction_get()
        self.test_transaction_get_confirmed_blockhash()
        self.test_transaction_get_height()
        self.test_transaction_broadcast()
        self.test_transaction_get_merkle()
        self.test_transaction_id_from_pos()
        self.test_block_header()
        self.test_scripthash()
        self.test_headers_subscribe()
        self.test_scripthash_subscribe()
        self.test_address_get_scripthash()
        self.test_estimate_fee()
        self.test_relay_fee()

    def test_invalid_params(self):
        # Invalid params type
        for response in (
            self.client.synchronous_request("blockchain.transaction.get", params="foo"),
            self.client.synchronous_request("blockchain.transaction.get", params=42),
        ):
            assert_equal(
                response.error,
                {"code": -32602, "message": "'params' must be an array or an object"},
            )

        assert_equal(
            self.client.synchronous_request(
                "blockchain.transaction.get", params=None
            ).error,
            {"code": -32602, "message": "Missing required params"},
        )

        # Too many params
        for response in (
            self.client.blockchain.transaction.get(1, 2, 3),
            self.client.blockchain.transaction.get(tx_hash=1, verbose=2, blockhash=3),
        ):
            assert_equal(
                response.error,
                {"code": -32602, "message": "Expected at most 2 parameters"},
            )
        assert_equal(
            self.client.blockchain.transaction.get_height(1, 2).error,
            {"code": -32602, "message": "Expected at most 1 parameter"},
        )

        # Missing mandatory argument in otherwise valid params
        for response in (
            self.client.synchronous_request("blockchain.transaction.get", params=[]),
            self.client.synchronous_request("blockchain.transaction.get", params={}),
            self.client.synchronous_request(
                "blockchain.transaction.get",
                params={"nottxid": 32 * "ff", "verbose": False},
            ),
            self.client.blockchain.transaction.get(verbose=True),
        ):
            assert_equal(
                response.error,
                {"code": -32602, "message": "Missing mandatory 'tx_hash' parameter"},
            )

        # Non-string json type for txid
        assert_equal(
            self.client.blockchain.transaction.get(tx_hash=int(32 * "ff", 16)).error,
            {"code": 1, "message": "Invalid tx hash"},
        )

        for response in (
            # non-hex characters
            self.client.blockchain.transaction.get("les sanglots longs"),
            # odd number of hex chars
            self.client.blockchain.transaction.get(GENESIS_CB_TXID[:-1]),
            # valid hex but invalid length for a txid
            self.client.blockchain.transaction.get(GENESIS_CB_TXID[:-2]),
        ):
            assert_equal(
                response.error,
                {"code": 1, "message": "Invalid tx hash"},
            )

        # Invalid type for boolean argument
        assert_equal(
            self.client.blockchain.transaction.get(
                tx_hash=32 * "ff", verbose="true"
            ).error,
            {
                "code": 1,
                "message": "Invalid verbose argument; expected boolean",
            },
        )

        # Valid txid, but no such transaction was found
        assert_equal(
            self.client.blockchain.transaction.get(tx_hash=32 * "ff").error,
            {
                "code": 1,
                "message": "No transaction matching the requested hash was found",
            },
        )

    def test_transaction_get(self):
        for response in (
            self.client.blockchain.transaction.get(GENESIS_CB_TXID),
            self.client.blockchain.transaction.get(GENESIS_CB_TXID, False),
            self.client.blockchain.transaction.get(tx_hash=GENESIS_CB_TXID),
            self.client.blockchain.transaction.get(
                tx_hash=GENESIS_CB_TXID, verbose=False
            ),
        ):
            assert_equal(response.result, COINBASE_TX_HEX)

        for response in (
            self.client.blockchain.transaction.get(GENESIS_CB_TXID, True),
            self.client.blockchain.transaction.get(
                tx_hash=GENESIS_CB_TXID, verbose=True
            ),
        ):
            assert_equal(
                response.result,
                {
                    "blockhash": GENESIS_BLOCK_HASH,
                    "blocktime": TIME_GENESIS_BLOCK,
                    "confirmations": 201,
                    "hash": GENESIS_CB_TXID,
                    "hex": COINBASE_TX_HEX,
                    "time": 0,
                },
            )

        self.generate(self.wallet, 2)
        assert_equal(
            self.client.blockchain.transaction.get(
                tx_hash=GENESIS_CB_TXID, verbose=True
            ).result["confirmations"],
            203,
        )

    def test_transaction_get_confirmed_blockhash(self):
        for response in (
            self.client.blockchain.transaction.get_confirmed_blockhash(GENESIS_CB_TXID),
            self.client.blockchain.transaction.get_confirmed_blockhash(
                GENESIS_CB_TXID, False
            ),
            self.client.blockchain.transaction.get_confirmed_blockhash(
                tx_hash=GENESIS_CB_TXID
            ),
            self.client.blockchain.transaction.get_confirmed_blockhash(
                tx_hash=GENESIS_CB_TXID, include_header=False
            ),
        ):
            assert_equal(
                response.result,
                {
                    "block_hash": GENESIS_BLOCK_HASH,
                    "block_height": 0,
                },
            )

        for response in (
            self.client.blockchain.transaction.get_confirmed_blockhash(
                GENESIS_CB_TXID, True
            ),
            self.client.blockchain.transaction.get_confirmed_blockhash(
                tx_hash=GENESIS_CB_TXID, include_header=True
            ),
        ):
            assert_equal(
                response.result,
                {
                    "block_hash": GENESIS_BLOCK_HASH,
                    "block_header": GENESIS_BLOCK_HEADER,
                    "block_height": 0,
                },
            )

        assert_equal(
            self.client.blockchain.transaction.get_confirmed_blockhash("0" * 64).error,
            {
                "code": 1,
                "message": "No confirmed transaction matching the requested hash was found",
            },
        )

        assert_equal(
            self.client.blockchain.transaction.get_confirmed_blockhash(
                GENESIS_CB_TXID, "foo"
            ).error,
            {
                "code": 1,
                "message": "Invalid second argument; expected boolean",
            },
        )

        mempool_txid = self.wallet.send_self_transfer(from_node=self.node)["txid"]
        assert mempool_txid in self.node.getrawmempool()

        assert_equal(
            self.client.blockchain.transaction.get_confirmed_blockhash(
                mempool_txid
            ).error,
            {
                "code": 1,
                "message": "No confirmed transaction matching the requested hash was found",
            },
        )

        tip = self.generate(self.wallet, 1)[0]
        assert_equal(
            self.client.blockchain.transaction.get_confirmed_blockhash(
                mempool_txid
            ).result,
            {
                "block_hash": tip,
                "block_height": self.node.getblockcount(),
            },
        )

    def test_transaction_get_height(self):
        response = self.client.blockchain.transaction.get_height(GENESIS_CB_TXID)
        assert_equal(response.result, 0)

        self.wallet.rescan_utxos()
        tx = self.wallet.create_self_transfer()

        response = self.client.blockchain.transaction.broadcast(tx["hex"])
        assert_equal(response.result, tx["txid"])
        self.node.syncwithvalidationinterfacequeue()

        response = self.client.blockchain.transaction.get(tx["txid"])
        assert_equal(response.result, tx["hex"])

        # A mempool transaction has height 0
        response = self.client.blockchain.transaction.get_height(tx["txid"])
        assert_equal(response.result, 0)

        # Mine the tx
        self.generate(self.wallet, 1)
        response = self.client.blockchain.transaction.get_height(tx["txid"])
        assert_equal(response.result, self.node.getblockcount())

        response = self.client.blockchain.transaction.get_height(32 * "ff")
        assert_equal(response.error, {"code": -32600, "message": "Unknown tx_hash"})

    def test_transaction_broadcast(self):
        tx_reference = self.wallet.create_self_transfer(target_size=100)
        raw_tx_reference = tx_reference["hex"]

        # broadcasting is allowed as long as the transaction is not mined
        for _ in range(3):
            response = self.client.blockchain.transaction.broadcast(raw_tx_reference)
            assert_equal(response.result, tx_reference["txid"])

        self.generate(self.wallet, 1)
        response = self.client.blockchain.transaction.broadcast(raw_tx_reference)
        assert_equal(
            response.error, {"code": 1, "message": "Transaction already in block chain"}
        )

        # different transaction that spend the same input
        tx_obj = self.wallet.create_self_transfer(target_size=200)["tx"]
        tx_obj.vin[0] = tx_reference["tx"].vin[0]
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {"code": 1, "message": "Missing inputs: bad-txns-inputs-missingorspent"},
        )

        tx_obj = FromHex(CTransaction(), raw_tx_reference)
        tx_obj.vin[0].scriptSig = b"aaaaaaaaaaaaaaa"
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {
                "code": 1,
                "message": "Transaction rejected by mempool: scriptsig-not-pushonly",
            },
        )

        tx_obj = FromHex(CTransaction(), raw_tx_reference)
        tx_obj.vout[0].scriptPubKey = CScript([OP_RETURN, b"\xff"])
        tx_obj.vout = [tx_obj.vout[0]] * 2
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {"code": 1, "message": "Transaction rejected by mempool: multi-op-return"},
        )

        tx_obj = FromHex(CTransaction(), raw_tx_reference)
        tx_obj.vin[0].nSequence = 0xFFFFFFFE
        tx_obj.nLockTime = self.node.getblockcount() + 1
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {
                "code": 1,
                "message": "Transaction rejected by mempool: bad-txns-nonfinal, non-final transaction",
            },
        )

        tx_obj = FromHex(CTransaction(), raw_tx_reference)
        tx_obj.vout = []
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {
                "code": 1,
                "message": "Transaction rejected by mempool: bad-txns-vout-empty",
            },
        )

        # Non-standard script
        tx_obj.vout.append(CTxOut(0, CScript([OP_TRUE])))
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {"code": 1, "message": "Transaction rejected by mempool: scriptpubkey"},
        )

        tx_obj.vout[0] = CTxOut(0, CScript([OP_RETURN, b"\xff"]))
        assert len(ToHex(tx_obj)) // 2 < 100
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {
                "code": 1,
                "message": "Transaction rejected by mempool: bad-txns-undersize",
            },
        )

        tx_obj = self.wallet.create_self_transfer(target_size=100_001)["tx"]
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {"code": 1, "message": "Transaction rejected by mempool: tx-size"},
        )

        tx_obj = FromHex(CTransaction(), raw_tx_reference)
        tx_obj.vin.append(tx_obj.vin[0])
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {
                "code": 1,
                "message": "Transaction rejected by mempool: bad-txns-inputs-duplicate",
            },
        )

        tx_obj.vin = []
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {
                "code": 1,
                "message": "Transaction rejected by mempool: bad-txns-vin-empty",
            },
        )

        tx_obj = FromHex(CTransaction(), raw_tx_reference)
        tx_obj.nVersion = 1337
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {"code": 1, "message": "Transaction rejected by mempool: version"},
        )

        # Coinbase input in first position
        tx_obj = FromHex(CTransaction(), raw_tx_reference)
        tx_obj.vin[0] = CTxIn(COutPoint(txid=0, n=0xFFFFFFFF))
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {"code": 1, "message": "Transaction rejected by mempool: bad-tx-coinbase"},
        )

        # Coinbase input in second position
        tx_obj = FromHex(CTransaction(), raw_tx_reference)
        tx_obj.vin.append(CTxIn(COutPoint(txid=0, n=0xFFFFFFFF)))
        response = self.client.blockchain.transaction.broadcast(ToHex(tx_obj))
        assert_equal(
            response.error,
            {
                "code": 1,
                "message": "Transaction rejected by mempool: bad-txns-prevout-null",
            },
        )

        tx = self.wallet.create_self_transfer(fee_rate=0, fee=0)
        response = self.client.blockchain.transaction.broadcast(tx["hex"])
        assert_equal(
            response.error,
            {
                "code": 1,
                "message": "Transaction rejected by mempool: min relay fee not met, 0 < 100",
            },
        )

        tx = self.wallet.create_self_transfer(fee_rate=10_000_000, fee=0)
        response = self.client.blockchain.transaction.broadcast(tx["hex"])
        assert_equal(
            response.error,
            {
                "code": 1,
                "message": "Fee exceeds maximum configured by user (e.g. -maxtxfee, maxfeerate)",
            },
        )

        # Mine enough blocks to ensure that the following test does not try to spend
        # a utxo already spent in a previous test.
        # Invalidate two blocks, so that miniwallet has access to a coin that
        # will mature in the next block.
        self.generate(self.wallet, 100)
        chain_height = self.node.getblockcount() - 3
        block_to_invalidate = self.node.getblockhash(chain_height + 1)
        self.node.invalidateblock(block_to_invalidate)
        immature_txid = self.nodes[0].getblock(
            self.nodes[0].getblockhash(chain_height - 100 + 2)
        )["tx"][0]
        immature_utxo = self.wallet.get_utxo(txid=immature_txid)
        tx = self.wallet.create_self_transfer(utxo_to_spend=immature_utxo)
        response = self.client.blockchain.transaction.broadcast(tx["hex"])
        assert_equal(
            response.error,
            {
                "code": 1,
                "message": "Transaction rejected by mempool: bad-txns-premature-spend-of-coinbase, tried to spend coinbase at depth 99",
            },
        )

    def test_transaction_get_merkle(self):
        for _ in range(42):
            self.wallet.send_self_transfer(from_node=self.node)
        block_hash = self.generate(self.node, 1)[0]
        block_info = self.node.getblock(block_hash)
        height = block_info["height"]
        txids_hex = block_info["tx"]
        txids = [hex_to_be_bytes(txid) for txid in txids_hex]

        for i in range(len(txids)):
            _root, branch = merkle_root_and_branch(txids, i)
            assert_equal(
                self.client.blockchain.transaction.get_merkle(txids_hex[i]).result,
                {
                    "block_height": height,
                    "merkle": [h[::-1].hex() for h in branch],
                    "pos": i,
                },
            )

        # We can optionally specify the correct block height as 2nd argument
        assert_equal(
            self.client.blockchain.transaction.get_merkle(
                tx_hash=txids_hex[-1], height=height
            ).result,
            {
                "block_height": height,
                "merkle": [h[::-1].hex() for h in branch],
                "pos": len(txids) - 1,
            },
        )

        assert_equal(
            self.client.blockchain.transaction.get_merkle(32 * "ff").error,
            {
                "code": 1,
                "message": "No confirmed transaction matching the requested hash was found",
            },
        )

        for wrong_height in (1, height - 1, height + 1, max_int32):
            assert_equal(
                self.client.blockchain.transaction.get_merkle(
                    txids_hex[-1], wrong_height
                ).error,
                {
                    "code": 1,
                    "message": f"No transaction matching the requested hash found at height {wrong_height}",
                },
            )

        for invalid_height in (-1, max_int32 + 1, max_int64, max_int64 + 1):
            assert_equal(
                self.client.blockchain.transaction.get_merkle(
                    txids_hex[-1], invalid_height
                ).error,
                {
                    "code": 1,
                    "message": "Invalid height argument; expected non-negative numeric value",
                },
            )

    def test_transaction_id_from_pos(self):
        for _ in range(42):
            self.wallet.send_self_transfer(from_node=self.node)
        block_hash = self.generate(self.node, 1)[0]
        block_info = self.node.getblock(block_hash)
        height = block_info["height"]
        txids_hex = block_info["tx"]
        txids = [hex_to_be_bytes(txid) for txid in txids_hex]

        for i in range(len(txids)):
            _root, branch = merkle_root_and_branch(txids, i)
            assert_equal(
                self.client.blockchain.transaction.id_from_pos(height, i, False).result,
                txids_hex[i],
            )
            assert_equal(
                self.client.blockchain.transaction.id_from_pos(height, i, True).result,
                {
                    "tx_hash": txids_hex[i],
                    "merkle": [h[::-1].hex() for h in branch],
                },
            )

        # The block at height of tip + 1 doesn't exist
        assert_equal(
            self.client.blockchain.transaction.id_from_pos(height + 1, 0).error,
            {
                "code": 1,
                "message": f"No transaction at position 0 for height {height + 1}",
            },
        )
        # The transaction at index numtx doesn't exist (because it's indexed
        # from 0).
        assert_equal(
            self.client.blockchain.transaction.id_from_pos(height, len(txids)).error,
            {
                "code": 1,
                "message": f"No transaction at position {len(txids)} for height {height}",
            },
        )

        for bad_height in ["", "0", -1, "foo"]:
            assert_equal(
                self.client.blockchain.transaction.id_from_pos(bad_height, 0).error,
                {
                    "code": 1,
                    "message": "Invalid height argument; expected non-negative numeric value",
                },
            )
            assert_equal(
                self.client.blockchain.transaction.id_from_pos(
                    height=bad_height, tx_pos=0
                ).error,
                {
                    "code": 1,
                    "message": "Invalid height argument; expected non-negative numeric value",
                },
            )

        for bad_tx_pos in ["", "0", -1, "foo"]:
            assert_equal(
                self.client.blockchain.transaction.id_from_pos(0, bad_tx_pos).error,
                {
                    "code": 1,
                    "message": "Invalid tx_pos argument; expected non-negative numeric value",
                },
            )
            assert_equal(
                self.client.blockchain.transaction.id_from_pos(
                    height=0, tx_pos=bad_tx_pos
                ).error,
                {
                    "code": 1,
                    "message": "Invalid tx_pos argument; expected non-negative numeric value",
                },
            )

        for bad_merkle in ["", "false", 1, "foo"]:
            assert_equal(
                self.client.blockchain.transaction.id_from_pos(0, 0, bad_merkle).error,
                {
                    "code": 1,
                    "message": "Invalid merkle argument; expected boolean",
                },
            )
            assert_equal(
                self.client.blockchain.transaction.id_from_pos(
                    height=0, tx_pos=0, merkle=bad_merkle
                ).error,
                {
                    "code": 1,
                    "message": "Invalid merkle argument; expected boolean",
                },
            )

    def test_block_header(self):
        block_hashes = [
            self.node.getblockhash(i) for i in range(self.node.getblockcount() + 1)
        ]
        block_hashes_bytes = [hex_to_be_bytes(bh) for bh in block_hashes]
        headers = [self.node.getblockheader(bh, False) for bh in block_hashes]

        self.log.info("Testing the blockchain.headers.get_tip RPC")

        tip_height = len(headers) - 1
        tip_hash = block_hashes[-1]
        tip_header = headers[-1]

        assert_equal(
            self.client.blockchain.headers.get_tip(tip_height).error,
            {
                "code": -32602,
                "message": "Expected at most 0 parameters",
            },
        )
        assert_equal(
            self.client.blockchain.headers.get_tip(tip_hash).error,
            {
                "code": -32602,
                "message": "Expected at most 0 parameters",
            },
        )

        assert_equal(
            self.client.blockchain.headers.get_tip().result,
            {
                "height": tip_height,
                "hex": tip_header,
            },
        )

        self.log.info(
            "Testing the blockchain.block.header and blockchain.header.get RPCs"
        )
        response = self.client.blockchain.block.header(0)
        assert_equal(response.result, headers[0])
        assert_equal(
            self.client.blockchain.header.get(0).result,
            {
                "height": 0,
                "hex": headers[0],
            },
        )

        height = len(block_hashes) // 2
        response = self.client.blockchain.block.header(height, tip_height)
        root, branch = merkle_root_and_branch(block_hashes_bytes, height)
        assert_equal(
            response.result,
            {
                "branch": [h[::-1].hex() for h in branch],
                "header": headers[height],
                "root": root[::-1].hex(),
            },
        )
        assert_equal(
            self.client.blockchain.header.get(height).result,
            {
                "height": height,
                "hex": headers[height],
            },
        )

        for bh in ("toto", -1, max_int32 + 1, max_int64, max_int64 + 1):
            for rpc_call in (
                lambda h: self.client.blockchain.block.header(h),
                lambda h: self.client.blockchain.block.headers(start_height=h, count=0),
            ):
                assert_equal(
                    rpc_call(bh).error,
                    {
                        "code": 1,
                        "message": "Invalid height",
                    },
                )

        for bh in (-1, max_int32 + 1, max_int64, max_int64 + 1):
            assert_equal(
                self.client.blockchain.header.get(bh).error,
                {
                    "code": 1,
                    "message": "Invalid height",
                },
            )
        for bh in ("toto", "00", "0" * 65):
            assert_equal(
                self.client.blockchain.header.get(bh).error,
                {
                    "code": 1,
                    "message": "Invalid block hash",
                },
            )

        for cp_height in ("toto", -1, max_int32 + 1, max_int64, max_int64 + 1):
            for rpc_call in (
                lambda h: self.client.blockchain.block.header(0, h),
                lambda h: self.client.blockchain.block.headers(0, 10, h),
            ):
                assert_equal(
                    rpc_call(cp_height).error,
                    {
                        "code": 1,
                        "message": "Invalid cp_height",
                    },
                )

        for bh in (max_int32, tip_height + 1):
            for rpc_call in (
                lambda h: self.client.blockchain.block.header(h),
                lambda h: self.client.blockchain.header.get(h),
            ):
                assert_equal(
                    rpc_call(bh).error,
                    {
                        "code": 1,
                        "message": f"Height {bh} is out of range",
                    },
                )

        assert_equal(
            self.client.blockchain.block.header(2, 1).error,
            {
                "code": 1,
                "message": f"header height 2 must be <= cp_height 1 which must be <= chain height {tip_height}",
            },
        )

        self.log.info("Testing the blockchain.block.headers RPC")
        # Fulcrum basically just ignores the other parameters when count = 0,
        # unless they reach a much higher limit than tip_height.
        for start_height in (0, 5, max_int32):
            # Note that Fulcrum has a lower hard limit than max int32 start_height
            # before returning a RPC error: Storage::MAX_HEADERS = 100'000'000.
            # So it is a minor difference in behavior to not error in such a case for
            # 100'000'000 < start_height <= 2**31
            count = 0
            assert_equal(
                self.client.blockchain.block.headers(start_height, count).result,
                {"count": 0, "hex": "", "max": 2016},
            )

        for bh in range(0, tip_height + 1):
            assert_equal(
                self.client.blockchain.block.headers(start_height=bh, count=1).result,
                {"count": 1, "hex": headers[bh], "max": 2016},
            )

        start_height = 5
        count = 6
        assert_equal(
            self.client.blockchain.block.headers(start_height, count).result,
            {
                "count": 6,
                "hex": "".join(headers[start_height : start_height + count]),
                "max": 2016,
            },
        )

        cp_height = 21
        root, branch = merkle_root_and_branch(
            block_hashes_bytes[: cp_height + 1], start_height + count - 1
        )
        assert_equal(
            self.client.blockchain.block.headers(start_height, count, cp_height).result,
            {
                "branch": [h[::-1].hex() for h in branch],
                "count": 6,
                "hex": "".join(headers[start_height : start_height + count]),
                "max": 2016,
                "root": root[::-1].hex(),
            },
        )

        # The RPC may return less than {count} headers if the chain is not long enough
        start_height = 4
        for excessive_count in (tip_height - start_height + 2, max_int32):
            response = self.client.blockchain.block.headers(
                start_height, excessive_count
            )
            assert_equal(
                response.result,
                {
                    "count": tip_height - start_height + 1,
                    "hex": "".join(headers[start_height:]),
                    "max": 2016,
                },
            )

        for count in ("toto", -1, max_int32 + 1, max_int64, max_int64 + 1):
            assert_equal(
                self.client.blockchain.block.headers(0, count).error,
                {
                    "code": 1,
                    "message": "Invalid count",
                },
            )

        for cp_height in (1, 8, tip_height + 1, max_int32):
            assert_equal(
                self.client.blockchain.block.headers(0, 10, cp_height).error,
                {
                    "code": 1,
                    "message": (
                        f"header height + (count - 1) 9 must be <= cp_height {cp_height} "
                        f"which must be <= chain height {tip_height}"
                    ),
                },
            )

    def test_scripthash(self):
        for invalid_scripthash in (31 * "ff", 31 * "ff" + "f", 42, False, "spam"):
            assert_equal(
                self.client.blockchain.scripthash.get_balance(invalid_scripthash).error,
                {
                    "code": 1,
                    "message": "Invalid scripthash",
                },
            )
            assert_equal(
                self.client.blockchain.scripthash.get_history(invalid_scripthash).error,
                {
                    "code": 1,
                    "message": "Invalid scripthash",
                },
            )
            assert_equal(
                self.client.blockchain.scripthash.listunspent(invalid_scripthash).error,
                {
                    "code": 1,
                    "message": "Invalid scripthash",
                },
            )
            assert_equal(
                self.client.blockchain.scripthash.get_first_use(
                    invalid_scripthash
                ).error,
                {
                    "code": 1,
                    "message": "Invalid scripthash",
                },
            )
            assert_equal(
                self.client.blockchain.scripthash.get_mempool(invalid_scripthash).error,
                {
                    "code": 1,
                    "message": "Invalid scripthash",
                },
            )

        for invalid_address in (
            "",
            "foobar",
            "ecregtest:",
            "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkk",
        ):
            assert_equal(
                self.client.blockchain.address.get_balance(invalid_address).error,
                {
                    "code": 1,
                    "message": f"Invalid address: {invalid_address}",
                },
            )
            assert_equal(
                self.client.blockchain.address.get_history(invalid_address).error,
                {
                    "code": 1,
                    "message": f"Invalid address: {invalid_address}",
                },
            )
            assert_equal(
                self.client.blockchain.address.listunspent(invalid_address).error,
                {
                    "code": 1,
                    "message": f"Invalid address: {invalid_address}",
                },
            )
            assert_equal(
                self.client.blockchain.address.get_first_use(invalid_address).error,
                {
                    "code": 1,
                    "message": f"Invalid address: {invalid_address}",
                },
            )
            assert_equal(
                self.client.blockchain.address.get_mempool(invalid_address).error,
                {
                    "code": 1,
                    "message": f"Invalid address: {invalid_address}",
                },
            )

        # valid hash, but not associated with any known script
        assert_equal(
            self.client.blockchain.scripthash.get_balance(32 * "ff").result,
            {
                "confirmed": 0,
                "unconfirmed": 0,
            },
        )
        assert_equal(
            self.client.blockchain.scripthash.get_history(32 * "ff").result,
            [],
        )
        assert_equal(
            self.client.blockchain.scripthash.listunspent(32 * "ff").result,
            [],
        )
        assert_equal(
            self.client.blockchain.scripthash.get_first_use(32 * "ff").result,
            None,
        )
        assert_equal(
            self.client.blockchain.scripthash.get_mempool(32 * "ff").result,
            [],
        )

        # Valid address, but not associated with any known coin. With or without
        # prefix
        for address in (
            "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpuvt7ljzqy",
            "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpuvt7ljzqy",
        ):
            assert_equal(
                self.client.blockchain.scripthash.get_balance(32 * "ff").result,
                {
                    "confirmed": 0,
                    "unconfirmed": 0,
                },
            )
            assert_equal(
                self.client.blockchain.scripthash.get_history(32 * "ff").result,
                [],
            )
            assert_equal(
                self.client.blockchain.scripthash.listunspent(32 * "ff").result,
                [],
            )
            assert_equal(
                self.client.blockchain.scripthash.get_first_use(32 * "ff").result,
                None,
            )
            assert_equal(
                self.client.blockchain.scripthash.get_mempool(32 * "ff").result,
                [],
            )

        # Mine a block just to be sure all the utxos are confirmed
        self.generate(self.wallet, 1)
        value = sum(
            [
                utxo["value"]
                for utxo in self.wallet.get_utxos(
                    include_immature_coinbase=True, mark_as_spent=False
                )
            ]
        )
        scripthash = hex_be_sha256(self.wallet.get_scriptPubKey())
        address = ADDRESS_ECREG_P2SH_OP_TRUE
        balance = self.client.blockchain.scripthash.get_balance(scripthash).result
        assert_equal(
            balance,
            {
                "confirmed": value * XEC,
                "unconfirmed": 0,
            },
        )
        assert_equal(
            self.client.blockchain.address.get_balance(address).result,
            balance,
        )

        tx = self.wallet.send_self_transfer(from_node=self.node)
        balance = self.client.blockchain.scripthash.get_balance(scripthash).result
        assert_equal(
            balance,
            {"confirmed": value * XEC, "unconfirmed": -tx["fee"] * XEC},
        )
        assert_equal(
            self.client.blockchain.address.get_balance(address).result,
            balance,
        )

        self.generatetoaddress(self.node, 1, ADDRESS_ECREG_UNSPENDABLE)
        balance = self.client.blockchain.scripthash.get_balance(scripthash).result
        assert_equal(
            balance,
            {
                "confirmed": (value - tx["fee"]) * XEC,
                "unconfirmed": 0,
            },
        )
        assert_equal(
            self.client.blockchain.address.get_balance(address).result,
            balance,
        )

        # Send transactions to a previously unused script
        address = "ecregtest:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq5qvvema7"
        script = CScript(
            bytes.fromhex("76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac")
        )
        scripthash = hex_be_sha256(script)
        confirmed = 0
        unconfirmed = 0
        history = []
        mempool = []
        utxos = []

        assert_equal(
            self.client.blockchain.scripthash.get_first_use(scripthash).result,
            None,
        )
        assert_equal(
            self.client.blockchain.address.get_first_use(address).result,
            None,
        )

        def utxo_sorting_key(utxo):
            return utxo["tx_hash"], utxo["tx_pos"]

        def assert_scripthash_balance_and_history():
            balance = self.client.blockchain.scripthash.get_balance(scripthash).result
            assert_equal(
                balance,
                {
                    "confirmed": confirmed,
                    "unconfirmed": unconfirmed,
                },
            )
            assert_equal(
                self.client.blockchain.address.get_balance(address).result,
                balance,
            )
            actual_history = self.client.blockchain.scripthash.get_history(
                scripthash
            ).result
            assert_equal(
                self.client.blockchain.address.get_history(address).result,
                actual_history,
            )
            expected_history = history
            actual_utxos = self.client.blockchain.scripthash.listunspent(
                scripthash
            ).result
            assert_equal(
                self.client.blockchain.address.listunspent(address).result,
                actual_utxos,
            )
            expected_utxos = utxos

            actual_mempool = self.client.blockchain.scripthash.get_mempool(
                scripthash
            ).result
            assert_equal(
                self.client.blockchain.address.get_mempool(address).result,
                actual_mempool,
            )
            expected_mempool = mempool

            def electrum_history_sort(hist):
                # Extract confirmed txs and sort by ascending height then
                # txid
                conf_hist = [tx for tx in hist if tx["height"] > 0]
                # We use no coinbase tx in this test, otherwise this should be
                # accounted for (a coinbase tx should remain at first position)
                conf_hist.sort(key=lambda tx: tx["tx_hash"])
                conf_hist.sort(key=lambda tx: tx["height"])

                # Extract unconfirmed txs and sort by descending height then
                # txid
                unconf_hist = [tx for tx in hist if tx["height"] <= 0]
                unconf_hist.sort(key=lambda tx: tx["tx_hash"])
                unconf_hist.sort(key=lambda tx: tx["height"], reverse=True)

                # The full history is made of confirmed txs first then
                # unconfirmed txs
                return conf_hist + unconf_hist

            expected_history = electrum_history_sort(expected_history)
            # Actually the same sort except all mempool txs have a block
            # height of 0
            expected_utxos = electrum_history_sort(expected_utxos)
            expected_mempool = electrum_history_sort(expected_mempool)

            assert_equal(actual_history, expected_history)
            assert_equal(actual_utxos, expected_utxos)
            assert_equal(actual_mempool, expected_mempool)

        assert_scripthash_balance_and_history()

        def add_unconfirmed_transaction(amount: int, fee: int) -> tuple[str, int]:
            nonlocal unconfirmed
            nonlocal history
            nonlocal utxos
            nonlocal mempool
            txid, n = self.wallet.send_to(
                from_node=self.node, scriptPubKey=script, amount=amount, fee=fee
            )
            unconfirmed += amount

            unconfirmed_parents = len(self.node.getmempoolentry(txid)["depends"]) > 0
            history_entry = {
                "fee": fee,
                "height": -1 if unconfirmed_parents else 0,
                "tx_hash": txid,
            }
            history.append(history_entry)
            mempool.append(history_entry)

            # Note that unlike history, mempool utxos are always returned with a
            # height of 0 independently of the presence of unconfirmed parents.
            utxos.append({"height": 0, "tx_hash": txid, "tx_pos": n, "value": amount})

            return txid, n

        txid, n = add_unconfirmed_transaction(amount=1337, fee=1000)
        assert_scripthash_balance_and_history()

        first_use = self.client.blockchain.scripthash.get_first_use(scripthash).result
        assert_equal(
            first_use,
            {
                "block_hash": "00" * 32,
                "height": 0,
                "tx_hash": txid,
            },
        )
        assert_equal(
            self.client.blockchain.address.get_first_use(address).result,
            first_use,
        )

        # Confirm the transaction
        self.generatetoaddress(self.node, 1, ADDRESS_ECREG_UNSPENDABLE)
        confirmed += 1337
        unconfirmed -= 1337
        h = self.node.getblockcount()
        history.pop()
        history.append({"height": h, "tx_hash": txid})
        utxos.pop()
        utxos.append({"height": h, "tx_hash": txid, "tx_pos": n, "value": 1337})
        mempool.clear()
        assert_scripthash_balance_and_history()

        first_use = self.client.blockchain.scripthash.get_first_use(scripthash).result
        assert_equal(
            first_use,
            {
                "block_hash": self.node.getblockhash(h),
                "height": h,
                "tx_hash": txid,
            },
        )
        assert_equal(
            self.client.blockchain.address.get_first_use(address).result,
            first_use,
        )

        for _ in range(3):
            txid, n = add_unconfirmed_transaction(amount=1337, fee=1000)
            assert_scripthash_balance_and_history()

            assert_equal(
                self.client.blockchain.scripthash.get_first_use(scripthash).result,
                first_use,
            )
            assert_equal(
                self.client.blockchain.address.get_first_use(address).result,
                first_use,
            )

            # Confirm the transaction
            self.generatetoaddress(self.node, 1, ADDRESS_ECREG_UNSPENDABLE)
            confirmed += 1337
            unconfirmed -= 1337
            h = self.node.getblockcount()
            history.pop()
            history.append({"height": h, "tx_hash": txid})
            utxos.pop()
            utxos.append({"height": h, "tx_hash": txid, "tx_pos": n, "value": 1337})
            mempool.clear()
            assert_scripthash_balance_and_history()

            assert_equal(
                self.client.blockchain.scripthash.get_first_use(scripthash).result,
                first_use,
            )
            assert_equal(
                self.client.blockchain.address.get_first_use(address).result,
                first_use,
            )

        # History with multiple unconfirmed transactions
        for _ in range(3):
            add_unconfirmed_transaction(amount=888, fee=999)
            assert_scripthash_balance_and_history()

        # Test an excessive transaction history
        history_len = len(
            self.client.blockchain.scripthash.get_history(scripthash).result
        )

        self.stop_node(0)

        self.nodes[0].assert_start_raises_init_error(
            extra_args=self.extra_args[0] + ["-chronikelectrummaxhistory=-1"],
            expected_msg="Error: The -chronikelectrummaxhistory value should be within the range [1, 4294967295].",
        )

        self.nodes[0].assert_start_raises_init_error(
            extra_args=self.extra_args[0] + ["-chronikelectrummaxhistory=0"],
            expected_msg="Error: The -chronikelectrummaxhistory value should be within the range [1, 4294967295].",
        )

        self.nodes[0].assert_start_raises_init_error(
            extra_args=self.extra_args[0] + ["-chronikelectrummaxhistory=4294967296"],
            expected_msg="Error: The -chronikelectrummaxhistory value should be within the range [1, 4294967295].",
        )

        self.start_node(
            0,
            extra_args=self.extra_args[0]
            + [f"-chronikelectrummaxhistory={history_len + 1}"],
        )
        self.client = self.nodes[0].get_chronik_electrum_client(name="client")
        # We can add one more transaction
        add_unconfirmed_transaction(amount=777, fee=998)
        assert_scripthash_balance_and_history()

        # The next transaction makes the tx history too long.
        add_unconfirmed_transaction(amount=777, fee=998)
        msg = f"transaction history for scripthash {scripthash} exceeds limit ({history_len + 1})"
        assert_equal(
            self.client.blockchain.scripthash.get_history(scripthash).error,
            {
                "code": 1,
                "message": msg,
            },
        )
        # We compute the balance on demand, so this RPC is also limited by the max
        # history parameter.
        assert_equal(
            self.client.blockchain.scripthash.get_balance(scripthash).error,
            {
                "code": 1,
                "message": msg,
            },
        )
        # But the listunspent RPC is unaffected.
        assert_equal(
            sorted(
                self.client.blockchain.scripthash.listunspent(scripthash).result,
                key=utxo_sorting_key,
            ),
            sorted(utxos, key=utxo_sorting_key),
        )

        # Remove the history limit for the next tests
        self.restart_node(0)
        self.client = self.node.get_chronik_electrum_client(name="client")
        self.wallet.rescan_utxos()

    def test_headers_subscribe(self):
        self.log.info("Test the blockchain.headers.subscribe endpoint")

        def new_header():
            tip = self.generate(self.node, 1)[0]
            height = self.node.getblockcount()
            header_hex = self.node.getblockheader(tip, verbose=False)
            return height, header_hex

        (height, header_hex) = new_header()

        sub_message = self.client.blockchain.headers.subscribe()
        assert_equal(
            sub_message.result,
            {
                "height": height,
                "hex": header_hex,
            },
        )

        # Subscribing again is a no-op and returns the same result
        for _ in range(3):
            sub_message = self.client.blockchain.headers.subscribe()
            assert_equal(
                sub_message.result,
                {
                    "height": height,
                    "hex": header_hex,
                },
            )

        def check_notification(clients, height, header_hex):
            for client in clients:
                notification = client.wait_for_notification(
                    "blockchain.headers.subscribe"
                )[0]
                assert_equal(notification["height"], height)
                assert_equal(notification["hex"], header_hex)

        # Mine a block and check we get the message we subscribed for
        (height, header_hex) = new_header()
        check_notification([self.client], height, header_hex)

        # Let's add more clients
        client2 = self.node.get_chronik_electrum_client(name="client2")
        sub_message = client2.blockchain.headers.subscribe()
        assert_equal(
            sub_message.result,
            {
                "height": height,
                "hex": header_hex,
            },
        )

        # At this stage both self.client and client2 will receive header
        # notifications
        (height, header_hex) = new_header()
        check_notification([self.client, client2], height, header_hex)

        client3 = self.node.get_chronik_electrum_client(name="client3")
        sub_message = client3.blockchain.headers.subscribe()
        assert_equal(
            sub_message.result,
            {
                "height": height,
                "hex": header_hex,
            },
        )

        # At this stage self.client, client2 and client3 will receive header
        # notifications
        (height, header_hex) = new_header()
        check_notification([self.client, client2, client3], height, header_hex)

        # Unsubscribe client2
        unsub_message = client2.blockchain.headers.unsubscribe()
        assert_equal(unsub_message.result, True)

        # From now on client2 won't receive the header notifications anymore
        (height, header_hex) = new_header()
        check_notification([self.client, client3], height, header_hex)

        try:
            client2.wait_for_notification("blockchain.headers.subscribe", timeout=1)
            assert False, "Received an unexpected header notification"
        except TimeoutError:
            pass

        # Unsubscribing more is a no-op and returns False
        for _ in range(3):
            unsub_message = client2.blockchain.headers.unsubscribe()
            assert_equal(unsub_message.result, False)

        # Unsubscribe all the clients so we don't mess with other tests
        unsub_message = self.client.blockchain.headers.unsubscribe()
        assert_equal(unsub_message.result, True)
        unsub_message = client3.blockchain.headers.unsubscribe()
        assert_equal(unsub_message.result, True)

    def test_scripthash_subscribe(self):
        self.log.info("Test the blockchain.scripthash.subscribe endpoint")

        self.generate(self.wallet, 10)

        # Subscribing to an address with no history returns null as a status
        sub_message = self.client.blockchain.scripthash.subscribe("0" * 64)
        result_no_history = sub_message.result
        assert_equal(result_no_history, None)
        assert_equal(
            self.client.blockchain.address.subscribe(
                "ecregtest:prllllllllllllllllllllllllllllllluj3tvnrr9"
            ).result,
            result_no_history,
        )

        # Subscribing to an address with some history returns a hash as a status
        # Note that this scriptpubkey corresponds to ADDRESS_ECREG_P2SH_OP_TRUE
        scripthash = hex_be_sha256(self.wallet.get_scriptPubKey())
        assert_greater_than(
            len(self.client.blockchain.scripthash.get_history(scripthash).result), 0
        )
        sub_message = self.client.blockchain.scripthash.subscribe(scripthash)
        result_history = sub_message.result
        assert result_history is not None
        assert_equal(len(result_history), 64)
        assert_equal(
            self.client.blockchain.address.subscribe(ADDRESS_ECREG_P2SH_OP_TRUE).result,
            result_history,
        )

        # Subscribing again is a no-op and returns the same result, even if we
        # use the address instead of script hash
        for _ in range(3):
            assert_equal(
                self.client.blockchain.scripthash.subscribe("0" * 64).result,
                result_no_history,
            )
            assert_equal(
                self.client.blockchain.address.subscribe(
                    "ecregtest:prllllllllllllllllllllllllllllllluj3tvnrr9"
                ).result,
                result_no_history,
            )

            assert_equal(
                self.client.blockchain.scripthash.subscribe(scripthash).result,
                result_history,
            )
            assert_equal(
                self.client.blockchain.address.subscribe(
                    ADDRESS_ECREG_P2SH_OP_TRUE
                ).result,
                result_history,
            )

        # Generate a few wallet transactions so we get notifications
        chain = self.wallet.create_self_transfer_chain(chain_length=3)

        def check_notification(
            clients,
            scripthash_or_address,
            last_status=None,
            method="blockchain.scripthash.subscribe",
        ):
            ret_status = None
            for client in clients:
                notification = client.wait_for_notification(method)
                # We should have exactly 2 items, the scripthash (or address)
                # and the status
                assert_equal(len(notification), 2)
                (ret_scripthash_or_address, status) = notification
                assert_equal(ret_scripthash_or_address, scripthash_or_address)
                # Status is some hash
                assert_equal(len(status), 64)

                # The status should be the same for all clients
                if ret_status:
                    assert_equal(status, ret_status)
                ret_status = status

            assert ret_status != last_status
            return ret_status

        # We should get a notification of each tx in the chain. Each tx causes
        # the status to change so the status should be different for each
        # notification.
        last_status = None
        for tx in chain:
            self.node.sendrawtransaction(tx["hex"])
            last_status = check_notification([self.client], scripthash, last_status)

        # Mine a block: the 3 previously unconfirmed txs are confirmed. We get 2
        # notification: 1 for the confirmation of the 3 mempool txs, and 1 for
        # the new coinbase tx
        assert_equal(len(self.node.getrawmempool()), 3)
        self.generate(self.wallet, 1)
        assert_equal(len(self.node.getrawmempool()), 0)

        # Here the confirmation happens for all the txs at the same time, so the
        # status is the same across all the notifications (there is no such
        # thing as one tx enters the block, then another one etc.).
        # But this will differ from the previously saved status because the txs
        # now have a non zero block height (and there is a new coinbase tx).
        last_status = check_notification([self.client], scripthash, last_status)

        # Let's add some clients
        client2 = self.node.get_chronik_electrum_client(name="client2")
        assert_equal(
            client2.blockchain.scripthash.subscribe(scripthash).result, last_status
        )
        client3 = self.node.get_chronik_electrum_client(name="client3")
        assert_equal(
            client3.blockchain.scripthash.subscribe(scripthash).result, last_status
        )

        # Add a few more txs: all clients get notified. The status changes
        # everytime, see the above rationale
        chain = self.wallet.create_self_transfer_chain(chain_length=3)
        for tx in chain:
            self.node.sendrawtransaction(tx["hex"])
            last_status = check_notification(
                [self.client, client2, client3], scripthash, last_status
            )

        # Mine the block to confirm the transactions
        assert_equal(len(self.node.getrawmempool()), 3)
        self.generate(self.wallet, 1)
        assert_equal(len(self.node.getrawmempool()), 0)
        last_status = check_notification(
            [self.client, client2, client3], scripthash, last_status
        )

        # Unsubscribe client 2, the other clients are still notified
        assert_equal(client2.blockchain.scripthash.unsubscribe(scripthash).result, True)

        self.generate(self.wallet, 1)
        last_status = check_notification(
            [self.client, client3], scripthash, last_status
        )

        try:
            client2.wait_for_notification("blockchain.scripthash.subscribe", timeout=1)
            assert False, "Received an unexpected scripthash notification"
        except TimeoutError:
            pass

        # Unsubscribing again is a no-op
        for _ in range(3):
            assert_equal(
                client2.blockchain.scripthash.unsubscribe(scripthash).result, False
            )

        # Subscribe the first client to another hash
        scriptpubkey = CScript(
            bytes.fromhex("76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac")
        )
        other_scripthash = hex_be_sha256(scriptpubkey)
        # This script has some history from the previous tests
        sub_message = self.client.blockchain.scripthash.subscribe(other_scripthash)
        assert_equal(len(sub_message.result), 64)

        # We're sending from the originally subscribed address to the newly
        # subscribed one so we also get the change output
        self.wallet.send_to(
            from_node=self.node,
            scriptPubKey=scriptpubkey,
            amount=1000,
        )
        check_notification([self.client], other_scripthash)
        last_status = check_notification(
            [self.client, client3], scripthash, last_status
        )

        # Unsubscribe the first client from the first scripthash
        assert_equal(
            self.client.blockchain.scripthash.unsubscribe(scripthash).result, True
        )

        # Now only client3 gets notified for the original scripthash
        self.generate(self.wallet, 1)
        check_notification([client3], scripthash, last_status)

        # The other tx get confirmed
        check_notification([self.client], other_scripthash)
        # But that's the only notification
        try:
            self.client.wait_for_notification(
                "blockchain.scripthash.subscribe", timeout=1
            )
            assert False, "Received an unexpected scripthash notification"
        except TimeoutError:
            pass

        # Unsubscribe to everything
        assert_equal(
            self.client.blockchain.scripthash.unsubscribe(other_scripthash).result, True
        )
        # We can also unsubscribe using the equivalent address despite we
        # subscribed to the script hash
        assert_equal(
            client3.blockchain.address.unsubscribe(ADDRESS_ECREG_P2SH_OP_TRUE).result,
            True,
        )
        # Unsubscribing from script hash is now a no-op
        assert_equal(
            client3.blockchain.scripthash.unsubscribe(scripthash).result, False
        )

        # Subscribe to an address first so we get notified using the address as
        # well. Let's use a new address.
        address = "ecregtest:qr8kjf29cdqg03qfhrszleksaf36ue7yqc44rcgt3z"
        scriptpubkey = CScript.fromhex(
            "76a914cf692545c34087c409b8e02fe6d0ea63ae67c40688ac"
        )
        scripthash = hex_be_sha256(scriptpubkey)
        assert_equal(
            self.client.blockchain.address.subscribe(address).result,
            None,
        )
        assert_equal(
            client2.blockchain.address.subscribe(address).result,
            None,
        )
        assert_equal(
            client3.blockchain.address.subscribe(address).result,
            None,
        )

        last_status = None
        for _ in range(3):
            self.wallet.send_to(
                from_node=self.node,
                scriptPubKey=scriptpubkey,
                amount=1000,
            )
            last_status = check_notification(
                [self.client, client2, client3],
                address,
                last_status,
                method="blockchain.address.subscribe",
            )

        # Unsubscribe clients 2 and 3, mixing script_hash and address
        assert_equal(client2.blockchain.address.unsubscribe(address).result, True)
        assert_equal(
            client2.blockchain.scripthash.unsubscribe(scripthash).result, False
        )
        assert_equal(client3.blockchain.scripthash.unsubscribe(scripthash).result, True)
        assert_equal(client3.blockchain.address.unsubscribe(address).result, False)

        # Only the first client gets notified
        self.wallet.send_to(
            from_node=self.node,
            scriptPubKey=scriptpubkey,
            amount=1000,
        )
        last_status = check_notification(
            [self.client], address, last_status, method="blockchain.address.subscribe"
        )
        for client in [client2, client3]:
            try:
                client.wait_for_notification("blockchain.address.subscribe", timeout=1)
                assert False, "Received an unexpected scripthash notification"
            except TimeoutError:
                pass

        assert_equal(self.client.blockchain.address.unsubscribe(address).result, True)

    def test_address_get_scripthash(self):
        self.log.info("Test the blockchain.address.get_scripthash endpoint")

        for address in [
            # Empty
            "",
            # Dummy
            "foobar",
            # Script
            "76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac",
            # Script hash
            "8b01df4e368ea28f8dc0423bcf7a4923e3a12d307c875e47a0cfbf90b5c39161",
            # Invalid eCash address (wrong checksum)
            "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkk",
            # Missing prefix and the prefix ("electrum" here) is not in the
            # supported list
            "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqdxqwk8ju",
        ]:
            assert_equal(
                self.client.blockchain.address.get_scripthash(address).error,
                {
                    "code": 1,
                    "message": f"Invalid address: {address}",
                },
            )

        assert_equal(
            self.client.blockchain.address.get_scripthash(
                ADDRESS_ECREG_UNSPENDABLE
            ).result,
            hex_be_sha256(SCRIPT_UNSPENDABLE),
        )

        # Works for any prefix
        assert_equal(
            self.client.blockchain.address.get_scripthash(
                "electrum:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqdxqwk8ju"
            ).result,
            hex_be_sha256(SCRIPT_UNSPENDABLE),
        )

        # Or without a prefix as long as it's in the supported list.
        for prefixless in [
            "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratqfx",  # ecash:
            "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqk4aavd2h",  # ectest:
            "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkt",  # ecregtest:
            "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq7q2la8d3",  # etoken:
        ]:
            assert_equal(
                self.client.blockchain.address.get_scripthash(prefixless).result,
                hex_be_sha256(SCRIPT_UNSPENDABLE),
            )

    def test_estimate_fee(self):
        self.log.info("Test the blockchain.estimatefee endpoint")

        assert_equal(
            self.client.blockchain.estimatefee("foo").error,
            {
                "code": 1,
                "message": "blockchain.estimatefee parameter should be a single non-negative integer",
            },
        )
        assert_equal(
            self.client.blockchain.estimatefee(-1).error,
            {
                "code": 1,
                "message": "blockchain.estimatefee parameter should be a single non-negative integer",
            },
        )

        # The fee doesn't change depending on the number of confirmations
        assert_equal(
            self.client.blockchain.estimatefee(0).result,
            10,
        )
        assert_equal(
            self.client.blockchain.estimatefee(1).result,
            10,
        )
        assert_equal(
            self.client.blockchain.estimatefee(42).result,
            10,
        )

    def test_relay_fee(self):
        self.log.info("Test the blockchain.relayfee endpoint")

        # This endpoint accepts no parameter
        assert_equal(
            self.client.blockchain.relayfee(42).error,
            {
                "code": -32602,
                "message": "Expected at most 0 parameters",
            },
        )

        # Default min relay fee is 10 XEC/kB
        assert_equal(
            self.client.blockchain.relayfee().result,
            10,
        )

        self.restart_node(0, extra_args=self.extra_args[0] + ["-minrelaytxfee=42"])
        self.client = self.node.get_chronik_electrum_client(name="client")
        self.wallet.rescan_utxos()

        assert_equal(
            self.client.blockchain.relayfee().result,
            42,
        )


if __name__ == "__main__":
    ChronikElectrumBlockchain().main()
