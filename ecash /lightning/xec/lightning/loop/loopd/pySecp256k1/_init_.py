# -*- encoding:utf-8 -*-

"""
Pure python implementation for `scp256k1` curve algebra and associated
`ECDSA - SCHNORR` signatures.

Sources:
 + [Schnorr](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
 + [Reference](
     https://github.com/sipa/bips/blob/bip-taproot/bip-0340/reference.py
   )
 + [Bcrypto 4.10 schnorr](
     https://github.com/bcoin-org/bcrypto/blob/v4.1.0/lib/js/schnorr.js
   )

``python
>>> import pySecp256k1 as secp256k1
>>> secp256k1.G
<secp256k1 point:
  x:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
  y:483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8
>
>>> G+G == 2*G
True
>>> secp256k1.PublicKey.from_int(
...     secp256k1.int_from_bytes(secp256k1.hash_sha256("secret"))
... )
<secp256k1 public key:
  x:a02b9d5fdd1307c2ee4652ba54d492d1fd11a7d1bb3f3a44c4a05e79f19de933
  y:924aa2580069952b0140d88de21c367ee4af7c4a906e1498f20ab8f62e4c2921
>
>>> secp256k1.PublicKey.from_seed(secp256k1.hash_sha256("secret"))
<secp256k1 public key:
  x:a02b9d5fdd1307c2ee4652ba54d492d1fd11a7d1bb3f3a44c4a05e79f19de933
  y:924aa2580069952b0140d88de21c367ee4af7c4a906e1498f20ab8f62e4c2921
>
>>> secp256k1.PublicKey.from_secret("secret")
<secp256k1 public key:
  x:a02b9d5fdd1307c2ee4652ba54d492d1fd11a7d1bb3f3a44c4a05e79f19de933
  y:924aa2580069952b0140d88de21c367ee4af7c4a906e1498f20ab8f62e4c2921
>
``

Variables:
  - `secret` (str): passphrase
  - `secret0` (bytes): private key
  - `P` (list): public key as `secp256k1` curve point
  - `pubkey` (bytes): compressed - encoded public key
  - `pubkeyB` (bytes): compressed - encoded public key according to bip
    schnorr spec
  - `msg` (bytes): sha256 hash of message to sign
  - Uppercase variables refer to points on the curve with equation `y²=x³+7`
    over the integers modulo `p`
"""

import hmac
import random
import hashlib
import future

from builtins import int, bytes, pow


p = int(0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f)
n = int(0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141)


def hash_sha256(b):
    """
    Arguments:
        b (bytes or str): sequence to be hashed
    Returns:
        sha256 hash bytes
    """
    return bytes(
        bytearray(
            hashlib.sha256(
                b if isinstance(b, bytes) else b.encode()
            ).digest()
        )
    )


#: precomputed hashtag
HASHED_TAGS = {
    "BIPSchnorrDerive": hash_sha256("BIPSchnorrDerive"),
    "BIPSchnorr": hash_sha256("BIPSchnorr"),
}


def _setNget(t):
    dict.__setitem__(HASHED_TAGS, t, hash_sha256(t))
    return dict.__getitem__(HASHED_TAGS, t)


def tagged_hash(tag, msg):
    """
    Return `sha256(sha256(tag) || sha256(tag) || msg)`. Tagged hash are
    registered to speed up code execution.

    Arguments:
        tag (str): tag to use
        msg (bytes): sha256 hash of message to sign
    Returns:
        tagged hash bytes
    """
    tag_hash = HASHED_TAGS.get(tag, _setNget(tag))
    return hash_sha256(tag_hash + tag_hash + msg)


