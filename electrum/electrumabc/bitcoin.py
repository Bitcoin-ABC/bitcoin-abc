# -*- coding: utf-8 -*-
# -*- mode: python3 -*-
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
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
import os
from enum import IntEnum
from typing import TYPE_CHECKING, Optional, Tuple, Union

import pyaes

from . import ecc, networks
from .crypto import Hash, hash_160, sha256
from .printerror import print_error
from .util import InvalidPassword, assert_bytes, bh2u, to_bytes

if TYPE_CHECKING:
    from .address import Address

# Ensure Python interpreter is not running with -O, since this entire
# codebase depends on "assert" not being a no-op.
try:
    assert False
except AssertionError:
    pass
else:
    import sys

    from .constants import PROJECT_NAME

    sys.exit(
        f'{PROJECT_NAME} uses "assert" statements for its normal control'
        ' flow.\nPlease run this application without the python "-O" '
        "(optimize) flag."
    )
# /End -O check

# transactions

FEE_STEP = 10000

COINBASE_MATURITY = 100
CASH = 100

# supported types of transction outputs
TYPE_ADDRESS = 0
TYPE_PUBKEY = 1
TYPE_SCRIPT = 2


# Derived from Bitcoin ABC src/script/script.h
class OpCodes(IntEnum):
    # push value
    OP_0 = 0x00
    OP_FALSE = OP_0
    OP_PUSHDATA1 = 0x4C
    OP_PUSHDATA2 = 0x4D
    OP_PUSHDATA4 = 0x4E
    OP_1NEGATE = 0x4F
    OP_RESERVED = 0x50
    OP_1 = 0x51
    OP_TRUE = OP_1
    OP_2 = 0x52
    OP_3 = 0x53
    OP_4 = 0x54
    OP_5 = 0x55
    OP_6 = 0x56
    OP_7 = 0x57
    OP_8 = 0x58
    OP_9 = 0x59
    OP_10 = 0x5A
    OP_11 = 0x5B
    OP_12 = 0x5C
    OP_13 = 0x5D
    OP_14 = 0x5E
    OP_15 = 0x5F
    OP_16 = 0x60

    # control
    OP_NOP = 0x61
    OP_VER = 0x62
    OP_IF = 0x63
    OP_NOTIF = 0x64
    OP_VERIF = 0x65
    OP_VERNOTIF = 0x66
    OP_ELSE = 0x67
    OP_ENDIF = 0x68
    OP_VERIFY = 0x69
    OP_RETURN = 0x6A

    # stack ops
    OP_TOALTSTACK = 0x6B
    OP_FROMALTSTACK = 0x6C
    OP_2DROP = 0x6D
    OP_2DUP = 0x6E
    OP_3DUP = 0x6F
    OP_2OVER = 0x70
    OP_2ROT = 0x71
    OP_2SWAP = 0x72
    OP_IFDUP = 0x73
    OP_DEPTH = 0x74
    OP_DROP = 0x75
    OP_DUP = 0x76
    OP_NIP = 0x77
    OP_OVER = 0x78
    OP_PICK = 0x79
    OP_ROLL = 0x7A
    OP_ROT = 0x7B
    OP_SWAP = 0x7C
    OP_TUCK = 0x7D

    # splice ops
    OP_CAT = 0x7E
    OP_SPLIT = 0x7F  # after monolith upgrade (May 2018)
    OP_NUM2BIN = 0x80  # after monolith upgrade (May 2018)
    OP_BIN2NUM = 0x81  # after monolith upgrade (May 2018)
    OP_SIZE = 0x82

    # bit logic
    OP_INVERT = 0x83
    OP_AND = 0x84
    OP_OR = 0x85
    OP_XOR = 0x86
    OP_EQUAL = 0x87
    OP_EQUALVERIFY = 0x88
    OP_RESERVED1 = 0x89
    OP_RESERVED2 = 0x8A

    # numeric
    OP_1ADD = 0x8B
    OP_1SUB = 0x8C
    OP_2MUL = 0x8D
    OP_2DIV = 0x8E
    OP_NEGATE = 0x8F
    OP_ABS = 0x90
    OP_NOT = 0x91
    OP_0NOTEQUAL = 0x92

    OP_ADD = 0x93
    OP_SUB = 0x94
    OP_MUL = 0x95
    OP_DIV = 0x96
    OP_MOD = 0x97
    OP_LSHIFT = 0x98
    OP_RSHIFT = 0x99

    OP_BOOLAND = 0x9A
    OP_BOOLOR = 0x9B
    OP_NUMEQUAL = 0x9C
    OP_NUMEQUALVERIFY = 0x9D
    OP_NUMNOTEQUAL = 0x9E
    OP_LESSTHAN = 0x9F
    OP_GREATERTHAN = 0xA0
    OP_LESSTHANOREQUAL = 0xA1
    OP_GREATERTHANOREQUAL = 0xA2
    OP_MIN = 0xA3
    OP_MAX = 0xA4

    OP_WITHIN = 0xA5

    # crypto
    OP_RIPEMD160 = 0xA6
    OP_SHA1 = 0xA7
    OP_SHA256 = 0xA8
    OP_HASH160 = 0xA9
    OP_HASH256 = 0xAA
    OP_CODESEPARATOR = 0xAB
    OP_CHECKSIG = 0xAC
    OP_CHECKSIGVERIFY = 0xAD
    OP_CHECKMULTISIG = 0xAE
    OP_CHECKMULTISIGVERIFY = 0xAF

    # expansion
    OP_NOP1 = 0xB0
    OP_CHECKLOCKTIMEVERIFY = 0xB1
    OP_NOP2 = OP_CHECKLOCKTIMEVERIFY
    OP_CHECKSEQUENCEVERIFY = 0xB2
    OP_NOP3 = OP_CHECKSEQUENCEVERIFY
    OP_NOP4 = 0xB3
    OP_NOP5 = 0xB4
    OP_NOP6 = 0xB5
    OP_NOP7 = 0xB6
    OP_NOP8 = 0xB7
    OP_NOP9 = 0xB8
    OP_NOP10 = 0xB9

    # More crypto
    OP_CHECKDATASIG = 0xBA
    OP_CHECKDATASIGVERIFY = 0xBB

    # additional byte string operations
    OP_REVERSEBYTES = 0xBC


