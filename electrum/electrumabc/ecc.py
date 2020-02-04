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
from typing import TYPE_CHECKING, NamedTuple, Optional, Union

import ecdsa
from ecdsa.curves import SECP256k1
from ecdsa.ecdsa import curve_secp256k1, generator_secp256k1
from ecdsa.ellipticcurve import Point
from ecdsa.util import number_to_string, string_to_number

from . import networks
from .crypto import Hash, aes_decrypt_with_iv, aes_encrypt_with_iv
from .ecc_fast import do_monkey_patching_of_python_ecdsa_internals_with_libsecp256k1
from .serialize import serialize_blob
from .util import InvalidPassword, assert_bytes, randrange, to_bytes

if TYPE_CHECKING:
    from .address import Address


do_monkey_patching_of_python_ecdsa_internals_with_libsecp256k1()

CURVE_ORDER = SECP256k1.order


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


def sig_string_from_der_sig(der_sig):
    r, s = ecdsa.util.sigdecode_der(der_sig, CURVE_ORDER)
    return ecdsa.util.sigencode_string(r, s, CURVE_ORDER)


class EcCoordinates(NamedTuple):
    x: int
    y: int


def point_to_ser(
    P: Union[EcCoordinates, ecdsa.ellipticcurve.Point], compressed=True
) -> bytes:
    if isinstance(P, tuple):
        assert len(P) == 2, f"unexpected point: {P}"
        x, y = P
    else:
        x, y = P.x(), P.y()
    if compressed:
        return int(2 + (y & 1)).to_bytes(1, "big") + int(x).to_bytes(32, "big")
    return b"\x04" + int(x).to_bytes(32, "big") + int(y).to_bytes(32, "big")


def ser_to_coordinates(ser: bytes) -> EcCoordinates:
    if ser[0] not in (0x02, 0x03, 0x04):
        raise ValueError(f"Unexpected first byte: {ser[0]}")
    if ser[0] == 0x04:
        return EcCoordinates(string_to_number(ser[1:33]), string_to_number(ser[33:]))

    x = string_to_number(ser[1:])
    return EcCoordinates(x, get_y_coord_from_x(x, ser[0] == 0x03))


def ser_to_point(ser: bytes) -> ecdsa.ellipticcurve.Point:
    x, y = ser_to_coordinates(ser)
    return Point(curve_secp256k1, x, y, generator_secp256k1.order())


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


class ECPubkey(object):

    def __init__(self, b: bytes):
        assert_bytes(b)
        point = ser_to_point(b)
        self._pubkey = ecdsa.ecdsa.Public_key(generator_secp256k1, point)

    @classmethod
    def from_sig_string(cls, sig_string: bytes, recid: int, msg_hash: bytes):
        assert_bytes(sig_string)
        if len(sig_string) != 64:
            raise Exception("Wrong encoding")
        if not (0 <= recid <= 3):
            raise ValueError(f"recid is {recid}, but should be 0 <= recid <= 3")
        ecdsa_verifying_key = MyVerifyingKey.from_signature(
            sig_string, recid, msg_hash, curve=SECP256k1
        )
        ecdsa_point = ecdsa_verifying_key.pubkey.point
        return ECPubkey(point_to_ser(ecdsa_point))

    @classmethod
    def from_signature65(cls, sig: bytes, msg_hash: bytes):
        if len(sig) != 65:
            raise Exception("Wrong encoding")
        nV = sig[0]
        if not (27 <= nV <= 34):
            raise Exception("Bad encoding")
        if nV >= 31:
            compressed = True
            nV -= 4
        else:
            compressed = False
        recid = nV - 27
        return cls.from_sig_string(sig[1:], recid, msg_hash), compressed

    @classmethod
    def from_point(
        cls, point: Union[EcCoordinates, ecdsa.ecdsa.Public_key]
    ) -> ECPubkey:
        _bytes = point_to_ser(point, compressed=False)  # faster than compressed
        return ECPubkey(_bytes)

    def get_public_key_bytes(self, compressed=True):
        return point_to_ser(self.point(), compressed)

    def get_public_key_hex(self, compressed=True):
        return self.get_public_key_bytes(compressed).hex()

    def point(self) -> EcCoordinates:
        return EcCoordinates(self._pubkey.point.x(), self._pubkey.point.y())

    def __mul__(self, other: int):
        if not isinstance(other, int):
            raise TypeError(
                f"multiplication not defined for ECPubkey and {type(other)}"
            )
        ecdsa_point = self._pubkey.point * other
        return self.from_point(ecdsa_point)

    def __rmul__(self, other: int):
        return self * other

    def __add__(self, other):
        if not isinstance(other, ECPubkey):
            raise TypeError(f"addition not defined for ECPubkey and {type(other)}")
        ecdsa_point = self._pubkey.point + other._pubkey.point
        return self.from_point(ecdsa_point)

    def __eq__(self, other):
        return self.get_public_key_bytes() == other.get_public_key_bytes()

    def __ne__(self, other):
        return not (self == other)

    def verify_message(
        self,
        sig65: bytes,
        message: bytes,
        *,
        sigtype: SignatureType = SignatureType.ECASH,
    ) -> bool:
        assert_bytes(message)
        h = Hash(msg_magic(message, sigtype))
        try:
            public_key, compressed = ECPubkey.from_signature65(sig65, h)
        except Exception:
            return False
        # check public key
        if public_key != self:
            return False
        # check message
        return self.verify_message_hash(sig65[1:], h)

    def verify_message_hash(self, sig_string: bytes, msg_hash: bytes) -> bool:
        assert_bytes(sig_string)
        if len(sig_string) != 64:
            return False
        ecdsa_point = self._pubkey.point
        verifying_key = MyVerifyingKey.from_public_point(ecdsa_point, curve=SECP256k1)
        return verifying_key.verify_digest(
            sig_string, msg_hash, sigdecode=ecdsa.util.sigdecode_string
        )

    @classmethod
    def order(cls):
        return CURVE_ORDER


def verify_message_with_address(
    address: Union[str, "Address"],
    sig65: bytes,
    message: bytes,
    *,
    sigtype: SignatureType = SignatureType.ECASH,
    net: Optional[networks.AbstractNet] = None,
) -> bool:
    # Fixme: circular import address -> ecc -> address
    from .address import Address

    if net is None:
        net = networks.net
    assert_bytes(sig65, message)

    if not isinstance(address, Address):
        address = Address.from_string(address, net=net)

    h = Hash(msg_magic(message, sigtype))
    try:
        public_key, compressed = ECPubkey.from_signature65(sig65, h)
    except Exception:
        return False
    # check public key using the address
    pubkey_hex = public_key.get_public_key_bytes(compressed)
    addr = Address.from_pubkey(pubkey_hex)
    if address != addr:
        return False
    # check message
    return public_key.verify_message_hash(sig65[1:], h)


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
            pubkey = ECPubkey.from_point(self.pubkey.point)
            if pubkey.verify_message(sig, message, sigtype=sigtype):
                return sig
            continue
        else:
            raise Exception("error: cannot sign message")

    # ECIES encryption/decryption methods; AES-128-CBC with PKCS7 is used as the cipher; hmac-sha256 is used as the mac

    @classmethod
    def encrypt_message(self, message, pubkey, magic=b"BIE1"):
        assert_bytes(message)

        pk = ser_to_point(pubkey)
        if not ecdsa.ecdsa.point_is_valid(generator_secp256k1, pk.x(), pk.y()):
            raise Exception("invalid pubkey")

        ephemeral_exponent = number_to_string(
            randrange(pow(2, 256)), generator_secp256k1.order()
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
