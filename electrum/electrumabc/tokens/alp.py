# Electrum ABC - lightweight eCash client
# Copyright (C) 2025-present The Electrum ABC Developers
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
"""Augmented Ledger Protocol

https://ecashbuilders.notion.site/ALP-a862a4130877448387373b9e6a93dd97
"""

from ..address import Address, ScriptOutput
from ..transaction import Transaction
from .empp import parse_empp_script

ALP_LOKAD_ID = b"SLP2"


class WalletData:
    """Track UTXOs that look like ALP tokens in a wallet"""

    STORAGE_VERSION = "1"

    def __init__(self, wallet):
        self.wallet = wallet
        self.storage = wallet.storage
        self.needs_rebuild = False
        self.outpoints: dict[str, list[int]] = {}
        """{"txid": [n0, n1....]}"""

        self.load()

    def load(self):
        alp = self.storage.get("alp")
        if alp is None:
            self.needs_rebuild = True
            return

        self.outpoints = alp.get("outpoints", {})

    def rebuild(self):
        """Scan the entire wallet for ALP outputs."""
        with self.wallet.lock:
            for txid, tx in self.wallet.transactions.items():
                # we take a copy of the transaction to prevent storing deserialized tx
                # in wallet.transactions dict (memory optimization)
                self.add_tx(txid, Transaction(tx.raw))
        self.needs_rebuild = False

    def add_tx(self, txid: str, tx: Transaction):
        if txid in self.outpoints:
            # We already processed this transaction. There is no way it has changed
            # since last time. If we ever want to rescan the entire wallet for any
            # reason, it can be done by calling `clear()` then `rebuild()`.
            return
        outputs = tx.outputs()
        so = outputs and outputs[0].destination

        if not isinstance(so, ScriptOutput):
            return

        empp_payloads = parse_empp_script(so.script)
        if empp_payloads is None:
            # Not an EMPP script
            return

        if not any(payload.startswith(ALP_LOKAD_ID) for payload in empp_payloads):
            return

        # TODO: properly validate the script. For now we just assume that all outputs
        #     in this tx are probably ALP tokens.
        for i, outp in enumerate(outputs[1:]):
            addr = outp.destination
            if not isinstance(addr, Address) or not self.wallet.is_mine(addr):
                # ignore txo's for addresses that are not "mine", or that are not TYPE_ADDRESS
                continue
            if txid not in self.outpoints:
                self.outpoints[txid] = []
            self.outpoints[txid].append(i + 1)

    def rm_tx(self, txid: str):
        self.outpoints.pop(txid, None)

    def has_txo(self, txo: str):
        txid, n = txo.split(":")
        return txid in self.outpoints and int(n) in self.outpoints[txid]

    def save(self):
        data = {
            "outpoints": self.outpoints,
            "version": self.STORAGE_VERSION,
        }
        self.storage.put("alp", data)

    def clear(self):
        self.outpoints = {}
        self.needs_rebuild = False
