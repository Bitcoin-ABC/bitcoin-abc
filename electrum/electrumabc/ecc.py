# -*- coding: utf-8 -*-
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2018 The Electrum developers
# Copyright (C) 2024 The Electrum ABC developers
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

import base64
import hashlib
import hmac
from enum import Enum
from typing import TYPE_CHECKING, Optional, Union

import ecdsa
from ecdsa.curves import SECP256k1
from ecdsa.ecdsa import curve_secp256k1, generator_secp256k1
from ecdsa.ellipticcurve import Point
from ecdsa.util import number_to_string, string_to_number

from . import networks
from .crypto import Hash, aes_decrypt_with_iv, aes_encrypt_with_iv
from .ecc_fast import do_monkey_patching_of_python_ecdsa_internals_with_libsecp256k1
from .serialize import serialize_blob
from .util import InvalidPassword, assert_bytes, to_bytes

if TYPE_CHECKING:
    from .address import Address


do_monkey_patching_of_python_ecdsa_internals_with_libsecp256k1()


def i2o_ECPublicKey(pubkey, compressed=False):
    # public keys are 65 bytes long (520 bits)
    # 0x04 + 32-byte X-coordinate + 32-byte Y-coordinate
    # 0x00 = point at infinity, 0x02 and 0x03 = compressed, 0x04 = uncompressed
    # compressed keys: <sign> <x> where <sign> is 0x02 if y is even and 0x03 if y is odd
    if compressed:
        if pubkey.point.y() & 1:
            # explicitly convert point coordinates to int, because ecdsa
            # returns mpz instead of int if gmpY is installed
            key = b"\x03" + int(pubkey.point.x()).to_bytes(32, "big")
        else:
            key = b"\x02" + int(pubkey.point.x()).to_bytes(32, "big")
    else:
        key = (
            b"\x04"
            + int(pubkey.point.x()).to_bytes(32, "big")
            + int(pubkey.point.y()).to_bytes(32, "big")
        )

    return key


def regenerate_key(pk):
    assert len(pk) == 32
    return ECKey(pk)


def GetPubKey(pubkey, compressed=False) -> bytes:
    return i2o_ECPublicKey(pubkey, compressed)


def public_key_from_private_key(pk: bytes, compressed) -> bytes:
    pkey = regenerate_key(pk)
    return GetPubKey(pkey.pubkey, compressed)


class SignatureType(Enum):
    ECASH = 1
    BITCOIN = 2


ECASH_MSG_MAGIC = b"eCash Signed Message:\n"
BITCOIN_MSG_MAGIC = b"Bitcoin Signed Message:\n"


def msg_magic(message: bytes, sigtype: SignatureType = SignatureType.ECASH) -> bytes:
    """Prepare the preimage of the message before signing it or verifying
    its signature."""
    magic = ECASH_MSG_MAGIC if sigtype == SignatureType.ECASH else BITCOIN_MSG_MAGIC
    return serialize_blob(magic) + serialize_blob(message)


def verify_message(
    address: Union[str, "Address"],
    sig: bytes,
    message: bytes,
    *,
    net: Optional[networks.AbstractNet] = None,
    sigtype: SignatureType = SignatureType.ECASH,
) -> bool:
    if net is None:
        net = networks.net
    assert_bytes(sig, message)
    # Fixme: circular import address -> ecc -> address
    from .address import Address

    if not isinstance(address, Address):
        address = Address.from_string(address, net=net)

    h = Hash(msg_magic(message, sigtype))
    public_key, compressed = pubkey_from_signature(sig, h)
    # check public key using the right address
    pubkey = point_to_ser(public_key.pubkey.point, compressed)
    addr = Address.from_pubkey(pubkey)
    if address != addr:
        return False
    # check message
    try:
        public_key.verify_digest(sig[1:], h, sigdecode=ecdsa.util.sigdecode_string)
    except Exception:
        return False
    return True


def encrypt_message(message, pubkey: bytes, magic=b"BIE1"):
    return ECKey.encrypt_message(message, pubkey, magic)


