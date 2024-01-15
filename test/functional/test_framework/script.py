#!/usr/bin/env python3
# Copyright (c) 2015-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Functionality to build scripts, as well as SignatureHash().

This file is modified from python-bitcoinlib.
"""

import struct
import unittest
from typing import Dict, List

from .messages import (
    CTransaction,
    CTxOut,
    hash256,
    ser_string,
    ser_uint256,
    sha256,
    uint256_from_str,
)
from .ripemd160 import ripemd160

MAX_SCRIPT_ELEMENT_SIZE = 520
OPCODE_NAMES: Dict["CScriptOp", str] = {}


def hash160(s: bytes) -> bytes:
    return ripemd160(sha256(s))


def bn2vch(v):
    """Convert number to bitcoin-specific little endian format."""
    # We need v.bit_length() bits, plus a sign bit for every nonzero number.
    n_bits = v.bit_length() + (v != 0)
    # The number of bytes for that is:
    n_bytes = (n_bits + 7) // 8
    # Convert number to absolute value + sign in top bit.
    encoded_v = 0 if v == 0 else abs(v) | ((v < 0) << (n_bytes * 8 - 1))
    # Serialize to bytes
    return encoded_v.to_bytes(n_bytes, "little")


_opcode_instances: List["CScriptOp"] = []


class CScriptOp(int):
    """A single script opcode"""

    __slots__ = ()

    @staticmethod
    def encode_op_pushdata(d):
        """Encode a PUSHDATA op, returning bytes"""
        if len(d) < 0x4C:
            # OP_PUSHDATA
            return b"" + bytes([len(d)]) + d
        elif len(d) <= 0xFF:
            # OP_PUSHDATA1
            return b"\x4c" + bytes([len(d)]) + d
        elif len(d) <= 0xFFFF:
            # OP_PUSHDATA2
            return b"\x4d" + struct.pack(b"<H", len(d)) + d
        elif len(d) <= 0xFFFFFFFF:
            # OP_PUSHDATA4
            return b"\x4e" + struct.pack(b"<I", len(d)) + d
        else:
            raise ValueError("Data too long to encode in a PUSHDATA op")

    @staticmethod
    def encode_op_n(n):
        """Encode a small integer op, returning an opcode"""
        if not (0 <= n <= 16):
            raise ValueError(f"Integer must be in range 0 <= n <= 16, got {n}")

        if n == 0:
            return OP_0
        else:
            return CScriptOp(OP_1 + n - 1)

    def decode_op_n(self):
        """Decode a small integer opcode, returning an integer"""
        if self == OP_0:
            return 0

        if not (self == OP_0 or OP_1 <= self <= OP_16):
            raise ValueError(f"op {self!r} is not an OP_N")

        return int(self - OP_1 + 1)

    def is_small_int(self):
        """Return true if the op pushes a small integer to the stack"""
        if 0x51 <= self <= 0x60 or self == 0:
            return True
        else:
            return False

    def __str__(self):
        return repr(self)

    def __repr__(self):
        if self in OPCODE_NAMES:
            return OPCODE_NAMES[self]
        else:
            return f"CScriptOp(0x{self:x})"

    def __new__(cls, n):
        try:
            return _opcode_instances[n]
        except IndexError:
            assert len(_opcode_instances) == n
            _opcode_instances.append(super().__new__(cls, n))
            return _opcode_instances[n]


# Populate opcode instance table
for n in range(0xFF + 1):
    CScriptOp(n)


# push value
OP_0 = CScriptOp(0x00)
OP_FALSE = OP_0
OP_PUSHDATA1 = CScriptOp(0x4C)
OP_PUSHDATA2 = CScriptOp(0x4D)
OP_PUSHDATA4 = CScriptOp(0x4E)
OP_1NEGATE = CScriptOp(0x4F)
OP_RESERVED = CScriptOp(0x50)
OP_1 = CScriptOp(0x51)
OP_TRUE = OP_1
OP_2 = CScriptOp(0x52)
OP_3 = CScriptOp(0x53)
OP_4 = CScriptOp(0x54)
OP_5 = CScriptOp(0x55)
OP_6 = CScriptOp(0x56)
OP_7 = CScriptOp(0x57)
OP_8 = CScriptOp(0x58)
OP_9 = CScriptOp(0x59)
OP_10 = CScriptOp(0x5A)
OP_11 = CScriptOp(0x5B)
OP_12 = CScriptOp(0x5C)
OP_13 = CScriptOp(0x5D)
OP_14 = CScriptOp(0x5E)
OP_15 = CScriptOp(0x5F)
OP_16 = CScriptOp(0x60)

# control
OP_NOP = CScriptOp(0x61)
OP_VER = CScriptOp(0x62)
OP_IF = CScriptOp(0x63)
OP_NOTIF = CScriptOp(0x64)
OP_VERIF = CScriptOp(0x65)
OP_VERNOTIF = CScriptOp(0x66)
OP_ELSE = CScriptOp(0x67)
OP_ENDIF = CScriptOp(0x68)
OP_VERIFY = CScriptOp(0x69)
OP_RETURN = CScriptOp(0x6A)

# stack ops
OP_TOALTSTACK = CScriptOp(0x6B)
OP_FROMALTSTACK = CScriptOp(0x6C)
OP_2DROP = CScriptOp(0x6D)
OP_2DUP = CScriptOp(0x6E)
OP_3DUP = CScriptOp(0x6F)
OP_2OVER = CScriptOp(0x70)
OP_2ROT = CScriptOp(0x71)
OP_2SWAP = CScriptOp(0x72)
OP_IFDUP = CScriptOp(0x73)
OP_DEPTH = CScriptOp(0x74)
OP_DROP = CScriptOp(0x75)
OP_DUP = CScriptOp(0x76)
OP_NIP = CScriptOp(0x77)
OP_OVER = CScriptOp(0x78)
OP_PICK = CScriptOp(0x79)
OP_ROLL = CScriptOp(0x7A)
OP_ROT = CScriptOp(0x7B)
OP_SWAP = CScriptOp(0x7C)
OP_TUCK = CScriptOp(0x7D)

# splice ops
OP_CAT = CScriptOp(0x7E)
OP_SPLIT = CScriptOp(0x7F)
OP_NUM2BIN = CScriptOp(0x80)
OP_BIN2NUM = CScriptOp(0x81)
OP_SIZE = CScriptOp(0x82)

# bit logic
OP_INVERT = CScriptOp(0x83)
OP_AND = CScriptOp(0x84)
OP_OR = CScriptOp(0x85)
OP_XOR = CScriptOp(0x86)
OP_EQUAL = CScriptOp(0x87)
OP_EQUALVERIFY = CScriptOp(0x88)
OP_RESERVED1 = CScriptOp(0x89)
OP_RESERVED2 = CScriptOp(0x8A)

# numeric
OP_1ADD = CScriptOp(0x8B)
OP_1SUB = CScriptOp(0x8C)
OP_2MUL = CScriptOp(0x8D)
OP_2DIV = CScriptOp(0x8E)
OP_NEGATE = CScriptOp(0x8F)
OP_ABS = CScriptOp(0x90)
OP_NOT = CScriptOp(0x91)
OP_0NOTEQUAL = CScriptOp(0x92)

OP_ADD = CScriptOp(0x93)
OP_SUB = CScriptOp(0x94)
OP_MUL = CScriptOp(0x95)
OP_DIV = CScriptOp(0x96)
OP_MOD = CScriptOp(0x97)
OP_LSHIFT = CScriptOp(0x98)
OP_RSHIFT = CScriptOp(0x99)

OP_BOOLAND = CScriptOp(0x9A)
OP_BOOLOR = CScriptOp(0x9B)
OP_NUMEQUAL = CScriptOp(0x9C)
OP_NUMEQUALVERIFY = CScriptOp(0x9D)
OP_NUMNOTEQUAL = CScriptOp(0x9E)
OP_LESSTHAN = CScriptOp(0x9F)
OP_GREATERTHAN = CScriptOp(0xA0)
OP_LESSTHANOREQUAL = CScriptOp(0xA1)
OP_GREATERTHANOREQUAL = CScriptOp(0xA2)
OP_MIN = CScriptOp(0xA3)
OP_MAX = CScriptOp(0xA4)

OP_WITHIN = CScriptOp(0xA5)

# crypto
OP_RIPEMD160 = CScriptOp(0xA6)
OP_SHA1 = CScriptOp(0xA7)
OP_SHA256 = CScriptOp(0xA8)
OP_HASH160 = CScriptOp(0xA9)
OP_HASH256 = CScriptOp(0xAA)
OP_CODESEPARATOR = CScriptOp(0xAB)
OP_CHECKSIG = CScriptOp(0xAC)
OP_CHECKSIGVERIFY = CScriptOp(0xAD)
OP_CHECKMULTISIG = CScriptOp(0xAE)
OP_CHECKMULTISIGVERIFY = CScriptOp(0xAF)

# expansion
OP_NOP1 = CScriptOp(0xB0)
OP_CHECKLOCKTIMEVERIFY = CScriptOp(0xB1)
OP_CHECKSEQUENCEVERIFY = CScriptOp(0xB2)
OP_NOP4 = CScriptOp(0xB3)
OP_NOP5 = CScriptOp(0xB4)
OP_NOP6 = CScriptOp(0xB5)
OP_NOP7 = CScriptOp(0xB6)
OP_NOP8 = CScriptOp(0xB7)
OP_NOP9 = CScriptOp(0xB8)
OP_NOP10 = CScriptOp(0xB9)

# more crypto
OP_CHECKDATASIG = CScriptOp(0xBA)
OP_CHECKDATASIGVERIFY = CScriptOp(0xBB)

# additional byte string operations
OP_REVERSEBYTES = CScriptOp(0xBC)

# multi-byte opcodes
OP_PREFIX_BEGIN = CScriptOp(0xF0)
OP_PREFIX_END = CScriptOp(0xF7)

# template matching params
OP_SMALLINTEGER = CScriptOp(0xFA)
OP_PUBKEYS = CScriptOp(0xFB)
OP_PUBKEYHASH = CScriptOp(0xFD)
OP_PUBKEY = CScriptOp(0xFE)

OP_INVALIDOPCODE = CScriptOp(0xFF)

OPCODE_NAMES.update(
    {
        OP_0: "OP_0",
        OP_PUSHDATA1: "OP_PUSHDATA1",
        OP_PUSHDATA2: "OP_PUSHDATA2",
        OP_PUSHDATA4: "OP_PUSHDATA4",
        OP_1NEGATE: "OP_1NEGATE",
        OP_RESERVED: "OP_RESERVED",
        OP_1: "OP_1",
        OP_2: "OP_2",
        OP_3: "OP_3",
        OP_4: "OP_4",
        OP_5: "OP_5",
        OP_6: "OP_6",
        OP_7: "OP_7",
        OP_8: "OP_8",
        OP_9: "OP_9",
        OP_10: "OP_10",
        OP_11: "OP_11",
        OP_12: "OP_12",
        OP_13: "OP_13",
        OP_14: "OP_14",
        OP_15: "OP_15",
        OP_16: "OP_16",
        OP_NOP: "OP_NOP",
        OP_VER: "OP_VER",
        OP_IF: "OP_IF",
        OP_NOTIF: "OP_NOTIF",
        OP_VERIF: "OP_VERIF",
        OP_VERNOTIF: "OP_VERNOTIF",
        OP_ELSE: "OP_ELSE",
        OP_ENDIF: "OP_ENDIF",
        OP_VERIFY: "OP_VERIFY",
        OP_RETURN: "OP_RETURN",
        OP_TOALTSTACK: "OP_TOALTSTACK",
        OP_FROMALTSTACK: "OP_FROMALTSTACK",
        OP_2DROP: "OP_2DROP",
        OP_2DUP: "OP_2DUP",
        OP_3DUP: "OP_3DUP",
        OP_2OVER: "OP_2OVER",
        OP_2ROT: "OP_2ROT",
        OP_2SWAP: "OP_2SWAP",
        OP_IFDUP: "OP_IFDUP",
        OP_DEPTH: "OP_DEPTH",
        OP_DROP: "OP_DROP",
        OP_DUP: "OP_DUP",
        OP_NIP: "OP_NIP",
        OP_OVER: "OP_OVER",
        OP_PICK: "OP_PICK",
        OP_ROLL: "OP_ROLL",
        OP_ROT: "OP_ROT",
        OP_SWAP: "OP_SWAP",
        OP_TUCK: "OP_TUCK",
        OP_CAT: "OP_CAT",
        OP_SPLIT: "OP_SPLIT",
        OP_NUM2BIN: "OP_NUM2BIN",
        OP_BIN2NUM: "OP_BIN2NUM",
        OP_SIZE: "OP_SIZE",
        OP_INVERT: "OP_INVERT",
        OP_AND: "OP_AND",
        OP_OR: "OP_OR",
        OP_XOR: "OP_XOR",
        OP_EQUAL: "OP_EQUAL",
        OP_EQUALVERIFY: "OP_EQUALVERIFY",
        OP_RESERVED1: "OP_RESERVED1",
        OP_RESERVED2: "OP_RESERVED2",
        OP_1ADD: "OP_1ADD",
        OP_1SUB: "OP_1SUB",
        OP_2MUL: "OP_2MUL",
        OP_2DIV: "OP_2DIV",
        OP_NEGATE: "OP_NEGATE",
        OP_ABS: "OP_ABS",
        OP_NOT: "OP_NOT",
        OP_0NOTEQUAL: "OP_0NOTEQUAL",
        OP_ADD: "OP_ADD",
        OP_SUB: "OP_SUB",
        OP_MUL: "OP_MUL",
        OP_DIV: "OP_DIV",
        OP_MOD: "OP_MOD",
        OP_LSHIFT: "OP_LSHIFT",
        OP_RSHIFT: "OP_RSHIFT",
        OP_BOOLAND: "OP_BOOLAND",
        OP_BOOLOR: "OP_BOOLOR",
        OP_NUMEQUAL: "OP_NUMEQUAL",
        OP_NUMEQUALVERIFY: "OP_NUMEQUALVERIFY",
        OP_NUMNOTEQUAL: "OP_NUMNOTEQUAL",
        OP_LESSTHAN: "OP_LESSTHAN",
        OP_GREATERTHAN: "OP_GREATERTHAN",
        OP_LESSTHANOREQUAL: "OP_LESSTHANOREQUAL",
        OP_GREATERTHANOREQUAL: "OP_GREATERTHANOREQUAL",
        OP_MIN: "OP_MIN",
        OP_MAX: "OP_MAX",
        OP_WITHIN: "OP_WITHIN",
        OP_RIPEMD160: "OP_RIPEMD160",
        OP_SHA1: "OP_SHA1",
        OP_SHA256: "OP_SHA256",
        OP_HASH160: "OP_HASH160",
        OP_HASH256: "OP_HASH256",
        OP_CODESEPARATOR: "OP_CODESEPARATOR",
        OP_CHECKSIG: "OP_CHECKSIG",
        OP_CHECKSIGVERIFY: "OP_CHECKSIGVERIFY",
        OP_CHECKMULTISIG: "OP_CHECKMULTISIG",
        OP_CHECKMULTISIGVERIFY: "OP_CHECKMULTISIGVERIFY",
        OP_CHECKDATASIG: "OP_CHECKDATASIG",
        OP_CHECKDATASIGVERIFY: "OP_CHECKDATASIGVERIFY",
        OP_NOP1: "OP_NOP1",
        OP_CHECKLOCKTIMEVERIFY: "OP_CHECKLOCKTIMEVERIFY",
        OP_CHECKSEQUENCEVERIFY: "OP_CHECKSEQUENCEVERIFY",
        OP_NOP4: "OP_NOP4",
        OP_NOP5: "OP_NOP5",
        OP_NOP6: "OP_NOP6",
        OP_NOP7: "OP_NOP7",
        OP_NOP8: "OP_NOP8",
        OP_NOP9: "OP_NOP9",
        OP_NOP10: "OP_NOP10",
        OP_SMALLINTEGER: "OP_SMALLINTEGER",
        OP_PUBKEYS: "OP_PUBKEYS",
        OP_PUBKEYHASH: "OP_PUBKEYHASH",
        OP_PUBKEY: "OP_PUBKEY",
        OP_INVALIDOPCODE: "OP_INVALIDOPCODE",
    }
)


class CScriptInvalidError(Exception):
    """Base class for CScript exceptions"""

    pass


class CScriptTruncatedPushDataError(CScriptInvalidError):
    """Invalid pushdata due to truncation"""

    def __init__(self, msg, data):
        self.data = data
        super().__init__(msg)


# This is used, eg, for blockchain heights in coinbase scripts (bip34)
class CScriptNum:
    __slots__ = ("value",)

    def __init__(self, d=0):
        self.value = d

    @staticmethod
    def encode(obj):
        r = bytearray(0)
        if obj.value == 0:
            return bytes(r)
        neg = obj.value < 0
        absvalue = -obj.value if neg else obj.value
        while absvalue:
            r.append(absvalue & 0xFF)
            absvalue >>= 8
        if r[-1] & 0x80:
            r.append(0x80 if neg else 0)
        elif neg:
            r[-1] |= 0x80
        return bytes([len(r)]) + r

    @staticmethod
    def decode(vch):
        result = 0
        # We assume valid push_size and minimal encoding
        value = vch[1:]
        if len(value) == 0:
            return result
        for i, byte in enumerate(value):
            result |= int(byte) << 8 * i
        if value[-1] >= 0x80:
            # Mask for all but the highest result bit
            num_mask = (2 ** (len(value) * 8) - 1) >> 1
            result &= num_mask
            result *= -1
        return result


class CScript(bytes):
    """Serialized script

    A bytes subclass, so you can use this directly whenever bytes are accepted.
    Note that this means that indexing does *not* work - you'll get an index by
    byte rather than opcode. This format was chosen for efficiency so that the
    general case would not require creating a lot of little CScriptOP objects.

    iter(script) however does iterate by opcode.
    """

    __slots__ = ()

    @classmethod
    def _coerce_instance(cls, other):
        # Coerce other into bytes
        if isinstance(other, CScriptOp):
            other = bytes([other])
        elif isinstance(other, CScriptNum):
            if other.value == 0:
                other = bytes([CScriptOp(OP_0)])
            else:
                other = CScriptNum.encode(other)
        elif isinstance(other, int):
            if 0 <= other <= 16:
                other = bytes([CScriptOp.encode_op_n(other)])
            elif other == -1:
                other = bytes([OP_1NEGATE])
            else:
                other = CScriptOp.encode_op_pushdata(bn2vch(other))
        elif isinstance(other, (bytes, bytearray)):
            other = CScriptOp.encode_op_pushdata(other)
        return other

    def __add__(self, other):
        # add makes no sense for a CScript()
        raise NotImplementedError

    def join(self, iterable):
        # join makes no sense for a CScript()
        raise NotImplementedError

    def __new__(cls, value=b""):
        if isinstance(value, bytes) or isinstance(value, bytearray):
            return super().__new__(cls, value)
        else:

            def coerce_iterable(iterable):
                for instance in iterable:
                    yield cls._coerce_instance(instance)

            # Annoyingly on both python2 and python3 bytes.join() always
            # returns a bytes instance even when subclassed.
            return super().__new__(cls, b"".join(coerce_iterable(value)))

    def raw_iter(self):
        """Raw iteration

        Yields tuples of (opcode, data, sop_idx) so that the different possible
        PUSHDATA encodings can be accurately distinguished, as well as
        determining the exact opcode byte indexes. (sop_idx)
        """
        i = 0
        while i < len(self):
            sop_idx = i
            opcode = self[i]
            i += 1

            if opcode > OP_PUSHDATA4:
                yield (opcode, None, sop_idx)
            else:
                datasize = None
                pushdata_type = None
                if opcode < OP_PUSHDATA1:
                    pushdata_type = f"PUSHDATA({opcode})"
                    datasize = opcode

                elif opcode == OP_PUSHDATA1:
                    pushdata_type = "PUSHDATA1"
                    if i >= len(self):
                        raise CScriptInvalidError("PUSHDATA1: missing data length")
                    datasize = self[i]
                    i += 1

                elif opcode == OP_PUSHDATA2:
                    pushdata_type = "PUSHDATA2"
                    if i + 1 >= len(self):
                        raise CScriptInvalidError("PUSHDATA2: missing data length")
                    datasize = self[i] + (self[i + 1] << 8)
                    i += 2

                elif opcode == OP_PUSHDATA4:
                    pushdata_type = "PUSHDATA4"
                    if i + 3 >= len(self):
                        raise CScriptInvalidError("PUSHDATA4: missing data length")
                    datasize = (
                        self[i]
                        + (self[i + 1] << 8)
                        + (self[i + 2] << 16)
                        + (self[i + 3] << 24)
                    )
                    i += 4

                else:
                    assert False  # shouldn't happen

                data = bytes(self[i : i + datasize])

                # Check for truncation
                if len(data) < datasize:
                    raise CScriptTruncatedPushDataError(
                        f"{pushdata_type}: truncated data", data
                    )

                i += datasize

                yield (opcode, data, sop_idx)

    def __iter__(self):
        """'Cooked' iteration

        Returns either a CScriptOP instance, an integer, or bytes, as
        appropriate.

        See raw_iter() if you need to distinguish the different possible
        PUSHDATA encodings.
        """
        for opcode, data, sop_idx in self.raw_iter():
            if data is not None:
                yield data
            else:
                opcode = CScriptOp(opcode)

                if opcode.is_small_int():
                    yield opcode.decode_op_n()
                else:
                    yield CScriptOp(opcode)

    def __repr__(self):
        def _repr(o):
            if isinstance(o, bytes):
                return f"x('{o.hex()}')"
            else:
                return repr(o)

        ops = []
        i = iter(self)
        while True:
            op = None
            try:
                op = _repr(next(i))
            except CScriptTruncatedPushDataError as err:
                op = f"{_repr(err.data)}...<ERROR: {err}>"
                break
            except CScriptInvalidError as err:
                op = f"<ERROR: {err}>"
                break
            except StopIteration:
                break
            finally:
                if op is not None:
                    ops.append(op)

        return f"CScript([{', '.join(ops)}])"


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


class TestFrameworkScript(unittest.TestCase):
    def test_bn2vch(self):
        self.assertEqual(bn2vch(0), bytes([]))
        self.assertEqual(bn2vch(1), bytes([0x01]))
        self.assertEqual(bn2vch(-1), bytes([0x81]))
        self.assertEqual(bn2vch(0x7F), bytes([0x7F]))
        self.assertEqual(bn2vch(-0x7F), bytes([0xFF]))
        self.assertEqual(bn2vch(0x80), bytes([0x80, 0x00]))
        self.assertEqual(bn2vch(-0x80), bytes([0x80, 0x80]))
        self.assertEqual(bn2vch(0xFF), bytes([0xFF, 0x00]))
        self.assertEqual(bn2vch(-0xFF), bytes([0xFF, 0x80]))
        self.assertEqual(bn2vch(0x100), bytes([0x00, 0x01]))
        self.assertEqual(bn2vch(-0x100), bytes([0x00, 0x81]))
        self.assertEqual(bn2vch(0x7FFF), bytes([0xFF, 0x7F]))
        self.assertEqual(bn2vch(-0x8000), bytes([0x00, 0x80, 0x80]))
        self.assertEqual(bn2vch(-0x7FFFFF), bytes([0xFF, 0xFF, 0xFF]))
        self.assertEqual(bn2vch(0x80000000), bytes([0x00, 0x00, 0x00, 0x80, 0x00]))
        self.assertEqual(bn2vch(-0x80000000), bytes([0x00, 0x00, 0x00, 0x80, 0x80]))
        self.assertEqual(bn2vch(0xFFFFFFFF), bytes([0xFF, 0xFF, 0xFF, 0xFF, 0x00]))
        self.assertEqual(bn2vch(123456789), bytes([0x15, 0xCD, 0x5B, 0x07]))
        self.assertEqual(bn2vch(-54321), bytes([0x31, 0xD4, 0x80]))

    def test_cscriptnum_encoding(self):
        # round-trip negative and multi-byte CScriptNums
        values = [
            0,
            1,
            -1,
            -2,
            127,
            128,
            -255,
            256,
            (1 << 15) - 1,
            -(1 << 16),
            (1 << 24) - 1,
            (1 << 31),
            1 - (1 << 32),
            1 << 40,
            1500,
            -1500,
        ]
        for value in values:
            self.assertEqual(
                CScriptNum.decode(CScriptNum.encode(CScriptNum(value))), value
            )
