# Copyright (c) 2015-2019 The Bitcoin Core developers
# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Python imlementations of SignatureHash and SignatureHashForkId
"""

import struct

from .messages import (
    CTransaction,
    CTxOut,
    hash256,
    ser_string,
    ser_uint256,
    uint256_from_str,
)
from .script import OP_CODESEPARATOR, CScript

SIGHASH_ALL = 1
SIGHASH_NONE = 2
SIGHASH_SINGLE = 3
SIGHASH_FORKID = 0x40
SIGHASH_ANYONECANPAY = 0x80


def FindAndDelete(script, sig):
    """Consensus critical, see FindAndDelete() in Satoshi codebase"""
    r = b""
    last_sop_idx = sop_idx = 0
    skip = True
    for opcode, data, sop_idx in script.raw_iter():
        if not skip:
            r += script[last_sop_idx:sop_idx]
        last_sop_idx = sop_idx
        if script[sop_idx : sop_idx + len(sig)] == sig:
            skip = True
        else:
            skip = False
    if not skip:
        r += script[last_sop_idx:]
    return CScript(r)


def SignatureHash(script, txTo, inIdx, hashtype):
    """Consensus-correct SignatureHash

    Returns (sighash, err) to precisely match the consensus-critical behavior of
    the SIGHASH_SINGLE bug. (inIdx is *not* checked for validity)
    """
    HASH_ONE = b"\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"

    if inIdx >= len(txTo.vin):
        return (HASH_ONE, f"inIdx {inIdx} out of range ({len(txTo.vin)})")
    txtmp = CTransaction(txTo)

    for txin in txtmp.vin:
        txin.scriptSig = b""
    txtmp.vin[inIdx].scriptSig = FindAndDelete(script, CScript([OP_CODESEPARATOR]))

    if (hashtype & 0x1F) == SIGHASH_NONE:
        txtmp.vout = []

        for i in range(len(txtmp.vin)):
            if i != inIdx:
                txtmp.vin[i].nSequence = 0

    elif (hashtype & 0x1F) == SIGHASH_SINGLE:
        outIdx = inIdx
        if outIdx >= len(txtmp.vout):
            return (HASH_ONE, f"outIdx {outIdx} out of range ({len(txtmp.vout)})")

        tmp = txtmp.vout[outIdx]
        txtmp.vout = []
        for _ in range(outIdx):
            txtmp.vout.append(CTxOut(-1))
        txtmp.vout.append(tmp)

        for i in range(len(txtmp.vin)):
            if i != inIdx:
                txtmp.vin[i].nSequence = 0

    if hashtype & SIGHASH_ANYONECANPAY:
        tmp = txtmp.vin[inIdx]
        txtmp.vin = []
        txtmp.vin.append(tmp)

    s = txtmp.serialize()
    s += struct.pack(b"<I", hashtype)

    sighash = hash256(s)

    return (sighash, None)


# TODO: Allow cached hashPrevouts/hashSequence/hashOutputs to be provided.
# Performance optimization probably not necessary for python tests, however.


def SignatureHashForkId(script, txTo, inIdx, hashtype, amount):
    hashPrevouts = 0
    hashSequence = 0
    hashOutputs = 0

    if not (hashtype & SIGHASH_ANYONECANPAY):
        serialize_prevouts = bytes()
        for i in txTo.vin:
            serialize_prevouts += i.prevout.serialize()
        hashPrevouts = uint256_from_str(hash256(serialize_prevouts))

    if (
        not (hashtype & SIGHASH_ANYONECANPAY)
        and (hashtype & 0x1F) != SIGHASH_SINGLE
        and (hashtype & 0x1F) != SIGHASH_NONE
    ):
        serialize_sequence = bytes()
        for i in txTo.vin:
            serialize_sequence += struct.pack("<I", i.nSequence)
        hashSequence = uint256_from_str(hash256(serialize_sequence))

    if (hashtype & 0x1F) != SIGHASH_SINGLE and (hashtype & 0x1F) != SIGHASH_NONE:
        serialize_outputs = bytes()
        for o in txTo.vout:
            serialize_outputs += o.serialize()
        hashOutputs = uint256_from_str(hash256(serialize_outputs))
    elif (hashtype & 0x1F) == SIGHASH_SINGLE and inIdx < len(txTo.vout):
        serialize_outputs = txTo.vout[inIdx].serialize()
        hashOutputs = uint256_from_str(hash256(serialize_outputs))

    ss = bytes()
    ss += struct.pack("<i", txTo.nVersion)
    ss += ser_uint256(hashPrevouts)
    ss += ser_uint256(hashSequence)
    ss += txTo.vin[inIdx].prevout.serialize()
    ss += ser_string(script)
    ss += struct.pack("<q", amount)
    ss += struct.pack("<I", txTo.vin[inIdx].nSequence)
    ss += ser_uint256(hashOutputs)
    ss += struct.pack("<i", txTo.nLockTime)
    ss += struct.pack("<I", hashtype)

    return hash256(ss)
