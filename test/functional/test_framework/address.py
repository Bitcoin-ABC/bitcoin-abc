#!/usr/bin/env python3
# Copyright (c) 2016-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Encode and decode BASE58, P2PKH and P2SH addresses."""

import unittest

from .script import CScript, hash160, hash256
from .util import assert_equal, hex_str_to_bytes

ADDRESS_ECREG_UNSPENDABLE = 'ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkt'
ADDRESS_ECREG_UNSPENDABLE_DESCRIPTOR = 'addr(ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkt)#u6xx93xc'
# Coins sent to this address can be spent with a scriptSig of just OP_TRUE
ADDRESS_ECREG_P2SH_OP_TRUE = 'ecregtest:prdpw30fk4ym6zl6rftfjuw806arpn26fvkgfu97xt'

chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'


def byte_to_base58(b, version):
    result = ''
    str = b.hex()
    str = chr(version).encode('latin-1').hex() + str
    checksum = hash256(hex_str_to_bytes(str)).hex()
    str += checksum[:8]
    value = int('0x' + str, 0)
    while value > 0:
        result = chars[value % 58] + result
        value //= 58
    while (str[:2] == '00'):
        result = chars[0] + result
        str = str[2:]
    return result


def base58_to_byte(s, verify_checksum=True):
    if not s:
        return b''
    n = 0
    for c in s:
        n *= 58
        assert c in chars
        digit = chars.index(c)
        n += digit
    h = '{:x}'.format(n)
    if len(h) % 2:
        h = '0' + h
    res = n.to_bytes((n.bit_length() + 7) // 8, 'big')
    pad = 0
    for c in s:
        if c == chars[0]:
            pad += 1
        else:
            break
    res = b'\x00' * pad + res
    if verify_checksum:
        assert_equal(hash256(res[:-4])[:4], res[-4:])

    return res[1:-4], int(res[0])


def keyhash_to_p2pkh(hash, main=False):
    assert (len(hash) == 20)
    version = 0 if main else 111
    return byte_to_base58(hash, version)


def scripthash_to_p2sh(hash, main=False):
    assert (len(hash) == 20)
    version = 5 if main else 196
    return byte_to_base58(hash, version)


def key_to_p2pkh(key, main=False):
    key = check_key(key)
    return keyhash_to_p2pkh(hash160(key), main)


def script_to_p2sh(script, main=False):
    script = check_script(script)
    return scripthash_to_p2sh(hash160(script), main)


def check_key(key):
    if (isinstance(key, str)):
        key = hex_str_to_bytes(key)  # Assuming this is hex string
    if (isinstance(key, bytes) and (len(key) == 33 or len(key) == 65)):
        return key
    assert False


def check_script(script):
    if (isinstance(script, str)):
        script = hex_str_to_bytes(script)  # Assuming this is hex string
    if (isinstance(script, bytes) or isinstance(script, CScript)):
        return script
    assert False


class TestFrameworkScript(unittest.TestCase):
    def test_base58encodedecode(self):
        def check_base58(data, version):
            self.assertEqual(
                base58_to_byte(byte_to_base58(data, version)),
                (data, version))

        check_base58(
            b'\x1f\x8e\xa1p*{\xd4\x94\x1b\xca\tA\xb8R\xc4\xbb\xfe\xdb.\x05',
            111)
        check_base58(
            b':\x0b\x05\xf4\xd7\xf6l;\xa7\x00\x9fE50)l\x84\\\xc9\xcf', 111)
        check_base58(
            b'A\xc1\xea\xf1\x11\x80%Y\xba\xd6\x1b`\xd6+\x1f\x89|c\x92\x8a',
            111)
        check_base58(
            b'\0A\xc1\xea\xf1\x11\x80%Y\xba\xd6\x1b`\xd6+\x1f\x89|c\x92\x8a',
            111)
        check_base58(
            b'\0\0A\xc1\xea\xf1\x11\x80%Y\xba\xd6\x1b`\xd6+\x1f\x89|c\x92\x8a',
            111)
        check_base58(
            b'\0\0\0A\xc1\xea\xf1\x11\x80%Y\xba\xd6\x1b`\xd6+\x1f\x89|c\x92\x8a',
            111)
        check_base58(
            b'\x1f\x8e\xa1p*{\xd4\x94\x1b\xca\tA\xb8R\xc4\xbb\xfe\xdb.\x05', 0)
        check_base58(
            b':\x0b\x05\xf4\xd7\xf6l;\xa7\x00\x9fE50)l\x84\\\xc9\xcf', 0)
        check_base58(
            b'A\xc1\xea\xf1\x11\x80%Y\xba\xd6\x1b`\xd6+\x1f\x89|c\x92\x8a', 0)
        check_base58(
            b'\0A\xc1\xea\xf1\x11\x80%Y\xba\xd6\x1b`\xd6+\x1f\x89|c\x92\x8a', 0)
        check_base58(
            b'\0\0A\xc1\xea\xf1\x11\x80%Y\xba\xd6\x1b`\xd6+\x1f\x89|c\x92\x8a', 0)
        check_base58(
            b'\0\0\0A\xc1\xea\xf1\x11\x80%Y\xba\xd6\x1b`\xd6+\x1f\x89|c\x92\x8a', 0)
