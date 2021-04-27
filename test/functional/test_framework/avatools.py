#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Utilities for avalanche tests."""

from typing import Any, Optional, List, Dict

from .messages import (
    CTransaction,
    FromHex,
    ToHex
)
from .test_node import TestNode
from .util import satoshi_round


def create_coinbase_stakes(
        node: TestNode,
        blockhashes: List[str],
        priv_key: str,
        amount: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns a list of dictionaries representing stakes, in a format
    compatible with the buildavalancheproof RPC, using only coinbase
    transactions.

    :param node: Test node used to get the block and coinbase data.
    :param blockhashes: List of block hashes, whose coinbase tx will be used
        as a stake.
    :param priv_key: Private key controlling the coinbase UTXO
    :param amount: If specified, this overwrites the amount information
        in the coinbase dicts.
    """
    blocks = [node.getblock(h, 2) for h in blockhashes]
    coinbases = [
        {
            'height': b['height'],
            'txid': b['tx'][0]['txid'],
            'n': 0,
            'value': b['tx'][0]['vout'][0]['value'],
        } for b in blocks
    ]

    return [{
        'txid': coinbase['txid'],
        'vout': coinbase['n'],
        'amount': amount or coinbase['value'],
        'height': coinbase['height'],
        'iscoinbase': True,
        'privatekey': priv_key,
    } for coinbase in coinbases]


def get_utxos_in_blocks(node: TestNode, blockhashes: List[str]) -> List[Dict]:
    """Return all UTXOs in the specified list of blocks.
    """
    utxos = filter(
        lambda u: node.gettransaction(u["txid"])["blockhash"] in blockhashes,
        node.listunspent())
    return list(utxos)


def create_stakes(
        node: TestNode, blockhashes: List[str], count: int
) -> List[Dict[str, Any]]:
    """
    Create a list of stakes by splitting existing UTXOs from a specified list
    of blocks into 10 new coins.

    This function can generate more valid stakes than `get_coinbase_stakes`
    does, because on the regtest chain halving happens every 150 blocks so
    the coinbase amount is below the dust threshold after only 900 blocks.

    :param node: Test node used to generate blocks and send transactions
    :param blockhashes: List of block hashes whose UTXOs will be split.
    :param count: Number of stakes to return.
    """
    assert 10 * len(blockhashes) >= count
    utxos = get_utxos_in_blocks(node, blockhashes)

    addresses = [node.getnewaddress() for _ in range(10)]
    private_keys = {addr: node.dumpprivkey(addr) for addr in addresses}

    for u in utxos:
        inputs = [{"txid": u["txid"], "vout": u["vout"]}]
        outputs = {
            addr: satoshi_round(u['amount'] / 10) for addr in addresses}
        raw_tx = node.createrawtransaction(inputs, outputs)
        ctx = FromHex(CTransaction(), raw_tx)
        ctx.vout[0].nValue -= node.calculate_fee(ctx)
        signed_tx = node.signrawtransactionwithwallet(ToHex(ctx))["hex"]
        node.sendrawtransaction(signed_tx)

    # confirm the transactions
    new_blocks = []
    while node.getmempoolinfo()['size'] > 0:
        new_blocks += node.generate(1)

    utxos = get_utxos_in_blocks(node, new_blocks)
    stakes = []
    # cache block heights
    heights = {}
    for utxo in utxos[:count]:
        blockhash = node.gettransaction(utxo["txid"])["blockhash"]
        if blockhash not in heights:
            heights[blockhash] = node.getblock(blockhash, 1)["height"]
        stakes.append({
            'txid': utxo['txid'],
            'vout': utxo['vout'],
            'amount': utxo['amount'],
            'iscoinbase': utxo['label'] == "coinbase",
            'height': heights[blockhash],
            'privatekey': private_keys[utxo["address"]],
        })

    return stakes
