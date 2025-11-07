#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2011 Thomas Voegtlin
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
from __future__ import annotations

import json
import queue
import random
import struct
import threading
import time
import warnings
from collections import defaultdict
from contextlib import suppress
from io import BytesIO
from typing import Any, Dict, List, NamedTuple, Optional, Tuple, Union

from . import bitcoin, schnorr
from .address import (
    Address,
    DestinationType,
    P2PKH_prefix,
    P2PKH_suffix,
    P2SH_prefix,
    P2SH_suffix,
    PublicKey,
    Script,
    ScriptOutput,
    UnknownAddress,
)
from .bitcoin import TYPE_SCRIPT, OpCodes, ScriptType
from .caches import ExpiringCache
from .constants import DEFAULT_TXIN_SEQUENCE
from .crypto import Hash, hash_160
from .ecc import ECPrivkey, ECPubkey, sig_string_from_der_sig

#
# Workalike python implementation of Bitcoin's CDataStream class.
#
from .keystore import xpubkey_to_address, xpubkey_to_pubkey
from .printerror import print_error
from .serialize import (
    SerializableObject,
    compact_size,
    compact_size_nbytes,
    serialize_blob,
    serialize_sequence,
)
from .uint256 import UInt256
from .util import bh2u, profiler, to_bytes

DUST_THRESHOLD: int = 546
"""
Change < dust threshold is added to the tx fee.
The unit is satoshis.
"""

# Maximum script length in bytes (see Bitcoin ABC's script.h)
MAX_SCRIPT_SIZE = 10000

AMOUNT_NBYTES = 8
TXID_NBYTES = 32
OUTPUT_INDEX_NBYTES = 4
OUTPOINT_NBYTES = TXID_NBYTES + OUTPUT_INDEX_NBYTES
SEQUENCE_NBYTES = 4
COMPRESSED_PUBKEY_NBYTES = 33

# Note: The deserialization code originally comes from ABE.


NO_SIGNATURE = b"\xff"


class SerializationError(Exception):
    """Thrown when there's a problem deserializing or serializing"""


class InputValueMissing(ValueError):
    """thrown when the value of an input is needed but not present"""


class TxOutput(NamedTuple):
    type: int
    destination: DestinationType
    # str when the output is set to max: '!'
    value: Union[int, str]

    def is_opreturn(self) -> bool:
        if not self.type == TYPE_SCRIPT or not isinstance(
            self.destination, ScriptOutput
        ):
            return False

        ops = Script.get_ops(self.destination.script)
        return len(ops) >= 1 and ops[0][0] == OpCodes.OP_RETURN

    def size(self):
        script_nbytes = len(self.destination.to_script())
        assert script_nbytes <= MAX_SCRIPT_SIZE
        return AMOUNT_NBYTES + compact_size_nbytes(script_nbytes) + script_nbytes

    def serialize(self) -> bytes:
        s = self.value.to_bytes(8, "little")
        script = self.destination.to_script()
        s += serialize_blob(script)
        return s


class OutPoint(SerializableObject):
    """
    An outpoint - a combination of a transaction hash and an index n into its
    vout.
    """

    def __init__(self, txid, n):
        self.txid: UInt256 = txid
        """Transaction ID (SHA256 hash)."""

        self.n: int = n
        """vout index (uint32)"""

    def serialize(self) -> bytes:
        return self.txid.serialize() + self.n.to_bytes(4, "little")

    @classmethod
    def deserialize(cls, stream: BytesIO) -> OutPoint:
        txid = UInt256.deserialize(stream)
        n = struct.unpack("<I", stream.read(4))[0]
        return OutPoint(txid, n)

    def __eq__(self, other: OutPoint):
        return self.txid == other.txid and self.n == other.n

    def __hash__(self):
        return hash((self.txid, self.n))

    def __str__(self):
        return f"{self.txid.to_string()}:{self.n}"

    @staticmethod
    def from_str(outpoint: str) -> OutPoint:
        txid_hex, n_str = outpoint.split(":")
        return OutPoint(UInt256.from_hex(txid_hex), int(n_str))


