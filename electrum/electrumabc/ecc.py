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
from ctypes import byref, c_char_p, c_size_t, cast, create_string_buffer
from enum import Enum
from typing import TYPE_CHECKING, Callable, NamedTuple, Optional, Tuple, Union

from . import networks
from .crypto import Hash, aes_decrypt_with_iv, aes_encrypt_with_iv
from .secp256k1 import SECP256K1_EC_UNCOMPRESSED, secp256k1
from .serialize import serialize_blob
from .util import InvalidPassword, assert_bytes, randrange, to_bytes

if TYPE_CHECKING:
    from ctypes import Array, c_char

    from .address import Address

CURVE_ORDER = 0xFFFFFFFF_FFFFFFFF_FFFFFFFF_FFFFFFFE_BAAEDCE6_AF48A03B_BFD25E8C_D0364141

PRIVATE_KEY_BYTECOUNT = 32


def be_bytes_to_number(b: bytes) -> int:
    return int.from_bytes(b, byteorder="big", signed=False)


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


def _x_and_y_from_pubkey_bytes(pubkey: bytes) -> Tuple[int, int]:
    pubkey_ptr = create_string_buffer(64)
    ret = secp256k1.secp256k1_ec_pubkey_parse(
        secp256k1.ctx, pubkey_ptr, pubkey, len(pubkey)
    )
    if not ret:
        raise InvalidECPointException("public key could not be parsed or is invalid")

    pubkey_serialized = create_string_buffer(65)
    pubkey_size = c_size_t(65)
    secp256k1.secp256k1_ec_pubkey_serialize(
        secp256k1.ctx,
        pubkey_serialized,
        byref(pubkey_size),
        pubkey_ptr,
        SECP256K1_EC_UNCOMPRESSED,
    )
    pubkey_serialized = bytes(pubkey_serialized)
    assert pubkey_serialized[0] == 0x04, pubkey_serialized
    x = int.from_bytes(pubkey_serialized[1:33], byteorder="big", signed=False)
    y = int.from_bytes(pubkey_serialized[33:65], byteorder="big", signed=False)
    return x, y


def sig_string_from_der_sig(der_sig) -> bytes:
    r, s = get_r_and_s_from_der_sig(der_sig)
    return sig_string_from_r_and_s(r, s)


def der_sig_from_sig_string(sig_string: bytes) -> bytes:
    r, s = get_r_and_s_from_sig_string(sig_string)
    return der_sig_from_r_and_s(r, s)


def der_sig_from_r_and_s(r: int, s: int) -> bytes:
    sig_string = int.to_bytes(r, length=32, byteorder="big") + int.to_bytes(
        s, length=32, byteorder="big"
    )
    sig = create_string_buffer(64)
    ret = secp256k1.secp256k1_ecdsa_signature_parse_compact(
        secp256k1.ctx, sig, sig_string
    )
    if not ret:
        raise Exception("Bad signature")
    ret = secp256k1.secp256k1_ecdsa_signature_normalize(secp256k1.ctx, sig, sig)
    der_sig = create_string_buffer(80)  # this much space should be enough
    der_sig_size = c_size_t(len(der_sig))
    ret = secp256k1.secp256k1_ecdsa_signature_serialize_der(
        secp256k1.ctx, der_sig, byref(der_sig_size), sig
    )
    if not ret:
        raise Exception("failed to serialize DER sig")
    der_sig_size = der_sig_size.value
    return bytes(der_sig)[:der_sig_size]


def get_r_and_s_from_raw_sig(sig: Array[c_char]) -> Tuple[int, int]:
    secp256k1.secp256k1_ecdsa_signature_normalize(secp256k1.ctx, sig, sig)
    compact_signature = create_string_buffer(64)
    secp256k1.secp256k1_ecdsa_signature_serialize_compact(
        secp256k1.ctx, compact_signature, sig
    )
    r = int.from_bytes(compact_signature[:32], byteorder="big")
    s = int.from_bytes(compact_signature[32:], byteorder="big")
    return r, s


def get_r_and_s_from_der_sig(der_sig: bytes) -> Tuple[int, int]:
    assert isinstance(der_sig, bytes)
    sig = create_string_buffer(64)
    ret = secp256k1.secp256k1_ecdsa_signature_parse_der(
        secp256k1.ctx, sig, der_sig, len(der_sig)
    )
    if not ret:
        raise Exception("Bad signature")
    return get_r_and_s_from_raw_sig(sig)