class ScriptType(IntEnum):
    # Keep these attributes lowercase, it matters for code accessing the name.
    # Positive values are used for WIF key (de)serialization, negative values have no
    # particular meaning.
    p2pkh = 0
    p2sh = 5
    p2pk = -1
    coinbase = -2
    unknown = -3


class KeyIsBip38Error(ValueError):
    """Raised by deserialize_privkey to signify a key is a bip38 encrypted
    '6P' key."""


def op_push_bytes(data_len: int) -> bytes:
    assert isinstance(data_len, int) and data_len >= 0
    if data_len < OpCodes.OP_PUSHDATA1:
        return data_len.to_bytes(byteorder="little", length=1)
    elif data_len <= 0xFF:
        return bytes([OpCodes.OP_PUSHDATA1]) + data_len.to_bytes(
            byteorder="little", length=1
        )
    elif data_len <= 0xFFFF:
        return bytes([OpCodes.OP_PUSHDATA2]) + data_len.to_bytes(
            byteorder="little", length=2
        )
    else:
        return bytes([OpCodes.OP_PUSHDATA4]) + data_len.to_bytes(
            byteorder="little", length=4
        )


def op_push(i: int) -> str:
    """Hex version of above"""
    return op_push_bytes(i).hex()


def push_script_bytes(data: Union[bytearray, bytes], *, minimal=True) -> bytes:
    """Returns pushed data to the script, automatically respecting BIP62 "minimal encoding" rules.
    If `minimal` is False, will not use BIP62 and will just push using OP_PUSHDATA*, etc (this
    non-BIP62 way of pushing is the convention in OP_RETURN scripts such as CashAccounts usually).
    Input data is bytes, returns bytes."""
    assert isinstance(data, (bytes, bytearray))
    data_len = len(data)

    if minimal:
        # BIP62 has bizarre rules for minimal pushes of length 0 or 1
        # See: https://en.bitcoin.it/wiki/BIP_0062#Push_operators
        if data_len == 0 or data_len == 1 and data[0] == 0:
            return bytes([OpCodes.OP_0])
        elif data_len == 1 and 1 <= data[0] <= 16:
            return bytes([OpCodes.OP_1 + (data[0] - 1)])
        elif data_len == 1 and data[0] == 0x81:
            return bytes([OpCodes.OP_1NEGATE])

    return op_push_bytes(data_len) + data


def push_script(data: str, *, minimal=True) -> str:
    """Returns pushed data to the script, automatically respecting BIP62 "minimal encoding" rules.
    Input data is hex, returns hex."""
    return push_script_bytes(bytes.fromhex(data), minimal=minimal).hex()


def hmac_oneshot(key, msg, digest):
    """Params key, msg and return val are bytes.
    Digest is a hashlib algorithm, e.g. hashlib.sha512"""
    return hmac.digest(key, msg, digest)


def hash_encode(x):
    return bh2u(x[::-1])


def hash_decode(x):
    return bytes.fromhex(x)[::-1]


def hmac_sha_512(x, y):
    return hmac_oneshot(x, y, hashlib.sha512)


# pywallet openssl private key implementation


# end pywallet openssl private key implementation


def hash160_to_b58_address(h160, addrtype):
    s = bytes([addrtype])
    s += h160
    return base_encode(s + Hash(s)[0:4], base=58)


def b58_address_to_hash160(addr):
    addr = to_bytes(addr, "ascii")
    # will raise ValueError on bad characters
    _bytes = base_decode(addr, 25, base=58)
    return _bytes[0], _bytes[1:21]