class TxInput:
    def __init__(
        self,
        outpoint: OutPoint,
        sequence: int,
        scriptsig: Optional[bytes] = None,
        script_type: Optional[ScriptType] = None,
        num_required_sigs: Optional[int] = None,
        pubkeys: Optional[List[bytes]] = None,
        x_pubkeys: Optional[List[bytes]] = None,
        signatures: Optional[List[bytes]] = None,
        address: Optional[Address] = None,
        value: Optional[int] = None,
        height: Optional[int] = None,
        prev_tx: Optional[Transaction] = None,
    ):
        self.outpoint: OutPoint = outpoint
        self.sequence: int = sequence

        self.scriptsig: Optional[bytes] = scriptsig

        # Properties that are lazily computed on demand if scriptsig is provided
        self._num_required_sigs: Optional[int] = num_required_sigs
        self._x_pubkeys: Optional[List[bytes]] = x_pubkeys
        self._pubkeys: Optional[List[bytes]] = pubkeys
        self._type: Optional[ScriptType] = script_type
        self._signatures: Optional[List[Optional[bytes]]] = signatures
        self._address: Optional[Address] = address

        # Needed by various tools (coinchooser, consolidate, fusion...).
        # The value is also required for offline signing.
        self._value: Optional[int] = value
        self.height: Optional[int] = height

        # This is set by the wallet for hardware wallets
        self._prev_tx: Optional[Transaction] = prev_tx

    def set_value(self, value: int):
        self._value = value

    def get_value(self) -> Optional[int]:
        return self._value

    def set_prev_tx(self, tx: Transaction):
        self._prev_tx = tx

    def get_prev_tx(self) -> Optional[Transaction]:
        return self._prev_tx

    @staticmethod
    def estimate_pubkey_size_from_x_pubkey(x_pubkey) -> int:
        try:
            # compressed pubkey
            if x_pubkey[0] in [2, 3]:
                return 0x21
            # uncompressed pubkey
            elif x_pubkey[0] == 4:
                return 0x41
            # bip32 extended pubkey
            elif x_pubkey[0] == 0xFF:
                return 0x21
            # old electrum extended pubkey
            elif x_pubkey[0] == 0xFE:
                return 0x41
        except Exception:
            # fixme try to remove this branch and see if a test fails
            pass
        # just guess it is compressed
        return 0x21

    def estimate_pubkey_size(self) -> int:
        if self.pubkeys and len(self.pubkeys) > 0:
            return self.estimate_pubkey_size_from_x_pubkey(self.pubkeys[0])
        elif self.x_pubkeys and len(self.x_pubkeys) > 0:
            return self.estimate_pubkey_size_from_x_pubkey(self.x_pubkeys[0])
        else:
            # just guess it is compressed
            return 0x21

    def get_siglist(
        self, estimate_size=False, sign_schnorr=False
    ) -> Tuple[List[bytes], List[bytes]]:
        # if we have enough signatures, we use the actual pubkeys
        # otherwise, use extended pubkeys (with bip32 derivation)
        if estimate_size:
            pubkey_size = self.estimate_pubkey_size()
            pk_list = [b"\x00" * pubkey_size] * len(self.x_pubkeys)
            # we assume that signature will be 0x48 bytes long if ECDSA, 0x41 if Schnorr
            if sign_schnorr:
                siglen = 0x41
            else:
                siglen = 0x48
            sig_list = [b"\x00" * siglen] * self.num_required_sigs
        else:
            pubkeys, x_pubkeys = self.get_sorted_pubkeys()
            signatures = list(filter(None, self.signatures))
            if self.is_complete():
                pk_list = pubkeys
                sig_list = signatures
            else:
                pk_list = x_pubkeys
                sig_list = [sig if sig else NO_SIGNATURE for sig in self.signatures]
        return pk_list, sig_list

    def get_or_build_scriptsig(self, estimate_size=False, sign_schnorr=False) -> bytes:
        # For already-complete transactions, scriptSig will be set and we prefer
        # to use it verbatim in order to get an exact reproduction (including
        # malleated push opcodes, etc.).
        if self.scriptsig is not None and self.is_complete():
            return self.scriptsig

        # For partially-signed inputs, or freshly signed transactions, the
        # scriptSig will be missing and so we construct it from pieces.
        if self.type == ScriptType.coinbase:
            raise RuntimeError("Attempted to serialize coinbase with missing scriptSig")
        pubkeys, sig_list = self.get_siglist(estimate_size, sign_schnorr=sign_schnorr)
        script = b"".join(bitcoin.push_script_bytes(x) for x in sig_list)
        if self.type == ScriptType.p2pk:
            pass
        elif self.type == ScriptType.p2sh:
            # put op_0 before script
            script = bytes([OpCodes.OP_0]) + script
            redeem_script = multisig_script(pubkeys, self.num_required_sigs)
            script += bitcoin.push_script_bytes(redeem_script)
        elif self.type == ScriptType.p2pkh:
            script += bitcoin.push_script_bytes(pubkeys[0])
        elif self.type == ScriptType.unknown:
            raise RuntimeError("Cannot serialize unknown input with missing scriptSig")

        if self.is_complete():
            # cache the result
            self.scriptsig = script
        return script

    def size(self, sign_schnorr: bool = False) -> int:
        scriptsig_nbytes = len(
            self.get_or_build_scriptsig(estimate_size=True, sign_schnorr=sign_schnorr)
        )

        assert scriptsig_nbytes <= MAX_SCRIPT_SIZE
        return (
            OUTPOINT_NBYTES
            + compact_size_nbytes(scriptsig_nbytes)
            + scriptsig_nbytes
            + SEQUENCE_NBYTES
        )

    def __eq__(self, other: TxInput):
        return (
            self.outpoint == other.outpoint
            and self.get_or_build_scriptsig() == other.get_or_build_scriptsig()
            and self.sequence == other.sequence
        )

    def __hash__(self):
        return hash((self.outpoint, self.get_or_build_scriptsig(), self.sequence))

    def __str__(self):
        return (
            f"TxInput(outpoint={self.outpoint}, scriptsig={self.get_or_build_scriptsig().hex()}, "
            f"sequence={self.sequence})"
        )

    def is_coinbase(self) -> bool:
        return self.outpoint.txid.is_null()

    def parse_scriptsig(self):
        assert self.scriptsig is not None
        self._num_required_sigs = 0
        self._signatures = []
        if self.is_coinbase():
            self._type = ScriptType.coinbase
            return

        decoded = Script.get_ops(self.scriptsig)
        if matches_p2pk_scriptsig(decoded):
            self._type = ScriptType.p2pk
            self._signatures = [decoded[0][1]]
            self._num_required_sigs = 1
            return

        if matches_p2pkh_scriptsig(decoded):
            sig = decoded[0][1]
            x_pubkey = decoded[1][1]
            try:
                pubkey, address = xpubkey_to_address(x_pubkey)
            except Exception:
                print_error("cannot find address in input script", bh2u(self.scriptsig))
                return
            self._type = ScriptType.p2pkh
            self._signatures = [sig if sig != NO_SIGNATURE else None]
            self._num_required_sigs = 1
            self._x_pubkeys = [x_pubkey]
            self._pubkeys = [pubkey]
            self._address = address
            return

        if not matches_p2sh_ecdsa_multisig_scriptsig(decoded):
            self._type = ScriptType.unknown
            print_error("cannot find address in input script", bh2u(self.scriptsig))
            return
        # p2sh transaction, m of n
        x_sig = [x[1] for x in decoded[1:-1]]
        m, n, x_pubkeys, pubkeys, redeemScript = parse_redeemScript(decoded[-1][1])
        # write result in d
        self._type = ScriptType.p2sh
        self._signatures = [(sig if sig != NO_SIGNATURE else None) for sig in x_sig]
        self._num_required_sigs = m
        self._x_pubkeys = x_pubkeys
        self._pubkeys = pubkeys
        assert len(self._signatures) in (m, n)
        assert len(self._pubkeys) == n
        self._address = Address.from_P2SH_hash(hash_160(redeemScript))

    @property
    def type(self) -> ScriptType:
        if self._type is None:
            self.parse_scriptsig()
        return self._type

    @property
    def x_pubkeys(self) -> Optional[List[bytes]]:
        if self._x_pubkeys is None and self._type not in (
            ScriptType.p2pk,
            ScriptType.coinbase,
        ):
            self.parse_scriptsig()
        return self._x_pubkeys

    @property
    def pubkeys(self) -> Optional[List[bytes]]:
        if self._pubkeys is None and self._x_pubkeys is not None:
            self._pubkeys = [xpubkey_to_pubkey(xpub) for xpub in self._x_pubkeys]
        elif self._pubkeys is None and self._type not in (
            ScriptType.p2pk,
            ScriptType.coinbase,
        ):
            self.parse_scriptsig()
        return self._pubkeys

    def update_pubkey(self, pubkey: bytes, index: int):
        """Update pubkey at given index.
        This method ensures the pubkeys are sorted in the correct order for
        multisig transactions before accessing the pubkey at the given index.
        """
        assert self._pubkeys is not None and len(self._pubkeys) > index
        self._pubkeys[index] = pubkey

    @property
    def signatures(self) -> List[Optional[bytes]]:
        """List of signatures for this input.

        For a complete input, the number of signatures is the actual number: M for an
        M-of-N multisig.

        For an unsigned or partially signed transaction, one or more signatures are
        None. The number of signatures is equal to the number of pubkeys: N for an
        M-of-N multisig.

        Note that the position of signatures needs to match with the position of pubkeys
        as they are returned by get_sorted_pubkeys().
        """
        if self._signatures is None and self._type != ScriptType.coinbase:
            self.parse_scriptsig()
        return self._signatures

    def update_signature(self, sig: bytes, index: int):
        """Set or update the signature at given index.
        The index must match the corresponding sorted pubkeys index.
        """
        assert self._signatures is not None and len(self._signatures) > index
        self._signatures[index] = sig

        # invalidate scriptsig
        self.scriptsig = None

    @property
    def num_valid_sigs(self) -> int:
        """Number of signatures actually available.
        If this does not match `num_required_sigs` the transaction is considered
        incomplete.
        Note that a signature is considered valid if not None. It is assumed that
        provided signatures are cryptographically valid.
        """
        return len(list(filter(None, self.signatures)))

    @property
    def num_required_sigs(self) -> int:
        """Number of signatures required for this input to be complete.
        May be None
        """
        if self._num_required_sigs is None:
            self.parse_scriptsig()
        return self._num_required_sigs

    def get_sorted_pubkeys(self) -> Tuple[List[bytes], List[bytes]]:
        """Return sorted pubkeys and xpubkeys, using the order of pubkeys.

        Note: this function is CRITICAL to get the correct order of pubkeys in
            multisignatures; avoid changing.
        """
        if self.pubkeys is None:
            return [], []
        pubkeys, x_pubkeys = zip(*sorted(zip(self.pubkeys, self.x_pubkeys)))
        return list(pubkeys), list(x_pubkeys)

    @property
    def address(self) -> Optional[Address]:
        if self._address is None and self._type not in (
            ScriptType.p2pk,
            ScriptType.coinbase,
        ):
            self.parse_scriptsig()
        return self._address

    def is_complete(self) -> bool:
        if self.type == ScriptType.coinbase or self.num_required_sigs == 0:
            return True
        return self.num_required_sigs == self.num_valid_sigs

    def to_coin_dict(self) -> Dict[str, Any]:
        """Return a legacy coin dict for this TxInput"""
        d = {
            "prevout_hash": self.outpoint.txid.get_hex(),
            "prevout_n": self.outpoint.n,
            "sequence": self.sequence,
            # default address, updated later for p2pkh and p2sh
            "address": UnknownAddress(),
        }
        if self.scriptsig is not None:
            d["scriptSig"] = self.scriptsig.hex()

        if self.is_coinbase():
            d["type"] = "coinbase"
            return d

        d["x_pubkeys"] = []
        d["pubkeys"] = []
        d["signatures"] = {}
        d["address"] = None
        d["num_sig"] = 0

        if self.scriptsig is not None:
            self.parse_scriptsig()

            if self.type == ScriptType.unknown:
                # Unsupported p2sh type (only standard multisig schemes are supported)
                d["address"] = UnknownAddress()
                d["type"] = "unknown"
                return d

        d["type"] = self.type.name
        d["signatures"] = [
            (sig.hex() if sig is not None else None) for sig in self.signatures
        ]
        d["num_sig"] = self.num_required_sigs
        if self.type == ScriptType.p2pk:
            # TODO: remove this entirely if unused
            d["x_pubkeys"] = ["(pubkey)"]
            d["pubkeys"] = ["(pubkey)"]
        else:
            # The legacy code used to sort pubkeys in place in the coin dicts, so we
            # should assume that some users of coin dicts require them to be sorted.
            # I cannot think of a use case that would require the original unsorted
            # order to be preserved,
            pubkeys, x_pubkeys = self.get_sorted_pubkeys()
            d["x_pubkeys"] = [xpub.hex() for xpub in x_pubkeys]
            d["pubkeys"] = [pub.hex() for pub in pubkeys]
            d["address"] = self.address
        if self.type == ScriptType.p2sh:
            d["redeemScript"] = self.scriptsig
        if not self.is_complete():
            d.pop("scriptSig", None)
            if self.get_value() is not None:
                # The amount is needed for signing, in case of partially signed inputs.
                d["value"] = self.get_value()
        if self.height is not None:
            d["height"] = self.height
        if self._prev_tx is not None:
            d["prev_tx"] = self._prev_tx
        return d

    @staticmethod
    def from_scriptsig(
        outpoint: OutPoint, sequence: int, scriptsig: bytes, value: Optional[int] = None
    ) -> TxInput:
        """TxInput factory for deserialized transactions (complete transactions or
        partially signed transactions previously serialized)."""
        assert scriptsig is not None
        return TxInput(outpoint, sequence, scriptsig, value=value)

    @staticmethod
    def from_keys(
        outpoint: OutPoint,
        sequence: int,
        script_type: ScriptType,
        num_required_sigs: int,
        x_pubkeys: List[bytes],
        signatures: List[Optional[bytes]],
        pubkeys: Optional[List[bytes]] = None,
        address: Optional[Address] = None,
        value: Optional[int] = None,
        height: Optional[int] = None,
        prev_tx: Optional[Transaction] = None,
    ) -> TxInput:
        """Txinput factory for defining an input by its components"""
        assert all(
            arg is not None
            for arg in (
                script_type,
                num_required_sigs,
                x_pubkeys,
                signatures,
            )
        )
        assert address is not None or script_type == ScriptType.p2pk
        return TxInput(
            outpoint,
            sequence,
            script_type=script_type,
            num_required_sigs=num_required_sigs,
            pubkeys=pubkeys,
            x_pubkeys=x_pubkeys,
            signatures=signatures,
            address=address,
            value=value,
            height=height,
            prev_tx=prev_tx,
        )

    @staticmethod
    def from_coin_dict(coin: Dict) -> TxInput:
        outpoint = OutPoint(UInt256.from_hex(coin["prevout_hash"]), coin["prevout_n"])
        sequence = coin.get("sequence", DEFAULT_TXIN_SEQUENCE)
        scriptsig = coin.get("scriptSig")
        value = coin.get("value")
        height = coin.get("height")
        prev_tx = coin.get("prev_tx")

        if scriptsig is not None:
            return TxInput.from_scriptsig(
                outpoint, sequence, bytes.fromhex(scriptsig), value=value
            )

        signatures = [
            (None if sig is None else bytes.fromhex(sig)) for sig in coin["signatures"]
        ]
        pubkeys = coin.get("pubkeys")
        if pubkeys is not None:
            pubkeys = [bytes.fromhex(pubk) for pubk in pubkeys]
        return TxInput.from_keys(
            outpoint,
            sequence,
            script_type=ScriptType[coin["type"]],
            num_required_sigs=coin.get("num_sig", 0),
            x_pubkeys=[bytes.fromhex(xpubk) for xpubk in coin["x_pubkeys"]],
            signatures=signatures,
            pubkeys=pubkeys,
            address=coin.get("address"),
            value=value,
            height=height,
            prev_tx=prev_tx,
        )

    def get_preimage_script(self) -> bytes:
        if self.type == ScriptType.p2pkh:
            return self.address.to_script()
        if self.type == ScriptType.p2sh:
            pubkeys, x_pubkeys = self.get_sorted_pubkeys()
            return multisig_script(pubkeys, self.num_required_sigs)
        if self.type == ScriptType.p2pk:
            if self.pubkeys is None:
                raise RuntimeError(
                    "Cannot get preimage for p2pk input without knowing the pubkey"
                )
            return bitcoin.push_script_bytes(self.pubkeys[0]) + bytes(
                [OpCodes.OP_CHECKSIG]
            )
        raise RuntimeError(
            f"Cannot get preimage script for input with type {self.type.name}"
        )

    def serialize(self, estimate_size=False, sign_schnorr=False) -> bytes:
        script = self.get_or_build_scriptsig(estimate_size, sign_schnorr)
        s = (
            self.outpoint.serialize()
            + serialize_blob(script)
            + self.sequence.to_bytes(4, "little")
        )
        # offline signing needs to know the input value
        value = self.get_value()
        if not self.is_complete() and value is not None and not estimate_size:
            s += value.to_bytes(8, "little")
        return s


