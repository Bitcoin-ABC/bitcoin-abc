#!/usr/bin/env python3
# Copyright (c) 2015-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test transaction signing using the signrawtransaction* RPCs."""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error

RPC_WALLET_NOT_SPECIFIED = (
    "Wallet file not specified (must request wallet "
    + "RPC through /wallet/<filename> uri-path)."
)


class SignRawTransactionsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def successful_signing_test(self):
        """Creates and signs a valid raw transaction with one input.

        Expected results:

        1) The transaction has a complete set of signatures
        2) No script verification error occurred"""
        self.log.info("Test valid raw transaction with one input")
        privKeys = [
            "cUeKHd5orzT3mz8P9pxyREHfsWtVfgsfDjiZZBcjUBAaGk1BTj7N",
            "cVKpPfVKSJxKqVpE9awvXNWuLHCa5j5tiE7K6zbUSptFpTEtiFrA",
        ]

        inputs = [
            # Valid pay-to-pubkey scripts
            {
                "txid": (
                    "9b907ef1e3c26fc71fe4a4b3580bc75264112f95050014157059c736f0202e71"
                ),
                "vout": 0,
                "amount": 3141590,
                "scriptPubKey": "76a91460baa0f494b38ce3c940dea67f3804dc52d1fb9488ac",
            },
            {
                "txid": (
                    "83a4f6a6b73660e13ee6cb3c6063fa3759c50c9b7521d0536022961898f4fb02"
                ),
                "vout": 0,
                "amount": "123456000",
                "scriptPubKey": "76a914669b857c03a5ed269d5d85a1ffac9ed5d663072788ac",
            },
        ]

        outputs = {"mpLQjfK79b7CCV4VMJWEWAj5Mpx8Up5zxB": 100000}

        rawTx = self.nodes[0].createrawtransaction(inputs, outputs)
        rawTxSigned = self.nodes[0].signrawtransactionwithkey(rawTx, privKeys, inputs)

        # 1) The transaction has a complete set of signatures
        assert rawTxSigned["complete"]

        # 2) No script verification error occurred
        assert "errors" not in rawTxSigned

    def test_with_lock_outputs(self):
        self.log.info(
            "Test correct error reporting when trying to sign a locked output"
        )
        self.nodes[0].encryptwallet("password")

        rawTx = "020000000156b958f78e3f24e0b2f4e4db1255426b0902027cb37e3ddadb52e37c3557dddb0000000000ffffffff01c0a6b929010000001600149a2ee8c77140a053f36018ac8124a6ececc1668a00000000"

        assert_raises_rpc_error(
            -13,
            "Please enter the wallet passphrase with walletpassphrase first",
            self.nodes[0].signrawtransactionwithwallet,
            rawTx,
        )

    def script_verification_error_test(self):
        """Creates and signs a raw transaction with valid (vin 0), invalid (vin 1) and one missing (vin 2) input script.

        Expected results:

        3) The transaction has no complete set of signatures
        4) Two script verification errors occurred
        5) Script verification errors have certain properties ("txid", "vout", "scriptSig", "sequence", "error")
        6) The verification errors refer to the invalid (vin 1) and missing input (vin 2)
        """
        self.log.info("Test script verification errors")
        privKeys = ["cUeKHd5orzT3mz8P9pxyREHfsWtVfgsfDjiZZBcjUBAaGk1BTj7N"]

        inputs = [
            # Valid pay-to-pubkey script
            {
                "txid": (
                    "9b907ef1e3c26fc71fe4a4b3580bc75264112f95050014157059c736f0202e71"
                ),
                "vout": 0,
                "amount": 0,
            },
            # Invalid script
            {
                "txid": (
                    "5b8673686910442c644b1f4993d8f7753c7c8fcb5c87ee40d56eaeef25204547"
                ),
                "vout": 7,
                "amount": "1.1",
            },
            # Missing scriptPubKey
            {
                "txid": (
                    "9b907ef1e3c26fc71fe4a4b3580bc75264112f95050014157059c736f0202e71"
                ),
                "vout": 1,
                "amount": 2.0,
            },
        ]

        scripts = [
            # Valid pay-to-pubkey script
            {
                "txid": (
                    "9b907ef1e3c26fc71fe4a4b3580bc75264112f95050014157059c736f0202e71"
                ),
                "vout": 0,
                "amount": 0,
                "scriptPubKey": "76a91460baa0f494b38ce3c940dea67f3804dc52d1fb9488ac",
            },
            # Invalid script
            {
                "txid": (
                    "5b8673686910442c644b1f4993d8f7753c7c8fcb5c87ee40d56eaeef25204547"
                ),
                "vout": 7,
                "amount": "1.1",
                "scriptPubKey": "badbadbadbad",
            },
        ]

        outputs = {"mpLQjfK79b7CCV4VMJWEWAj5Mpx8Up5zxB": 0.1}

        rawTx = self.nodes[0].createrawtransaction(inputs, outputs)

        # Make sure decoderawtransaction is at least marginally sane
        decodedRawTx = self.nodes[0].decoderawtransaction(rawTx)
        for i, inp in enumerate(inputs):
            assert_equal(decodedRawTx["vin"][i]["txid"], inp["txid"])
            assert_equal(decodedRawTx["vin"][i]["vout"], inp["vout"])

        # Make sure decoderawtransaction throws if there is extra data
        assert_raises_rpc_error(
            -22, "TX decode failed", self.nodes[0].decoderawtransaction, f"{rawTx}00"
        )

        rawTxSigned = self.nodes[0].signrawtransactionwithkey(rawTx, privKeys, scripts)

        # 3) The transaction has no complete set of signatures
        assert not rawTxSigned["complete"]

        # 4) Two script verification errors occurred
        assert "errors" in rawTxSigned
        assert_equal(len(rawTxSigned["errors"]), 2)

        # 5) Script verification errors have certain properties
        assert "txid" in rawTxSigned["errors"][0]
        assert "vout" in rawTxSigned["errors"][0]
        assert "scriptSig" in rawTxSigned["errors"][0]
        assert "sequence" in rawTxSigned["errors"][0]
        assert "error" in rawTxSigned["errors"][0]

        # 6) The verification errors refer to the invalid (vin 1) and missing
        # input (vin 2)
        assert_equal(rawTxSigned["errors"][0]["txid"], inputs[1]["txid"])
        assert_equal(rawTxSigned["errors"][0]["vout"], inputs[1]["vout"])
        assert_equal(rawTxSigned["errors"][1]["txid"], inputs[2]["txid"])
        assert_equal(rawTxSigned["errors"][1]["vout"], inputs[2]["vout"])

    def test_fully_signed_tx(self):
        self.log.info("Test signing a fully signed transaction does nothing")
        self.nodes[0].walletpassphrase("password", 9999)
        self.generate(self.nodes[0], 101)
        rawtx = self.nodes[0].createrawtransaction(
            [], [{self.nodes[0].getnewaddress(): 10}]
        )
        fundedtx = self.nodes[0].fundrawtransaction(rawtx)
        signedtx = self.nodes[0].signrawtransactionwithwallet(fundedtx["hex"])
        assert_equal(signedtx["complete"], True)
        signedtx2 = self.nodes[0].signrawtransactionwithwallet(signedtx["hex"])
        assert_equal(signedtx2["complete"], True)
        assert_equal(signedtx["hex"], signedtx2["hex"])
        self.nodes[0].walletlock()

    def test_sighashes(self):
        """Creates and signs a raw transaction with various sighashes.

        Expected result:

        1) The transaction is complete if the sighash is valid and has FORKID.
        2) The RPC throws an error if the sighash does not contain FORKID.
        3) The RPC throws an error if the sighash is invalid."""

        privKeys = ["cUeKHd5orzT3mz8P9pxyREHfsWtVfgsfDjiZZBcjUBAaGk1BTj7N"]

        inputs = [
            # Valid pay-to-pubkey script
            {
                "txid": (
                    "9b907ef1e3c26fc71fe4a4b3580bc75264112f95050014157059c736f0202e71"
                ),
                "vout": 0,
                "amount": 3141590,
                "scriptPubKey": "76a91460baa0f494b38ce3c940dea67f3804dc52d1fb9488ac",
            }
        ]

        outputs = {"mpLQjfK79b7CCV4VMJWEWAj5Mpx8Up5zxB": 100000}

        rawTx = self.nodes[0].createrawtransaction(inputs, outputs)

        valid_sighashes = [
            "ALL|FORKID",
            "NONE|FORKID",
            "SINGLE|FORKID",
            "ALL|FORKID|ANYONECANPAY",
            "NONE|FORKID|ANYONECANPAY",
            "SINGLE|FORKID|ANYONECANPAY",
        ]
        no_forkid_sighashes = [
            "ALL",
            "NONE",
            "SINGLE",
            "ALL|ANYONECANPAY",
            "NONE|ANYONECANPAY",
            "SINGLE|ANYONECANPAY",
        ]
        invalid_sighashes = [
            "",
            "ALL|SINGLE|FORKID",
            str(0),
            str(0x20),
        ]

        # 1) If the sighash is valid with FORKID, the signature is complete
        for sighash in valid_sighashes:
            rawTxSigned = self.nodes[0].signrawtransactionwithkey(
                rawTx, privKeys, inputs, sighash
            )
            assert "complete" in rawTxSigned
            assert_equal(rawTxSigned["complete"], True)
            assert "errors" not in rawTxSigned

        # 2) If FORKID is missing in the sighash, the RPC throws an error
        for sighash in no_forkid_sighashes:
            assert_raises_rpc_error(
                -8,
                "Signature must use SIGHASH_FORKID",
                self.nodes[0].signrawtransactionwithkey,
                rawTx,
                privKeys,
                inputs,
                sighash,
            )

        # 3) If the sighash is invalid the RPC throws an error
        for sighash in invalid_sighashes:
            assert_raises_rpc_error(
                -1,
                f"{sighash} is not a valid sighash parameter.",
                self.nodes[0].signrawtransactionwithkey,
                rawTx,
                privKeys,
                inputs,
                sighash,
            )

    def multiwallet_signing_test(self):
        """Creates and signs a raw transaction with a multiwallet node.

        Expected results:

        1) The transaction is not signed if no wallet is specified
        2) The transaction is signed if the correct wallet URI is given"""
        inputs = [
            # Valid pay-to-pubkey scripts
            {
                "txid": (
                    "9b907ef1e3c26fc71fe4a4b3580bc75264112f95050014157059c736f0202e71"
                ),
                "vout": 0,
                "amount": 3141590,
                "scriptPubKey": "76a91460baa0f494b38ce3c940dea67f3804dc52d1fb9488ac",
            },
        ]

        outputs = {"mpLQjfK79b7CCV4VMJWEWAj5Mpx8Up5zxB": 100000}

        multiwallet_node = self.nodes[0]
        multiwallet_node.createwallet("w1")
        multiwallet_node.createwallet("w2")

        rawTx = multiwallet_node.createrawtransaction(inputs, outputs)

        # The multiwallet node cannot sign the transaction if no wallet is
        # specified
        assert_raises_rpc_error(
            -19,
            RPC_WALLET_NOT_SPECIFIED,
            multiwallet_node.signrawtransactionwithwallet,
            rawTx,
        )

        # The multiwallet node can sign the transaction using w1
        w1 = multiwallet_node.get_wallet_rpc("w1")
        self.generatetoaddress(
            multiwallet_node, nblocks=101, address=w1.getnewaddress(label="coinbase")
        )

        utxo = w1.listunspent()[0]
        inputs = [
            {
                "txid": utxo["txid"],
                "vout": utxo["vout"],
            }
        ]

        rawTx_w1 = w1.createrawtransaction(inputs, outputs)

        rawTxSigned_w1 = w1.signrawtransactionwithwallet(rawTx_w1)
        assert rawTxSigned_w1["complete"]
        assert "errors" not in rawTxSigned_w1

    def run_test(self):
        self.successful_signing_test()
        self.script_verification_error_test()
        self.test_sighashes()
        self.test_with_lock_outputs()
        self.test_fully_signed_tx()
        self.multiwallet_signing_test()


if __name__ == "__main__":
    SignRawTransactionsTest().main()
