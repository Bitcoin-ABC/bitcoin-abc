# Electrum ABC - lightweight eCash client
# Copyright (C) The Electrum ABC developers
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

"""Parser and writer for the Partially Signed Bitcoin Transaction format.

The Partially Signed Bitcoin Transaction (PSBT) format consists of key-value maps.
Each map consists of a sequence of key-value records, terminated by a 0x00 byte.

 <psbt> := <magic> <global-map> <input-map>* <output-map>*

Where <global-map>, <input-map> and <output-map> are sequences of key-value records.

 <global-map> := <keypair>* 0x00
 <input-map> := <keypair>* 0x00
 <output-map> := <keypair>* 0x00

Where
 <keypair> := <key> <value>

Where
 <key> := <keylen> <keytype> <keydata>
 <value> := <valuelen> <valuedata>

Where:
  - <keylen> is the compact size unsigned integer containing the combined length of
    <keytype> and <keydata>
  - <keytype> is a compact size unsigned integer representing the type.
    See the Enums below for a list of defined key types.
    There can be multiple entries with the same <keytype> within a specific <map>,
    but the <key> must be unique.
  - <valuelen> is the compact size unsigned integer containing the length of
    <valuedata>.
  - <keydata> and <valuedata> are blob of bytes whose meaning depends on <keytype>.
    See  BIP 0174.

Additional documentation:
  - psbt.h in the Bitcoin ABC node.
  - https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki

This currently supports PSBT version 0.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum
from io import BytesIO
from typing import List, Optional, Tuple

from .serialize import (
    DeserializationError,
    UnexpectedEndOfStream,
    compact_size,
    read_compact_size,
)

PSBT_MAGIC_BYTES = b"psbt\xff"

# The PSBT separator happens to also be a 0-length key. This is used by the parser
# to find the end of a section.
PSBT_SEPARATOR = b"\x00"


class PSBTGlobalType(IntEnum):
    UNSIGNED_TX = 0x0
    XPUB = 0x1
    VERSION = 0xFB


class PSBTInputType(IntEnum):
    UTXO = 0x0
    PARTIAL_SIG = 0x2
    SIGHASH_TYPE = 0x3
    REDEEM_SCRIPT = 0x4
    BIP32_DERIVATION = 0x6
    FINAL_SCRIPTSIG = 0x7


class PSBTOutputType(IntEnum):
    REDEEM_SCRIPT = 0x0
    BIP32_DERIVATION = 0x2


@dataclass
class PSBTKeypair:
    keytype: int
    keydata: bytes
    valuedata: bytes

    @classmethod
    def deserialize(cls, stream: BytesIO) -> Optional[PSBTKeypair]:
        """Deserialize a keypair from a buffer. Return None if the end of a section or
        the end of the stream is reached.
        """
        key_size = read_compact_size(stream)
        if key_size is None or key_size == 0:
            # We reached a PSBT separator or the end of the stream.
            return None

        full_key = stream.read(key_size)
        key_type, key = cls.get_keytype_and_key_from_fullkey(full_key)

        val_size = read_compact_size(stream)
        if val_size is None:
            raise UnexpectedEndOfStream()
        val = stream.read(val_size)

        return cls(key_type, key, val)

    @classmethod
    def get_keytype_and_key_from_fullkey(cls, full_key: bytes) -> Tuple[int, bytes]:
        with BytesIO(full_key) as key_stream:
            key_type = read_compact_size(key_stream)
            if key_type is None:
                raise UnexpectedEndOfStream()
            key = key_stream.read()
        return key_type, key

    @classmethod
    def get_fullkey_from_keytype_and_key(cls, key_type: int, key: bytes) -> bytes:
        key_type_bytes = compact_size(key_type)
        return key_type_bytes + key

    def serialize(self) -> bytes:
        full_key = self.get_fullkey_from_keytype_and_key(self.keytype, self.keydata)
        return (
            compact_size(len(full_key))
            + full_key
            + compact_size(len(self.valuedata))
            + self.valuedata
        )


@dataclass
class PSBTSection:
    keypairs: List[PSBTKeypair]

    @classmethod
    def deserialize(cls, stream: BytesIO) -> Optional[PSBTSection]:
        """Return None in case the section is empty (EOF reached or other error)"""
        keypairs = []
        while (kp := PSBTKeypair.deserialize(stream)) is not None:
            keypairs.append(kp)

        if not keypairs:
            return None

        return cls(keypairs)

    def serialize(self) -> bytes:
        return b"".join(kp.serialize() for kp in self.keypairs) + PSBT_SEPARATOR


@dataclass
class PSBT:
    sections: List[PSBTSection]

    @classmethod
    def deserialize(cls, stream: BytesIO) -> PSBT:
        magic = stream.read(5)
        if magic != PSBT_MAGIC_BYTES:
            raise DeserializationError(
                "The data does not start with the PSBT magic bytes"
            )
        sections = []
        while (kp := PSBTSection.deserialize(stream)) is not None:
            sections.append(kp)

        return cls(sections)

    def serialize(self) -> bytes:
        return PSBT_MAGIC_BYTES + b"".join(
            section.serialize() for section in self.sections
        )