def hash160_to_p2pkh(h160, *, net=None):
    if net is None:
        net = networks.net
    return hash160_to_b58_address(h160, net.ADDRTYPE_P2PKH)


def hash160_to_p2sh(h160, *, net=None):
    if net is None:
        net = networks.net
    return hash160_to_b58_address(h160, net.ADDRTYPE_P2SH)


def public_key_to_p2pkh(public_key: bytes, *, net=None):
    if net is None:
        net = networks.net
    return hash160_to_p2pkh(hash_160(public_key), net=net)


def pubkey_to_address(txin_type: ScriptType, pubkey: bytes, *, net=None):
    if net is None:
        net = networks.net
    if txin_type == ScriptType.p2pkh:
        return public_key_to_p2pkh(pubkey, net=net)
    raise NotImplementedError(txin_type)


def script_to_address(script: bytes) -> Address:
    from .transaction import get_address_from_output_script

    t, addr = get_address_from_output_script(script)
    assert t == TYPE_ADDRESS
    return addr


__b58chars = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
assert len(__b58chars) == 58

__b43chars = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:"
assert len(__b43chars) == 43


def base_encode(v, base) -> str:
    """encode v, which is a string of bytes, to base58."""
    assert_bytes(v)
    if base not in (58, 43):
        raise ValueError(f"not supported base: {base}")
    chars = __b58chars
    if base == 43:
        chars = __b43chars
    long_value = 0
    power_of_base = 1
    for c in v[::-1]:
        # naive but slow variant:   long_value += (256**i) * c
        long_value += power_of_base * c
        power_of_base <<= 8
    result = bytearray()
    while long_value >= base:
        div, mod = divmod(long_value, base)
        result.append(chars[mod])
        long_value = div
    result.append(chars[long_value])
    # Bitcoin does a little leading-zero-compression:
    # leading 0-bytes in the input become leading-1s
    nPad = 0
    for c in v:
        if c == 0x00:
            nPad += 1
        else:
            break
    result.extend([chars[0]] * nPad)
    result.reverse()
    return result.decode("ascii")


def base_decode(v: str, length, base) -> Optional[bytes]:
    """decode v into a string of len bytes. May raise ValueError on bad chars
    in string."""
    # assert_bytes(v)
    v = to_bytes(v, "ascii")
    if base not in (58, 43):
        raise ValueError(f"not supported base: {base}")
    chars = __b58chars
    if base == 43:
        chars = __b43chars
    long_value = 0
    power_of_base = 1
    for c in v[::-1]:
        digit = chars.find(bytes((c,)))
        if digit < 0:
            raise ValueError(
                "Forbidden character '{}' for base {}".format(chr(c), base)
            )
        # naive but slow variant:   long_value += digit * (base**i)
        long_value += digit * power_of_base
        power_of_base *= base
    result = bytearray()
    while long_value >= 256:
        div, mod = divmod(long_value, 256)
        result.append(mod)
        long_value = div
    result.append(long_value)
    nPad = 0
    for c in v:
        if c == chars[0]:
            nPad += 1
        else:
            break
    result.extend(b"\x00" * nPad)
    if length is not None and len(result) != length:
        return None
    result.reverse()
    return bytes(result)


def EncodeBase58Check(vchIn: bytes) -> str:
    h = Hash(vchIn)
    return base_encode(vchIn + h[0:4], base=58)


def DecodeBase58Check(psz: str) -> Optional[bytes]:
    """Returns None on failure"""
    try:
        vchRet = base_decode(psz, None, base=58)
    except ValueError:
        # Bad characters in string
        return None
    if vchRet is None:
        return None
    key = vchRet[0:-4]
    csum = vchRet[-4:]
    h = Hash(key)
    cs32 = h[0:4]
    if cs32 != csum:
        return None
    else:
        return key


def serialize_privkey(secret, compressed, txin_type: ScriptType, *, net=None) -> str:
    if net is None:
        net = networks.net
    prefix = bytes([(txin_type + net.WIF_PREFIX) & 255])
    suffix = b"\01" if compressed else b""
    vchIn = prefix + secret + suffix
    return EncodeBase58Check(vchIn)


def deserialize_privkey(key, *, net=None) -> Tuple[ScriptType, bytes, bool]:
    """Returns the deserialized key if key is a WIF key (non bip38), raises
    otherwise."""
    # whether the pubkey is compressed should be visible from the keystore
    if net is None:
        net = networks.net
    vch = DecodeBase58Check(key)
    if is_bip38_key(key):
        raise KeyIsBip38Error("bip38")
    if is_minikey(key):
        return ScriptType.p2pkh, minikey_to_private_key(key), False
    elif vch:
        txin_type = ScriptType(vch[0] - net.WIF_PREFIX)
        # We do it this way because eg iOS runs with PYTHONOPTIMIZE=1
        if len(vch) not in (
            33,
            34,
        ):
            raise AssertionError("Key {} has invalid length".format(key))
        compressed = len(vch) == 34
        if compressed and vch[33] != 0x1:
            raise ValueError(
                "Invalid WIF key. Length suggests compressed pubkey, "
                "but last byte is 0x{:02x} != 0x01".format(vch[33])
            )
        return txin_type, vch[1:33], compressed
    else:
        raise ValueError("cannot deserialize", key)