class BCDataStream(object):
    def __init__(self):
        self.input = None
        self.read_cursor = 0

    def clear(self):
        self.input = None
        self.read_cursor = 0

    def write(self, _bytes):  # Initialize with string of _bytes
        if self.input is None:
            self.input = bytearray(_bytes)
        else:
            self.input += bytearray(_bytes)

    def read_string(self, encoding="ascii"):
        # Strings are encoded depending on length:
        # 0 to 252 :  1-byte-length followed by bytes (if any)
        # 253 to 65,535 : byte'253' 2-byte-length followed by bytes
        # 65,536 to 4,294,967,295 : byte '254' 4-byte-length followed by bytes
        # ... and the Bitcoin client is coded to understand:
        # greater than 4,294,967,295 : byte '255' 8-byte-length followed by bytes of string
        # ... but I don't think it actually handles any strings that big.
        if self.input is None:
            raise SerializationError("call write(bytes) before trying to deserialize")

        length = self.read_compact_size()

        return self.read_bytes(length).decode(encoding)

    def write_string(self, string, encoding="ascii"):
        string = to_bytes(string, encoding)
        # Length-encoded as with read-string
        self.write_compact_size(len(string))
        self.write(string)

    def read_bytes(self, length):
        try:
            result = self.input[self.read_cursor : self.read_cursor + length]
            self.read_cursor += length
            return result
        except IndexError:
            raise SerializationError("attempt to read past end of buffer")

        return ""

    def can_read_more(self) -> bool:
        if not self.input:
            return False
        return self.read_cursor < len(self.input)

    def read_boolean(self):
        return self.read_bytes(1)[0] != chr(0)

    def read_int16(self):
        return self._read_num("<h")

    def read_uint16(self):
        return self._read_num("<H")

    def read_int32(self):
        return self._read_num("<i")

    def read_uint32(self):
        return self._read_num("<I")

    def read_int64(self):
        return self._read_num("<q")

    def read_uint64(self):
        return self._read_num("<Q")

    def write_boolean(self, val):
        return self.write(chr(1) if val else chr(0))

    def write_int16(self, val):
        return self._write_num("<h", val)

    def write_uint16(self, val):
        return self._write_num("<H", val)

    def write_int32(self, val):
        return self._write_num("<i", val)

    def write_uint32(self, val):
        return self._write_num("<I", val)

    def write_int64(self, val):
        return self._write_num("<q", val)

    def write_uint64(self, val):
        return self._write_num("<Q", val)

    def read_compact_size(self):
        try:
            size = self.input[self.read_cursor]
            self.read_cursor += 1
            if size == 253:
                size = self._read_num("<H")
            elif size == 254:
                size = self._read_num("<I")
            elif size == 255:
                size = self._read_num("<Q")
            return size
        except IndexError:
            raise SerializationError("attempt to read past end of buffer")

    def write_compact_size(self, size):
        if size < 0:
            raise SerializationError("attempt to write size < 0")
        self.write(compact_size(size))

    def _read_num(self, fmt):
        try:
            (i,) = struct.unpack_from(fmt, self.input, self.read_cursor)
            self.read_cursor += struct.calcsize(fmt)
        except Exception as e:
            raise SerializationError(e)
        return i

    def _write_num(self, fmt, num):
        s = struct.pack(fmt, num)
        self.write(s)


def is_push_opcode(opcode: Union[OpCodes, int], min_data_size: int = 0) -> bool:
    """Return True if opcode is a data PUSH that can handle min_data_size or more bytes.

    >>> is_push_opcode(OpCodes.OP_CHECKMULTISIGVERIFY)
    False
    >>> is_push_opcode(OpCodes.OP_0)
    True
    >>> is_push_opcode(OpCodes.OP_0, 1)
    False
    >>> is_push_opcode(OpCodes.OP_1NEGATE, 1)
    True
    >>> is_push_opcode(OpCodes.OP_16, 2)
    False
    >>> is_push_opcode(OpCodes.OP_PUSHDATA2, 256)
    True
    >>> is_push_opcode(OpCodes.OP_PUSHDATA1, 256)
    False
    """
    assert 0 <= min_data_size <= 0xFFFFFFFF

    if min_data_size == 0:
        return (
            OpCodes.OP_0 <= opcode <= OpCodes.OP_1NEGATE
            or OpCodes.OP_1 <= opcode <= OpCodes.OP_16
        )

    if min_data_size == 1:
        # This excludes the empty array push (0P_0)
        return (
            OpCodes.OP_0 < opcode <= OpCodes.OP_1NEGATE
            or OpCodes.OP_1 <= opcode <= OpCodes.OP_16
        )

    if min_data_size < OpCodes.OP_PUSHDATA1:
        # Exclude also OP_1 ... OP_16 and OP_1NEGATE and opcodes lower than
        # min_data_size
        return min_data_size <= opcode <= OpCodes.OP_PUSHDATA4

    if min_data_size <= 0xFF:
        # We need at least OP_PUSHDATA1
        return OpCodes.OP_PUSHDATA1 <= opcode <= OpCodes.OP_PUSHDATA4

    if min_data_size <= 0xFFFF:
        return opcode in [OpCodes.OP_PUSHDATA2, OpCodes.OP_PUSHDATA4]

    return opcode == OpCodes.OP_PUSHDATA4


