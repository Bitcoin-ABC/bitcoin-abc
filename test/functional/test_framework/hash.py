# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Cryptographic hash functions for the test framework
"""

from .messages import sha256
from .ripemd160 import ripemd160


def hash160(s: bytes) -> bytes:
    return ripemd160(sha256(s))


def hex_be_sha256(data: bytes) -> str:
    return sha256(data)[::-1].hex()
