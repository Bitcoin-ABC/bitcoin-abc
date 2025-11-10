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
"""This module contains serialization tools for various basic data structures used by
data structures.
"""

from __future__ import annotations

import struct
from abc import ABC, abstractmethod
from io import BytesIO
from typing import Optional, Sequence, Type


class DeserializationError(BaseException):
    pass


class UnexpectedEndOfStream(DeserializationError):
    pass


class SerializableObject(ABC):
    @abstractmethod
    def serialize(self) -> bytes:
        """Return a binary serialization of this object"""
        pass

    @classmethod
    @abstractmethod
    def deserialize(cls, stream: BytesIO) -> SerializableObject:
        pass

    @classmethod
    def from_hex(cls, hex_str: str) -> SerializableObject:
        try:
            return cls.deserialize(BytesIO(bytes.fromhex(hex_str)))
        except ValueError:
            # raised by bytes.fromhex for non-hexadecimal values
            raise DeserializationError("Invalid hexadecimal string")
        except struct.error:
            raise DeserializationError("Invalid proof format")

    def to_hex(self) -> str:
        return self.serialize().hex()


def compact_size(nsize: int) -> bytes:
    """Serialize a size. Values lower than 253 are serialized using 1 byte.
    For larger values, the first byte indicates how many additional bytes to
    read when decoding (253: 2 bytes, 254: 4 bytes, 255: 8 bytes)

    See https://en.bitcoin.it/wiki/Protocol_specification#Variable_length_integer

    :param nsize: value to serialize
    :return:
    """
    assert nsize >= 0
    if nsize < 0xFD:
        return nsize.to_bytes(1, "little")
    if nsize <= 0xFFFF:
        return b"\xfd" + nsize.to_bytes(2, "little")
    if nsize <= 0xFFFFFFFF:
        return b"\xfe" + nsize.to_bytes(4, "little")
    assert nsize < 0x10000000000000000
    return b"\xff" + nsize.to_bytes(8, "little")


def read_compact_size(stream: BytesIO) -> Optional[int]:
    """
    Read a compact size from a stream and return its value.
    Return None in case the stream is depleted.
    """
    if not (next_byte := stream.read(1)):
        return None
    nit = struct.unpack("<B", next_byte)[0]
    if nit == 253:
        nit = struct.unpack("<H", stream.read(2))[0]
    elif nit == 254:
        nit = struct.unpack("<I", stream.read(4))[0]
    elif nit == 255:
        nit = struct.unpack("<Q", stream.read(8))[0]
    return nit


def compact_size_nbytes(nsize: int) -> int:
    """Return the number of bytes needed to encode an integer as a CompactSize.
    See https://en.bitcoin.it/wiki/Protocol_documentation#Variable_length_integer.
    """
    if nsize < 253:
        return 1
    if nsize < 0x10000:
        return 3
    if nsize < 0x100000000:
        return 5
    if nsize > 0xFFFFFFFFFFFFFFFF:
        raise OverflowError("CompactSize cannot encode values larger than 2^64 - 1")
    return 9


def serialize_sequence(seq: Sequence[SerializableObject]) -> bytes:
    """Serialize a variable length sequence (list...) of serializable constant size
    objects. The length of the sequence is encoded as a VarInt.
    """
    b = compact_size(len(seq))
    for obj in seq:
        b += obj.serialize()
    return b


def deserialize_sequence(stream: BytesIO, cls: Type[SerializableObject]):
    """Deserialize a list of object of type klass.
    cls must implement a deserialize classmethod returning an instance of the class.
    """
    size = read_compact_size(stream)
    if size is None:
        raise UnexpectedEndOfStream()
    ret = []
    for _ in range(size):
        obj = cls.deserialize(stream)
        ret.append(obj)
    return ret


def serialize_blob(blob: bytes) -> bytes:
    """Serialize a variable length bytestring. The length of the sequence is encoded as
    a VarInt.
    """
    return compact_size(len(blob)) + blob


def deserialize_blob(stream: BytesIO) -> bytes:
    """Deserialize a blob prefixed with a VarInt length"""
    size = read_compact_size(stream)
    if size is None:
        raise UnexpectedEndOfStream()
    return stream.read(size)