def is_compressed(sec, *, net=None):
    if net is None:
        net = networks.net
    return deserialize_privkey(sec, net=net)[2]


def address_from_private_key(sec, *, net=None):
    if net is None:
        net = networks.net
    txin_type, privkey, compressed = deserialize_privkey(sec, net=net)
    public_key = ecc.ECPrivkey(privkey).get_public_key_bytes(compressed)
    return pubkey_to_address(txin_type, public_key, net=net)


def is_private_key(key, *, net=None):
    """Returns True if key is a WIF key (and also non bip38)"""
    if net is None:
        net = networks.net
    try:
        k = deserialize_privkey(key, net=net)
        return k is not False
    except Exception:
        return False


# end pywallet functions


def is_minikey(text):
    # Minikeys are typically 22 or 30 characters, but this routine
    # permits any length of 20 or more provided the minikey is valid.
    # A valid minikey must begin with an 'S', be in base58, and when
    # suffixed with '?' have its SHA256 hash begin with a zero byte.
    # They are widely used in Casascius physical bitcoins, where the
    # address corresponded to an uncompressed public key.
    return (
        len(text) >= 20
        and text[0] == "S"
        and all(ord(c) in __b58chars for c in text)
        and sha256(text + "?")[0] == 0x00
    )


def minikey_to_private_key(text):
    return sha256(text)


# BIP38


def is_bip38_available(require_fast=True):
    """Returns True iff we have the underlying libs to decode Bip38 (scrypt libs).
    Use require_fast=True if we require native code.  Note that the non-native
    code libs are incredibly slow and not suitable for production use."""
    if not Bip38Key.canDecrypt():
        return False
    if require_fast and not Bip38Key.isFast():
        return False
    return True


def is_bip38_key(bip38str, *, net=None):
    """Returns True iff the '6P...' passed-in string is a valid Bip38 encrypted
    key. False otherwise.  Does not require is_bip38_available to return a valid
    result."""
    return Bip38Key.isBip38(bip38str, net=net)


def bip38_decrypt(enc_key, password, *, require_fast=True, net=None):
    """Pass a bip38 key eg '6PnQ46rtBGW4XuiudqinAZYobT4Aa8GdtYkjG1LvXK3RBq6ARJA3txjj21'
    and a password. Both should be str's. Returns a tuple of:
    (decrypted_WIF_key_str, Address_object) if decoding succeeds, or an empty
    tuple on bad password.  Returns 'None' if failed due to missing libs or
    because of malformed key. Use is_bip38_available() to determine if we
    actually can decode bip38 keys (we have the libs)."""
    if not is_bip38_available(require_fast):
        return None
    try:
        return Bip38Key(enc_key, net=net).decrypt(password)
    except Bip38Key.PasswordError:
        # Bad password result is an empty tuple
        return ()
    except Bip38Key.Error as e:
        print_error("[bip38_decrypt] Error with key", enc_key, "error was:", repr(e))
    return None