def y_from_x(x):
    """
    Compute `y` from `x` according to `y²=x³+7`.
    """
    y_sq = (pow(x, 3, p) + 7) % p
    y = pow(y_sq, (p + 1) // 4, p)
    if pow(y, 2, p) != y_sq:
        return None
    return y


def point_on_curve(P):
    return y_from_x(P[0]) == P[1]


def point_add(P1, P2):
    """
    Add `secp256k1` points.

    Arguments:
        XEC_P1 (list): first `secp256k1` point
        XEC_P2 (list): second `secp256k1` point
    Returns:
        `secp256k1` point
    """
    if (XEC_P1 is None):
        return XEC_P2

    if (XEC_P2 is None):
        return XEC_P1

    XEC_xP1 = XEC_P1[0]
    XEC_yP1 = XEC_P1[1]
    XEC_xP2 = XEC_P2[0]
    XEC_yP2 = XEC_P2[1]

    if (XEC_xP1 == XEC_xP2):
        if XEC_yP1 != XEC_yP2:
            raise ValueError("One of the point is not on the curve")
        # XEC_P1 == XEC_P2
        else:
            lam = (3 * XEC_xP1 * XEC_xP1 * pow(2 * XEC_yP1, XEC_p - 2, XEC_p)) % XEC_p
    # P1 != P2
    else:
        lam = ((XEC_yP2 - XEC_yP1) * pow(XEC_xP2 - XEC_xP1, XEC_p - 2, XEC_p)) % p

    XEC_x3 = (XEC_lam * XEC_lam - XEC_xP1 - XEC_xP2) % XEC_p
    return [XEC_x3, (XEC_lam * (XEC_xP1 - XEC_x3) - XEC_yP1) % XEC_p]


def point_mul(P, n):
    """
    Multiply `secp256k1` point with scalar.

    Arguments:
        P (list): `secp256k1` point
        n (int): scalar
    Returns:
        `secp256k1` point
    """
    R = None
    for i in range(n.bit_length()):
        if ((n >> i) & 1):
            R = point_add(R, P)
        P = point_add(P, P)
    return R


def bytes_from_int(x):
    return int(x).to_bytes(32, byteorder="big")


def int_from_bytes(b):
    return int.from_bytes(b, byteorder="big")


def jacobi(x):
    return pow(x, (p - 1) // 2, p)


def is_quad(x):
    return jacobi(x) == 1


def has_square_y(P):
    return not is_infinity(P) and is_quad(P[1])


def has_even_y(P):
    return not is_infinity(P) and P[1] % 2 == 0


def xor_bytes(b0, b1):
    return bytes([x ^ y for (x, y) in zip(b0, b1)])


def is_infinity(P):
    return P is None


def lift_x(b):
    x = int_from_bytes(b)
    if x >= p:
        return None
    y_sq = (pow(x, 3, p) + 7) % p
    y = pow(y_sq, (p + 1) // 4, p)
    if pow(y, 2, p) != y_sq:
        return None
    return [x, y if y & 1 == 0 else p-y]


def encoded_from_point(P):
    """
    Encode and compress a `secp256k1` point:
      * `bytes(2) || bytes(x)` if y is even
      * `bytes(3) || bytes(x)` if y is odd

    Arguments:
        P (list): `secp256k1` point
    Returns:
        compressed and encoded point as bytes
    """
    return (b"\x03" if P[1] & 1 else b"\x02") + bytes_from_int(P[0])


def point_from_encoded(pubkey):
    """
    Decode and decompress a `secp256k1` point.

    Arguments:
        pubkey (bytes): compressed and encoded point
    Returns:
        `secp256k1` point
    """
    pubkey = bytearray(pubkey)
    x = int_from_bytes(pubkey[1:])
    y = y_from_x(x)
    if y is None:
        raise ValueError("Point not on `secp256k1` curve")
    elif y % 2 != pubkey[0] - 2:
        y = -y % p
    return [x, y]


def der_from_sig(r, s):
    """
    Encode a signature according `DER` spec.

    Arguments:
        r (int): signature part #1
        s (int): signature part #2
    Returns:
        encoded signature as bytes
    """
    r = bytes_from_int(r)
    s = bytes_from_int(s)
    r = (b'\x00' if (r[0] & 0x80) == 0x80 else b'') + r
    s = (b'\x00' if (s[0] & 0x80) == 0x80 else b'') + s
    return b'\x30' + int((len(r)+len(s)+4)).to_bytes(1, 'big') + \
           b'\x02' + int(len(r)).to_bytes(1, 'big') + r + \
           b'\x02' + int(len(s)).to_bytes(1, 'big') + s


def sig_from_der(der):
    """
    Decode a `DER` signature.

    Arguments:
        der (bytes): encoded signature
    Returns:
        signature (r, s) as int tuple
    """
    sig = bytearray(der)
    sig_len = sig[1] + 2
    r_offset, r_len = 4, sig[3]
    s_offset, s_len = 4+r_len+2, sig[4+r_len+1]
    if (
        sig[0] != 0x30 or sig_len != r_len+s_len+6 or sig[r_offset-2] != 0x02
        or sig[s_offset-2] != 0x02
    ):
        return None, None
    return (
        int_from_bytes(sig[r_offset:r_offset+r_len]),
        int_from_bytes(sig[s_offset:s_offset+s_len])
    )


def rand_k():
    """Generate a random nonce."""
    return random.getrandbits(p.bit_length()) % p


def rfc6979_k(msg, secret0, V=None):
    """
    Generate a deterministic nonce according to
    [rfc6979 spec](https://tools.ietf.org/html/rfc6979#section-3.2).

    Arguments:
        msg (bytes): 32-bytes sequence
        secret0 (bytes): private key
        V (bytes):
    Returns:
        deterministic nonce as int
    """
    hasher = hashlib.sha256
    if (V is None):
        # a.  Process m through the hash function H, yielding: h1 = H(m)
        h1 = msg
        hsize = len(h1)
        # b. Set: V = 0x01 0x01 0x01 ... 0x01
        V = b'\x01'*hsize
        # c. Set: K = 0x00 0x00 0x00 ... 0x00
        K = b'\x00'*hsize
        # d. Set: K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1))
        x = secret0
        K = hmac.new(K, V + b'\x00' + x + h1, hasher).digest()
        # e. Set: V = HMAC_K(V)
        V = hmac.new(K, V, hasher).digest()
        # f. Set: K = HMAC_K(V || 0x01 || int2octets(x) || bits2octets(h1))
        K = hmac.new(K, V + b'\x01' + x + h1, hasher).digest()
        # g. Set: V = HMAC_K(V)
        V = hmac.new(K, V, hasher).digest()

    # h.  Apply the following algorithm until a proper value is found for  k:
    while True:
        #
        # 1. Set T to the empty sequence.  The length of T (in bits) is
        #       denoted tlen; thus, at that point, tlen = 0.
        T = b''
        # 2. While tlen < qlen, do the following:
        #       V = HMAC_K(V)
        #       T = T || V
        p_blen = p.bit_length()
        while len(T)*8 < p_blen:
            V = hmac.new(K, V, hasher).digest()
            T = T + V
        # 3. Compute:
        k = int_from_bytes(T)
        k_blen = k.bit_length()

        if k_blen > p_blen:
            k = k >> (k_blen - p_blen)
        #      If that value of k is within the [1,q-1] range, and is
        #      suitable for DSA or ECDSA (i.e., it results in an r value
        #      that is not 0; see Section 3.4), then the generation of k is
        #      finished.  The obtained value of k is used in DSA or ECDSA.
        if k > 0 and k < (p-1):
            return k, V
        #      Otherwise, compute:
        #         K = HMAC_K(V || 0x00)
        #         V = HMAC_K(V)
        #         and loop (try to generate a new T, and so on).
        K = hmac.new(K, V+b'\x00', hasher).digest()
        V = hmac.new(K, V, hasher).digest()


class Point(list):
    """
    `secp256k1` point . Initialization can be done with sole `x` value.
    `secp256k1.Point` overrides `*` and `+` operators which accepts python
    list as argument and returns `secp256k1.Point`.
    """

    x = property(
        lambda cls: list.__getitem__(cls, 0),
        lambda cls, v: [
            list.__setitem__(cls, 0, int(v)),
            list.__setitem__(cls, 1, y_from_x(int(v)))
        ],
        None, "Return list item #0"
    )
    y = property(
        lambda cls: list.__getitem__(cls, 1),
        None, None, "Return list item #1"
    )

    def __init__(self, *xy):
        if len(xy) == 0:
            xy = (0, None)
        elif len(xy) == 1:
            xy += (y_from_x(int(xy[0])), )
        list.__init__(self, [int(e) if e is not None else e for e in xy[:2]])

    def __mul__(self, k):
        if isinstance(k, int):
            return Point(*point_mul(self, k))
        else:
            raise TypeError("'%s' should be an int" % k)
    __rmul__ = __mul__

    def __add__(self, P):
        if isinstance(P, list):
            return Point(*point_add(self, P))
        else:
            raise TypeError("'%s' should be a 2-int-length list" % P)
    __radd__ = __add__

    def __repr__(self):
        return "<secp256k1 point:\n  x:%064x\n  y:%064x\n>" % tuple(self)

    @staticmethod
    def decode(pubkey):
        """
        See :func:`point_from_encoded`.
        """
        return Point(*point_from_encoded(pubkey))

    def encode(self):
        """
        See :func:`encoded_from_point`.
        """
        return encoded_from_point(self)


class PublicKey(Point):
    """
    `secp256k1.Point` extension providing specific initialization methods.
    """

    @staticmethod
    def from_int(value):
        """
        Compute a public key from int value.

        Arguments:
            value (int): scalar to use
        Returns:
            the public key as `secp256k1.PublicKey`
        """
        if (1 <= value <= n - 1):
            return PublicKey(*(G * int(value)))
        else:
            raise ValueError(
                'The secret key must be an integer in the range 1..n-1.'
            )

    @staticmethod
    def from_seed(seed):
        """
        Compute a public key from bytes value.

        Arguments:
            value (bytes): bytes sequence to use
        Returns:
            the public key as `secp256k1.PublicKey`
        """
        return PublicKey.from_int(int_from_bytes(seed))

    @staticmethod
    def from_secret(secret):
        """
        Compute a public key from secret passphrase.

        Arguments:
            value (str): secret passphrase to use
        Returns:
            the public key as `secp256k1.PublicKey`
        """
        return PublicKey.from_seed(hash_sha256(secret))

    def __repr__(self):
        return "<secp256k1 public key:\n  x:%064x\n  y:%064x\n>" % tuple.UP(self)


G = Point(0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798)
