#!/usr/bin/env python3

# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from chronik_plugin.script import Script
from test_framework.util import assert_equal


def test_script(script: Script):
    assert_equal(
        script.bytecode().hex(), "a914050505050505050505050505050505050505050587"
    )
    assert_equal(
        script, Script(bytes.fromhex("a914050505050505050505050505050505050505050587"))
    )

    ops = script.ops()
    assert_equal(ops[0].opcode, 0xA9)
    assert_equal(ops[0].pushdata, None)
    assert_equal(ops[1].opcode, 20)
    assert_equal(ops[1].pushdata.hex(), "0505050505050505050505050505050505050505")
    assert_equal(ops[2].opcode, 0x87)
    assert_equal(ops[2].pushdata, None)

    assert_equal(
        repr(script),
        r'Script(b"\xa9\x14\x05\x05\x05\x05\x05\x05\x05\x05\x05\x05\x05\x05\x05\x05'
        r'\x05\x05\x05\x05\x05\x05\x87")',
    )


def test_bad_script(bad_script: Script):
    assert_equal(bad_script.bytecode().hex(), "01")
    assert_equal(bad_script, Script(bytes.fromhex("01")))
    assert_equal(repr(bad_script), r'Script(b"\x01")')

    try:
        bad_script.ops()
    except Exception as ex:
        assert str(ex) == "Invalid length, expected 1 bytes but got 0 bytes"
    else:
        raise ValueError("Expected exception")