def matches_p2pk_scriptsig(script_ops: List[Tuple[OpCodes, Optional[bytes]]]) -> bool:
    """Return True if the script operations match a P2PK scriptSig:

        PUSH(pubkey)

    script_ops is a list of (opcode, data) tuples.
    """
    if len(script_ops) != 1:
        return False
    return is_push_opcode(script_ops[0][0], min_data_size=COMPRESSED_PUBKEY_NBYTES)


def matches_p2pkh_scriptsig(script_ops: List[Tuple[OpCodes, Optional[bytes]]]) -> bool:
    """Return True if the script operations match a P2PHK scriptSig:

        PUSH(signature) PUSH(pubkey)

    script_ops is a list of (opcode, data) tuples.
    """
    if len(script_ops) != 2:
        return False
    # Set min_data_size to 1 for signatures because unsigned transactions are serialized
    # with a 1-byte placeholder signature (b"FF")
    return is_push_opcode(script_ops[0][0], min_data_size=1) and is_push_opcode(
        script_ops[1][0], min_data_size=COMPRESSED_PUBKEY_NBYTES
    )


def matches_p2sh_ecdsa_multisig_scriptsig(
    script_ops: List[Tuple[OpCodes, Optional[bytes]]],
) -> bool:
    """Return True if the script operations match a P2SH multisig scriptSig:

        OP_0 PUSH(signature1) PUSH(signature2)... PUSH(redeemScript)

    script_ops is a list of (opcode, data) tuples.
    """
    if len(script_ops) < 3:
        # There must be at least OP_0, one signature and a redeem script
        return False
    # Partially signed transaction can have 1-byte placeholder signatures (b"FF")
    return script_ops[0][0] == OpCodes.OP_0 and all(
        is_push_opcode(script_op[0], min_data_size=1) for script_op in script_ops[1:]
    )


def matches_multisig_redeemscript(
    script_ops: List[Tuple[OpCodes, Optional[bytes]]], num_pubkeys: int
) -> bool:
    """Return True if the script operations match a P2SH multisig scriptSig:

        OP_m PUSH(pubkey_1) ... PUSH(pubkey_n) OP_n OP_CHECKMULTISIG

    script_ops is a list of (opcode, data) tuples
    """
    if len(script_ops) != num_pubkeys + 3:
        return False
    op_n = OpCodes.OP_1 + num_pubkeys - 1
    return (
        OpCodes.OP_1 <= script_ops[0][0] <= OpCodes.OP_16
        and script_ops[-2][0] == op_n
        and script_ops[-1][0] == OpCodes.OP_CHECKMULTISIG
        and all(is_push_opcode(script_op[0]) for script_op in script_ops[1:-2])
    )


def parse_sig(x_sig):
    return [None if x == NO_SIGNATURE.hex() else x for x in x_sig]


def safe_parse_pubkey(x: bytes) -> bytes:
    try:
        return xpubkey_to_pubkey(x)
    except Exception:
        return x


def parse_redeemScript(s: bytes) -> Tuple[int, int, List[bytes], List[bytes], bytes]:
    """
    Returns (M, N, xpubkeys, pubkeys, redeemscript) for a M-of-N multisig script
    """
    dec2 = Script.get_ops(s)
    # the following throw exception when redeemscript has one or zero opcodes
    m = dec2[0][0] - OpCodes.OP_1 + 1
    n = dec2[-2][0] - OpCodes.OP_1 + 1
    if not matches_multisig_redeemscript(dec2, n):
        # causes exception in caller when mismatched
        print_error("cannot find address in input script", bh2u(s))
        return
    x_pubkeys = [x[1] for x in dec2[1:-2]]
    pubkeys = [safe_parse_pubkey(x) for x in x_pubkeys]
    redeemScript = Script.multisig_script(m, pubkeys)
    return (
        m,
        n,
        x_pubkeys,
        pubkeys,
        redeemScript,
    )


def get_address_from_output_script(
    _bytes: bytes,
) -> Tuple[int, Union[PublicKey, DestinationType]]:
    """Return the type of the output and the address"""
    scriptlen = len(_bytes)

    if (
        scriptlen == 23
        and _bytes.startswith(P2SH_prefix)
        and _bytes.endswith(P2SH_suffix)
    ):
        # Pay-to-script-hash
        return bitcoin.TYPE_ADDRESS, Address.from_P2SH_hash(_bytes[2:22])

    if (
        scriptlen == 25
        and _bytes.startswith(P2PKH_prefix)
        and _bytes.endswith(P2PKH_suffix)
    ):
        # Pay-to-pubkey-hash
        return bitcoin.TYPE_ADDRESS, Address.from_P2PKH_hash(_bytes[3:23])

    if (
        scriptlen == 35
        and _bytes[0] == 33
        and _bytes[1] in (2, 3)
        and _bytes[34] == OpCodes.OP_CHECKSIG
    ):
        # Pay-to-pubkey (compressed)
        return bitcoin.TYPE_PUBKEY, PublicKey.from_pubkey(_bytes[1:34])

    if (
        scriptlen == 67
        and _bytes[0] == 65
        and _bytes[1] == 4
        and _bytes[66] == OpCodes.OP_CHECKSIG
    ):
        # Pay-to-pubkey (uncompressed)
        return bitcoin.TYPE_PUBKEY, PublicKey.from_pubkey(_bytes[1:66])

    # note: we don't recognize bare multisigs.

    return bitcoin.TYPE_SCRIPT, ScriptOutput.protocol_factory(bytes(_bytes))


def parse_input(vds) -> TxInput:
    prevout_hash = bitcoin.hash_encode(vds.read_bytes(32))
    prevout_n = vds.read_uint32()
    # convert scriptsig from bytearray to bytes
    scriptSig = bytes(vds.read_bytes(vds.read_compact_size()))
    sequence = vds.read_uint32()

    txin = TxInput.from_scriptsig(
        OutPoint(UInt256.from_hex(prevout_hash), prevout_n), sequence, scriptSig
    )
    if not txin.is_complete():
        # This is a partially signed transaction in the custom Electrum format, the
        # amount is appended to the serialized input.
        txin.set_value(vds.read_uint64())

    return txin


def parse_output(vds: BCDataStream) -> TxOutput:
    value = vds.read_int64()
    scriptPubKey = vds.read_bytes(vds.read_compact_size())
    output_type, address = get_address_from_output_script(scriptPubKey)
    return TxOutput(output_type, address, value)


def deserialize(raw: bytes) -> Tuple[int, List[TxInput], List[TxOutput], int]:
    vds = BCDataStream()
    vds.write(raw)
    version = vds.read_int32()
    n_vin = vds.read_compact_size()
    inputs = [parse_input(vds) for i in range(n_vin)]
    n_vout = vds.read_compact_size()
    outputs = [parse_output(vds) for i in range(n_vout)]
    locktime = vds.read_uint32()
    if vds.can_read_more():
        raise SerializationError("extra junk at the end")
    return version, inputs, outputs, locktime


# pay & redeem scripts
def multisig_script(public_keys: List[bytes], m) -> bytes:
    n = len(public_keys)
    assert n <= 15
    assert m <= n
    op_m = bitcoin.push_script_bytes(bytes([m]))
    op_n = bitcoin.push_script_bytes(bytes([n]))
    keylist = [bitcoin.push_script_bytes(k) for k in public_keys]
    return op_m + b"".join(keylist) + op_n + bytes([OpCodes.OP_CHECKMULTISIG])


