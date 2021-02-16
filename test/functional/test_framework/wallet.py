#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""A limited-functionality wallet, which may replace a real wallet in tests"""

from copy import deepcopy
from decimal import Decimal
from typing import Optional

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.messages import (
    XEC,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    FromHex,
    ToHex,
)
from test_framework.txtools import pad_tx
from test_framework.util import (
    assert_equal,
    assert_greater_than_or_equal,
    satoshi_round,
)

DEFAULT_FEE = Decimal("100.00")


class MiniWallet:
    def __init__(self, test_node):
        self._test_node = test_node
        self._utxos = []
        self._address = ADDRESS_ECREG_P2SH_OP_TRUE
        self._scriptPubKey = bytes.fromhex(
            self._test_node.validateaddress(
                self._address)['scriptPubKey'])

    def scan_blocks(self, *, start=1, num):
        """Scan the blocks for self._address outputs and add them to self._utxos"""
        for i in range(start, start + num):
            block = self._test_node.getblock(
                blockhash=self._test_node.getblockhash(i), verbosity=2)
            for tx in block['tx']:
                for out in tx['vout']:
                    if out['scriptPubKey']['hex'] == self._scriptPubKey.hex():
                        self._utxos.append(
                            {'txid': tx['txid'], 'vout': out['n'], 'value': out['value']})

    def generate(self, num_blocks):
        """Generate blocks with coinbase outputs to the internal address,
        and append the outputs to the internal list"""
        blocks = self._test_node.generatetoaddress(num_blocks, self._address)
        for b in blocks:
            cb_tx = self._test_node.getblock(blockhash=b, verbosity=2)['tx'][0]
            self._utxos.append(
                {'txid': cb_tx['txid'], 'vout': 0, 'value': cb_tx['vout'][0]['value']})
        return blocks

    def get_utxo(self, *, txid: Optional[str] = ''):
        """
        Returns a utxo and marks it as spent (pops it from the internal list)

        Args:
        txid: get the first utxo we find from a specific transaction

        Note: Can be used to get the change output immediately after a send_self_transfer
        """
        # by default the last utxo
        index = -1
        if txid:
            utxo = next(filter(lambda utxo: txid == utxo['txid'], self._utxos))
            index = self._utxos.index(utxo)
        return self._utxos.pop(index)

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

        tx_info = from_node.testmempoolaccept([tx_hex])[0]
        self._utxos.append(
            {'txid': tx_info['txid'], 'vout': 0, 'value': send_value})
        from_node.sendrawtransaction(tx_hex)
        assert_equal(tx_info['size'], size)
        assert_equal(tx_info['fees']['base'], fee)
        return {'txid': tx_info['txid'], 'hex': tx_hex}


def make_chain(node, address, privkeys, parent_txid, parent_value, n=0,
               parent_locking_script=None, fee=DEFAULT_FEE):
    """Build a transaction that spends parent_txid.vout[n] and produces one
    output with amount = parent_value with a fee deducted.
    Return tuple (CTransaction object, raw hex, nValue, scriptPubKey of the
    output created).
    """
    inputs = [{"txid": parent_txid, "vout": n}]
    my_value = parent_value - fee
    outputs = {address: my_value}
    rawtx = node.createrawtransaction(inputs, outputs)
    prevtxs = [{
        "txid": parent_txid,
        "vout": n,
        "scriptPubKey": parent_locking_script,
        "amount": parent_value,
    }] if parent_locking_script else None
    signedtx = node.signrawtransactionwithkey(
        hexstring=rawtx, privkeys=privkeys, prevtxs=prevtxs)
    assert signedtx["complete"]
    tx = FromHex(CTransaction(), signedtx["hex"])
    return (tx, signedtx["hex"], my_value, tx.vout[0].scriptPubKey.hex())


def create_child_with_parents(node, address, privkeys, parents_tx, values,
                              locking_scripts, fee=DEFAULT_FEE):
    """Creates a transaction that spends the first output of each parent in parents_tx."""
    num_parents = len(parents_tx)
    total_value = sum(values)
    inputs = [{"txid": tx.get_id(), "vout": 0} for tx in parents_tx]
    outputs = {address: total_value - fee}
    rawtx_child = node.createrawtransaction(inputs, outputs)
    prevtxs = []
    for i in range(num_parents):
        prevtxs.append(
            {"txid": parents_tx[i].get_id(), "vout": 0,
             "scriptPubKey": locking_scripts[i], "amount": values[i]})
    signedtx_child = node.signrawtransactionwithkey(
        hexstring=rawtx_child, privkeys=privkeys, prevtxs=prevtxs)
    assert signedtx_child["complete"]
    return signedtx_child["hex"]


def create_raw_chain(node, first_coin, address, privkeys, chain_length=50):
    """Helper function: create a "chain" of chain_length transactions.
    The nth transaction in the chain is a child of the n-1th transaction and
    parent of the n+1th transaction.
    """
    parent_locking_script = None
    txid = first_coin["txid"]
    chain_hex = []
    chain_txns = []
    value = first_coin["amount"]

    for _ in range(chain_length):
        (tx, txhex, value, parent_locking_script) = make_chain(
            node, address, privkeys, txid, value, 0, parent_locking_script)
        txid = tx.get_id()
        chain_hex.append(txhex)
        chain_txns.append(tx)

    return (chain_hex, chain_txns)


def bulk_transaction(
        tx: CTransaction, node, target_size: int, privkeys=None, prevtxs=None
) -> CTransaction:
    """Return a padded and signed transaction. The original transaction is left
    unaltered.
    If privkeys is not specified, it is assumed that the transaction has an
    anyone-can-spend output as unique output.
    """
    tx_heavy = deepcopy(tx)
    pad_tx(tx_heavy, target_size)
    assert_greater_than_or_equal(tx_heavy.billable_size(), target_size)
    if privkeys is not None:
        signed_tx = node.signrawtransactionwithkey(
            ToHex(tx_heavy), privkeys, prevtxs)
        return FromHex(CTransaction(), signed_tx["hex"])
    # OP_TRUE
    tx_heavy.vin[0].scriptSig = SCRIPTSIG_OP_TRUE
    return tx_heavy
