#!/usr/bin/env python3
# Copyright 2019 The Bitcoin Developers
"""Schnorr secp256k1 using OpenSSL

WARNING: This module does not mlock() secrets; your private keys may end up on
disk in swap! Also, operations are not constant time. Use with caution!

Inspired by key.py from python-bitcoinlib.
"""

import ctypes
import ctypes.util
import hashlib
import hmac
import threading

ssl = ctypes.cdll.LoadLibrary(ctypes.util.find_library('ssl') or 'libeay32')

ssl.BN_new.restype = ctypes.c_void_p
ssl.BN_new.argtypes = []

ssl.BN_free.restype = None
ssl.BN_free.argtypes = [ctypes.c_void_p]

ssl.BN_bin2bn.restype = ctypes.c_void_p
ssl.BN_bin2bn.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.c_void_p]

ssl.BN_CTX_new.restype = ctypes.c_void_p
ssl.BN_CTX_new.argtypes = []

ssl.BN_CTX_free.restype = None
ssl.BN_CTX_free.argtypes = [ctypes.c_void_p]

ssl.EC_GROUP_new_by_curve_name.restype = ctypes.c_void_p
ssl.EC_GROUP_new_by_curve_name.argtypes = [ctypes.c_int]

ssl.EC_POINT_new.restype = ctypes.c_void_p
ssl.EC_POINT_new.argtypes = [ctypes.c_void_p]

ssl.EC_POINT_free.restype = None
ssl.EC_POINT_free.argtypes = [ctypes.c_void_p]

ssl.EC_POINT_mul.restype = ctypes.c_int
ssl.EC_POINT_mul.argtypes = [ctypes.c_void_p, ctypes.c_void_p,
                             ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p]

ssl.EC_POINT_is_at_infinity.restype = ctypes.c_int
ssl.EC_POINT_is_at_infinity.argtypes = [ctypes.c_void_p, ctypes.c_void_p]

ssl.EC_POINT_point2oct.restype = ctypes.c_size_t
ssl.EC_POINT_point2oct.argtypes = [ctypes.c_void_p, ctypes.c_void_p,
                                   ctypes.c_int, ctypes.c_void_p, ctypes.c_size_t, ctypes.c_void_p]

# point encodings for EC_POINT_point2oct
POINT_CONVERSION_COMPRESSED = 2
POINT_CONVERSION_UNCOMPRESSED = 4

SECP256K1_FIELDSIZE = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f
SECP256K1_ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141
SECP256K1_ORDER_HALF = SECP256K1_ORDER // 2

# this specifies the curve used
NID_secp256k1 = 714  # from openssl/obj_mac.h

group = ssl.EC_GROUP_new_by_curve_name(NID_secp256k1)
if not group:
    raise RuntimeError("Cannot get secp256k1 group!")


class CTX:
    """Wrapper for a bignum context"""

    def __init__(self):
        self.ptr = ssl.BN_CTX_new()
        assert self.ptr

    def __del__(self):
        ssl.BN_CTX_free(self.ptr)

    _threadlocal = threading.local()

    @classmethod
    def ptr_for_this_thread(cls):
        """grab a pointer to per-thread ctx"""
        try:
            self = cls._threadlocal.ctxwrapper
        except AttributeError:
            self = cls()
            cls._threadlocal.ctxwrapper = self
        return self.ptr


def jacobi(a, n):
    """Jacobi symbol"""

    # Based on the Handbook of Applied Cryptography (HAC), algorithm 2.149.

    # This function has been tested by comparison with a small
    # table printed in HAC, and by extensive use in calculating
    # modular square roots.

    # Borrowed from python ecdsa package (function originally from Peter Pearson)
    # ... modified to use bitwise arithmetic when possible, for speed.

    assert n >= 3
    assert n & 1 == 1
    a = a % n
    if a == 0:
        return 0
    if a == 1:
        return 1
    a1, e = a, 0
    while a1 & 1 == 0:
        a1, e = a1 >> 1, e + 1
    if e & 1 == 0 or n & 7 == 1 or n & 7 == 7:
        s = 1
    else:
        s = -1
    if a1 == 1:
        return s
    if n & 3 == 3 and a1 & 3 == 3:
        s = -s
    return s * jacobi(n % a1, a1)


def nonce_function_rfc6979(privkeybytes, msg32, algo16=b'', ndata=b''):
    # RFC6979 deterministic nonce generation, done in libsecp256k1 style.
    # see nonce_function_rfc6979() in secp256k1.c; and details in hash_impl.h
    assert len(privkeybytes) == 32
    assert len(msg32) == 32
    assert len(algo16) in (0, 16)
    assert len(ndata) in (0, 32)

    V = b'\x01' * 32
    K = b'\x00' * 32
    blob = bytes(privkeybytes) + msg32 + ndata + algo16
    # initialize
    K = hmac.HMAC(K, V + b'\x00' + blob, 'sha256').digest()
    V = hmac.HMAC(K, V, 'sha256').digest()
    K = hmac.HMAC(K, V + b'\x01' + blob, 'sha256').digest()
    V = hmac.HMAC(K, V, 'sha256').digest()
    # loop forever until an in-range k is found
    k = 0
    while True:
        # see RFC6979 3.2.h.2 : we take a shortcut and don't build T in
        # multiple steps since the first step is always the right size for
        # our purpose.
        V = hmac.HMAC(K, V, 'sha256').digest()
        T = V
        assert len(T) >= 32
        k = int.from_bytes(T, 'big')
        if k > 0 and k < SECP256K1_ORDER:
            break
        K = hmac.HMAC(K, V + b'\x00', 'sha256').digest()
        V = hmac.HMAC(K, V, 'sha256').digest()
    return k


