#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Utilities for avalanche tests."""

from typing import Any, Optional, List, Dict

from .test_node import TestNode


def get_stakes(node: TestNode,
               blockhashes: List[str],
               priv_key: str,
               amount: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns a list of dictionaries representing stakes, in a format
    compatible with the buildavalancheproof RPC.

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
