from __future__ import annotations

import struct
from io import BytesIO
from typing import Optional

from .serialize import DeserializationError


class BaseBlob:
    """Base class for fixed-size opaque blobs.
    This attempts to reproduce the exact same behavior as the class from the bitcoin
    code base.
    """

    BITS: int = 0

    def __init__(self, data: Optional[bytes] = None):
        assert self.BITS % 8 == 0
        self.WIDTH: int = self.BITS // 8
        self.data = data or b"\x00" * self.WIDTH

    def is_null(self) -> bool:
        return not self.data or all(b == 0 for b in self.data)

    def set_null(self):
        self.data = b"\x00" * self.WIDTH

    def compare(self, other: BaseBlob) -> int:
        """Return 0 if the blobs are identical, else 1 if self > other else -1.
        The bytes are compared backwards.
        """
        if self.WIDTH != other.WIDTH:
            raise TypeError("Cannot compare blobs with different sizes")
        if self.data[::-1] < other.data[::-1]:
            return -1
        if self.data[::-1] > other.data[::-1]:
            return 1
        return 0

    def __eq__(self, other):
        return self.compare(other) == 0

    def __hash__(self):
        return hash((self.data, self.WIDTH))

    def __lt__(self, other):
        return self.compare(other) < 0

    def __gt__(self, other):
        return self.compare(other) > 0

    def __ge__(self, other):
        return self.compare(other) >= 0

    def __le__(self, other):
        return self.compare(other) <= 0

    def serialize(self) -> bytes:
        return self.data

    def unserialize(self, data: bytes):
        """Deserialize into an existing instance from bytes"""
        if len(data) != self.WIDTH:
            raise DeserializationError(
                f"Wrong data size, expected {self.WIDTH} bytes but received {len(data)}"
            )
        self.data = data

    @classmethod
    def deserialize(cls, stream: BytesIO) -> BaseBlob:
        """Deserialize from a bystream and return a new instance."""
        return cls(stream.read(cls.BITS // 8))

    def get_hex(self) -> str:
        return self.data[::-1].hex()

    def to_string(self) -> str:
        return self.get_hex()

    @classmethod
    def from_hex(cls, hex_str: str) -> BaseBlob:
        hex_str = hex_str.strip()
        if hex_str.startswith("0x"):
            hex_str = hex_str[2:]

        if len(hex_str) // 2 != (cls.BITS // 8):
            raise DeserializationError(
                f"Wrong data size, expected {cls.BITS // 8} bytes but received "
                f"{len(hex_str) // 2}"
            )

        try:
            b = bytes.fromhex(hex_str)
        except ValueError:
            raise DeserializationError("Non-hexadecimal data in hex_str.")
        return cls(b[::-1])

    def __repr__(self) -> str:
        return self.to_string()


class UInt256(BaseBlob):
    BITS = 256

    # int helpers to deal with data from the Bitcoin Test Framework, which handles
    # uint256 objects as python bignum
    @classmethod
    def from_int(cls, i: int) -> UInt256:
        # This is ser_uint256 from the bitcoin test framework
        rs = b""
        for _ in range(8):
            rs += struct.pack("<I", i & 0xFFFFFFFF)
            i >>= 32
        return UInt256(rs)

    def get_int(self) -> int:
        # This is uint256_from_str from the bitcoin test framework
        r = 0
        t = struct.unpack("<IIIIIIII", self.data[:32])
        for i in range(8):
            r += t[i] << (i * 32)
        return r