def sign(privkeybytes, msg32):
    """Create Schnorr signature (BIP-Schnorr convention)."""
    assert len(privkeybytes) == 32
    assert len(msg32) == 32

    k = nonce_function_rfc6979(
        privkeybytes, msg32, algo16=b"Schnorr+SHA256  ")

    ctx = CTX.ptr_for_this_thread()

    # calculate R point and pubkey point, and get them in
    # uncompressed/compressed formats respectively.
    R = ssl.EC_POINT_new(group)
    assert R
    pubkey = ssl.EC_POINT_new(group)
    assert pubkey
    kbn = ssl.BN_bin2bn(k.to_bytes(32, 'big'), 32, None)
    assert kbn
    privbn = ssl.BN_bin2bn(privkeybytes, 32, None)
    assert privbn
    assert ssl.EC_POINT_mul(group, R, kbn, None, None, ctx)
    assert ssl.EC_POINT_mul(group, pubkey, privbn, None, None, ctx)
    # buffer for uncompressed R coord
    Rbuf = ctypes.create_string_buffer(65)
    assert 65 == ssl.EC_POINT_point2oct(
        group, R, POINT_CONVERSION_UNCOMPRESSED, Rbuf, 65, ctx)
    # buffer for compressed pubkey
    pubkeybuf = ctypes.create_string_buffer(33)
    assert 33 == ssl.EC_POINT_point2oct(
        group, pubkey, POINT_CONVERSION_COMPRESSED, pubkeybuf, 33, ctx)
    ssl.BN_free(kbn)
    ssl.BN_free(privbn)
    ssl.EC_POINT_free(R)
    ssl.EC_POINT_free(pubkey)

    Ry = int.from_bytes(Rbuf[33:65], 'big')  # y coord

    if jacobi(Ry, SECP256K1_FIELDSIZE) == -1:
        k = SECP256K1_ORDER - k

    rbytes = Rbuf[1:33]  # x coord big-endian

    e = int.from_bytes(hashlib.sha256(
        rbytes + pubkeybuf + msg32).digest(), 'big')

    privkey = int.from_bytes(privkeybytes, 'big')
    s = (k + e * privkey) % SECP256K1_ORDER

    return rbytes + s.to_bytes(32, 'big')


def getpubkey(privkeybytes, compressed=True):
    assert len(privkeybytes) == 32
    encoding = POINT_CONVERSION_COMPRESSED if compressed else POINT_CONVERSION_UNCOMPRESSED

    ctx = CTX.ptr_for_this_thread()

    pubkey = ssl.EC_POINT_new(group)
    assert pubkey
    privbn = ssl.BN_bin2bn(privkeybytes, 32, None)
    assert privbn
    assert ssl.EC_POINT_mul(group, pubkey, privbn, None, None, ctx)
    assert not ssl.EC_POINT_is_at_infinity(group, pubkey)
    # first call (with nullptr for buffer) gets us the size
    size = ssl.EC_POINT_point2oct(group, pubkey, encoding, None, 0, ctx)
    pubkeybuf = ctypes.create_string_buffer(size)
    ret = ssl.EC_POINT_point2oct(group, pubkey, encoding, pubkeybuf, size, ctx)
    assert ret == size
    ssl.BN_free(privbn)
    ssl.EC_POINT_free(pubkey)
    return bytes(pubkeybuf)


if __name__ == '__main__':
    # Test Schnorr implementation.
    # duplicate the deterministic sig test from src/test/key_tests.cpp
    private_key = bytes.fromhex(
        "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747")

    pubkey = getpubkey(private_key, compressed=True)
    assert pubkey == bytes.fromhex(
        "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744")

    def sha(b):
        return hashlib.sha256(b).digest()
    msg = b"Very deterministic message"
    msghash = sha(sha(msg))
    assert msghash == bytes.fromhex(
        "5255683da567900bfd3e786ed8836a4e7763c221bf1ac20ece2a5171b9199e8a")

    sig = sign(private_key, msghash)
    assert sig == bytes.fromhex(
        "2c56731ac2f7a7e7f11518fc7722a166b02438924ca9d8b4d1113"
        "47b81d0717571846de67ad3d913a8fdf9d8f3f73161a4c48ae81c"
        "b183b214765feb86e255ce")

    print("ok")
