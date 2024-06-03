# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC Developers
# Copyright (C) 2017-2020 The Electron Cash Developers
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

# Many of the functions in this file are copied from ElectrumX
from __future__ import annotations

import abc
import hashlib
import struct
from collections import namedtuple
from typing import List, Optional, Tuple, Union

from . import cashaddr, networks
from .bitcoin import (
    OpCodes,
    ScriptType,
    is_minikey,
    minikey_to_private_key,
    push_script_bytes,
)
from .crypto import hash_160
from .ecc import ECKey
from .util import cachedproperty

_sha256 = hashlib.sha256
hex_to_bytes = bytes.fromhex


class DestinationType(abc.ABC):
    """Base class for TxOutput destination types"""

    @abc.abstractmethod
    def to_ui_string(self) -> str:
        pass


class AddressError(Exception):
    """Exception used for Address errors."""


class ScriptError(Exception):
    """Exception used for Script errors."""


P2PKH_prefix = bytes([OpCodes.OP_DUP, OpCodes.OP_HASH160, 20])
P2PKH_suffix = bytes([OpCodes.OP_EQUALVERIFY, OpCodes.OP_CHECKSIG])

P2SH_prefix = bytes([OpCodes.OP_HASH160, 20])
P2SH_suffix = bytes([OpCodes.OP_EQUAL])

# Utility functions


def to_bytes(x):
    """Convert to bytes which is hashable."""
    if isinstance(x, bytes):
        return x
    if isinstance(x, bytearray):
        return bytes(x)
    raise TypeError("{} is not bytes ({})".format(x, type(x)))


def hash_to_hex_str(x):
    """Convert a big-endian binary hash to displayed hex string.

    Display form of a binary hash is reversed and converted to hex.
    """
    return bytes(reversed(x)).hex()


def hex_str_to_hash(x):
    """Convert a displayed hex string to a binary hash."""
    return bytes(reversed(hex_to_bytes(x)))


def bytes_to_int(be_bytes):
    """Interprets a big-endian sequence of bytes as an integer"""
    return int.from_bytes(be_bytes, "big")


