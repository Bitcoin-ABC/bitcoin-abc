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
from typing import Sequence, Type


class DeserializationError(BaseException):
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


def write_compact_size(nsize: int) -> bytes:
    """Serialize a size. Values lower than 253 are serialized using 1 byte.
    For larger values, the first byte indicates how many additional bytes to
    read when decoding (253: 2 bytes, 254: 4 bytes, 255: 8 bytes)

    :param nsize: value to serialize
    :return:
    """
    assert nsize >= 0
    if nsize < 253:
        return struct.pack("B", nsize)
    if nsize < 0x10000:
        return struct.pack("<BH", 253, nsize)
    if nsize < 0x100000000:
        return struct.pack("<BL", 254, nsize)
    assert nsize < 0x10000000000000000
    return struct.pack("<BQ", 255, nsize)


def read_compact_size(stream: BytesIO) -> int:
    nit = struct.unpack("<B", stream.read(1))[0]
    if nit == 253:
        nit = struct.unpack("<H", stream.read(2))[0]
    elif nit == 254:
        nit = struct.unpack("<I", stream.read(4))[0]
    elif nit == 255:
        nit = struct.unpack("<Q", stream.read(8))[0]
    return nit


def serialize_sequence(seq: Sequence[SerializableObject]) -> bytes:
    """Serialize a variable length sequence (list...) of serializable constant size
    objects. The length of the sequence is encoded as a VarInt.
    """
    b = write_compact_size(len(seq))
    for obj in seq:
        b += obj.serialize()
    return b


def deserialize_sequence(stream: BytesIO, cls: Type[SerializableObject]):
    """Deserialize a list of object of type klass.
    cls must implement a deserialize classmethod returning an instance of the class.
    """
    size = read_compact_size(stream)
    ret = []
    for _ in range(size):
        obj = cls.deserialize(stream)
        ret.append(obj)
    return ret


def serialize_blob(blob: bytes) -> bytes:
    """Serialize a variable length bytestring. The length of the sequence is encoded as
    a VarInt.
    """
    return write_compact_size(len(blob)) + blob


def deserialize_blob(stream: BytesIO) -> bytes:
    """Deserialize a blob prefixed with a VarInt length"""
    size = read_compact_size(stream)
    return stream.read(size)
