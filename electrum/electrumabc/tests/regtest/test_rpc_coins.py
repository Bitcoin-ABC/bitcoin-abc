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
from .util import EC_DAEMON_RPC_URL, poll_for_answer, rpc, wait_until

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


if __name__ == "__main__":
    unittest.main()