def int_to_bytes(value):
    """Converts an integer to a big-endian sequence of bytes"""
    return value.to_bytes((value.bit_length() + 7) // 8, "big")


def sha256(x):
    """Simple wrapper of hashlib sha256."""
    return _sha256(x).digest()


def double_sha256(x):
    """SHA-256 of SHA-256, as used extensively in bitcoin."""
    return sha256(sha256(x))


class UnknownAddress(DestinationType):
    def to_ui_string(self):
        return "<UnknownAddress>"

    def __str__(self):
        return self.to_ui_string()

    def __repr__(self):
        return self.to_ui_string()


class PublicKey(namedtuple("PublicKeyTuple", "pubkey")):
    TO_ADDRESS_OPS = [
        OpCodes.OP_DUP,
        OpCodes.OP_HASH160,
        -1,
        OpCodes.OP_EQUALVERIFY,
        OpCodes.OP_CHECKSIG,
    ]

    @classmethod
    def from_pubkey(cls, pubkey):
        """Create from a public key expressed as binary bytes."""
        if isinstance(pubkey, str):
            pubkey = hex_to_bytes(pubkey)
        cls.validate(pubkey)
        return cls(to_bytes(pubkey))

    @classmethod
    def privkey_from_WIF_privkey(cls, WIF_privkey, *, net=None):
        """Given a WIF private key (or minikey), return the private key as
        binary and a boolean indicating whether it was encoded to
        indicate a compressed public key or not.
        """
        if net is None:
            net = networks.net
        if is_minikey(WIF_privkey):
            # The Casascius coins were uncompressed
            return minikey_to_private_key(WIF_privkey), False
        raw = Base58.decode_check(WIF_privkey)
        if not raw:
            raise ValueError("Private key WIF decode error; unable to decode.")
        if raw[0] != net.WIF_PREFIX:
            # try and generate a helpful error message as this propagates up to the UI if they are creating a new wallet.
            extra = ""
            if int(raw[0] - net.WIF_PREFIX) in iter(ScriptType):
                extra = (
                    "; this corresponds to a key of type: '{}' which is unsupported for"
                    " importing from WIF key.".format(
                        ScriptType(int(raw[0] - net.WIF_PREFIX)).name
                    )
                )
            raise ValueError(
                "Private key has invalid WIF version byte (expected: 0x{:x} got:"
                " 0x{:x}){}".format(net.WIF_PREFIX, raw[0], extra)
            )
        if len(raw) == 34 and raw[-1] == 1:
            return raw[1:33], True
        if len(raw) == 33:
            return raw[1:], False
        raise ValueError("invalid private key")

    @classmethod
    def from_WIF_privkey(cls, WIF_privkey) -> PublicKey:
        """Create a compressed or uncompressed public key from a private
        key."""
        privkey, compressed = cls.privkey_from_WIF_privkey(WIF_privkey)
        ec_key = ECKey(privkey)
        return cls.from_pubkey(ec_key.GetPubKey(compressed))

    @classmethod
    def from_string(cls, string):
        """Create from a hex string."""
        return cls.from_pubkey(hex_to_bytes(string))

    @classmethod
    def validate(cls, pubkey):
        if not isinstance(pubkey, (bytes, bytearray)):
            raise TypeError("pubkey must be of bytes type, not {}".format(type(pubkey)))
        if len(pubkey) == 33 and pubkey[0] in (2, 3):
            return  # Compressed
        if len(pubkey) == 65 and pubkey[0] == 4:
            return  # Uncompressed
        raise AddressError("invalid pubkey {}".format(pubkey))

    @cachedproperty
    def address(self):
        """Convert to an Address object."""
        return Address(hash_160(self.pubkey), Address.ADDR_P2PKH)

    def is_compressed(self):
        """Returns True if the pubkey is compressed."""
        return len(self.pubkey) == 33

    def to_ui_string(self):
        """Convert to a hexadecimal string."""
        return self.pubkey.hex()

    def to_storage_string(self):
        """Convert to a hexadecimal string for storage."""
        return self.pubkey.hex()

    def to_script(self):
        """Note this returns the P2PK script."""
        return Script.P2PK_script(self.pubkey)

    def to_script_hex(self):
        """Return a script to pay to the address as a hex string."""
        return self.to_script().hex()

    def to_scripthash(self):
        """Returns the hash of the script in binary."""
        return sha256(self.to_script())

    def to_scripthash_hex(self):
        """Like other bitcoin hashes this is reversed when written in hex."""
        return hash_to_hex_str(self.to_scripthash())

    def to_P2PKH_script(self):
        """Return a P2PKH script."""
        return self.address.to_script()

    def __str__(self):
        return self.to_ui_string()

    def __repr__(self):
        return "<PubKey {}>".format(self.__str__())


class ScriptOutput(namedtuple("ScriptAddressTuple", "script"), DestinationType):
    @classmethod
    def from_string(self, string):
        """Instantiate from a mixture of opcodes and raw data."""
        script = bytearray()
        for word in string.split():
            if word.startswith("OP_"):
                try:
                    opcode = OpCodes[word]
                except KeyError:
                    raise AddressError("unknown opcode {}".format(word))
                script.append(opcode)
            else:
                import binascii

                script.extend(Script.push_data(binascii.unhexlify(word)))
        return ScriptOutput.protocol_factory(bytes(script))

    def to_ui_string(self, ignored=None):
        """Convert to user-readable OP-codes (plus pushdata as text if possible)
        eg OP_RETURN (12) "Hello there!"
        """
        try:
            ops = Script.get_ops(self.script)
        except ScriptError:
            # Truncated script -- so just default to hex string.
            return "Invalid script: " + self.script.hex()

        def lookup(x):
            try:
                return OpCodes(x).name
            except ValueError:
                return "(" + str(x) + ")"

        parts = []
        for op, data in ops:
            if data is not None:
                # Attempt to make a friendly string, or fail to hex
                try:
                    astext = data.decode("utf8")

                    friendlystring = repr(astext)

                    # if too many escaped characters, it's too ugly!
                    if friendlystring.count("\\") * 3 > len(astext):
                        friendlystring = None
                except Exception:
                    friendlystring = None

                if not friendlystring:
                    friendlystring = data.hex()

                parts.append(lookup(op) + " " + friendlystring)
            else:  # isinstance(op, int):
                parts.append(lookup(op))
        return ", ".join(parts)

    def to_script(self):
        return self.script

    def is_opreturn(self):
        """Returns True iff this script is an OP_RETURN script (starts with
        the OP_RETURN byte)"""
        return bool(self.script and self.script[0] == OpCodes.OP_RETURN)

    def __str__(self):
        return self.to_ui_string(True)

    def __repr__(self):
        return "<ScriptOutput {}>".format(self.__str__())

    ###########################################
    # Protocol system methods and class attrs #
    ###########################################

    # subclasses of ScriptOutput that handle protocols. Currently this will
    # contain a cashacct.ScriptOutput instance.
    #
    # NOTE: All subclasses of this class must be hashable. Please implement
    # __hash__ for any subclasses. (This is because our is_mine cache in
    # wallet.py assumes all possible types that pass through it are hashable).
    #
    protocol_classes = set()

    def make_complete(self, block_height=None, block_hash=None, txid=None):
        """Subclasses implement this, noop here."""
        pass

    def is_complete(self):
        """Subclasses implement this, noop here."""
        return True

    @classmethod
    def find_protocol_class(cls, script_bytes):
        """Scans the protocol_classes set, and if the passed-in script matches
        a known protocol, returns that class, otherwise returns our class."""
        for c in cls.protocol_classes:
            if c.protocol_match(script_bytes):
                return c
        return __class__

    @staticmethod
    def protocol_factory(script):
        """One shot -- find the right class and construct object based on script"""
        return __class__.find_protocol_class(script)(script)


# A namedtuple for easy comparison and unique hashing
class Address(namedtuple("AddressTuple", "hash160 kind"), DestinationType):
    # Address kinds
    ADDR_P2PKH = 0
    ADDR_P2SH = 1

    # Address formats
    FMT_CASHADDR = "CashAddr"
    FMT_LEGACY = "Legacy"

    # We keep this for now for the address converter tool and hw wallets, but it
    # can no longer be shown in the rest of the UI and is no longer supported in
    # the "Pay to" field.
    FMT_CASHADDR_BCH = "CashAddr BCH"

    # Default to CashAddr
    FMT_UI = FMT_CASHADDR
    """Current address format used in the UI"""

    FMTS_UI = [FMT_CASHADDR, FMT_LEGACY]
    """All address formats that can be used in the UI"""

    FMT_UI_IDX = FMTS_UI.index(FMT_UI)
    """Index of current format in the list of usable address formats"""

    def __new__(cls, hash160, kind):
        assert kind in (cls.ADDR_P2PKH, cls.ADDR_P2SH)
        hash160 = to_bytes(hash160)
        assert len(hash160) == 20, "hash must be 20 bytes"
        ret = super().__new__(cls, hash160, kind)
        ret._addr2str_cache = {
            cls.FMT_CASHADDR: None,
            cls.FMT_CASHADDR_BCH: None,
            cls.FMT_LEGACY: None,
        }
        return ret

    @classmethod
    def set_address_format(cls, fmt):
        cls.FMT_UI = fmt
        cls.FMT_UI_IDX = cls.FMTS_UI.index(cls.FMT_UI)

    @classmethod
    def toggle_address_format(cls):
        # increment index and select next format in list
        cls.FMT_UI_IDX = (cls.FMT_UI_IDX + 1) % len(cls.FMTS_UI)
        cls.FMT_UI = cls.FMTS_UI[cls.FMT_UI_IDX]

    @classmethod
    def from_cashaddr_string(
        cls,
        string: str,
        *,
        net: Optional[networks.AbstractNet] = None,
        support_arbitrary_prefix: bool = False,
    ):
        """Construct from a cashaddress string.
        :return: Instance of :class:`Address`
        """
        if net is None:
            net = networks.net
        string = string.lower()

        if ":" in string:
            # Case of prefix being specified
            try:
                prefix, kind, addr_hash = cashaddr.decode(string)
            except ValueError as e:
                raise AddressError(str(e))

            if not support_arbitrary_prefix and prefix != net.CASHADDR_PREFIX:
                raise AddressError(f"address has unexpected prefix {prefix}")
        else:
            full_string = ":".join([net.CASHADDR_PREFIX, string])
            try:
                prefix, kind, addr_hash = cashaddr.decode(full_string)
            except ValueError as e:
                raise AddressError(
                    f"Unable to decode CashAddr with supported prefix '{net.CASHADDR_PREFIX}'."
                    f"\n\n{str(e)}\n"
                )

        if kind == cashaddr.PUBKEY_TYPE:
            return cls(addr_hash, cls.ADDR_P2PKH)
        elif kind == cashaddr.SCRIPT_TYPE:
            return cls(addr_hash, cls.ADDR_P2SH)
        else:
            raise AddressError(f"address has unexpected kind {kind}")

    @classmethod
    def from_string(
        cls,
        string: str,
        *,
        net: Optional[networks.AbstractNet] = None,
        support_arbitrary_prefix: bool = False,
    ):
        """Construct from an address string.
        This supports the following formats:
          - legacy BTC addresses
          - CashAddr with a "ecash:" prefix
          - CashAddr with a prefix omitted if this prefix is "ecash:"
          - CashAddr with an arbitrary prefix, if support_arbitrary_prefix
            is True

        :return: Instance of :class:`Address`
        """
        if net is None:
            net = networks.net
        if len(string) > 35:
            try:
                return cls.from_cashaddr_string(
                    string, net=net, support_arbitrary_prefix=support_arbitrary_prefix
                )
            except ValueError as e:
                raise AddressError(str(e))

        try:
            raw = Base58.decode_check(string)
        except Base58Error as e:
            raise AddressError(str(e))

        # Require version byte(s) plus hash160.
        if len(raw) != 21:
            raise AddressError("invalid address: {}".format(string))

        verbyte, hash160 = raw[0], raw[1:]
        if verbyte == net.ADDRTYPE_P2PKH:
            kind = cls.ADDR_P2PKH
        elif verbyte == net.ADDRTYPE_P2SH:
            kind = cls.ADDR_P2SH
        else:
            raise AddressError("unknown version byte: {}".format(verbyte))

        return cls(hash160, kind)

    @classmethod
    def is_valid(cls, string, *, net=None):
        if net is None:
            net = networks.net
        try:
            cls.from_string(string, net=net)
            return True
        except Exception:
            return False

    @classmethod
    def from_strings(cls, strings, *, net=None):
        """Construct a list from an iterable of strings."""
        if net is None:
            net = networks.net
        return [cls.from_string(string, net=net) for string in strings]

    @classmethod
    def from_pubkey(cls, pubkey):
        """Returns a P2PKH address from a public key.  The public key can
        be bytes or a hex string."""
        if isinstance(pubkey, str):
            pubkey = hex_to_bytes(pubkey)
        PublicKey.validate(pubkey)
        return cls(hash_160(pubkey), cls.ADDR_P2PKH)

    @classmethod
    def from_P2PKH_hash(cls, hash160):
        """Construct from a P2PKH hash160."""
        return cls(hash160, cls.ADDR_P2PKH)

    @classmethod
    def from_P2SH_hash(cls, hash160):
        """Construct from a P2PKH hash160."""
        return cls(hash160, cls.ADDR_P2SH)

    @classmethod
    def from_multisig_script(cls, script):
        return cls(hash_160(script), cls.ADDR_P2SH)

    @classmethod
    def to_strings(cls, fmt, addrs, *, net=None):
        """Construct a list of strings from an iterable of Address objects."""
        if net is None:
            net = networks.net
        return [addr.to_string(fmt, net=net) for addr in addrs]

    @staticmethod
    def is_legacy(address: str, net=None) -> bool:
        """Find if the string of the address is in legacy format"""
        if net is None:
            net = networks.net
        try:
            raw = Base58.decode_check(address)
        except Base58Error:
            return False

        if len(raw) != 21:
            return False

        verbyte = raw[0]
        legacy_formats = (net.ADDRTYPE_P2PKH, net.ADDRTYPE_P2SH)
        return verbyte in legacy_formats

    def to_cashaddr(self, *, net=None) -> str:
        """Return address string in CashAddr format (without prefix)"""
        if net is None:
            net = networks.net
        if self.kind == self.ADDR_P2PKH:
            kind = cashaddr.PUBKEY_TYPE
        else:
            kind = cashaddr.SCRIPT_TYPE
        return cashaddr.encode(net.CASHADDR_PREFIX, kind, self.hash160)

    def to_cashaddr_bch(self, *, net=None) -> str:
        if net is None:
            net = networks.net
        if self.kind == self.ADDR_P2PKH:
            kind = cashaddr.PUBKEY_TYPE
        else:
            kind = cashaddr.SCRIPT_TYPE
        return cashaddr.encode(net.CASHADDR_PREFIX_BCH, kind, self.hash160)

    def to_string(self, fmt, *, net=None) -> str:
        """Converts to a string of the given format.
        CashAddr formats are produced without prefix.
        """
        if net is None:
            net = networks.net
        if net is networks.net:
            try:
                cached = self._addr2str_cache[fmt]
                if cached is not None:
                    return cached
            except (IndexError, TypeError):
                raise AddressError("unrecognised format")

        cached = None
        try:
            if fmt == self.FMT_CASHADDR:
                cached = self.to_cashaddr(net=net)
                return cached

            if fmt == self.FMT_CASHADDR_BCH:
                cached = self.to_cashaddr_bch(net=net)
                return cached

            if fmt == self.FMT_LEGACY:
                if self.kind == self.ADDR_P2PKH:
                    verbyte = net.ADDRTYPE_P2PKH
                else:
                    verbyte = net.ADDRTYPE_P2SH
            else:
                # This should never be reached due to cache-lookup check above. But leaving it in as it's a harmless sanity check.
                raise AddressError("unrecognised format")

            cached = Base58.encode_check(bytes([verbyte]) + self.hash160)
            return cached
        finally:
            if cached is not None and net is networks.net:
                self._addr2str_cache[fmt] = cached

    def to_full_string(self, fmt, *, net=None) -> str:
        """Convert to text, with a URI prefix for cashaddr format."""
        if net is None:
            net = networks.net
        text = self.to_string(fmt, net=net)
        if fmt == self.FMT_CASHADDR:
            text = ":".join([net.CASHADDR_PREFIX, text])
        if fmt == self.FMT_CASHADDR_BCH:
            text = ":".join([net.CASHADDR_PREFIX_BCH, text])
        return text

    def to_ui_string_without_prefix(self, *, net=None) -> str:
        """Convert to text in the current UI format choice.
        If the format is CashAddr, it is produced without the prefix."""
        if net is None:
            net = networks.net
        return self.to_string(self.FMT_UI, net=net)

    def to_ui_string(self, *, net=None) -> str:
        """Convert to text, with a URI prefix if cashaddr."""
        if net is None:
            net = networks.net
        return self.to_full_string(self.FMT_UI, net=net)

    def to_URI_components(self, *, net=None) -> Tuple[str, str]:
        """Returns a (scheme, path) pair for building a URI."""
        if net is None:
            net = networks.net
        scheme = net.CASHADDR_PREFIX
        path = self.to_string(self.FMT_UI, net=net)
        return scheme, path

    def to_storage_string(self, *, net=None):
        """Convert to text in the storage format."""
        if net is None:
            net = networks.net
        return self.to_string(self.FMT_LEGACY, net=net)

    def to_script(self):
        """Return a binary script to pay to the address."""
        if self.kind == self.ADDR_P2PKH:
            return Script.P2PKH_script(self.hash160)
        else:
            return Script.P2SH_script(self.hash160)

    def to_script_hex(self):
        """Return a script to pay to the address as a hex string."""
        return self.to_script().hex()

    def to_scripthash(self):
        """Returns the hash of the script in binary."""
        return sha256(self.to_script())

    def to_scripthash_hex(self):
        """Like other bitcoin hashes this is reversed when written in hex."""
        return hash_to_hex_str(self.to_scripthash())

    def __str__(self):
        return self.to_ui_string()

    def __repr__(self):
        return "<Address {}>".format(self.__str__())


def _match_ops(ops, pattern):
    if len(ops) != len(pattern):
        return False
    for op, pop in zip(ops, pattern):
        if pop != op:
            # -1 means 'data push', whose op is an (op, data) tuple
            if pop == -1 and isinstance(op, tuple):
                continue
            return False

    return True


class Script:
    @classmethod
    def P2SH_script(cls, hash160):
        assert len(hash160) == 20
        return P2SH_prefix + hash160 + P2SH_suffix

    @classmethod
    def P2PKH_script(cls, hash160):
        assert len(hash160) == 20
        return P2PKH_prefix + hash160 + P2PKH_suffix

    @classmethod
    def P2PK_script(cls, pubkey):
        return cls.push_data(pubkey) + bytes([OpCodes.OP_CHECKSIG])

    @classmethod
    def multisig_script(cls, m, pubkeys) -> bytes:
        """Returns the script for a pay-to-multisig transaction."""
        n = len(pubkeys)
        if not 1 <= m <= n <= 15:
            raise ScriptError("{:d} of {:d} multisig script not possible".format(m, n))
        for pubkey in pubkeys:
            PublicKey.validate(pubkey)  # Can be compressed or not
        # See https://bitcoin.org/en/developer-guide
        # 2 of 3 is: OP_2 pubkey1 pubkey2 pubkey3 OP_3 OP_CHECKMULTISIG
        return (
            cls.push_data(bytes([m]))
            + b"".join(cls.push_data(pubkey) for pubkey in pubkeys)
            + cls.push_data(bytes([n]))
            + bytes([OpCodes.OP_CHECKMULTISIG])
        )

    @classmethod
    def push_data(cls, data: Union[bytes, bytearray], *, minimal=True) -> bytes:
        """Returns the OpCodes to push the data on the stack, plus the payload."""
        return push_script_bytes(data, minimal=minimal)

    @classmethod
    def get_ops(
        cls, script: bytes, *, synthesize_minimal_data=True
    ) -> List[Tuple[OpCodes, Optional[bytes]]]:
        """Parse a script and return a list of (opcode, data) tuples.
        If the opcode is not a push operation, data is None.
        """
        ops = []

        # The unpacks or script[n] below throw on truncated scripts
        try:
            n = 0
            while n < len(script):
                op = script[n]
                n += 1

                if op <= OpCodes.OP_PUSHDATA4:
                    if op < OpCodes.OP_PUSHDATA1:
                        # Raw bytes follow
                        dlen = op
                    elif op == OpCodes.OP_PUSHDATA1:
                        # One-byte length, then data
                        dlen = script[n]
                        n += 1
                    elif op == OpCodes.OP_PUSHDATA2:
                        # Two-byte length, then data
                        (dlen,) = struct.unpack("<H", script[n : n + 2])
                        n += 2
                    else:  # op == OpCodes.OP_PUSHDATA4
                        # Four-byte length, then data
                        (dlen,) = struct.unpack("<I", script[n : n + 4])
                        n += 4
                    if n + dlen > len(script):
                        raise IndexError
                    data = script[n : n + dlen]
                    n += dlen
                elif synthesize_minimal_data and OpCodes.OP_1 <= op <= OpCodes.OP_16:
                    # BIP62: 1-byte pushes containing just 0x1 to 0x10 are encoded as single op-codes
                    # We synthesize the data that was originally pushed.
                    data = bytes([1 + (op - OpCodes.OP_1)])
                elif synthesize_minimal_data and op == OpCodes.OP_1NEGATE:
                    # BIP62: 1-byte pushes containing just 0x81 are encoded as single op-codes
                    # We synthesize the data that was originally pushed.
                    data = bytes([0x81])
                else:
                    data = None

                ops.append((op, data))
        except Exception:
            # Truncated script; e.g. tx_hash
            # ebc9fa1196a59e192352d76c0f6e73167046b9d37b8302b6bb6968dfd279b767
            raise ScriptError("truncated script")

        return ops


class Base58Error(Exception):
    """Exception used for Base58 errors."""


class Base58:
    """Class providing base 58 functionality."""

    chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    assert len(chars) == 58
    cmap = {c: n for n, c in enumerate(chars)}

    @staticmethod
    def char_value(c):
        val = Base58.cmap.get(c)
        if val is None:
            raise Base58Error('invalid base 58 character "{}"'.format(c))
        return val

    @staticmethod
    def decode(txt):
        """Decodes txt into a big-endian bytearray."""
        if not isinstance(txt, str):
            raise TypeError("a string is required")

        if not txt:
            raise Base58Error("string cannot be empty")

        value = 0
        for c in txt:
            value = value * 58 + Base58.char_value(c)

        result = int_to_bytes(value)

        # Prepend leading zero bytes if necessary
        count = 0
        for c in txt:
            if c != "1":
                break
            count += 1
        if count:
            result = bytes(count) + result

        return result

    @staticmethod
    def encode(be_bytes):
        """Converts a big-endian bytearray into a base58 string."""
        value = bytes_to_int(be_bytes)

        txt = ""
        while value:
            value, mod = divmod(value, 58)
            txt += Base58.chars[mod]

        for byte in be_bytes:
            if byte != 0:
                break
            txt += "1"

        return txt[::-1]

    @staticmethod
    def decode_check(txt):
        """Decodes a Base58Check-encoded string to a payload.  The version
        prefixes it."""
        be_bytes = Base58.decode(txt)
        result, check = be_bytes[:-4], be_bytes[-4:]
        if check != double_sha256(result)[:4]:
            raise Base58Error("invalid base 58 checksum for {}".format(txt))
        return result

    @staticmethod
    def encode_check(payload):
        """Encodes a payload bytearray (which includes the version byte(s))
        into a Base58Check string."""
        be_bytes = payload + double_sha256(payload)[:4]
        return Base58.encode(be_bytes)
