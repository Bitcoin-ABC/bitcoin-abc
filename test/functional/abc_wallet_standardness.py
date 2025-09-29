# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the response of wallet to a variety of weird / nonstandard coins
that it might try to spend."""

from decimal import Decimal

from test_framework.hash import hash160
from test_framework.messages import CTransaction, CTxOut, FromHex, ToHex
from test_framework.script import (
    OP_1,
    OP_5,
    OP_CHECKMULTISIG,
    OP_CHECKSIG,
    OP_DUP,
    OP_EQUALVERIFY,
    OP_HASH160,
    OP_PUSHDATA1,
    CScript,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error

SATOSHI = Decimal("0.01")


class WalletStandardnessTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.extra_args = [["-acceptnonstdtxn=0"], ["-acceptnonstdtxn=1"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        std_node, nonstd_node = self.nodes

        address_nonstd = nonstd_node.getnewaddress()

        # make and mature some coins for the nonstandard node
        self.generate(nonstd_node, 120)

        def fund_and_test_wallet(
            scriptPubKey,
            is_standard,
            expected_in_std_wallet,
            amount=10000,
            spendfee=500,
            nonstd_error="scriptpubkey",
            sign_error=None,
        ):
            """
            Get the nonstandard node to fund a transaction, test its
            standardness by trying to broadcast on the standard node,
            then mine it and see if it ended up in the standard node's wallet.
            Finally, it attempts to spend the coin.
            """

            self.log.info(f"Trying script {scriptPubKey.hex()}")

            # get nonstandard node to fund the script
            tx = CTransaction()
            tx.vout.append(CTxOut(max(amount, 10000), scriptPubKey))
            rawtx = nonstd_node.fundrawtransaction(
                ToHex(tx), {"lockUnspents": True, "changePosition": 1}
            )["hex"]
            # fundrawtransaction doesn't like to fund dust outputs, so we
            # have to manually override the amount.
            FromHex(tx, rawtx)
            tx.vout[0].nValue = min(amount, 10000)
            rawtx = nonstd_node.signrawtransactionwithwallet(ToHex(tx))["hex"]

            # ensure signing process did not disturb scriptPubKey
            signedtx = FromHex(CTransaction(), rawtx)
            assert_equal(scriptPubKey, signedtx.vout[0].scriptPubKey)
            txid = signedtx.txid_hex

            balance_initial = std_node.getbalance()

            # try broadcasting it on the standard node
            if is_standard:
                std_node.sendrawtransaction(rawtx)
                assert txid in std_node.getrawmempool()
            else:
                assert_raises_rpc_error(
                    -26, nonstd_error, std_node.sendrawtransaction, rawtx
                )
                assert txid not in std_node.getrawmempool()

            # make sure it's in nonstandard node's mempool, then mine it
            nonstd_node.sendrawtransaction(rawtx)
            assert txid in nonstd_node.getrawmempool()
            [blockhash] = self.generate(nonstd_node, 1)
            # make sure it was mined
            assert txid in nonstd_node.getblock(blockhash)["tx"]

            wallet_outpoints = {
                (entry["txid"], entry["vout"]) for entry in std_node.listunspent()
            }

            # calculate wallet balance change just as a double check
            balance_change = std_node.getbalance() - balance_initial
            if expected_in_std_wallet:
                assert (txid, 0) in wallet_outpoints
                assert balance_change == amount * SATOSHI
            else:
                assert (txid, 0) not in wallet_outpoints
                assert balance_change == 0

            # try spending the funds using the wallet.
            outamount = (amount - spendfee) * SATOSHI
            if outamount < 546 * SATOSHI:
                # If the final amount would be too small, then just donate
                # to miner fees.
                outputs = [{"data": b"to miner, with love".hex()}]
            else:
                outputs = [{address_nonstd: outamount}]
            spendtx = std_node.createrawtransaction(
                [{"txid": txid, "vout": 0}], outputs
            )
            signresult = std_node.signrawtransactionwithwallet(spendtx)

            if sign_error is None:
                assert_equal(signresult["complete"], True)
                txid = std_node.sendrawtransaction(signresult["hex"])
                [blockhash] = self.generate(std_node, 1)
                # make sure it was mined
                assert txid in std_node.getblock(blockhash)["tx"]
            else:
                assert_equal(signresult["complete"], False)
                assert_equal(signresult["errors"][0]["error"], sign_error)

        # we start with an empty wallet
        assert_equal(std_node.getbalance(), 0)

        address = std_node.getnewaddress()
        pubkey = bytes.fromhex(std_node.getaddressinfo(address)["pubkey"])
        pubkeyhash = hash160(pubkey)

        # P2PK
        fund_and_test_wallet(CScript([pubkey, OP_CHECKSIG]), True, True)
        fund_and_test_wallet(
            CScript([OP_PUSHDATA1, pubkey, OP_CHECKSIG]),
            False,
            False,
            sign_error="Data push larger than necessary",
        )

        # P2PKH
        fund_and_test_wallet(
            CScript([OP_DUP, OP_HASH160, pubkeyhash, OP_EQUALVERIFY, OP_CHECKSIG]),
            True,
            True,
        )
        # The signing error changes here since the script check (with empty
        # scriptSig) hits OP_DUP before it hits the nonminimal push; in all
        # other cases we hit the nonminimal push first.
        fund_and_test_wallet(
            CScript(
                [
                    OP_DUP,
                    OP_HASH160,
                    OP_PUSHDATA1,
                    pubkeyhash,
                    OP_EQUALVERIFY,
                    OP_CHECKSIG,
                ]
            ),
            False,
            False,
            sign_error=(
                "Unable to sign input, invalid stack size (possibly missing key)"
            ),
        )

        # Bare multisig
        fund_and_test_wallet(
            CScript([OP_1, pubkey, OP_1, OP_CHECKMULTISIG]), True, False
        )
        fund_and_test_wallet(
            CScript([OP_1, OP_PUSHDATA1, pubkey, OP_1, OP_CHECKMULTISIG]),
            False,
            False,
            sign_error="Data push larger than necessary",
        )
        fund_and_test_wallet(
            CScript([OP_1, pubkey, b"\x01", OP_CHECKMULTISIG]),
            False,
            False,
            sign_error="Data push larger than necessary",
        )
        fund_and_test_wallet(
            CScript([b"\x01", pubkey, OP_1, OP_CHECKMULTISIG]),
            False,
            False,
            sign_error="Data push larger than necessary",
        )
        # Note: 1-of-5 is nonstandard to fund yet is standard to spend. However,
        # trying to spend it with our wallet in particular will generate
        # too-dense sigchecks since our wallet currently only signs with ECDSA
        # (Schnorr would not have this issue).
        fund_and_test_wallet(
            CScript(
                [OP_1, pubkey, pubkey, pubkey, pubkey, pubkey, OP_5, OP_CHECKMULTISIG]
            ),
            False,
            False,
            sign_error="Input SigChecks limit exceeded",
        )
        fund_and_test_wallet(
            CScript(
                [
                    OP_1,
                    pubkey,
                    pubkey,
                    pubkey,
                    OP_PUSHDATA1,
                    pubkey,
                    pubkey,
                    OP_5,
                    OP_CHECKMULTISIG,
                ]
            ),
            False,
            False,
            sign_error="Data push larger than necessary",
        )

        # Dust also is nonstandard to fund but standard to spend.
        fund_and_test_wallet(
            CScript([pubkey, OP_CHECKSIG]), False, True, amount=200, nonstd_error="dust"
        )

        # and we end with an empty wallet
        assert_equal(std_node.getbalance(), 0)


if __name__ == "__main__":
    WalletStandardnessTest().main()
