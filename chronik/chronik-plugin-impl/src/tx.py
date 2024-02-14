# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from typing import List, NamedTuple, Optional

from chronik_plugin.script import Script
from chronik_plugin.token import Token, TokenTxEntry


class OutPoint(NamedTuple):
    # TxId of the tx whose output is being spent, in little-endian
    txid: bytes
    # Index of the output we're spending
    out_idx: int


class TxOutput(NamedTuple):
    # scriptPubKey, script locking the output
    script: Script

    # value of the output, in satoshis
    value: int

    # ALP/SLP value attached to the output
    token: Optional[Token]


class TxInput(NamedTuple):
    prev_out: OutPoint

    # scriptSig of the input, as a handy `Script` object to simplify parsing
    script: Script

    # Output spent by the input
    output: TxOutput

    # nSequence of the input
    sequence: int


class Tx(NamedTuple):
    # txid of the tx, in little-endian
    txid: bytes

    # Tx nVersion
    version: int

    # Tx inputs
    inputs: List[TxInput]

    # Tx outputs
    outputs: List[TxOutput]

    # Tx nLockTime
    lock_time: int

    # Token data of this tx
    token_entries: List[TokenTxEntry]

    # Parsed eMPP data of this tx, or the empty list if not eMPP
    empp_data: List[bytes]