def get_r_and_s_from_sig_string(sig_string: bytes) -> Tuple[int, int]:
    if not (isinstance(sig_string, bytes) and len(sig_string) == 64):
        raise Exception("sig_string must be bytes, and 64 bytes exactly")
    sig = create_string_buffer(64)
    ret = secp256k1.secp256k1_ecdsa_signature_parse_compact(
        secp256k1.ctx, sig, sig_string
    )
    if not ret:
        raise Exception("Bad signature")
    return get_r_and_s_from_raw_sig(sig)


def sig_string_from_r_and_s(r: int, s: int) -> bytes:
    sig_string = int.to_bytes(r, length=32, byteorder="big") + int.to_bytes(
        s, length=32, byteorder="big"
    )
    sig = create_string_buffer(64)
    ret = secp256k1.secp256k1_ecdsa_signature_parse_compact(
        secp256k1.ctx, sig, sig_string
    )
    if not ret:
        raise Exception("Bad signature")
    ret = secp256k1.secp256k1_ecdsa_signature_normalize(secp256k1.ctx, sig, sig)
    compact_signature = create_string_buffer(64)
    secp256k1.secp256k1_ecdsa_signature_serialize_compact(
        secp256k1.ctx, compact_signature, sig
    )
    return bytes(compact_signature)


class EcCoordinates(NamedTuple):
    x: int
    y: int


class InvalidECPointException(Exception):
    """e.g. not on curve, or infinity"""


class ECPubkey(object):

    def __init__(self, b: Optional[bytes]):
        self._x, self._y = None, None
        if b is not None:
            assert_bytes(b)
            self._x, self._y = _x_and_y_from_pubkey_bytes(b)

    @classmethod
    def from_sig_string(cls, sig_string: bytes, recid: int, msg_hash: bytes):
        assert_bytes(sig_string)
        if len(sig_string) != 64:
            raise Exception("Wrong encoding")
        if not (0 <= recid <= 3):
            raise ValueError(f"recid is {recid}, but should be 0 <= recid <= 3")
        sig65 = create_string_buffer(65)
        ret = secp256k1.secp256k1_ecdsa_recoverable_signature_parse_compact(
            secp256k1.ctx, sig65, sig_string, recid
        )
        if not ret:
            raise Exception("failed to parse signature")
        pubkey = create_string_buffer(64)
        ret = secp256k1.secp256k1_ecdsa_recover(secp256k1.ctx, pubkey, sig65, msg_hash)
        if not ret:
            raise InvalidECPointException("failed to recover public key")
        return ECPubkey._from_libsecp256k1_pubkey_ptr(pubkey)

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
    def from_x_and_y(cls, x: int, y: int) -> ECPubkey:
        _bytes = (
            b"\x04"
            + int.to_bytes(x, length=32, byteorder="big", signed=False)
            + int.to_bytes(y, length=32, byteorder="big", signed=False)
        )
        return ECPubkey(_bytes)

    def get_public_key_bytes(self, compressed=True):
        if self.is_at_infinity():
            raise InvalidECPointException("point is at infinity")
        x = int.to_bytes(self.x(), length=32, byteorder="big", signed=False)
        y = int.to_bytes(self.y(), length=32, byteorder="big", signed=False)
        if compressed:
            header = b"\x03" if self.y() & 1 else b"\x02"
            return header + x
        else:
            header = b"\x04"
            return header + x + y

    def get_public_key_hex(self, compressed=True):
        return self.get_public_key_bytes(compressed).hex()

    def point(self) -> EcCoordinates:
        return EcCoordinates(self.x(), self.y())

    def x(self) -> int:
        return self._x

    def y(self) -> int:
        return self._y

    def _to_libsecp256k1_pubkey_ptr(self):
        pubkey = create_string_buffer(64)
        public_pair_bytes = self.get_public_key_bytes(compressed=False)
        ret = secp256k1.secp256k1_ec_pubkey_parse(
            secp256k1.ctx, pubkey, public_pair_bytes, len(public_pair_bytes)
        )
        if not ret:
            raise Exception("public key could not be parsed or is invalid")
        return pubkey

    @classmethod
    def _from_libsecp256k1_pubkey_ptr(cls, pubkey) -> ECPubkey:
        pubkey_serialized = create_string_buffer(65)
        pubkey_size = c_size_t(65)
        secp256k1.secp256k1_ec_pubkey_serialize(
            secp256k1.ctx,
            pubkey_serialized,
            byref(pubkey_size),
            pubkey,
            SECP256K1_EC_UNCOMPRESSED,
        )
        return ECPubkey(bytes(pubkey_serialized))

    def __mul__(self, other: int):
        if not isinstance(other, int):
            raise TypeError(
                f"multiplication not defined for ECPubkey and {type(other)}"
            )
        other %= CURVE_ORDER
        if self.is_at_infinity() or other == 0:
            return POINT_AT_INFINITY
        pubkey = self._to_libsecp256k1_pubkey_ptr()

        ret = secp256k1.secp256k1_ec_pubkey_tweak_mul(
            secp256k1.ctx, pubkey, other.to_bytes(32, byteorder="big")
        )
        if not ret:
            return POINT_AT_INFINITY
        return ECPubkey._from_libsecp256k1_pubkey_ptr(pubkey)

    def __rmul__(self, other: int):
        return self * other

    def __add__(self, other):
        if not isinstance(other, ECPubkey):
            raise TypeError(f"addition not defined for ECPubkey and {type(other)}")
        if self.is_at_infinity():
            return other
        if other.is_at_infinity():
            return self

        pubkey1 = self._to_libsecp256k1_pubkey_ptr()
        pubkey2 = other._to_libsecp256k1_pubkey_ptr()
        pubkey_sum = create_string_buffer(64)

        pubkey1 = cast(pubkey1, c_char_p)
        pubkey2 = cast(pubkey2, c_char_p)
        array_of_pubkey_ptrs = (c_char_p * 2)(pubkey1, pubkey2)
        ret = secp256k1.secp256k1_ec_pubkey_combine(
            secp256k1.ctx, pubkey_sum, array_of_pubkey_ptrs, 2
        )
        if not ret:
            return POINT_AT_INFINITY
        return ECPubkey._from_libsecp256k1_pubkey_ptr(pubkey_sum)

    def __eq__(self, other) -> bool:
        if not isinstance(other, ECPubkey):
            return False
        return self.point() == other.point()

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
        if not (isinstance(msg_hash, bytes) and len(msg_hash) == 32):
            return False

        sig = create_string_buffer(64)
        ret = secp256k1.secp256k1_ecdsa_signature_parse_compact(
            secp256k1.ctx, sig, sig_string
        )
        if not ret:
            raise Exception("Bad signature")
        ret = secp256k1.secp256k1_ecdsa_signature_normalize(secp256k1.ctx, sig, sig)

        pubkey = self._to_libsecp256k1_pubkey_ptr()
        return 1 == secp256k1.secp256k1_ecdsa_verify(
            secp256k1.ctx, sig, msg_hash, pubkey
        )

    def encrypt_message(self, message: bytes, magic=b"BIE1"):
        """
        ECIES encryption/decryption methods; AES-128-CBC with PKCS7 is used as the
         cipher; hmac-sha256 is used as the mac
        """
        assert_bytes(message)

        ephemeral_exponent = int.to_bytes(
            randrange(CURVE_ORDER),
            length=PRIVATE_KEY_BYTECOUNT,
            byteorder="big",
            signed=False,
        )
        ephemeral = ECPrivkey(ephemeral_exponent)
        ecdh_key = (self * ephemeral.secret_scalar).get_public_key_bytes(
            compressed=True
        )

        key = hashlib.sha512(ecdh_key).digest()
        iv, key_e, key_m = key[0:16], key[16:32], key[32:]
        ciphertext = aes_encrypt_with_iv(key_e, iv, message)
        ephemeral_pubkey = ephemeral.get_public_key_bytes(compressed=True)
        encrypted = magic + ephemeral_pubkey + ciphertext
        mac = hmac.new(key_m, encrypted, hashlib.sha256).digest()

        return base64.b64encode(encrypted + mac)

    @classmethod
    def order(cls):
        return CURVE_ORDER

    def is_at_infinity(self):
        return self == POINT_AT_INFINITY