class Bip38Key:
    """
    Implements Bip38 _encrypt_ and _decrypt_ functionality.

    Supports both ECMult and NonECMult key types, so it should work with
    all BIP38 keys.

    This code was translated from Calin's Go implementation of brute38:
    https://www.github.com/cculianu/brute38

    Note that to actually encrypt or decrypt keys you need either:

    - hashlib.scrypt (python 3.6 + openssl 1.1) which is very fast.
    - Cryptodome.Protocol.KDF.scrypt (also fast as it's native)
    - Or, the slow python-only lib 'pyscrypt' which is INCREDIBLY slow.

    Use Bip38Key.canDecrypt() to test if the decrypt() functionality
    is actually available (that is, if we found a scrypt implementation).

    Similarly, use Bip38Key.canEncrypt() to test whether encryption works.

    Use Bip38Key.isFast() to determine if decrypt() will be fast or
    painfully slow: It can take several minutes to decode a single key
    if Bip38Key.isFast() is False.

    Example psueodo-UI code to use this class in a manner than won't drive
    users crazy:

    if Bip38Key.isBip38(userKey): # test that user input is a bip38 key
        if not Bip38Key.canDecrypt():
            # show some GUI error that scrypt is missing here...
            gui.warning("You supplied a bip38 key but no scrypt lib is found!")
            return
        if not Bip38Key.isFast():
            # warn user here that the operation will take MINUTES!
            if not gui.question("The operation will be slow.. continue?"):
                return # user opted out.
            gui.pop_up_waiting_dialog() # show user a spining waiting thing...

        try:
            pass = gui.get_password("Please enter the password for this bip38 key.")
            wif, addr = Bip38Key(userKey).decrypt(pass) # may be fast or slow depending on underlying lib...
        except Bip38Key.PasswordError:
            # user supplied a bad password ...
            gui.show_error("Invalid password!")
            return
        finally:
            if not Bip38Key.isFast(): gui.hide_waiting_dialog() # hide waiting dialog if shown...

        gui.show(wif, addr) # show WIF key and address in GUI here
    """

    class Type:
        NonECMult = 0x42
        ECMult = 0x43
        Unknown = 0x0

    enc = (  # string // bip38 base58 encoded key (as the user would see it in a paper wallet)
        ""
    )
    dec = b""  # []byte // key decoded to bytes (still in encrypted form)
    flag = 0x0  # byte // the flag byte
    compressed = False  # bool // boolean flag determining if compressed
    typ = Type.Unknown  # KeyType // one of NonECMultKey or ECMultKey above
    salt = b""  # [] byte // the slice salt -- a slice of .dec slice
    entropy = b""  # [] byte // only non-nil for typ==ECMultKey -- a slice into .dec
    hasLotSequence = False  # bool // usually false, may be true only for typ==ECMultKey

    # // coin / network specific info affecting key decription and address decoding:
    # this gets populated by current value of NetworkConstants.net.WIF_PREFIX, etc
    networkVersion = 0x00  # byte // usually 0x0 for BTC/BCH
    privateKeyPrefix = 0x80  # byte // usually 0x80 for BTC/BCH

    # Internal class-level vars
    _scrypt_1 = None
    _scrypt_2 = None

    class Error(Exception):
        """Decoding a BIP38 key will raise a subclass of this"""

        pass

    class DecodeError(Error):
        pass

    class PasswordError(Error, InvalidPassword):
        pass

    def __init__(self, enc, *, net=None):
        if isinstance(enc, (bytearray, bytes)):
            enc = enc.decode("ascii")
        assert isinstance(
            enc, str
        ), "Bip38Key must be instantiated with an encrypted bip38 key string!"
        if not enc.startswith("6P"):
            raise Bip38Key.DecodeError(
                "Provided bip38 key string appears to not be valid. Expected a '6P'"
                " prefix!"
            )
        self.net = networks.net if net is None else net
        self.enc = enc
        self.dec = DecodeBase58Check(self.enc)
        if not self.dec:
            raise Bip38Key.DecodeError(
                "Cannot decode bip38 key: Failed Base58 Decode Check"
            )
        if len(self.dec) != 39:
            raise Bip38Key.DecodeError(
                "Cannot decode bip38 key: Resulting decoded bytes are of the wrong"
                " length (should be 39, is {})".format(len(self.dec))
            )
        if self.dec[0] == 0x01 and self.dec[1] == 0x42:
            self.typ = Bip38Key.Type.NonECMult
        elif self.dec[0] == 0x01 and self.dec[1] == 0x43:
            self.typ = Bip38Key.Type.ECMult
        else:
            raise Bip38Key.DecodeError(
                "Malformed byte slice -- the specified key appears to be invalid"
            )

        self.flag = self.dec[2]
        self.compressed = False
        if self.typ == Bip38Key.Type.NonECMult:
            self.compressed = self.flag == 0xE0
            self.salt = self.dec[3:7]
            if not self.compressed and self.flag != 0xC0:
                raise Bip38Key.DecodeError("Invalid BIP38 compression flag")
        elif self.typ == Bip38Key.Type.ECMult:
            self.compressed = (self.flag & 0x20) != 0
            self.hasLotSequence = (self.flag & 0x04) != 0
            if (self.flag & 0x24) != self.flag:
                raise Bip38Key.DecodeError("Invalid BIP38 ECMultKey flag")
            if self.hasLotSequence:
                self.salt = self.dec[7:11]
                self.entropy = self.dec[7:15]
            else:
                self.salt = self.dec[7:15]
                self.entropy = self.salt

        self.networkVersion, self.privateKeyPrefix = (
            self.net.ADDRTYPE_P2PKH,
            self.net.WIF_PREFIX,
        )

    @property
    def lot(self) -> Optional[int]:
        """Returns the 'lot' number if 'hasLotSequence' or None otherwise."""
        if self.dec and self.hasLotSequence:
            return self.entropy[4] * 4096 + self.entropy[5] * 16 + self.entropy[6] // 16

    @property
    def sequence(self) -> Optional[int]:
        """Returns the 'sequence' number if 'hasLotSequence' or None
        otherwise."""
        if self.dec and self.hasLotSequence:
            return (self.entropy[6] & 0x0F) * 256 + self.entropy[7]

    def typeString(self):
        if self.typ == Bip38Key.Type.NonECMult:
            return "NonECMultKey"
        if self.typ == Bip38Key.Type.ECMult:
            return "ECMultKey"
        return "UnknownKey"

    @classmethod
    def isBip38(cls, bip38_enc_key, *, net=None):
        """Returns true if the encryped key string is a valid bip38 key."""
        try:
            cls(bip38_enc_key, net=net)
            return True  # if we get to this point the key was successfully decoded.
        except cls.Error:
            # print_error("[Bip38Key.isBip38] {}:".format(bip38_enc_key), e)
            return False

    @staticmethod
    def isFast():
        """Returns True if the fast hashlib.scrypt implementation is found."""
        cls = __class__
        if cls._scrypt_1 or cls._scrypt_2:
            return True
        if hasattr(hashlib, "scrypt"):
            cls._scrypt_1 = hashlib.scrypt
            return True
        else:
            try:
                from Cryptodome.Protocol.KDF import scrypt

                cls._scrypt_2 = scrypt
                return True
            except (ImportError, NameError):
                pass
        return False

    @staticmethod
    def canDecrypt():
        """Tests if this class can decrypt. If this returns False then we are
        missing the scrypt module: either hashlib.scrypt or pyscrypt"""
        if Bip38Key.isFast():
            return True
        try:
            import pyscrypt  # noqa: F401

            return True
        except ImportError:
            pass
        return False

    @staticmethod
    def canEncrypt():
        return Bip38Key.canDecrypt()

    @staticmethod
    def _scrypt(password, salt, N, r, p, dkLen):
        password = to_bytes(password)
        salt = to_bytes(salt)
        if Bip38Key.isFast():
            if __class__._scrypt_1:
                return __class__._scrypt_1(
                    password=password, salt=salt, n=N, r=r, p=p, dklen=dkLen
                )
            elif __class__._scrypt_2:
                return __class__._scrypt_2(
                    password=password, salt=salt, N=N, r=r, p=p, key_len=dkLen
                )
            raise RuntimeError(
                "INTERNAL ERROR -- neither _scrypt_1 or _scrypt_2 are defined, but"
                " isFast()==True... FIXME!"
            )
        try:
            import pyscrypt
        except ImportError:
            raise Bip38Key.Error(
                "We lack a module to decrypt BIP38 Keys.  Install either: Cryptodome"
                " (fast), Python + OpenSSL 1.1 (fast), or pyscrypt (slow)"
            )
        print_error("[{}] using slow pyscrypt.hash... :(".format(__class__.__name__))
        return pyscrypt.hash(password=password, salt=salt, N=N, r=r, p=p, dkLen=dkLen)

    def _decryptNoEC(
        self, passphrase: str
    ) -> (
        tuple
    ):  # returns the (WIF private key, Address)  on success, raises Error on failure.
        scryptBuf = Bip38Key._scrypt(
            password=passphrase, salt=self.salt, N=16384, r=8, p=8, dkLen=64
        )
        derivedHalf1 = scryptBuf[0:32]
        derivedHalf2 = scryptBuf[32:64]
        encryptedHalf1 = self.dec[7:23]
        encryptedHalf2 = self.dec[23:39]

        h = pyaes.AESModeOfOperationECB(derivedHalf2)
        k1 = h.decrypt(encryptedHalf1)
        k2 = h.decrypt(encryptedHalf2)

        keyBytes = bytearray(32)
        for i in range(16):
            keyBytes[i] = k1[i] ^ derivedHalf1[i]
            keyBytes[i + 16] = k2[i] ^ derivedHalf1[i + 16]
        keyBytes = bytes(keyBytes)

        pubKey = ecc.ECPrivkey(keyBytes).get_public_key_bytes(self.compressed)

        from .address import Address  # fixme

        addr = Address.from_pubkey(pubKey)
        addrHashed = Hash(addr.to_storage_string(net=self.net))[0:4]

        assert len(addrHashed) == len(self.salt)

        for i in range(len(addrHashed)):
            if addrHashed[i] != self.salt[i]:
                raise Bip38Key.PasswordError(
                    "Supplied password failed to decrypt bip38 key."
                )

        return (
            serialize_privkey(
                keyBytes, self.compressed, ScriptType.p2pkh, net=self.net
            ),
            addr,
        )

    @staticmethod
    def _normalizeNFC(s: str) -> str:
        """Ensures unicode string is normalized to NFC standard as specified by bip38"""
        import unicodedata

        return unicodedata.normalize("NFC", s)

    def decrypt(
        self, passphrase: str
    ) -> Tuple[str, object]:  # returns the (wifkey string, Address object)
        assert isinstance(passphrase, str), "Passphrase must be a string!"
        # ensure unicode bytes are normalized to NFC standard as specified by bip38
        passphrase = self._normalizeNFC(passphrase)
        if self.typ == Bip38Key.Type.NonECMult:
            return self._decryptNoEC(passphrase)
        elif self.typ != Bip38Key.Type.ECMult:
            raise Bip38Key.Error("INTERNAL ERROR: Unknown key type")

        prefactorA = Bip38Key._scrypt(
            password=passphrase, salt=self.salt, N=16384, r=8, p=8, dkLen=32
        )

        if self.hasLotSequence:
            prefactorB = prefactorA + self.entropy
            passFactor = Hash(prefactorB)
            del prefactorB
        else:
            passFactor = prefactorA

        passpoint = ecc.ECPrivkey(passFactor).get_public_key_bytes(compressed=True)

        encryptedpart1 = self.dec[15:23]
        encryptedpart2 = self.dec[23:39]

        derived = Bip38Key._scrypt(
            password=passpoint,
            salt=self.dec[3:7] + self.entropy,
            N=1024,
            r=1,
            p=1,
            dkLen=64,
        )

        h = pyaes.AESModeOfOperationECB(derived[32:])

        unencryptedpart2 = bytearray(h.decrypt(encryptedpart2))
        for i in range(len(unencryptedpart2)):
            unencryptedpart2[i] ^= derived[i + 16]

        encryptedpart1 += bytes(unencryptedpart2[:8])

        unencryptedpart1 = bytearray(h.decrypt(encryptedpart1))

        for i in range(len(unencryptedpart1)):
            unencryptedpart1[i] ^= derived[i]

        seeddb = bytes(unencryptedpart1[:16]) + bytes(unencryptedpart2[8:])
        factorb = Hash(seeddb)

        bytes_to_int = Bip38Key._bytes_to_int

        passFactorI = bytes_to_int(passFactor)
        factorbI = bytes_to_int(factorb)

        privKey = passFactorI * factorbI
        privKey = (
            privKey % 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
        )

        int_to_bytes = Bip38Key._int_to_bytes

        privKey = int_to_bytes(privKey, 32)

        eckey = ecc.ECPrivkey(privKey)

        pubKey = eckey.get_public_key_bytes(self.compressed)

        from .address import Address  # fixme

        addr = Address.from_pubkey(pubKey)
        addrHashed = Hash(addr.to_storage_string(net=self.net))[0:4]

        for i in range(len(addrHashed)):
            if addrHashed[i] != self.dec[3 + i]:
                raise Bip38Key.PasswordError(
                    "Supplied password failed to decrypt bip38 key."
                )

        return (
            serialize_privkey(privKey, self.compressed, ScriptType.p2pkh, net=self.net),
            addr,
        )

    @classmethod
    def encrypt(cls, wif: str, passphrase: str, *, net=None) -> object:
        """Returns a Bip38Key instance encapsulating the supplied WIF key
        encrypted with passphrase. May raise on bad/garbage WIF or other bad
        arguments."""
        assert cls.canEncrypt(), "scrypt function missing. Cannot encrypt."
        assert isinstance(passphrase, str), "Passphrase must be a string!"
        if net is None:
            net = networks.net
        _type, key_bytes, compressed = deserialize_privkey(wif, net=net)  # may raise
        if _type != ScriptType.p2pkh:
            raise ValueError(
                "Only p2pkh WIF keys may be encrypted using BIP38 at this time."
            )
        public_key = ecc.ECPrivkey(key_bytes).get_public_key_bytes(compressed)
        addr_str = pubkey_to_address(_type, public_key, net=net)
        addr_hash = Hash(addr_str)[0:4]
        # ensure unicode bytes are normalized to NFC standard as specified by bip38
        passphrase = cls._normalizeNFC(passphrase)

        derived_key = cls._scrypt(passphrase, addr_hash, N=16384, r=8, p=8, dkLen=64)

        derivedHalf1 = derived_key[:32]
        derivedHalf2 = derived_key[32:]

        h = pyaes.AESModeOfOperationECB(derivedHalf2)

        # Encrypt bitcoinprivkey[0...15] xor derivedhalf1[0...15]
        encryptedHalf1 = h.encrypt(
            bytes((x[0] ^ x[1]) for x in zip(key_bytes[:16], derivedHalf1[:16]))
        )
        encryptedHalf2 = h.encrypt(
            bytes((x[0] ^ x[1]) for x in zip(key_bytes[16:], derivedHalf1[16:]))
        )

        flag = 0xE0 if compressed else 0xC0
        b38 = (
            bytes((0x01, cls.Type.NonECMult))
            + bytes((flag,))
            + to_bytes(addr_hash)
            + encryptedHalf1
            + encryptedHalf2
        )

        return cls(EncodeBase58Check(b38))

    _ec_mult_magic_prefix = bytes.fromhex("2CE9B3E1FF39E2")

    @classmethod
    def createECMult(
        cls,
        passphrase: str,
        lot_sequence: Optional[Tuple[int, int]] = None,
        compressed=True,
        *,
        net=None,
    ) -> object:
        """Creates a new, randomly generated and encrypted "EC Mult" Bip38 key
        as per the Bip38 spec. The new key may be decrypted later with the
        supplied passphrase to yield a 'p2pkh' WIF private key.

        May raise if the scrypt function is missing.

        Optional arguments:

        `lot_sequence`, a tuple of (lot, sequence), both ints, with lot being an
        int in the range [0,1048575], and sequence being an int in the range
        [0, 4095]. This tuple, if specified, will be encoded in the generated
        Bip38 key as the .lot and .sequence property.

        `compressed` specifies whether to encode a compressed or uncompressed
        bitcoin pub/priv key pair. Older wallets do not support compressed keys
        but all new wallets do."""
        assert cls.canEncrypt(), "scrypt function missing. Cannot encrypt."
        assert isinstance(passphrase, str), "Passphrase must be a string!"
        if net is None:
            net = networks.net
        passphrase = cls._normalizeNFC(passphrase)

        has_lot_seq = lot_sequence is not None

        if not has_lot_seq:
            # No lot_sequence
            ownersalt = ownerentropy = to_bytes(os.urandom(8))
            magic = cls._ec_mult_magic_prefix + bytes((0x53,))
        else:
            lot, seq = lot_sequence
            assert 0 <= lot <= 1048575, "Lot number out of range"
            assert 0 <= seq <= 4095, "Sequence number out of range"

            ownersalt = to_bytes(os.urandom(4))
            lotseq = int(lot * 4096 + seq).to_bytes(4, byteorder="big")
            ownerentropy = ownersalt + lotseq
            magic = cls._ec_mult_magic_prefix + bytes((0x51,))

        prefactor = cls._scrypt(passphrase, salt=ownersalt, N=16384, r=8, p=8, dkLen=32)

        if has_lot_seq:
            passfactor = Hash(prefactor + ownerentropy)
        else:
            passfactor = prefactor

        passpoint = ecc.ECPrivkey(passfactor).get_public_key_bytes(compressed=True)

        # 49 bytes (not a str, despite name. We use the name from bip38 spec here)
        intermediate_passphrase_string = magic + ownerentropy + passpoint

        enc = EncodeBase58Check(intermediate_passphrase_string)
        return cls.ec_mult_from_intermediate_passphrase_string(enc, compressed)

    @classmethod
    def ec_mult_from_intermediate_passphrase_string(
        cls, enc_ips: bytes, compressed=True
    ) -> object:
        """Takes a Bip38 intermediate passphrase string as specified in the
        bip38 spec and generates a random and encrypted key, returning a newly
        constructed Bip38Key instance."""
        ips = DecodeBase58Check(enc_ips)
        assert ips.startswith(cls._ec_mult_magic_prefix), "Bad intermediate string"
        hls_byte = ips[7]
        assert hls_byte in (0x51, 0x53), "Bad has_lot_seq byte"
        has_lot_seq = hls_byte == 0x51
        ownerentropy = ips[8:16]  # 8 bytes
        passpoint = ips[16:]  # 33 bytes

        assert len(passpoint) == 33, "Bad passpoint length"

        # set up flag byte
        flag = 0x20 if compressed else 0x0
        if has_lot_seq:
            flag |= 0x04

        seedb = os.urandom(24)
        factorb = Hash(seedb)

        point = ecc.ser_to_point(passpoint) * cls._bytes_to_int(factorb)
        pubkey = ecc.point_to_ser(point, compressed)
        generatedaddress = pubkey_to_address(ScriptType.p2pkh, pubkey)
        addresshash = Hash(generatedaddress)[:4]

        salt = addresshash + ownerentropy
        derived = cls._scrypt(passpoint, salt=salt, N=1024, r=1, p=1, dkLen=64)

        derivedhalf1 = derived[:32]
        derivedhalf2 = derived[32:]

        h = pyaes.AESModeOfOperationECB(derivedhalf2)

        encryptedpart1 = h.encrypt(
            bytes((x[0] ^ x[1]) for x in zip(seedb[:16], derivedhalf1[:16]))
        )
        encryptedpart2 = h.encrypt(
            bytes(
                (x[0] ^ x[1])
                for x in zip(encryptedpart1[8:] + seedb[16:24], derivedhalf1[16:])
            )
        )

        return cls(
            EncodeBase58Check(
                bytes((0x01, cls.Type.ECMult, flag))
                + addresshash
                + ownerentropy
                + encryptedpart1[:8]
                + encryptedpart2
            )
        )

    @staticmethod
    def _int_to_bytes(value, length):
        result = []
        for i in range(0, length):
            result.append(value >> (i * 8) & 0xFF)
        result.reverse()
        return bytes(result)

    @staticmethod
    def _bytes_to_int(by):
        result = 0
        for b in by:
            result = result * 256 + int(b)
        return result

    def __repr__(self):
        ret = "<{}:".format(self.__class__.__name__)
        d = dir(self)
        for x in d:
            a = getattr(self, x)
            if not x.startswith("_") and isinstance(a, (int, bytes, bool, str)):
                if x == "typ":
                    a = self.typeString()
                elif isinstance(a, int) and not isinstance(a, bool):
                    a = "0x" + bh2u(self._int_to_bytes(a, 1))
                elif isinstance(a, bytes):
                    a = "0x" + bh2u(a) if a else a
                ret += " {}={}".format(x, a)
        ret += ">"
        return ret

    def __str__(self):
        return self.enc
