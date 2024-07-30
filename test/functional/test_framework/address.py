# Copyright (c) 2016-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Encode and decode BASE58, P2PKH and P2SH addresses."""

import unittest

from .hash import hash160
from .script import OP_TRUE, CScript, CScriptOp, hash256
from .util import assert_equal

ADDRESS_ECREG_UNSPENDABLE = "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkt"
ADDRESS_ECREG_UNSPENDABLE_DESCRIPTOR = (
    "addr(ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkt)#u6xx93xc"
)
SCRIPT_UNSPENDABLE = CScript.fromhex(
    "76a914000000000000000000000000000000000000000088ac"
)

# Coins sent to this address can be spent with a scriptSig of just OP_TRUE
ADDRESS_ECREG_P2SH_OP_TRUE = "ecregtest:prdpw30fk4ym6zl6rftfjuw806arpn26fvkgfu97xt"
P2SH_OP_TRUE = CScript.fromhex("a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87")
SCRIPTSIG_OP_TRUE = CScriptOp.encode_op_pushdata(CScript([OP_TRUE]))

chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def byte_to_base58(b, version):
    result = ""
    # prepend version
    b = bytes([version]) + b
    # append checksum
    b += hash256(b)[:4]
    value = int.from_bytes(b, "big")
    while value > 0:
        result = chars[value % 58] + result
        value //= 58
    while b[0] == 0:
        result = chars[0] + result
        b = b[1:]
    return result


def base58_to_byte(s):
    """Converts a base58-encoded string to its data and version.

    Throws if the base58 checksum is invalid."""
    if not s:
        return b""
    n = 0
    for c in s:
        n *= 58
        assert c in chars
        digit = chars.index(c)
        n += digit
    h = f"{n:x}"
    if len(h) % 2:
        h = f"0{h}"
    res = n.to_bytes((n.bit_length() + 7) // 8, "big")
    pad = 0
    for c in s:
        if c == chars[0]:
            pad += 1
        else:
            break
    res = b"\x00" * pad + res

    # Assert if the checksum is invalid
    assert_equal(hash256(res[:-4])[:4], res[-4:])

    return res[1:-4], int(res[0])


def keyhash_to_p2pkh(keyhash, main=False):
    assert len(keyhash) == 20
    version = 0 if main else 111
    return byte_to_base58(keyhash, version)


def scripthash_to_p2sh(scripthash, main=False):
    assert len(scripthash) == 20
    version = 5 if main else 196
    return byte_to_base58(scripthash, version)


def key_to_p2pkh(key, main=False):
    key = check_key(key)
    return keyhash_to_p2pkh(hash160(key), main)


def script_to_p2sh(script, main=False):
    script = check_script(script)
    return scripthash_to_p2sh(hash160(script), main)


def check_key(key):
    if isinstance(key, str):
        key = bytes.fromhex(key)  # Assuming this is hex string
    if isinstance(key, bytes) and (len(key) == 33 or len(key) == 65):
        return key
    assert False


def check_script(script):
    if isinstance(script, str):
        script = bytes.fromhex(script)  # Assuming this is hex string
    if isinstance(script, bytes) or isinstance(script, CScript):
        return script
    assert False


class TestFrameworkScript(unittest.TestCase):
    def test_base58encodedecode(self):
        def check_base58(data, version):
            self.assertEqual(
                base58_to_byte(byte_to_base58(data, version)), (data, version)
            )

        check_base58(bytes.fromhex("1f8ea1702a7bd4941bca0941b852c4bbfedb2e05"), 111)
        check_base58(bytes.fromhex("3a0b05f4d7f66c3ba7009f453530296c845cc9cf"), 111)
        check_base58(bytes.fromhex("41c1eaf111802559bad61b60d62b1f897c63928a"), 111)
        check_base58(bytes.fromhex("0041c1eaf111802559bad61b60d62b1f897c63928a"), 111)
        check_base58(bytes.fromhex("000041c1eaf111802559bad61b60d62b1f897c63928a"), 111)
        check_base58(
            bytes.fromhex("00000041c1eaf111802559bad61b60d62b1f897c63928a"), 111
        )
        check_base58(bytes.fromhex("1f8ea1702a7bd4941bca0941b852c4bbfedb2e05"), 0)
        check_base58(bytes.fromhex("3a0b05f4d7f66c3ba7009f453530296c845cc9cf"), 0)
        check_base58(bytes.fromhex("41c1eaf111802559bad61b60d62b1f897c63928a"), 0)
        check_base58(bytes.fromhex("0041c1eaf111802559bad61b60d62b1f897c63928a"), 0)
        check_base58(bytes.fromhex("000041c1eaf111802559bad61b60d62b1f897c63928a"), 0)
        check_base58(bytes.fromhex("00000041c1eaf111802559bad61b60d62b1f897c63928a"), 0)