GENERATOR = ECPubkey(
    bytes.fromhex(
        "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
        "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
    )
)

POINT_AT_INFINITY = ECPubkey(None)


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


def is_secret_within_curve_range(secret: Union[int, bytes]) -> bool:
    if isinstance(secret, bytes):
        secret = be_bytes_to_number(secret)
    return 0 < secret < CURVE_ORDER


class ECPrivkey(ECPubkey):
    def __init__(self, privkey_bytes: bytes):
        assert_bytes(privkey_bytes)
        if len(privkey_bytes) != PRIVATE_KEY_BYTECOUNT:
            raise Exception(
                f"unexpected size for secret. should be {PRIVATE_KEY_BYTECOUNT} bytes, "
                f"not {len(privkey_bytes)}"
            )

        secret = be_bytes_to_number(privkey_bytes)
        if not is_secret_within_curve_range(secret):
            raise InvalidECPointException(
                "Invalid secret scalar (not within curve order)"
            )
        self.secret_scalar = secret

        pubkey = GENERATOR * secret
        super().__init__(pubkey.get_public_key_bytes(compressed=False))

    @classmethod
    def from_secret_scalar(cls, secret_scalar: int):
        secret_bytes = int.to_bytes(
            secret_scalar, length=PRIVATE_KEY_BYTECOUNT, byteorder="big", signed=False
        )
        return ECPrivkey(secret_bytes)

    @classmethod
    def from_arbitrary_size_secret(cls, privkey_bytes: bytes):
        """This method is only for wallet file encryption using arbitrary password data.
        Do not introduce new code that uses it.
        Unlike the default constructor, this method does not verify the privkey's length
        and the secret does not need to be within the curve order either.
        """
        return ECPrivkey(cls.normalize_secret_bytes(privkey_bytes))

    @classmethod
    def normalize_secret_bytes(cls, privkey_bytes: bytes) -> bytes:
        scalar = be_bytes_to_number(privkey_bytes) % CURVE_ORDER
        if scalar == 0:
            raise Exception("invalid EC private key scalar: zero")
        privkey_32bytes = int.to_bytes(
            scalar, length=PRIVATE_KEY_BYTECOUNT, byteorder="big", signed=False
        )
        return privkey_32bytes

    def sign(
        self,
        msg_hash: bytes,
        sigencode: Callable[[int, int], bytes],
    ) -> bytes:
        privkey_bytes = self.secret_scalar.to_bytes(32, byteorder="big")
        nonce_function = None
        sig = create_string_buffer(64)

        def sign_with_extra_entropy(extra_entropy):
            ret = secp256k1.secp256k1_ecdsa_sign(
                secp256k1.ctx,
                sig,
                msg_hash,
                privkey_bytes,
                nonce_function,
                extra_entropy,
            )
            if not ret:
                raise Exception(
                    "the nonce generation function failed, or the private key was invalid"
                )
            compact_signature = create_string_buffer(64)
            secp256k1.secp256k1_ecdsa_signature_serialize_compact(
                secp256k1.ctx, compact_signature, sig
            )
            r = int.from_bytes(compact_signature[:32], byteorder="big")
            s = int.from_bytes(compact_signature[32:], byteorder="big")
            return r, s

        r, s = sign_with_extra_entropy(extra_entropy=None)
        # grind for low R value https://github.com/bitcoin/bitcoin/pull/13666
        counter = 0
        while r >= 2**255:
            counter += 1
            extra_entropy = counter.to_bytes(32, byteorder="little")
            r, s = sign_with_extra_entropy(extra_entropy=extra_entropy)

        sig_string = sig_string_from_r_and_s(r, s)
        self.verify_message_hash(sig_string, msg_hash)

        sig = sigencode(r, s)
        return sig

    def sign_transaction(self, hashed_preimage):
        return self.sign(
            hashed_preimage,
            sigencode=der_sig_from_r_and_s,
        )

    def sign_message(
        self,
        message: bytes,
        is_compressed,
        *,
        sigtype: SignatureType = SignatureType.ECASH,
    ) -> bytes:

        def bruteforce_recid(sig_string):
            for recid in range(4):
                sig65 = construct_sig65(sig_string, recid, is_compressed)
                if not self.verify_message(sig65, message, sigtype=sigtype):
                    continue
                return sig65, recid
            else:
                raise Exception("error: cannot sign message. no recid fits..")

        message = to_bytes(message, "utf8")
        msg_hash = Hash(msg_magic(message, sigtype))
        sig_string = self.sign(
            msg_hash,
            sigencode=sig_string_from_r_and_s,
        )
        sig65, recid = bruteforce_recid(sig_string)
        return sig65

    def decrypt_message(self, encrypted, magic=b"BIE1"):
        encrypted = base64.b64decode(encrypted)
        if len(encrypted) < 85:
            raise Exception("invalid ciphertext: length")
        magic_found = encrypted[:4]
        ephemeral_pubkey_bytes = encrypted[4:37]
        ciphertext = encrypted[37:-32]
        mac = encrypted[-32:]
        if magic_found != magic:
            raise Exception("invalid ciphertext: invalid magic bytes")
        try:
            ephemeral_pubkey = ECPubkey(ephemeral_pubkey_bytes)
        except AssertionError:
            raise Exception("invalid ciphertext: invalid ephemeral pubkey")
        ecdh_key = (ephemeral_pubkey * self.secret_scalar).get_public_key_bytes(
            compressed=True
        )
        key = hashlib.sha512(ecdh_key).digest()
        iv, key_e, key_m = key[0:16], key[16:32], key[32:]
        if mac != hmac.new(key_m, encrypted[:-32], hashlib.sha256).digest():
            raise InvalidPassword()
        return aes_decrypt_with_iv(key_e, iv, ciphertext)


def construct_sig65(sig_string, recid, is_compressed):
    comp = 4 if is_compressed else 0
    return bytes([27 + recid + comp]) + sig_string
