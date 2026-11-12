# Electrum ABC - lightweight eCash client
# Copyright (C) 2026-present The Electrum ABC developers
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
"""Tests for the RPC commands that need coins in the wallet or on an address"""

import unittest
from decimal import Decimal

from jsonrpcclient import request

from ...constants import XEC
from .framework import ElectrumABCTestCase
from .util import (
    EC_DAEMON_RPC_URL,
    get_block_subsidy,
    poll_for_answer,
    rpc,
    wait_for_len,
    wait_until,
)

# Amounts are in XEC
FUNDING_AMOUNT = 1_000_000


class TestRPCCoins(ElectrumABCTestCase):
    def fund_wallet(self) -> tuple[str, str]:
        """Send FUNDING_AMOUNT to an unused address of the wallet, mine it and wait
        for the wallet to see the confirmed balance.
        Return the address and the txid."""
        address = rpc("getunusedaddress")
        txid = self.node.sendtoaddress(address, FUNDING_AMOUNT)
        self.generatetoaddress(1, self.node.getnewaddress())
        poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getbalance"),
            expected_answer=("confirmed", str(FUNDING_AMOUNT)),
        )
        return address, txid

    def test_freeze_address(self):
        address, _txid = self.fund_wallet()
        dest = self.node.getnewaddress()

        assert rpc("freeze", address=address) is True
        assert rpc("listaddresses", frozen=True) == [address]
        with self.assertRaisesRegex(RuntimeError, "NotEnoughFunds"):
            rpc("payto", destination=dest, amount=1_000)

        assert rpc("unfreeze", address=address) is True
        assert rpc("listaddresses", frozen=True) == []
        assert rpc("payto", destination=dest, amount=1_000)["complete"] is True

    def test_freeze_utxo(self):
        _address, txid = self.fund_wallet()
        dest = self.node.getnewaddress()
        [coin] = rpc("listunspent")
        assert coin["prevout_hash"] == txid
        assert coin["is_frozen_coin"] is False
        outpoint = f"{txid}:{coin['prevout_n']}"

        assert rpc("freeze_utxo", coin=outpoint) is True
        assert rpc("listunspent")[0]["is_frozen_coin"] is True
        with self.assertRaisesRegex(RuntimeError, "NotEnoughFunds"):
            rpc("payto", destination=dest, amount=1_000)

        assert rpc("unfreeze_utxo", coin=outpoint) is True
        assert rpc("listunspent")[0]["is_frozen_coin"] is False
        assert rpc("payto", destination=dest, amount=1_000)["complete"] is True

    def test_paytomany(self):
        self.fund_wallet()
        dest1 = self.node.getnewaddress()
        dest2 = self.node.getnewaddress()
        tx_hex = rpc("paytomany", outputs=[[dest1, 1_000], [dest2, 2_000]])["hex"]

        outputs = {
            out["address"]: out["value"]
            for out in rpc("deserialize", tx=tx_hex)["outputs"]
        }
        assert outputs[dest1] == XEC.unit_to_satoshis(Decimal(1_000))
        assert outputs[dest2] == XEC.unit_to_satoshis(Decimal(2_000))
        # Plus the change output
        assert len(outputs) == 3

        success, txid = rpc("broadcast", tx=tx_hex)
        assert success
        wait_until(lambda: txid in self.node.getrawmempool())

    def test_address_queries(self):
        """getaddressbalance, getaddressunspent, gettransaction and getmerkle are
        server queries that work for any address or transaction"""
        address = self.node.getnewaddress()
        assert rpc("getaddressbalance", address=address) == {
            "confirmed": "0",
            "unconfirmed": "0",
        }
        assert rpc("getaddressunspent", address=address) == []

        txid = self.node.sendtoaddress(address, FUNDING_AMOUNT)
        poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getaddressbalance", params={"address": address}),
            expected_answer=("unconfirmed", str(FUNDING_AMOUNT)),
        )
        assert rpc("gettransaction", txid=txid)["hex"] == self.node.getrawtransaction(
            txid
        )

        [block_hash] = self.generatetoaddress(1, self.node.getnewaddress())
        poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getaddressbalance", params={"address": address}),
            expected_answer=("confirmed", str(FUNDING_AMOUNT)),
        )
        [utxo] = rpc("getaddressunspent", address=address)
        block = self.node.getblock(block_hash)
        assert utxo["tx_hash"] == txid
        assert utxo["value"] == XEC.unit_to_satoshis(Decimal(FUNDING_AMOUNT))
        assert utxo["height"] == block["height"]

        # The block has only the coinbase transaction and our transaction, so the
        # merkle branch is just the coinbase txid.
        assert block["tx"] == [block["tx"][0], txid]
        assert rpc("getmerkle", txid=txid, height=block["height"]) == {
            "block_height": block["height"],
            "merkle": [block["tx"][0]],
            "pos": 1,
        }

    def test_setlabel_txid(self):
        _address, txid = self.fund_wallet()
        assert rpc("setlabel", key=txid, label="funding tx") is None
        [item] = rpc("history")
        assert item["txid"] == txid
        assert item["label"] == "funding tx"

    def test_is_synchronized(self):
        self.fund_wallet()
        assert rpc("is_synchronized") is True

    def test_sweep(self):
        address, _txid = self.fund_wallet()
        wif = rpc("getprivatekeys", address=address)
        dest = self.node.getnewaddress()

        tx_hex = rpc("sweep", privkey=wif, destination=dest)["hex"]
        tx = rpc("deserialize", tx=tx_hex)
        assert len(tx["inputs"]) == 1
        [output] = tx["outputs"]
        assert output["address"] == dest
        swept_amount = output["value"]
        # The fee is paid by the swept coin
        assert 0 < swept_amount < XEC.unit_to_satoshis(Decimal(FUNDING_AMOUNT))

        success, _txid = rpc("broadcast", tx=tx_hex)
        assert success
        self.generatetoaddress(1, self.node.getnewaddress())
        poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getaddressbalance", params={"address": dest}),
            expected_answer=("confirmed", str(XEC.satoshis_to_unit(swept_amount))),
        )
        poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getbalance"),
            expected_answer=("confirmed", "0"),
        )

    def test_balance(self):
        """Verify the `getbalance` RPC"""
        addr = rpc("getunusedaddress")

        tip_height = self.node.getblockchaininfo()["blocks"]
        coinbase_amount = XEC.satoshis_to_unit(get_block_subsidy(tip_height + 1))

        self.generatetoaddress(1, addr)

        def wallet_has_expected_amount(amount_status: str, amount: Decimal) -> bool:
            """Check the wallet balance for a specific amount.
            The amount is in XEC.
            amount_status can be one of "unmatured", "unconfirmed" or "confirmed"
            """
            result = rpc("getbalance")
            return amount_status in result and Decimal(result[amount_status]) == amount

        wait_until(lambda: wallet_has_expected_amount("unmatured", coinbase_amount))

        self.node.sendtoaddress(addr, 10_000_000)
        result = poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getbalance"),
            expected_answer=("unconfirmed", "10000000"),
        )
        assert (
            Decimal(result["unmatured"]) == coinbase_amount
            and result["unconfirmed"] == "10000000"
        )

        self.generatetoaddress(1, self.node.getnewaddress())
        result = poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getbalance"),
            expected_answer=("confirmed", "10000000"),
        )
        assert (
            Decimal(result["unmatured"]) == coinbase_amount
            and result["confirmed"] == "10000000"
        )

        self.generatetoaddress(97, self.node.getnewaddress())
        self.node.sendtoaddress(addr, 10_000_000)
        result = poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getbalance"),
            expected_answer=("unconfirmed", "10000000"),
        )
        assert (
            Decimal(result["unmatured"]) == coinbase_amount
            and result["confirmed"] == "10000000"
            and result["unconfirmed"] == "10000000"
        )

        self.generatetoaddress(1, self.node.getnewaddress())
        wait_until(
            lambda: wallet_has_expected_amount(
                "confirmed", coinbase_amount + 20_000_000
            )
        )

    def test_payto_broadcast_getaddresshistory(self):
        """Use the payto and broadcast commands and check the resulting  wallet UTXOs
        with getaddresshistory"""
        addr = rpc("getunusedaddress")

        self.node.sendtoaddress(addr, 10_000_000)

        hist = wait_for_len(request("getaddresshistory", params={"address": addr}), 1)
        txid0 = hist[0]["tx_hash"]

        tx_hex = rpc(
            "payto",
            destination=addr,
            amount=1_000,
            addtransaction=True,
        )["hex"]
        success, txid1 = rpc("broadcast", tx=tx_hex)
        assert success

        tx_hex = rpc(
            "payto",
            destination=addr,
            amount=2_000,
            addtransaction=True,
        )["hex"]
        success, txid2 = rpc("broadcast", tx=tx_hex)
        assert success

        hist = wait_for_len(request("getaddresshistory", params={"address": addr}), 3)
        assert {txid0, txid1, txid2} == {h["tx_hash"] for h in hist}

        total_fee = sum(XEC.satoshis_to_unit(tx["fee"]) for tx in hist[1:])
        coins = rpc("listunspent")
        assert {Decimal(coin["value"]) for coin in coins} == {
            Decimal(1000),
            Decimal(2000),
            Decimal(9_997_000) - total_fee,
        }

    def test_signtransaction(self):
        """Create an unsigned transaction, sign and broadcast it"""
        addr = rpc("getunusedaddress")

        self.node.sendtoaddress(addr, 1_100)

        wait_for_len(request("history"), 1)

        unsigned_tx_hex = rpc(
            "payto",
            destination=addr,
            amount=1_000,
            unsigned=True,
        )["hex"]

        signed_tx_hex = rpc("signtransaction", tx=unsigned_tx_hex)["hex"]

        success, _ = rpc("broadcast", tx=signed_tx_hex)
        assert success


if __name__ == "__main__":
    unittest.main()