class Transaction:
    SIGHASH_FORKID = 0x40  # do not use this; deprecated
    FORKID = 0x000000  # do not use this; deprecated

    def __str__(self):
        if self.raw is None:
            self.raw = self.serialize()
        return self.raw.hex()

    def __init__(self, raw: Optional[bytes], sign_schnorr=False):
        self.raw: Optional[bytes] = raw
        assert raw is None or isinstance(raw, bytes)
        self._inputs: Optional[List[TxInput]] = None
        self._outputs: Optional[List[TxOutput]] = None
        self.locktime = 0
        self.version = 2
        self._sign_schnorr = sign_schnorr

        # attribute used by HW wallets to tell the hw keystore about any outputs
        # in the tx that are to self (change), etc. See wallet.py add_hw_info
        # which writes to this dict and the various hw wallet plugins which
        # read this dict.
        self.output_info = {}

        # Ephemeral meta-data used internally to keep track of interesting
        # things. This is currently used to store the 'fetched_inputs' which are
        # asynchronously retrieved inputs (by retrieving prevout_hash tx's), see
        # `fetch_input_data`.
        #
        # Values in this dict are advisory only and may or may not always be
        # there!
        self.ephemeral = {}

    def set_sign_schnorr(self, b):
        self._sign_schnorr = b

    def update(self, raw: bytes):
        self.raw = raw
        self._inputs = None
        self.deserialize()

    def inputs(self) -> List[Dict]:
        """Return the list of inputs as a list of legacy coin dictionary.
        This is deprecated and should not be used for new code, except for exporting
        coins as JSON.
        Changes made to returned coins will not affect this transaction's inputs.
        """
        return [txin.to_coin_dict() for txin in self.txinputs()]

    def txinputs(self) -> List[TxInput]:
        if self._inputs is None:
            self.deserialize()
        return self._inputs

    def outputs(self) -> List[TxOutput]:
        if self._outputs is None:
            self.deserialize()
        return self._outputs

    @classmethod
    def get_sorted_pubkeys(self, txin):
        # sort pubkeys and x_pubkeys, using the order of pubkeys
        # Note: this function is CRITICAL to get the correct order of pubkeys in
        # multisignatures; avoid changing.
        x_pubkeys = txin["x_pubkeys"]
        pubkeys = txin.get("pubkeys")
        if pubkeys is None:
            pubkeys = [xpubkey_to_pubkey(bytes.fromhex(x)) for x in x_pubkeys]
            pubkeys, x_pubkeys = zip(*sorted(zip(pubkeys, x_pubkeys)))
            txin["pubkeys"] = pubkeys = [pubkey.hex() for pubkey in pubkeys]
            txin["x_pubkeys"] = x_pubkeys = list(x_pubkeys)
        return pubkeys, x_pubkeys

    def update_signatures(self, signatures: List[bytes]):
        """Add new signatures to a transaction
        `signatures` is expected to be a list of signatures with
        *no* sighash byte at the end (implicitly always 0x41 (SIGHASH_FORKID|SIGHASH_ALL);
        will be added by this function).

        signatures[i] is intended for self._inputs[i].

        The signature will be matched with the appropriate pubkey automatically
        in the case of multisignature wallets.

        This function is used by the Trezor, KeepKey, etc to update the
        transaction with signatures form the device.

        Note this function supports both Schnorr and ECDSA signatures, but as
        yet no hardware wallets are signing Schnorr.
        """
        if self.is_complete():
            return
        if not isinstance(signatures, (tuple, list)):
            raise Exception("API changed: update_signatures expects a list.")
        if len(self.txinputs()) != len(signatures):
            raise Exception(
                "expected {} signatures; got {}".format(
                    len(self.txinputs()), len(signatures)
                )
            )
        for i, txin in enumerate(self.txinputs()):
            pubkeys, x_pubkeys = txin.get_sorted_pubkeys()
            sig = signatures[i]
            if not isinstance(sig, bytes):
                raise ValueError("sig was str, expected bytes")
            # sig_final is the signature with the sighashbyte at the end (0x41)
            sig_final = sig + b"\x41"
            if sig_final in txin.signatures:
                # skip if we already have this signature
                continue
            pre_hash = Hash(self.serialize_preimage(i))
            added = False
            reason = []
            for j, pubkey in enumerate(pubkeys):
                # see which pubkey matches this sig (in non-multisig only 1 pubkey, in multisig may be multiple pubkeys)
                if self.verify_signature(pubkey, sig, pre_hash, reason):
                    print_error("adding sig", i, j, pubkey, sig_final)
                    self._inputs[i].update_signature(sig_final, j)
                    added = True
            if not added:
                resn = ", ".join(reversed(reason)) if reason else ""
                print_error(
                    "failed to add signature {} for any pubkey for reason(s): '{}' ;"
                    " pubkey(s) / sig / pre_hash = ".format(i, resn),
                    pubkeys,
                    "/",
                    sig,
                    "/",
                    pre_hash.hex(),
                )
        # redo raw
        self.raw = self.serialize()

    def is_schnorr_signed(self, input_idx):
        """Return True IFF any of the signatures for a particular input
        are Schnorr signatures (Schnorr signatures are always 64 bytes + 1)"""
        if (
            isinstance(self._inputs, (list, tuple))
            and input_idx < len(self._inputs)
            and self._inputs[input_idx]
        ):
            # Schnorr sigs are always 64 bytes. However the sig has a hash byte
            # at the end, so that's 65.
            return any(
                sig is not None and len(sig) == 65
                for sig in self._inputs[input_idx].signatures
            )
        return False

    @staticmethod
    def _assert_outputs_sanity(outputs):
        """Check that no legacy tuple is in the list, and that no destination is
        UnknownAddress."""
        assert all(isinstance(output, TxOutput) for output in outputs)
        assert all(
            isinstance(output.destination, (PublicKey, Address, ScriptOutput))
            for output in outputs
        )

    def deserialize(self):
        if self.raw is None:
            return
        if self._inputs is not None:
            return
        self.invalidate_common_sighash_cache()
        self.version, self._inputs, self._outputs, self.locktime = deserialize(self.raw)
        self._assert_outputs_sanity(self._outputs)

    @classmethod
    def from_io(
        klass,
        inputs: List[TxInput],
        outputs: List[TxOutput],
        locktime=0,
        sign_schnorr=False,
        version=None,
    ):
        assert all(isinstance(txin, TxInput) for txin in inputs)
        klass._assert_outputs_sanity(outputs)
        self = klass(None)
        self._inputs = inputs
        self._outputs = outputs.copy()
        self.locktime = locktime
        if version is not None:
            self.version = version
        self.set_sign_schnorr(sign_schnorr)
        return self

    @classmethod
    def estimate_pubkey_size_from_x_pubkey(cls, x_pubkey):
        try:
            if x_pubkey[0:2] in ["02", "03"]:  # compressed pubkey
                return 0x21
            elif x_pubkey[0:2] == "04":  # uncompressed pubkey
                return 0x41
            elif x_pubkey[0:2] == "ff":  # bip32 extended pubkey
                return 0x21
            elif x_pubkey[0:2] == "fe":  # old electrum extended pubkey
                return 0x41
        except Exception:
            pass
        return 0x21  # just guess it is compressed

    @classmethod
    def estimate_pubkey_size_for_txin(cls, txin):
        pubkeys = txin.get("pubkeys", [])
        x_pubkeys = txin.get("x_pubkeys", [])
        if pubkeys and len(pubkeys) > 0:
            return cls.estimate_pubkey_size_from_x_pubkey(pubkeys[0])
        elif x_pubkeys and len(x_pubkeys) > 0:
            return cls.estimate_pubkey_size_from_x_pubkey(x_pubkeys[0])
        else:
            return 0x21  # just guess it is compressed

    @classmethod
    def is_txin_complete(cls, txin):
        return TxInput.from_coin_dict(txin).is_complete()

    def shuffle_inputs(self):
        random.shuffle(self._inputs)

    def sort_outputs(self, shuffle: bool = True):
        """Put the op_return output first, and then shuffle the other outputs unless
        this behavior is explicitly disabled."""
        op_returns = []
        other_outputs = []
        for txo in self._outputs:
            if txo.is_opreturn():
                op_returns.append(txo)
            else:
                other_outputs.append(txo)
        if shuffle:
            random.shuffle(other_outputs)
        self._outputs = op_returns + other_outputs

    @classmethod
    def nHashType(cls):
        """Hash type in hex."""
        warnings.warn("warning: deprecated tx.nHashType()", FutureWarning, stacklevel=2)
        return 0x01 | (cls.SIGHASH_FORKID + (cls.FORKID << 8))

    def invalidate_common_sighash_cache(self):
        """Call this to invalidate the cached common sighash (computed by
        `calc_common_sighash` below).

        This is function is for advanced usage of this class where the caller
        has mutated the transaction after computing its signatures and would
        like to explicitly delete the cached common sighash. See
        `calc_common_sighash` below."""
        try:
            del self._cached_sighash_tup
        except AttributeError:
            pass

    def calc_common_sighash(self, use_cache=False):
        """Calculate the common sighash components that are used by
        transaction signatures. If `use_cache` enabled then this will return
        already-computed values from the `._cached_sighash_tup` attribute, or
        compute them if necessary (and then store).

        For transactions with N inputs and M outputs, calculating all sighashes
        takes only O(N + M) with the cache, as opposed to O(N^2 + NM) without
        the cache.

        Returns three 32-long bytes objects: (hashPrevouts, hashSequence, hashOutputs).

        Warning: If you modify non-signature parts of the transaction
        afterwards, this cache will be wrong!"""
        inputs = self.txinputs()
        outputs = self.outputs()
        meta = (len(inputs), len(outputs))

        if use_cache:
            try:
                cmeta, res = self._cached_sighash_tup
            except AttributeError:
                pass
            else:
                # minimal heuristic check to detect bad cached value
                if cmeta == meta:
                    # cache hit and heuristic check ok
                    return res
                else:
                    del cmeta, res, self._cached_sighash_tup

        hashPrevouts = Hash(b"".join(txin.outpoint.serialize() for txin in inputs))
        hashSequence = Hash(
            b"".join(txin.sequence.to_bytes(4, "little") for txin in inputs)
        )
        hashOutputs = Hash(b"".join(o.serialize() for o in outputs))

        res = hashPrevouts, hashSequence, hashOutputs
        # cach resulting value, along with some minimal metadata to defensively
        # program against cache invalidation (due to class mutation).
        self._cached_sighash_tup = meta, res
        return res

    def serialize_preimage(self, i, nHashType=0x00000041, use_cache=False) -> bytes:
        """See `.calc_common_sighash` for explanation of use_cache feature"""
        if (nHashType & 0xFF) != 0x41:
            raise ValueError("other hashtypes not supported; submit a PR to fix this!")

        txin: TxInput = self.txinputs()[i]
        if txin.get_value() is None:
            raise InputValueMissing
        hashPrevouts, hashSequence, hashOutputs = self.calc_common_sighash(
            use_cache=use_cache
        )

        return (
            self.version.to_bytes(4, "little")
            + hashPrevouts
            + hashSequence
            + txin.outpoint.serialize()
            + serialize_blob(txin.get_preimage_script())
            + txin.get_value().to_bytes(8, "little")
            + txin.sequence.to_bytes(4, "little")
            + hashOutputs
            + self.locktime.to_bytes(4, "little")
            + nHashType.to_bytes(4, "little")
        )

    def serialize(self, estimate_size=False) -> bytes:
        nVersion = self.version.to_bytes(4, "little")
        nLocktime = self.locktime.to_bytes(4, "little")
        inputs = self.txinputs()
        txins = compact_size(len(inputs)) + b"".join(
            txin.serialize(estimate_size, self._sign_schnorr) for txin in inputs
        )
        txouts = serialize_sequence(self.outputs())
        return nVersion + txins + txouts + nLocktime

    def hash(self):
        warnings.warn("warning: deprecated tx.hash()", FutureWarning, stacklevel=2)
        return self.txid()

    def txid(self):
        if not self.is_complete():
            return None
        ser = self.serialize()
        return self._txid(ser)

    def txid_fast(self):
        """Returns the txid by immediately calculating it from self.raw,
        which is faster than calling txid() which does a full re-serialize
        each time.  Note this should only be used for tx's that you KNOW are
        complete and that don't contain our funny serialization hacks.

        (The is_complete check is also not performed here because that
        potentially can lead to unwanted tx deserialization)."""
        if self.raw:
            return self._txid(self.raw)
        return self.txid()

    @staticmethod
    def _txid(raw_hex: bytes) -> str:
        return Hash(raw_hex)[::-1].hex()

    def add_inputs(self, inputs: List[TxInput]):
        assert all(isinstance(txin, TxInput) for txin in inputs)
        self._inputs.extend(inputs)
        self.raw = None

    def set_inputs(self, inputs: List[TxInput]):
        assert all(isinstance(txin, TxInput) for txin in inputs)
        self._inputs = inputs
        self.raw = None

    def update_input(self, index: int, txin: TxInput):
        assert isinstance(txin, TxInput)
        assert index < len(self._inputs)
        self._inputs[index] = txin

    def add_outputs(self, outputs: List[TxOutput]):
        self._assert_outputs_sanity(outputs)
        self._outputs.extend(outputs)
        self.raw = None

    def set_outputs(self, outputs: List[TxOutput]):
        self._assert_outputs_sanity(outputs)
        self._outputs = outputs
        self.raw = None

    def input_value(self):
        """Will return the sum of all input values, if the input values
        are known (may consult self.fetched_inputs() to get a better idea of
        possible input values).  Will raise InputValueMissing if input values
        are missing."""
        try:
            if self.fetched_inputs():
                inputs = [TxInput.from_coin_dict(inp) for inp in self.fetched_inputs()]
            else:
                inputs = self.txinputs()
            return sum(inp.get_value() for inp in inputs)
        except TypeError as e:
            # TypeError is raised if one or more values are None
            raise InputValueMissing from e

    def output_value(self):
        return sum(out.value for out in self.outputs())

    def get_fee(self):
        """Try and calculate the fee based on the input data, and returns it as
        satoshis (int). Can raise InputValueMissing on tx's where fee data is
        missing, so client code should catch that."""
        # first, check if coinbase; coinbase tx always has 0 fee
        if self._inputs and self._inputs[0].type == ScriptType.coinbase:
            return 0
        # otherwise just sum up all values - may raise InputValueMissing
        return self.input_value() - self.output_value()

    @profiler
    def estimated_size(self):
        """Return an estimated tx size in bytes.

        This size can be overestimated for partially signed transactions if using ECDSA
        signatures, as the estimation assumes a fixed signature size of 72 bytes
        (including the sighash flag).
        """
        if self.is_complete() and self.raw is not None:
            return len(self.raw)

        # VERSION (4 bytes) + INPUTS + OUTPUTS + locktime (4 bytes)
        inputs = self.txinputs()
        outputs = self.outputs()
        return (
            4
            + 4
            + compact_size_nbytes(len(inputs))
            + sum(inp.size(self._sign_schnorr) for inp in inputs)
            + compact_size_nbytes(len(outputs))
            + sum(outp.size() for outp in outputs)
        )

    def signature_count(self):
        r = 0
        s = 0
        for txin in self.txinputs():
            if txin.type == ScriptType.coinbase:
                continue
            s += txin.num_valid_sigs
            r += txin.num_required_sigs
        return s, r

    def is_complete(self):
        s, r = self.signature_count()
        return r == s

    @staticmethod
    def verify_signature(pubkey: bytes, sig: bytes, msghash: bytes, reason=None):
        """Given a pubkey, signature (without sighash byte),
        and a sha256d message digest, returns True iff the signature is good
        for the given public key, False otherwise.  Does not raise normally
        unless given bad or garbage arguments.

        Optional arg 'reason' should be a list which will have a string pushed
        at the front (failure reason) on False return."""
        if (
            any(not arg or not isinstance(arg, bytes) for arg in (pubkey, sig, msghash))
            or len(msghash) != 32
        ):
            raise ValueError("bad arguments to verify_signature")
        if len(sig) == 64:
            # Schnorr signatures are always exactly 64 bytes
            return schnorr.verify(pubkey, sig, msghash)

        # ECDSA signature
        try:
            public_key = ECPubkey(pubkey)
            sig_string = sig_string_from_der_sig(sig)
            return public_key.verify_message_hash(sig_string, msghash)
        except Exception as e:
            # ser_to_point will fail if pubkey is off-curve, infinity, or garbage.
            # verify_digest may also raise BadDigestError and BadSignatureError
            print_error("[Transaction.verify_signature] unexpected exception", repr(e))
            if isinstance(reason, list):
                reason.insert(0, repr(e))
        return False

    @staticmethod
    def _ecdsa_sign(sec, pre_hash):
        privkey = ECPrivkey(sec)
        return privkey.sign_transaction(pre_hash)

    @staticmethod
    def _schnorr_sign(pubkey: bytes, sec: bytes, pre_hash: bytes) -> bytes:
        sig = schnorr.sign(sec, pre_hash)
        assert schnorr.verify(pubkey, sig, pre_hash)  # verify what we just signed
        return sig

    def sign(self, keypairs: Dict[bytes, Tuple[bytes, bool]], *, use_cache=False):
        for i, txin in enumerate(self.txinputs()):
            pubkeys, x_pubkeys = txin.get_sorted_pubkeys()
            for j, (pubkey, x_pubkey) in enumerate(zip(pubkeys, x_pubkeys)):
                if txin.is_complete():
                    # txin is complete
                    break
                if pubkey in keypairs:
                    _pubkey = pubkey
                elif x_pubkey in keypairs:
                    _pubkey = x_pubkey
                else:
                    continue
                print_error(
                    f"adding signature for input#{i} sig#{j}; pubkey:"
                    f" {_pubkey} schnorr: {self._sign_schnorr}"
                )
                sec, compressed = keypairs.get(_pubkey)
                self._sign_txin(i, j, sec, compressed, use_cache=use_cache)
        print_error("is_complete", self.is_complete())
        self.raw = self.serialize()

    def _sign_txin(self, i, j, sec, compressed, *, use_cache=False):
        """Note: precondition is self._inputs is valid (ie: tx is already deserialized)"""
        pubkey = ECPrivkey(sec).get_public_key_bytes(compressed)
        # add signature
        nHashType = (
            0x00000041  # hardcoded, perhaps should be taken from unsigned input dict
        )
        pre_hash = Hash(self.serialize_preimage(i, nHashType, use_cache=use_cache))
        if self._sign_schnorr:
            sig = self._schnorr_sign(pubkey, sec, pre_hash)
        else:
            sig = self._ecdsa_sign(sec, pre_hash)
        reason = []
        if not self.verify_signature(pubkey, sig, pre_hash, reason=reason):
            print_error(
                f"Signature verification failed for input#{i} sig#{j}, reason:"
                f" {str(reason)}"
            )
            return None
        txin = self._inputs[i]
        txin.update_signature(sig + bytes((nHashType & 0xFF,)), j)

        if j == 1 and len(txin.pubkeys) == 1 and txin.pubkeys[0].startswith(b"\xfd"):
            # See https://github.com/spesmilo/electrum/issues/2566 :
            # ImportedAddressWallet cannot know the pubkey associated with coins, so
            # it puts an address prefixed with "fd" instead to tell the signing
            # wallet to use the "pubkey that belongs to this address".
            # This code is executed by the signing wallet, that has the key to derive
            # and update the pubkey.
            # Other wallet type should not be doing this, especially not multisig
            # wallets, as the pubkeys should already be set correctly and may not be in
            # the same order as the signatures in the internal date structures of a
            # TxInput.
            txin.update_pubkey(pubkey, j)
        return txin

    def is_final(self):
        return not any(
            txin.sequence < DEFAULT_TXIN_SEQUENCE for txin in self.txinputs()
        )

    def as_dict(self):
        if self.raw is None:
            self.raw = self.serialize()
        self.deserialize()
        out = {
            "hex": self.raw.hex(),
            "complete": self.is_complete(),
            "final": self.is_final(),
        }
        return out

    # This cache stores foreign (non-wallet) tx's we fetched from the network
    # for the purposes of the "fetch_input_data" mechanism. Its max size has
    # been thoughtfully calibrated to provide a decent tradeoff between
    # memory consumption and UX.
    #
    # In even aggressive/pathological cases this cache won't ever exceed
    # 100MB even when full. [see ExpiringCache.size_bytes() to test it].
    # This is acceptable considering this is Python + Qt and it eats memory
    # anyway.. and also this is 2019 ;). Note that all tx's in this cache
    # are in the non-deserialized state (hex encoded bytes only) as a memory
    # savings optimization.  Please maintain that invariant if you modify this
    # code, otherwise the cache may grow to 10x memory consumption if you
    # put deserialized tx's in here.
    _fetched_tx_cache = ExpiringCache(maxlen=1000, name="TransactionFetchCache")

    def fetch_input_data(
        self,
        wallet,
        done_callback=None,
        done_args=(),
        prog_callback=None,
        *,
        force=False,
        use_network=True,
    ):
        """
        Fetch all input data and put it in the 'ephemeral' dictionary, under
        'fetched_inputs'. This call potentially initiates fetching of
        prevout_hash transactions from the network for all inputs to this tx.

        The fetched data is basically used for the Transaction dialog to be able
        to display fee, actual address, and amount (value) for tx inputs.

        `wallet` should ideally have a network object, but this function still
        will work and is still useful if it does not.

        `done_callback` is called with `done_args` (only if True was returned),
        upon completion. Note that done_callback won't be called if this function
        returns False. Also note that done_callback runs in a non-main thread
        context and as such, if you want to do GUI work from within it, use
        the appropriate Qt signal/slot mechanism to dispatch work to the GUI.

        `prog_callback`, if specified, is called periodically to indicate
        progress after inputs are retrieved, and it is passed a single arg,
        "percent" (eg: 5.1, 10.3, 26.3, 76.1, etc) to indicate percent progress.

        Note 1: Results (fetched transactions) are cached, so subsequent
        calls to this function for the same transaction are cheap.

        Note 2: Multiple, rapid calls to this function will cause the previous
        asynchronous fetch operation (if active) to be canceled and only the
        latest call will result in the invocation of the done_callback if/when
        it completes.
        """
        if not self._inputs:
            return False
        if force:
            # forced-run -- start with empty list
            inps = []
        else:
            # may be a new list or list that was already in dict
            inps = self.fetched_inputs(require_complete=True)
        if len(self._inputs) == len(inps):
            # we already have results, don't do anything.
            return False
        eph = self.ephemeral
        # paranoia: in case another thread is running on this list
        eph["fetched_inputs"] = inps = inps.copy()

        t0 = time.time()
        t = None
        cls = __class__
        self_txid = self.txid()

        def doIt():
            """
            This function is seemingly complex, but it's really conceptually
            simple:
            1. Fetch all prevouts either from cache (wallet or global tx_cache)
            2. Or, if they aren't in either cache, then we will asynchronously
               queue the raw tx gets to the network in parallel, across *all*
               our connected servers. This is very fast, and spreads the load
               around.

            Tested with a huge tx of 600+ inputs all coming from different
            prevout_hashes on mainnet, and it's super fast:
            cd8fcc8ad75267ff9ad314e770a66a9e871be7882b7c05a7e5271c46bfca98bc"""
            last_prog = -9999.0
            # the dict of txids we will need to download (wasn't in cache)
            need_dl_txids = defaultdict(list)

            def prog(i, prog_total=100):
                """notify interested code about progress"""
                if not prog_callback:
                    return
                nonlocal last_prog
                prog = ((i + 1) * 100.0) / prog_total
                if prog - last_prog > 5.0:
                    prog_callback(prog)
                    last_prog = prog

            while eph.get("_fetch") == t and len(inps) < len(self._inputs):
                i = len(inps)
                # FIXME: convert this mess to using TxInput
                inp = self._inputs[i].to_coin_dict()
                typ, prevout_hash, n, addr, value = (
                    inp.get("type"),
                    inp.get("prevout_hash"),
                    inp.get("prevout_n"),
                    inp.get("address"),
                    inp.get("value"),
                )
                if not prevout_hash or n is None:
                    raise RuntimeError("Missing prevout_hash and/or prevout_n")
                if typ == "coinbase" or (
                    isinstance(addr, Address) and value is not None
                ):
                    # No extra work needed
                    inps.append(inp)
                    continue

                tx = cls.tx_cache_get(prevout_hash) or wallet.transactions.get(
                    prevout_hash
                )
                if tx is None or not tx.raw:
                    # tx was not in cache or wallet.transactions, or it did not have
                    # the raw data, mark it for download below
                    # Remember the input# as well as the prevout_n
                    need_dl_txids[prevout_hash].append((i, n))
                    # append as-yet-incomplete copy of _inputs[i]
                    inps.append(inp)
                    continue

                # Tx was in cache or wallet.transactions, proceed
                # note that the tx here should be in the "not
                # deserialized" state

                # Note we deserialize a *copy* of the tx so as to
                # save memory.  We do not want to deserialize the
                # cached tx because if we do so, the cache will
                # contain a deserialized tx which will take up
                # several times the memory when deserialized due to
                # Python's memory use being less efficient than the
                # binary-only raw bytes.  So if you modify this code
                # do bear that in mind.
                tx = Transaction(tx.raw)
                try:
                    tx.deserialize()
                    # The below txid check is commented-out as
                    # we trust wallet tx's and the network
                    # tx's that fail this check are never
                    # put in cache anyway.
                    # txid = tx._txid(tx.raw)
                    # if txid != prevout_hash: # sanity check
                    #    print_error("fetch_input_data: cached prevout_hash {} != tx.txid() {}, ignoring.".format(prevout_hash, txid))
                except Exception as e:
                    print_error(
                        f"fetch_input_data: WARNING failed to deserialize"
                        f" {prevout_hash}: {repr(e)}"
                    )
                    # The local tx was malformed (should never happen). Mark it
                    # for download below and append as-yet-incomplete copy of
                    # _inputs[i]
                    need_dl_txids[prevout_hash].append((i, n))
                    inps.append(inp)
                    continue

                if n < len(tx.outputs()):
                    outp = tx.outputs()[n]
                    addr, value = outp.destination, outp.value
                    inp["value"] = value
                    inp["address"] = addr
                    print_error("fetch_input_data: fetched cached", i, addr, value)
                else:
                    print_error(
                        "fetch_input_data: ** FIXME ** should never happen --"
                        f" n={n} >= len(tx.outputs())={len(tx.outputs())} for "
                        f"prevout {prevout_hash}"
                    )
                # append cached result
                inps.append(inp)
            # Now, download the tx's we didn't find above if network is available
            # and caller said it's ok to go out ot network.. otherwise just return
            # what we have
            if use_network and eph.get("_fetch") == t and wallet.network:
                callback_funcs_to_cancel = set()
                # the whole point of this try block is the `finally` way below...
                try:
                    # tell interested code that progress is now 0%
                    prog(-1)
                    # Next, queue the transaction.get requests, spreading them
                    # out randomly over the connected interfaces
                    q = queue.Queue()
                    q_ct = 0
                    bad_txids = set()

                    def put_in_queue_and_cache(r):
                        """we cache the results directly in the network callback
                        as even if the user cancels the operation, we would like
                        to save the returned tx in our cache, since we did the
                        work to retrieve it anyway."""
                        # put the result in the queue no matter what it is
                        q.put(r)
                        txid = ""
                        try:
                            # Below will raise if response was 'error' or
                            # otherwise invalid. Note: for performance reasons
                            # we don't validate the tx here or deserialize it as
                            # this function runs in the network thread and we
                            # don't want to eat up that thread's CPU time
                            # needlessly. Also note the cache doesn't store
                            # deserializd tx's so as to save memory. We
                            # always deserialize a copy when reading the cache.
                            tx = Transaction(bytes.fromhex(["result"]))
                            txid = r["params"][0]
                            # protection against phony responses
                            assert txid == cls._txid(tx.raw), "txid-is-sane-check"
                            # save tx to cache here
                            cls.tx_cache_put(tx=tx, txid=txid)
                        except Exception as e:
                            # response was not valid, ignore (don't cache)
                            # txid may be '' if KeyError from r['result'] above
                            if txid:
                                bad_txids.add(txid)
                            print_error(
                                "fetch_input_data: put_in_queue_and_cache fail for"
                                " txid:",
                                txid,
                                repr(e),
                            )

                    for txid, _prevout_n in need_dl_txids.items():
                        wallet.network.queue_request(
                            "blockchain.transaction.get",
                            [txid],
                            interface="random",
                            callback=put_in_queue_and_cache,
                        )
                        callback_funcs_to_cancel.add(put_in_queue_and_cache)
                        q_ct += 1

                    def get_bh():
                        if eph.get("block_height") or not self_txid:
                            return False

                        def got_tx_height(r):
                            # indicate to other thread we got the block_height reply
                            # from network
                            q.put("block_height")
                            if not isinstance(r, dict):
                                print_error(
                                    "fetch_input_data: unexpected response type", r
                                )
                                return
                            tx_height = r.get("result", 0)
                            if tx_height:
                                eph["block_height"] = tx_height
                                print_error(
                                    "fetch_input_data: got tx block height", tx_height
                                )
                            else:
                                print_error(
                                    "fetch_input_data: tx block height could not be"
                                    " determined"
                                )

                        wallet.network.queue_request(
                            "blockchain.transaction.get_height",
                            [self_txid],
                            interface=None,
                            callback=got_tx_height,
                        )
                        callback_funcs_to_cancel.add(got_tx_height)
                        return True

                    if get_bh():
                        q_ct += 1

                    class ErrorResp(Exception):
                        pass

                    for i in range(q_ct):
                        # now, read the q back, with a 10 second timeout, and
                        # populate the inputs
                        try:
                            r = q.get(timeout=10)
                            if eph.get("_fetch") != t:
                                # early abort from func, canceled
                                break
                            if r == "block_height":
                                # ignore block_height reply from network.. was already
                                # processed in other thread in got_tx_height above
                                continue
                            if r.get("error"):
                                msg = r.get("error")
                                if isinstance(msg, dict):
                                    msg = msg.get("message") or "unknown error"
                                raise ErrorResp(msg)
                            rawhex = r["result"]
                            txid = r["params"][0]
                            # skip if was marked bad by our callback code
                            assert txid not in bad_txids, "txid marked bad"
                            tx = Transaction(bytes.fromhex(rawhex))
                            tx.deserialize()
                            for item in need_dl_txids[txid]:
                                ii, n = item
                                assert n < len(tx.outputs())
                                outp = tx.outputs()[n]
                                addr, value = outp.destination, outp.value
                                inps[ii]["value"] = value
                                inps[ii]["address"] = addr
                                print_error(
                                    "fetch_input_data: fetched from network",
                                    ii,
                                    addr,
                                    value,
                                )
                            # tell interested code of progress
                            prog(i, q_ct)
                        except queue.Empty:
                            print_error(
                                "fetch_input_data: timed out after 10.0s fetching from"
                                " network, giving up."
                            )
                            break
                        except Exception as e:
                            print_error("fetch_input_data:", repr(e))
                finally:
                    # force-cancel any extant requests -- this is especially
                    # crucial on error/timeout/failure.
                    for func in callback_funcs_to_cancel:
                        wallet.network.cancel_requests(func)
            # sanity check
            if len(inps) != len(self._inputs) or eph.get("_fetch") != t:
                return
            # potential race condition here, popping wrong t -- but in practice w/
            # CPython threading it won't matter
            eph.pop("_fetch", None)
            print_error(f"fetch_input_data: elapsed {(time.time() - t0):.4f} sec")
            if done_callback:
                done_callback(*done_args)

        # /doIt
        t = threading.Thread(target=doIt, daemon=True)
        eph["_fetch"] = t
        t.start()
        return True

    def fetched_inputs(self, *, require_complete=False):
        """Returns the complete list of asynchronously fetched inputs for
        this tx, if they exist. If the list is not yet fully retrieved, and
        require_complete == False, returns what it has so far
        (the returned list will always be exactly equal to len(self._inputs),
        with not-yet downloaded inputs coming from self._inputs and not
        necessarily containing a good 'address' or 'value').

        If the download failed completely or was never started, will return the
        empty list [].

        Note that some inputs may still lack key: 'value' if there was a network
        error in retrieving them or if the download is still in progress."""
        # TODO: convert this method to return TxInputs (together with fetch_input_data)
        if self._inputs:
            ret = self.ephemeral.get("fetched_inputs") or []
            diff = len(self._inputs) - len(ret)
            if diff > 0 and self.ephemeral.get("_fetch") and not require_complete:
                # in progress.. so return what we have so far
                return ret + [inp.to_coin_dict() for inp in self._inputs[len(ret) :]]
            elif diff == 0 and (
                not require_complete or not self.ephemeral.get("_fetch")
            ):
                # finished *or* in-progress and require_complete==False
                return ret
        return []

    def fetch_cancel(self) -> bool:
        """Cancels the currently-active running fetch operation, if any"""
        return bool(self.ephemeral.pop("_fetch", None))

    @classmethod
    def tx_cache_get(cls, txid: str) -> Optional[Transaction]:
        """Attempts to retrieve txid from the tx cache that this class
        keeps in-memory.  Returns None on failure. The returned tx is
        not deserialized, and is a copy of the one in the cache."""
        tx = cls._fetched_tx_cache.get(txid)
        if tx is not None and tx.raw:
            # make sure to return a copy of the transaction from the cache
            # so that if caller does .deserialize(), *his* instance will
            # use up 10x memory consumption, and not the cached instance which
            # should just be an undeserialized raw tx.
            return Transaction(tx.raw)
        return None

    @classmethod
    def tx_cache_put(cls, tx: Transaction, txid: Optional[str] = None):
        """Puts a non-deserialized copy of tx into the tx_cache."""
        if not tx.raw:
            raise ValueError("Please pass a tx which has a valid .raw attribute!")
        # optionally, caller can pass-in txid to save CPU time for hashing
        txid = txid or cls._txid(tx.raw)
        cls._fetched_tx_cache.put(txid, Transaction(tx.raw))


