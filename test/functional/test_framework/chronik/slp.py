#!/usr/bin/env python3
# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import unittest

from test_framework.script import CScript


class SlpScript(CScript):
    """
    SLP requires us to encode Scripts differently than CScript currently does.
    SLP forbids using any single push-opcodes OP_1NEGATE, OP_0...OP_16, but CScript
    encodes empty bytestrings b"" and numbers between -1 and 16 using them.
    Therefore, we add SlpScript, which encodes b"" as b"\x4c\x00", and numbers as
    if these opcodes didn't exist (e.g. 5 is b"\x01\x05", -1 is b"\x01\x81").
    """

    @classmethod
    def _coerce_instance(cls, other):
        if isinstance(other, (bytes, bytearray, int)):
            if not other:
                return b"\x4c\x00"
        if isinstance(other, int):
            if other == -1:
                return bytes([1, 0x81])
            if 0 < other <= 16:
                return bytes([1, other])
        return super()._coerce_instance(other)


class TestFrameworkSlpScript(unittest.TestCase):
    def test_slp_script(self):
        # SlpScript encodes b"" as b"\4c\x00"
        self.assertEqual(SlpScript([b"abc"]), b"\x03abc")
        self.assertEqual(SlpScript([b""]), b"\x4c\x00")
        self.assertEqual(SlpScript([b"abc", b""]), b"\x03abc\x4c\x00")
        self.assertEqual(SlpScript([0]), b"\x4c\x00")
        self.assertEqual(SlpScript([-1]), b"\x01\x81")
        self.assertEqual(SlpScript([12, 0]), b"\x01\x0c\x4c\x00")

        # CScript encodes it as OP_0
        self.assertEqual(CScript([b""]), b"\x00")
        self.assertEqual(CScript([0]), b"\x00")
        self.assertEqual(CScript([-1]), b"\x4f")
        self.assertEqual(CScript([b"abc", b""]), b"\x03abc\x00")
        self.assertEqual(CScript([12, 0]), b"\x5c\x00")
