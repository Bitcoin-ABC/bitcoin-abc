#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""A limited-functionality wallet, which may replace a real wallet in tests"""

from decimal import Decimal

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.messages import XEC, COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, hex_str_to_bytes, satoshi_round


class MiniWallet:
    def __init__(self, test_node):
        self._test_node = test_node
        self._utxos = []
        self._address = ADDRESS_ECREG_P2SH_OP_TRUE
        self._scriptPubKey = hex_str_to_bytes(
            self._test_node.validateaddress(
                self._address)['scriptPubKey'])

    def generate(self, num_blocks):
        """Generate blocks with coinbase outputs to the internal address,
        and append the outputs to the internal list"""
        blocks = self._test_node.generatetoaddress(num_blocks, self._address)
        for b in blocks:
            cb_tx = self._test_node.getblock(blockhash=b, verbosity=2)['tx'][0]
            self._utxos.append(
                {'txid': cb_tx['txid'], 'vout': 0, 'value': cb_tx['vout'][0]['value']})
        return blocks

    def get_utxo(self):
        """Return the last utxo. Can be used to get the change output
        immediately after a send_self_transfer"""
        return self._utxos.pop()

    def send_self_transfer(self, *, fee_rate=Decimal("3000.00"), from_node,
                           utxo_to_spend=None):
        """Create and send a tx with the specified fee_rate. Fee may be exact
         or at most one satoshi higher than needed."""
        self._utxos = sorted(self._utxos, key=lambda k: k['value'])
        # Pick the largest utxo (if none provided) and hope it covers the fee
        utxo_to_spend = utxo_to_spend or self._utxos.pop()

        # The size will be enforced by pad_tx()
        size = 100
        send_value = satoshi_round(
            utxo_to_spend['value'] - fee_rate * (Decimal(size) / 1000))
        fee = utxo_to_spend['value'] - send_value
        assert send_value > 0

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(utxo_to_spend['txid'], 16),
                                  utxo_to_spend['vout']))]
        tx.vout = [CTxOut(int(send_value * XEC), self._scriptPubKey)]
        tx.vin[0].scriptSig = SCRIPTSIG_OP_TRUE
        pad_tx(tx, size)
        tx_hex = tx.serialize().hex()

        txid = from_node.sendrawtransaction(tx_hex)
        self._utxos.append({'txid': txid, 'vout': 0, 'value': send_value})
        tx_info = from_node.getmempoolentry(txid)
        assert_equal(tx_info['size'], size)
        assert_equal(tx_info['fee'], fee)
        return {'txid': txid, 'hex': tx_hex}