def get_y_coord_from_x(x: int, odd=True) -> int:
    curve = curve_secp256k1
    _p = curve.p()
    _a = curve.a()
    _b = curve.b()
    for offset in range(128):
        Mx = x + offset
        My2 = pow(Mx, 3, _p) + _a * pow(Mx, 2, _p) + _b % _p
        My = pow(My2, (_p + 1) // 4, _p)
        if curve.contains_point(Mx, My):
            if odd == bool(My & 1):
                return My
            return _p - My
    raise Exception("ECC_YfromX: No Y found")


def negative_point(P):
    return Point(P.curve(), P.x(), -P.y(), P.order())


def point_to_ser(P, comp=True) -> bytes:
    if comp:
        return int(2 + (P.y() & 1)).to_bytes(1, "big") + int(P.x()).to_bytes(32, "big")
    return b"\x04" + int(P.x()).to_bytes(32, "big") + int(P.y()).to_bytes(32, "big")


def ser_to_point(Aser):
    curve = curve_secp256k1
    generator = generator_secp256k1
    _r = generator.order()
    assert Aser[0] in [0x02, 0x03, 0x04]
    if Aser[0] == 0x04:
        return Point(
            curve, string_to_number(Aser[1:33]), string_to_number(Aser[33:]), _r
        )
    Mx = string_to_number(Aser[1:])
    return Point(curve, Mx, get_y_coord_from_x(Mx, Aser[0] == 0x03), _r)


class MyVerifyingKey(ecdsa.VerifyingKey):
    @classmethod
    def from_signature(klass, sig, recid, h, curve):
        """See http://www.secg.org/download/aid-780/sec1-v2.pdf, chapter 4.1.6"""
        from ecdsa import numbertheory, util

        from . import msqr

        curveFp = curve.curve
        G = curve.generator
        order = G.order()
        # extract r,s from signature
        r, s = util.sigdecode_string(sig, order)
        # 1.1
        x = r + (recid // 2) * order
        # 1.3
        alpha = (x * x * x + curveFp.a() * x + curveFp.b()) % curveFp.p()
        beta = msqr.modular_sqrt(alpha, curveFp.p())
        y = beta if (beta - recid) % 2 == 0 else curveFp.p() - beta
        # 1.4 the constructor checks that nR is at infinity
        R = Point(curveFp, x, y, order)
        # 1.5 compute e from message:
        e = string_to_number(h)
        minus_e = -e % order
        # 1.6 compute Q = r^-1 (sR - eG)
        inv_r = numbertheory.inverse_mod(r, order)
        Q = inv_r * (s * R + minus_e * G)
        return klass.from_public_point(Q, curve)


def pubkey_from_signature(sig, h):
    if len(sig) != 65:
        raise Exception("Wrong encoding")
    nV = sig[0]
    if nV < 27 or nV >= 35:
        raise Exception("Bad encoding")
    if nV >= 31:
        compressed = True
        nV -= 4
    else:
        compressed = False
    recid = nV - 27
    return MyVerifyingKey.from_signature(sig[1:], recid, h, curve=SECP256k1), compressed


class MySigningKey(ecdsa.SigningKey):
    """Enforce low S values in signatures"""

    def sign_number(self, number, entropy=None, k=None):
        curve = SECP256k1
        G = curve.generator
        order = G.order()
        r, s = ecdsa.SigningKey.sign_number(self, number, entropy, k)
        if s > order // 2:
            s = order - s
        return r, s


class ECKey(object):
    def __init__(self, k):
        secret = string_to_number(k)
        self.pubkey = ecdsa.ecdsa.Public_key(
            generator_secp256k1, generator_secp256k1 * secret
        )
        self.privkey = ecdsa.ecdsa.Private_key(self.pubkey, secret)
        self.secret = secret

    def GetPubKey(self, compressed):
        return GetPubKey(self.pubkey, compressed)

    def get_public_key(self, compressed=True) -> bytes:
        return point_to_ser(self.pubkey.point, compressed)

    def sign(self, msg_hash):
        private_key = MySigningKey.from_secret_exponent(self.secret, curve=SECP256k1)
        public_key = private_key.get_verifying_key()
        signature = private_key.sign_digest_deterministic(
            msg_hash, hashfunc=hashlib.sha256, sigencode=ecdsa.util.sigencode_string
        )
        assert public_key.verify_digest(
            signature, msg_hash, sigdecode=ecdsa.util.sigdecode_string
        )
        return signature

    def sign_message(self, message, is_compressed, sigtype=SignatureType.ECASH):
        message = to_bytes(message, "utf8")
        signature = self.sign(Hash(msg_magic(message, sigtype)))
        for i in range(4):
            sig = bytes([27 + i + (4 if is_compressed else 0)]) + signature
            try:
                self.verify_message(sig, message, sigtype)
                return sig
            except Exception:
                continue
        else:
            raise Exception("error: cannot sign message")

    def verify_message(self, sig, message, sigtype=SignatureType.ECASH):
        assert_bytes(message)
        h = Hash(msg_magic(message, sigtype))
        public_key, compressed = pubkey_from_signature(sig, h)
        # check public key
        if point_to_ser(public_key.pubkey.point, compressed) != point_to_ser(
            self.pubkey.point, compressed
        ):
            raise Exception("Bad signature")
        # check message
        public_key.verify_digest(sig[1:], h, sigdecode=ecdsa.util.sigdecode_string)

    # ECIES encryption/decryption methods; AES-128-CBC with PKCS7 is used as the cipher; hmac-sha256 is used as the mac

    @classmethod
    def encrypt_message(self, message, pubkey, magic=b"BIE1"):
        assert_bytes(message)

        pk = ser_to_point(pubkey)
        if not ecdsa.ecdsa.point_is_valid(generator_secp256k1, pk.x(), pk.y()):
            raise Exception("invalid pubkey")

        ephemeral_exponent = number_to_string(
            ecdsa.util.randrange(pow(2, 256)), generator_secp256k1.order()
        )
        ephemeral = ECKey(ephemeral_exponent)
        ecdh_key = point_to_ser(pk * ephemeral.privkey.secret_multiplier)
        key = hashlib.sha512(ecdh_key).digest()
        iv, key_e, key_m = key[0:16], key[16:32], key[32:]
        ciphertext = aes_encrypt_with_iv(key_e, iv, message)
        ephemeral_pubkey = ephemeral.get_public_key(compressed=True)
        encrypted = magic + ephemeral_pubkey + ciphertext
        mac = hmac.new(key_m, encrypted, hashlib.sha256).digest()

        return base64.b64encode(encrypted + mac)

    def decrypt_message(self, encrypted, magic=b"BIE1"):
        encrypted = base64.b64decode(encrypted)
        if len(encrypted) < 85:
            raise Exception("invalid ciphertext: length")
        magic_found = encrypted[:4]
        ephemeral_pubkey = encrypted[4:37]
        ciphertext = encrypted[37:-32]
        mac = encrypted[-32:]
        if magic_found != magic:
            raise Exception("invalid ciphertext: invalid magic bytes")
        try:
            ephemeral_pubkey = ser_to_point(ephemeral_pubkey)
        except AssertionError:
            raise Exception("invalid ciphertext: invalid ephemeral pubkey")
        if not ecdsa.ecdsa.point_is_valid(
            generator_secp256k1, ephemeral_pubkey.x(), ephemeral_pubkey.y()
        ):
            raise Exception("invalid ciphertext: invalid ephemeral pubkey")
        ecdh_key = point_to_ser(ephemeral_pubkey * self.privkey.secret_multiplier)
        key = hashlib.sha512(ecdh_key).digest()
        iv, key_e, key_m = key[0:16], key[16:32], key[32:]
        if mac != hmac.new(key_m, encrypted[:-32], hashlib.sha256).digest():
            raise InvalidPassword()
        return aes_decrypt_with_iv(key_e, iv, ciphertext)


def get_pubkeys_from_secret(secret):
    # public key
    private_key = ecdsa.SigningKey.from_string(secret, curve=SECP256k1)
    public_key = private_key.get_verifying_key()
    K = public_key.to_string()
    K_compressed = GetPubKey(public_key.pubkey, True)
    return K, K_compressed
