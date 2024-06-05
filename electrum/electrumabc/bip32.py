# -*- coding: utf-8 -*-
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2024 The Electrum ABC developers
# Copyright (C) 2011 thomasv@gitorious
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

from __future__ import annotations

import hashlib
import hmac

import ecdsa
from ecdsa.curves import SECP256k1
from ecdsa.ecdsa import generator_secp256k1
from ecdsa.util import number_to_string, string_to_number

from . import ecc, networks
from .bitcoin import DecodeBase58Check, EncodeBase58Check
from .crypto import hash_160

# BIP32
BIP32_PRIME = 0x80000000


# Child private key derivation function (from master private key)
# k = master private key (32 bytes)
# c = master chain code (extra entropy for key derivation) (32 bytes)
# n = the index of the key we want to derive. (only 32 bits will be used)
# If n is negative (i.e. the 32nd bit is set), the resulting private key's
#  corresponding public key can NOT be determined without the master private key.
# However, if n is positive, the resulting private key's corresponding
#  public key can be determined without the master private key.
def CKD_priv(k, c, n):
    is_prime = n & BIP32_PRIME
    return _CKD_priv(k, c, n.to_bytes(4, "big"), is_prime)


def _CKD_priv(k, c, s, is_prime):
    order = generator_secp256k1.order()
    keypair = ecc.ECKey(k)
    cK = ecc.GetPubKey(keypair.pubkey, True)
    data = bytes([0]) + k + s if is_prime else cK + s
    I_ = hmac.new(c, data, hashlib.sha512).digest()
    k_n = number_to_string(
        (string_to_number(I_[0:32]) + string_to_number(k)) % order, order
    )
    c_n = I_[32:]
    return k_n, c_n


# Child public key derivation function (from public key only)
# K = master public key
# c = master chain code
# n = index of key we want to derive
# This function allows us to find the nth public key, as long as n is
#  non-negative. If n is negative, we need the master private key to find it.
def CKD_pub(cK, c, n):
    if n & BIP32_PRIME:
        raise
    return _CKD_pub(cK, c, n.to_bytes(4, "big"))


# helper function, callable with arbitrary string
def _CKD_pub(cK, c, s):
    I_ = hmac.new(c, cK + s, hashlib.sha512).digest()
    curve = SECP256k1
    pubkey_point = string_to_number(I_[0:32]) * curve.generator + ecc.ser_to_point(cK)
    public_key = ecdsa.VerifyingKey.from_public_point(pubkey_point, curve=SECP256k1)
    c_n = I_[32:]
    cK_n = ecc.GetPubKey(public_key.pubkey, True)
    return cK_n, c_n


def xprv_header(xtype, *, net=None) -> bytes:
    if net is None:
        net = networks.net
    return net.XPRV_HEADERS[xtype].to_bytes(4, "big")


def xpub_header(xtype, *, net=None):
    if net is None:
        net = networks.net
    return net.XPUB_HEADERS[xtype].to_bytes(4, "big")


def serialize_xprv(
    xtype, c, k, depth=0, fingerprint=b"\x00" * 4, child_number=b"\x00" * 4, *, net=None
):
    if net is None:
        net = networks.net
    xprv = (
        xprv_header(xtype, net=net)
        + bytes([depth])
        + fingerprint
        + child_number
        + c
        + bytes([0])
        + k
    )
    return EncodeBase58Check(xprv)


def serialize_xpub(
    xtype,
    c,
    cK,
    depth=0,
    fingerprint=b"\x00" * 4,
    child_number=b"\x00" * 4,
    *,
    net=None,
):
    if net is None:
        net = networks.net
    xpub = (
        xpub_header(xtype, net=net)
        + bytes([depth])
        + fingerprint
        + child_number
        + c
        + cK
    )
    return EncodeBase58Check(xpub)


class InvalidXKey(Exception):
    pass


class InvalidXKeyFormat(InvalidXKey):
    pass


class InvalidXKeyLength(InvalidXKey):
    pass


class InvalidXKeyNotBase58(InvalidXKey):
    pass


def deserialize_xkey(xkey, prv, *, net=None):
    if net is None:
        net = networks.net
    xkey = DecodeBase58Check(xkey)
    if xkey is None:
        raise InvalidXKeyNotBase58("The supplied xkey is not encoded using base58")
    if len(xkey) != 78:
        raise InvalidXKeyLength("Invalid length")
    depth = xkey[4]
    fingerprint = xkey[5:9]
    child_number = xkey[9:13]
    c = xkey[13 : 13 + 32]
    header = int.from_bytes(xkey[0:4], byteorder="big")
    headers = net.XPRV_HEADERS if prv else net.XPUB_HEADERS
    if header not in headers.values():
        raise InvalidXKeyFormat("Invalid xpub format", hex(header))
    xtype = list(headers.keys())[list(headers.values()).index(header)]
    n = 33 if prv else 32
    K_or_k = xkey[13 + n :]
    try:
        # The below ensures we can actually derive nodes from this key,
        # by first deriving node 0.  Fixes #1817.
        if prv:
            CKD_priv(K_or_k, c, 0)
        else:
            CKD_pub(K_or_k, c, 0)
    except Exception as e:
        raise InvalidXKey("Cannot derive from key") from e
    return xtype, depth, fingerprint, child_number, c, K_or_k


