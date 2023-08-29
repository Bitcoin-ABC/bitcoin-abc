# -*- coding: utf-8 -*-
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2022 The Electrum ABC developers
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
"""This module defines base types used by more complex types.
"""
from __future__ import annotations

import struct
from io import BytesIO

from .. import schnorr
from ..bitcoin import deserialize_privkey, public_key_from_private_key
from ..serialize import (
    DeserializationError,
    SerializableObject,
    deserialize_blob,
    serialize_blob,
    write_compact_size,
)
from ..uint256 import UInt256

# We redefine private key and public key objects because the ones used in the rest
# of the codebase are messy.


class PublicKey(SerializableObject):
    # fixme: merge with address.PublicKey or us a different name for one of the classes
    def __init__(self, keydata):
        self.keydata: bytes = keydata

    def serialize(self) -> bytes:
        return serialize_blob(self.keydata)

    @classmethod
    def deserialize(cls, stream: BytesIO) -> PublicKey:
        keydata = deserialize_blob(stream)
        return PublicKey(keydata)

    def verify_schnorr(self, signature: bytes, message_hash: bytes):
        return schnorr.verify(self.keydata, signature, message_hash)

    @classmethod
    def from_hex(cls, hex_str: str) -> PublicKey:
        # We expect public keys to be hex encoded without the VarInt size that would
        # normally be a prefix to the serialized data. So this method deviates from the
        # default SerializableObject.from_hex behavior.
        try:
            data = bytes.fromhex(hex_str)
        except ValueError:
            raise DeserializationError("Non-hexadecimal data in public key.")

        if not (
            len(data) == 33 and data[0] in (2, 3) or len(data) == 65 and data[0] == 4
        ):
            raise DeserializationError(
                "Invalid pubkey format. Expected a 33 bytes hex string starting with 2 "
                "or 3 (compressed key) or a 65 bytes hex string starting with 4."
            )

        # TODO: more validation to ensure this key is a valid point on the curve.
        return cls.deserialize(BytesIO(write_compact_size(len(data)) + data))

    def to_hex(self) -> str:
        return self.keydata.hex()

    def __repr__(self):
        return f"PublicKey({self.to_hex()})"

    def __eq__(self, other):
        return self.keydata == other.keydata


class Key:
    """A private key"""

    def __init__(self, keydata, compressed):
        self.keydata: bytes = keydata
        """32 byte raw private key (as you would get from
        deserialize_privkey, etc)"""
        self.compressed: bool = compressed

    @classmethod
    def from_wif(cls, wif: str) -> Key:
        _, privkey, compressed = deserialize_privkey(wif)
        return cls(privkey, compressed)

    def sign_schnorr(self, message_hash: bytes) -> bytes:
        """

        :param message_hash: should be the 32 byte sha256d hash of the tx input (or
            message) you want to sign
        :return: Returns a 64-long bytes object (the signature)
        :raise: ValueError on failure.
            Failure can occur due to an invalid private key.
        """
        return schnorr.sign(self.keydata, message_hash)

    def get_pubkey(self):
        pubkey = public_key_from_private_key(self.keydata, self.compressed)
        return PublicKey(bytes.fromhex(pubkey))


class COutPoint(SerializableObject):
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
        return self.txid.serialize() + struct.pack("<I", self.n)

    @classmethod
    def deserialize(cls, stream: BytesIO) -> COutPoint:
        txid = UInt256.deserialize(stream)
        n = struct.unpack("<I", stream.read(4))[0]
        return COutPoint(txid, n)
