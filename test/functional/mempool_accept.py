# Copyright (c) 2017-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test mempool acceptance of raw transactions."""

from decimal import Decimal

from test_framework.hash import hash160
from test_framework.key import ECKey
from test_framework.messages import (
    MAX_BLOCK_BASE_SIZE,
    MAX_MONEY,
    XEC,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    FromHex,
    ToHex,
)
from test_framework.script import (
    OP_0,
    OP_2,
    OP_3,
    OP_CHECKMULTISIG,
    OP_EQUAL,
    OP_HASH160,
    OP_RETURN,
    CScript,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


class MempoolAcceptanceTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-txindex",
                "-acceptnonstdtxn=0",  # Try to mimic main-net
                "-permitbaremultisig=0",
            ]
        ] * self.num_nodes
        self.supports_cli = False

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def check_mempool_result(self, result_expected, *args, **kwargs):
        """Wrapper to check result of testmempoolaccept on node_0's mempool"""
        result_test = self.nodes[0].testmempoolaccept(*args, **kwargs)
        for r in result_test:
            # Skip these checks for now
            if "fees" in r:
                r["fees"].pop("effective-feerate")
                r["fees"].pop("effective-includes")
        assert_equal(result_expected, result_test)
        # Must not change mempool state
        assert_equal(self.nodes[0].getmempoolinfo()["size"], self.mempool_size)

    def run_test(self):
        node = self.nodes[0]

        self.log.info("Start with empty mempool, and 200 blocks")
        self.mempool_size = 0
        assert_equal(node.getblockcount(), 200)
        assert_equal(node.getmempoolinfo()["size"], self.mempool_size)
        coins = node.listunspent()

        self.log.info("Should not accept garbage to testmempoolaccept")
        assert_raises_rpc_error(
            -3,
            "not of expected type array",
            lambda: node.testmempoolaccept(rawtxs="ff00baar"),
        )
        assert_raises_rpc_error(
            -8,
            "Array must contain between 1 and 50 transactions.",
            lambda: node.testmempoolaccept(rawtxs=["ff22"] * 51),
        )
        assert_raises_rpc_error(
            -8,
            "Array must contain between 1 and 50 transactions.",
            lambda: node.testmempoolaccept(rawtxs=[]),
        )
        assert_raises_rpc_error(
            -22, "TX decode failed", lambda: node.testmempoolaccept(rawtxs=["ff00baar"])
        )

        self.log.info("A transaction already in the blockchain")
        # Pick a random coin(base) to spend
        coin = coins.pop()
        raw_tx_in_block = node.signrawtransactionwithwallet(
            node.createrawtransaction(
                inputs=[{"txid": coin["txid"], "vout": coin["vout"]}],
                outputs=[
                    {node.getnewaddress(): 300000},
                    {node.getnewaddress(): 49000000},
                ],
            )
        )["hex"]
        txid_in_block = node.sendrawtransaction(hexstring=raw_tx_in_block, maxfeerate=0)
        self.generate(node, 1)
        self.mempool_size = 0
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": txid_in_block,
                    "allowed": False,
                    "reject-reason": "txn-already-known",
                }
            ],
            rawtxs=[raw_tx_in_block],
        )

        self.log.info("A transaction not in the mempool")
        fee = Decimal("7.00")
        raw_tx_0 = node.signrawtransactionwithwallet(
            node.createrawtransaction(
                inputs=[{"txid": txid_in_block, "vout": 0, "sequence": 0xFFFFFFFD}],
                outputs=[{node.getnewaddress(): Decimal(300_000) - fee}],
            )
        )["hex"]
        tx = FromHex(CTransaction(), raw_tx_0)
        txid_0 = tx.txid_hex
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": txid_0,
                    "allowed": True,
                    "size": tx.billable_size(),
                    "fees": {"base": fee},
                }
            ],
            rawtxs=[raw_tx_0],
        )

        self.log.info("A final transaction not in the mempool")
        # Pick a random coin(base) to spend
        coin = coins.pop()
        output_amount = Decimal(25_000)
        raw_tx_final = node.signrawtransactionwithwallet(
            node.createrawtransaction(
                inputs=[
                    {"txid": coin["txid"], "vout": coin["vout"], "sequence": 0xFFFFFFFF}
                ],  # SEQUENCE_FINAL
                outputs=[{node.getnewaddress(): output_amount}],
                locktime=node.getblockcount() + 2000,  # Can be anything
            )
        )["hex"]
        tx = FromHex(CTransaction(), raw_tx_final)
        fee_expected = coin["amount"] - output_amount
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": True,
                    "size": tx.billable_size(),
                    "fees": {"base": fee_expected},
                }
            ],
            rawtxs=[tx.serialize().hex()],
            maxfeerate=0,
        )
        node.sendrawtransaction(hexstring=raw_tx_final, maxfeerate=0)
        self.mempool_size += 1

        self.log.info("A transaction in the mempool")
        node.sendrawtransaction(hexstring=raw_tx_0)
        self.mempool_size += 1
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": txid_0,
                    "allowed": False,
                    "reject-reason": "txn-already-in-mempool",
                }
            ],
            rawtxs=[raw_tx_0],
        )

        # Removed RBF test
        # self.log.info('A transaction that replaces a mempool transaction')
        # ...

        self.log.info("A transaction that conflicts with an unconfirmed tx")
        # Send the transaction that conflicts with the mempool transaction
        node.sendrawtransaction(hexstring=tx.serialize().hex(), maxfeerate=0)
        # take original raw_tx_0
        tx = FromHex(CTransaction(), raw_tx_0)
        tx.vout[0].nValue -= int(4 * fee * XEC)  # Set more fee
        # skip re-signing the tx
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "txn-mempool-conflict",
                }
            ],
            rawtxs=[tx.serialize().hex()],
            maxfeerate=0,
        )

        self.log.info("A transaction with missing inputs, that never existed")
        tx = FromHex(CTransaction(), raw_tx_0)
        tx.vin[0].prevout = COutPoint(txid=int("ff" * 32, 16), n=14)
        # skip re-signing the tx
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "missing-inputs",
                }
            ],
            rawtxs=[ToHex(tx)],
        )

        self.log.info(
            "A transaction with missing inputs, that existed once in the past"
        )
        tx = FromHex(CTransaction(), raw_tx_0)
        # Set vout to 1, to spend the other outpoint (49 coins) of the
        # in-chain-tx we want to double spend
        tx.vin[0].prevout.n = 1
        raw_tx_1 = node.signrawtransactionwithwallet(ToHex(tx))["hex"]
        txid_1 = node.sendrawtransaction(hexstring=raw_tx_1, maxfeerate=0)
        # Now spend both to "clearly hide" the outputs, ie. remove the coins
        # from the utxo set by spending them
        raw_tx_spend_both = node.signrawtransactionwithwallet(
            node.createrawtransaction(
                inputs=[
                    {"txid": txid_0, "vout": 0},
                    {"txid": txid_1, "vout": 0},
                ],
                outputs=[{node.getnewaddress(): 100000}],
            )
        )["hex"]
        txid_spend_both = node.sendrawtransaction(
            hexstring=raw_tx_spend_both, maxfeerate=0
        )
        self.generate(node, 1)
        self.mempool_size = 0
        # Now see if we can add the coins back to the utxo set by sending the
        # exact txs again
        self.check_mempool_result(
            result_expected=[
                {"txid": txid_0, "allowed": False, "reject-reason": "missing-inputs"}
            ],
            rawtxs=[raw_tx_0],
        )
        self.check_mempool_result(
            result_expected=[
                {"txid": txid_1, "allowed": False, "reject-reason": "missing-inputs"}
            ],
            rawtxs=[raw_tx_1],
        )

        self.log.info('Create a signed "reference" tx for later use')
        raw_tx_reference = node.signrawtransactionwithwallet(
            node.createrawtransaction(
                inputs=[{"txid": txid_spend_both, "vout": 0}],
                outputs=[{node.getnewaddress(): 50000}],
            )
        )["hex"]
        tx = FromHex(CTransaction(), raw_tx_reference)
        # Reference tx should be valid on itself
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": True,
                    "size": tx.billable_size(),
                    "fees": {"base": Decimal(100_000 - 50_000)},
                }
            ],
            rawtxs=[ToHex(tx)],
            maxfeerate=0,
        )

        self.log.info("A transaction with no outputs")
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.vout = []
        # Skip re-signing the transaction for context independent checks from now on
        # FromHex(tx, node.signrawtransactionwithwallet(ToHex(tx))['hex'])
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "bad-txns-vout-empty",
                }
            ],
            rawtxs=[ToHex(tx)],
        )

        self.log.info("A really large transaction")
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.vin = [tx.vin[0]] * (1 + MAX_BLOCK_BASE_SIZE // len(tx.vin[0].serialize()))
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "bad-txns-oversize",
                }
            ],
            rawtxs=[ToHex(tx)],
        )

        self.log.info("A transaction with negative output value")
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.vout[0].nValue *= -1
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "bad-txns-vout-negative",
                }
            ],
            rawtxs=[ToHex(tx)],
        )

        # The following two validations prevent overflow of the output amounts
        # (see CVE-2010-5139).
        self.log.info("A transaction with too large output value")
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.vout[0].nValue = MAX_MONEY + 1
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "bad-txns-vout-toolarge",
                }
            ],
            rawtxs=[ToHex(tx)],
        )

        self.log.info("A transaction with too large sum of output values")
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.vout = [tx.vout[0]] * 2
        tx.vout[0].nValue = MAX_MONEY
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "bad-txns-txouttotal-toolarge",
                }
            ],
            rawtxs=[ToHex(tx)],
        )

        self.log.info("A transaction with duplicate inputs")
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.vin = [tx.vin[0]] * 2
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "bad-txns-inputs-duplicate",
                }
            ],
            rawtxs=[ToHex(tx)],
        )

        self.log.info("A non-coinbase transaction with coinbase-like outpoint")
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.vin.append(CTxIn(COutPoint(txid=0, n=0xFFFFFFFF)))
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "bad-txns-prevout-null",
                }
            ],
            rawtxs=[tx.serialize().hex()],
        )

        self.log.info("A coinbase transaction")
        # Pick the input of the first tx we signed, so it has to be a coinbase
        # tx
        raw_tx_coinbase_spent = node.getrawtransaction(
            txid=node.decoderawtransaction(hexstring=raw_tx_in_block)["vin"][0]["txid"]
        )
        tx = FromHex(CTransaction(), raw_tx_coinbase_spent)
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "bad-tx-coinbase",
                }
            ],
            rawtxs=[ToHex(tx)],
        )

        self.log.info("Some nonstandard transactions")
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.nVersion = 3  # A version currently non-standard
        self.check_mempool_result(
            result_expected=[
                {"txid": tx.txid_hex, "allowed": False, "reject-reason": "version"}
            ],
            rawtxs=[ToHex(tx)],
        )
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.vout[0].scriptPubKey = CScript([OP_0])  # Some non-standard script
        self.check_mempool_result(
            result_expected=[
                {"txid": tx.txid_hex, "allowed": False, "reject-reason": "scriptpubkey"}
            ],
            rawtxs=[ToHex(tx)],
        )
        tx = FromHex(CTransaction(), raw_tx_reference)
        key = ECKey()
        key.generate()
        pubkey = key.get_pubkey().get_bytes()
        # Some bare multisig script (2-of-3)
        tx.vout[0].scriptPubKey = CScript(
            [OP_2, pubkey, pubkey, pubkey, OP_3, OP_CHECKMULTISIG]
        )
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "bare-multisig",
                }
            ],
            rawtxs=[tx.serialize().hex()],
        )
        tx = FromHex(CTransaction(), raw_tx_reference)
        # Some not-pushonly scriptSig
        tx.vin[0].scriptSig = CScript([OP_HASH160])
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "scriptsig-not-pushonly",
                }
            ],
            rawtxs=[ToHex(tx)],
        )
        tx = FromHex(CTransaction(), raw_tx_reference)
        # Some too large scriptSig (>1650 bytes)
        tx.vin[0].scriptSig = CScript([b"a" * 1648])
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "scriptsig-size",
                }
            ],
            rawtxs=[tx.serialize().hex()],
        )
        tx = FromHex(CTransaction(), raw_tx_reference)
        output_p2sh_burn = CTxOut(
            nValue=540, scriptPubKey=CScript([OP_HASH160, hash160(b"burn"), OP_EQUAL])
        )
        # Use enough outputs to make the tx too large for our policy
        num_scripts = 100000 // len(output_p2sh_burn.serialize())
        tx.vout = [output_p2sh_burn] * num_scripts
        self.check_mempool_result(
            result_expected=[
                {"txid": tx.txid_hex, "allowed": False, "reject-reason": "tx-size"}
            ],
            rawtxs=[ToHex(tx)],
        )
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.vout[0] = output_p2sh_burn
        # Make output smaller, such that it is dust for our policy
        tx.vout[0].nValue -= 1
        self.check_mempool_result(
            result_expected=[
                {"txid": tx.txid_hex, "allowed": False, "reject-reason": "dust"}
            ],
            rawtxs=[ToHex(tx)],
        )
        tx = FromHex(CTransaction(), raw_tx_reference)
        tx.vout[0].scriptPubKey = CScript([OP_RETURN, b"\xff"])
        tx.vout = [tx.vout[0]] * 2
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "multi-op-return",
                }
            ],
            rawtxs=[ToHex(tx)],
        )

        self.log.info("A timelocked transaction")
        tx = FromHex(CTransaction(), raw_tx_reference)
        # Should be non-max, so locktime is not ignored
        tx.vin[0].nSequence -= 1
        tx.nLockTime = node.getblockcount() + 1
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "bad-txns-nonfinal",
                }
            ],
            rawtxs=[ToHex(tx)],
        )

        self.log.info("A transaction that is locked by BIP68 sequence logic")
        tx = FromHex(CTransaction(), raw_tx_reference)
        # We could include it in the second block mined from now, but not the
        # very next one
        tx.vin[0].nSequence = 2
        # Can skip re-signing the tx because of early rejection
        self.check_mempool_result(
            result_expected=[
                {
                    "txid": tx.txid_hex,
                    "allowed": False,
                    "reject-reason": "non-BIP68-final",
                }
            ],
            rawtxs=[tx.serialize().hex()],
            maxfeerate=0,
        )


if __name__ == "__main__":
    MempoolAcceptanceTest().main()