def rawtx_from_str(txt: str) -> bytes:
    """Parse a hex raw transaction or a transaction saved to JSON.
    See Transaction.as_dict for the format of the JSON file.

    """
    txt = txt.strip()
    if not txt:
        raise ValueError("empty string")
    with suppress(ValueError):
        return bytes.fromhex(txt)
    tx_dict = json.loads(txt)
    assert "hex" in tx_dict.keys()
    return bytes.fromhex(tx_dict["hex"])


# ---
class OPReturn:
    """OPReturn helper namespace. Used by GUI main_window.py and also
    commands.py"""

    class Error(Exception):
        """thrown when the OP_RETURN for a tx not of the right format"""

    class TooLarge(Error):
        """thrown when the OP_RETURN for a tx is >220 bytes"""

    @staticmethod
    def output_for_stringdata(op_return):
        from .i18n import _

        if not isinstance(op_return, str):
            raise OPReturn.Error("OP_RETURN parameter needs to be of type str!")
        op_return_code = "OP_RETURN "
        op_return_encoded = op_return.encode("utf-8")
        if len(op_return_encoded) > 220:
            raise OPReturn.TooLarge(
                _("OP_RETURN message too large, needs to be no longer than 220 bytes")
            )
        op_return_payload = op_return_encoded.hex()
        script = op_return_code + op_return_payload
        amount = 0
        return TxOutput(bitcoin.TYPE_SCRIPT, ScriptOutput.from_string(script), amount)

    @staticmethod
    def output_for_rawhex(op_return):
        from .i18n import _

        if not isinstance(op_return, str):
            raise OPReturn.Error("OP_RETURN parameter needs to be of type str!")
        if op_return == "empty":
            op_return = ""
        try:
            op_return_script = b"\x6a" + bytes.fromhex(op_return.strip())
        except ValueError:
            raise OPReturn.Error(_("OP_RETURN script expected to be hexadecimal bytes"))
        if len(op_return_script) > 223:
            raise OPReturn.TooLarge(
                _("OP_RETURN script too large, needs to be no longer than 223 bytes")
            )
        amount = 0
        return TxOutput(
            bitcoin.TYPE_SCRIPT,
            ScriptOutput.protocol_factory(op_return_script),
            amount,
        )


# /OPReturn

if __name__ == "__main__":
    import doctest

    doctest.testmod()