def deserialize_xpub(xkey, *, net=None):
    if net is None:
        net = networks.net
    return deserialize_xkey(xkey, False, net=net)


def deserialize_xprv(xkey, *, net=None):
    if net is None:
        net = networks.net
    return deserialize_xkey(xkey, True, net=net)


def xpub_type(x, *, net=None):
    if net is None:
        net = networks.net
    return deserialize_xpub(x, net=net)[0]


def is_xpub(text, *, net=None):
    if net is None:
        net = networks.net
    try:
        deserialize_xpub(text, net=net)
        return True
    except Exception:
        return False


def is_xprv(text, *, net=None):
    if net is None:
        net = networks.net
    try:
        deserialize_xprv(text, net=net)
        return True
    except Exception:
        return False


def xpub_from_xprv(xprv, *, net=None):
    if net is None:
        net = networks.net
    xtype, depth, fingerprint, child_number, c, k = deserialize_xprv(xprv, net=net)
    K, cK = ecc.get_pubkeys_from_secret(k)
    return serialize_xpub(xtype, c, cK, depth, fingerprint, child_number, net=net)


def bip32_root(seed, xtype, *, net=None):
    if net is None:
        net = networks.net
    I_ = hmac.new(b"Bitcoin seed", seed, hashlib.sha512).digest()
    master_k = I_[0:32]
    master_c = I_[32:]
    K, cK = ecc.get_pubkeys_from_secret(master_k)
    xprv = serialize_xprv(xtype, master_c, master_k, net=net)
    xpub = serialize_xpub(xtype, master_c, cK, net=net)
    return xprv, xpub


def bip32_derivation(s):
    if not s.startswith("m/"):
        raise ValueError("invalid bip32 derivation path: {}".format(s))
    s = s[2:]
    for n in s.split("/"):
        if n == "":
            continue
        i = int(n[:-1]) + BIP32_PRIME if n[-1] == "'" else int(n)
        yield i


def is_bip32_derivation(x):
    try:
        list(bip32_derivation(x))
        return True
    except Exception:
        return False


def bip32_private_derivation(xprv, branch, sequence, *, net=None):
    if net is None:
        net = networks.net
    if not sequence.startswith(branch):
        raise ValueError(
            "incompatible branch ({}) and sequence ({})".format(branch, sequence)
        )
    if branch == sequence:
        return xprv, xpub_from_xprv(xprv, net=net)
    xtype, depth, fingerprint, child_number, c, k = deserialize_xprv(xprv, net=net)
    sequence = sequence[len(branch) :]
    for n in sequence.split("/"):
        if n == "":
            continue
        i = int(n[:-1]) + BIP32_PRIME if n[-1] == "'" else int(n)
        parent_k = k
        k, c = CKD_priv(k, c, i)
        depth += 1
    _, parent_cK = ecc.get_pubkeys_from_secret(parent_k)
    fingerprint = hash_160(parent_cK)[0:4]
    child_number = i.to_bytes(4, "big")
    K, cK = ecc.get_pubkeys_from_secret(k)
    xpub = serialize_xpub(xtype, c, cK, depth, fingerprint, child_number, net=net)
    xprv = serialize_xprv(xtype, c, k, depth, fingerprint, child_number, net=net)
    return xprv, xpub


def bip32_public_derivation(xpub, branch, sequence, *, net=None):
    if net is None:
        net = networks.net
    xtype, depth, fingerprint, child_number, c, cK = deserialize_xpub(xpub, net=net)
    assert sequence.startswith(branch)
    sequence = sequence[len(branch) :]
    for n in sequence.split("/"):
        if n == "":
            continue
        i = int(n)
        parent_cK = cK
        cK, c = CKD_pub(cK, c, i)
        depth += 1
    fingerprint = hash_160(parent_cK)[0:4]
    child_number = i.to_bytes(4, "big")
    return serialize_xpub(xtype, c, cK, depth, fingerprint, child_number, net=net)


def bip32_private_key(sequence, k, chain):
    for i in sequence:
        k, chain = CKD_priv(k, chain, i)
    return k
