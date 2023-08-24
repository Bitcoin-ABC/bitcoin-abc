#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the send RPC command."""

from decimal import Decimal

from test_framework.authproxy import JSONRPCException
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_fee_amount,
    assert_greater_than,
    assert_raises_rpc_error,
)


class WalletSendTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        # whitelist all peers to speed up tx relay / mempool sync
        self.extra_args = [
            [
                "-whitelist=127.0.0.1",
            ],
            [
                "-whitelist=127.0.0.1",
            ],
        ]

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def test_send(
        self,
        from_wallet,
        to_wallet=None,
        amount=None,
        data=None,
        add_to_wallet=None,
        psbt=None,
        inputs=None,
        add_inputs=None,
        include_unsafe=None,
        change_address=None,
        change_position=None,
        include_watching=None,
        locktime=None,
        lock_unspents=None,
        subtract_fee_from_outputs=None,
        fee_rate=None,
        expect_error=None,
    ):
        assert (amount is None) != (data is None)

        from_balance_before = from_wallet.getbalances()["mine"]["trusted"]
        if include_unsafe:
            from_balance_before += from_wallet.getbalances()["mine"][
                "untrusted_pending"
            ]

        if to_wallet is None:
            assert amount is None
        else:
            to_untrusted_pending_before = to_wallet.getbalances()["mine"][
                "untrusted_pending"
            ]

        if amount:
            dest = to_wallet.getnewaddress()
            outputs = {dest: amount}
        else:
            outputs = {"data": data}

        # Construct options dictionary
        options = {}
        if add_to_wallet is not None:
            options["add_to_wallet"] = add_to_wallet
        else:
            add_to_wallet = (
                False if psbt else from_wallet.getwalletinfo()["private_keys_enabled"]
            )
        if psbt is not None:
            options["psbt"] = psbt
        if inputs is not None:
            options["inputs"] = inputs
        if add_inputs is not None:
            options["add_inputs"] = add_inputs
        if include_unsafe is not None:
            options["include_unsafe"] = include_unsafe
        if change_address is not None:
            options["change_address"] = change_address
        if change_position is not None:
            options["change_position"] = change_position
        if include_watching is not None:
            options["include_watching"] = include_watching
        if locktime is not None:
            options["locktime"] = locktime
        if lock_unspents is not None:
            options["lock_unspents"] = lock_unspents
        if subtract_fee_from_outputs is not None:
            options["subtract_fee_from_outputs"] = subtract_fee_from_outputs
        if fee_rate is not None:
            options["fee_rate"] = fee_rate

        if len(options.keys()) == 0:
            options = None

        if expect_error is None:
            res = from_wallet.send(outputs=outputs, options=options)
        else:
            try:
                assert_raises_rpc_error(
                    expect_error[0],
                    expect_error[1],
                    from_wallet.send,
                    outputs=outputs,
                    options=options,
                )
            except AssertionError:
                # Provide debug info if the test fails
                self.log.error("Unexpected successful result:")
                self.log.error(options)
                res = from_wallet.send(outputs=outputs, options=options)
                self.log.error(res)
                if "txid" in res and add_to_wallet:
                    self.log.error("Transaction details:")
                    try:
                        tx = from_wallet.gettransaction(res["txid"])
                        self.log.error(tx)
                        self.log.error(
                            "testmempoolaccept (transaction may already be in mempool):"
                        )
                        self.log.error(from_wallet.testmempoolaccept([tx["hex"]]))
                    except JSONRPCException as exc:
                        self.log.error(exc)

                raise

            return

        if locktime:
            return res

        if from_wallet.getwalletinfo()["private_keys_enabled"] and not include_watching:
            assert_equal(res["complete"], True)
            assert "txid" in res
        else:
            assert_equal(res["complete"], False)
            assert "txid" not in res
            assert "psbt" in res

        from_balance = from_wallet.getbalances()["mine"]["trusted"]
        if include_unsafe:
            from_balance += from_wallet.getbalances()["mine"]["untrusted_pending"]

        if add_to_wallet and not include_watching:
            # Ensure transaction exists in the wallet:
            tx = from_wallet.gettransaction(res["txid"])
            assert tx
            # Ensure transaction exists in the mempool:
            tx = from_wallet.getrawtransaction(res["txid"], True)
            assert tx
            if amount:
                if subtract_fee_from_outputs:
                    assert_equal(from_balance_before - from_balance, amount)
                else:
                    assert_greater_than(from_balance_before - from_balance, amount)
            else:
                assert next(
                    (
                        out
                        for out in tx["vout"]
                        if out["scriptPubKey"]["asm"] == "OP_RETURN 35"
                    ),
                    None,
                )
        else:
            assert_equal(from_balance_before, from_balance)

        if to_wallet:
            self.sync_mempools()
            if add_to_wallet:
                if not subtract_fee_from_outputs:
                    assert_equal(
                        to_wallet.getbalances()["mine"]["untrusted_pending"],
                        to_untrusted_pending_before + Decimal(amount if amount else 0),
                    )
            else:
                assert_equal(
                    to_wallet.getbalances()["mine"]["untrusted_pending"],
                    to_untrusted_pending_before,
                )

        return res

    def run_test(self):
        self.log.info("Setup wallets...")
        # w0 is a wallet with coinbase rewards
        w0 = self.nodes[0].get_wallet_rpc(self.default_wallet_name)
        # w1 is a regular wallet
        self.nodes[1].createwallet(wallet_name="w1")
        w1 = self.nodes[1].get_wallet_rpc("w1")
        # w2 contains the private keys for w3
        self.nodes[1].createwallet(wallet_name="w2")
        w2 = self.nodes[1].get_wallet_rpc("w2")
        # w3 is a watch-only wallet, based on w2
        self.nodes[1].createwallet(wallet_name="w3", disable_private_keys=True)
        w3 = self.nodes[1].get_wallet_rpc("w3")
        for _ in range(3):
            a2_receive = w2.getnewaddress()
            # doesn't actually use change derivation
            a2_change = w2.getrawchangeaddress()
            res = w3.importmulti(
                [
                    {
                        "desc": w2.getaddressinfo(a2_receive)["desc"],
                        "timestamp": "now",
                        "keypool": True,
                        "watchonly": True,
                    },
                    {
                        "desc": w2.getaddressinfo(a2_change)["desc"],
                        "timestamp": "now",
                        "keypool": True,
                        "internal": True,
                        "watchonly": True,
                    },
                ]
            )
            assert_equal(res, [{"success": True}, {"success": True}])

        # fund w3
        w0.sendtoaddress(a2_receive, 10_000_000)
        self.generate(self.nodes[0], 1)

        # w4 has private keys enabled, but only contains watch-only keys (from
        # w2)
        self.nodes[1].createwallet(wallet_name="w4", disable_private_keys=False)
        w4 = self.nodes[1].get_wallet_rpc("w4")
        for _ in range(3):
            a2_receive = w2.getnewaddress()
            res = w4.importmulti(
                [
                    {
                        "desc": w2.getaddressinfo(a2_receive)["desc"],
                        "timestamp": "now",
                        "keypool": False,
                        "watchonly": True,
                    }
                ]
            )
            assert_equal(res, [{"success": True}])

        # fund w4
        w0.sendtoaddress(a2_receive, 10_000_000)
        self.generate(self.nodes[0], 1)

        self.log.info("Send to address...")
        self.test_send(from_wallet=w0, to_wallet=w1, amount=1_000_000)
        self.test_send(
            from_wallet=w0, to_wallet=w1, amount=1_000_000, add_to_wallet=True
        )

        self.log.info("Don't broadcast...")
        res = self.test_send(
            from_wallet=w0, to_wallet=w1, amount=1_000_000, add_to_wallet=False
        )
        assert res["hex"]

        self.log.info("Return PSBT...")
        res = self.test_send(from_wallet=w0, to_wallet=w1, amount=1_000_000, psbt=True)
        assert res["psbt"]

        self.log.info(
            "Create transaction that spends to address, but don't broadcast..."
        )
        self.test_send(
            from_wallet=w0, to_wallet=w1, amount=1_000_000, add_to_wallet=False
        )

        self.log.info("Create PSBT from watch-only wallet w3, sign with w2...")
        res = self.test_send(from_wallet=w3, to_wallet=w1, amount=1_000_000)
        res = w2.walletprocesspsbt(res["psbt"])
        assert res["complete"]

        self.log.info(
            "Create PSBT from wallet w4 with watch-only keys, sign with w2..."
        )
        self.test_send(
            from_wallet=w4,
            to_wallet=w1,
            amount=1_000_000,
            expect_error=(-4, "Insufficient funds"),
        )
        res = self.test_send(
            from_wallet=w4,
            to_wallet=w1,
            amount=1_000_000,
            include_watching=True,
            add_to_wallet=False,
        )
        res = w2.walletprocesspsbt(res["psbt"])
        assert res["complete"]

        self.log.info("Create OP_RETURN...")
        self.test_send(from_wallet=w0, to_wallet=w1, amount=1_000_000)
        self.test_send(
            from_wallet=w0,
            data="Hello World",
            expect_error=(-8, "Data must be hexadecimal string (not 'Hello World')"),
        )
        self.test_send(from_wallet=w0, data="23")
        res = self.test_send(from_wallet=w3, data="23")
        res = w2.walletprocesspsbt(res["psbt"])
        assert res["complete"]

        self.log.info("Set fee rate...")
        res = self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=1_000_000,
            fee_rate=Decimal("20.00"),
            add_to_wallet=False,
        )
        fee = self.nodes[1].decodepsbt(res["psbt"])["fee"]
        assert_fee_amount(fee, len(res["hex"]) // 2, Decimal("20.00"))
        self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=1_000_000,
            fee_rate=-1,
            expect_error=(-3, "Amount out of range"),
        )
        # Fee rate of 0.1 satoshi per byte should throw an error
        self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=1_000_000,
            fee_rate=Decimal("1.00"),
            expect_error=(
                -4,
                (
                    "Fee rate (1.00 XEC/kB) is lower than the minimum fee rate setting"
                    " (10.00 XEC/kB)"
                ),
            ),
        )

        # TODO: Return hex if fee rate is below -maxmempool
        # res = self.test_send(from_wallet=w0, to_wallet=w1, amount=1_000_000,
        #                      feeRate=Decimal("1.00"), add_to_wallet=False)
        # assert res["hex"]
        # hex = res["hex"]
        # res = self.nodes[0].testmempoolaccept([hex])
        # assert not res[0]["allowed"]
        # assert_equal(res[0]["reject-reason"], "...") # low fee
        # assert_fee_amount(fee, Decimal(len(res["hex"]) / 2), Decimal("1.00"))

        self.log.info("If inputs are specified, do not automatically add more...")
        res = self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=51_000_000,
            inputs=[],
            add_to_wallet=False,
        )
        assert res["complete"]
        utxo1 = w0.listunspent()[0]
        assert_equal(utxo1["amount"], 50_000_000)
        self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=51_000_000,
            inputs=[utxo1],
            expect_error=(-4, "Insufficient funds"),
        )
        self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=51_000_000,
            inputs=[utxo1],
            add_inputs=False,
            expect_error=(-4, "Insufficient funds"),
        )
        res = self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=51_000_000,
            inputs=[utxo1],
            add_inputs=True,
            add_to_wallet=False,
        )
        assert res["complete"]

        self.log.info("Manual change address and position...")
        self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=1_000_000,
            change_address="not an address",
            expect_error=(-5, "Change address must be a valid bitcoin address"),
        )
        change_address = w0.getnewaddress()
        self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=1_000_000,
            add_to_wallet=False,
            change_address=change_address,
        )
        assert res["complete"]
        res = self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=1_000_000,
            add_to_wallet=False,
            change_address=change_address,
            change_position=0,
        )
        assert res["complete"]
        assert_equal(
            self.nodes[0].decodepsbt(res["psbt"])["tx"]["vout"][0]["scriptPubKey"][
                "addresses"
            ],
            [change_address],
        )

        self.log.info("Set lock time...")
        height = self.nodes[0].getblockchaininfo()["blocks"]
        res = self.test_send(
            from_wallet=w0, to_wallet=w1, amount=1_000_000, locktime=height + 1
        )
        assert res["complete"]
        assert res["txid"]
        txid = res["txid"]
        # Although the wallet finishes the transaction, it can't be added to
        # the mempool yet:
        tx_hex = self.nodes[0].gettransaction(res["txid"])["hex"]
        res = self.nodes[0].testmempoolaccept([tx_hex])
        assert not res[0]["allowed"]
        assert_equal(res[0]["reject-reason"], "bad-txns-nonfinal")
        # It shouldn't be confirmed in the next block
        self.generate(self.nodes[0], 1)
        assert_equal(self.nodes[0].gettransaction(txid)["confirmations"], 0)
        # The mempool should allow it now:
        res = self.nodes[0].testmempoolaccept([tx_hex])
        assert res[0]["allowed"]
        # Don't wait for wallet to add it to the mempool:
        res = self.nodes[0].sendrawtransaction(tx_hex)
        self.generate(self.nodes[0], 1)
        assert_equal(self.nodes[0].gettransaction(txid)["confirmations"], 1)

        self.log.info("Lock unspents...")
        utxo1 = w0.listunspent()[0]
        assert_greater_than(utxo1["amount"], 1_000_000)
        res = self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=1_000_000,
            inputs=[utxo1],
            add_to_wallet=False,
            lock_unspents=True,
        )
        assert res["complete"]
        locked_coins = w0.listlockunspent()
        assert_equal(len(locked_coins), 1)
        # Locked coins are automatically unlocked when manually selected
        res = self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=1_000_000,
            inputs=[utxo1],
            add_to_wallet=False,
        )
        assert res["complete"]

        self.log.info("Subtract fee from output")
        self.test_send(
            from_wallet=w0,
            to_wallet=w1,
            amount=1_000_000,
            subtract_fee_from_outputs=[0],
        )

        self.log.info("Include unsafe inputs")
        self.nodes[1].createwallet(wallet_name="w5")
        w5 = self.nodes[1].get_wallet_rpc("w5")
        self.test_send(from_wallet=w0, to_wallet=w5, amount=2_000_000)
        self.test_send(
            from_wallet=w5,
            to_wallet=w0,
            amount=1_000_000,
            expect_error=(-4, "Insufficient funds"),
        )
        res = self.test_send(
            from_wallet=w5, to_wallet=w0, amount=1_000_000, include_unsafe=True
        )
        assert res["complete"]


if __name__ == "__main__":
    WalletSendTest().main()
