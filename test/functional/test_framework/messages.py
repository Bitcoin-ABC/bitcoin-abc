# Copyright (c) 2010 ArtForz -- public domain half-a-node
# Copyright (c) 2012 Jeff Garzik
# Copyright (c) 2010-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Bitcoin test framework primitive and message structures

CBlock, CTransaction, CBlockHeader, CTxIn, CTxOut, etc....:
    data structures that should map to corresponding structures in
    bitcoin/primitives

msg_block, msg_tx, msg_headers, etc.:
    data structures that represent network messages

ser_*, deser_*: functions that handle serialization/deserialization.

Classes use __slots__ to ensure extraneous attributes aren't accidentally added
by tests, compromising their intended effect.
"""
import copy
import hashlib
import random
import socket
import struct
import time
import unittest
from base64 import b64decode, b64encode
from enum import IntEnum
from io import BytesIO
from typing import List

from test_framework.siphash import siphash256
from test_framework.util import assert_equal, uint256_hex

MAX_LOCATOR_SZ = 101
MAX_BLOCK_BASE_SIZE = 1000000
MAX_BLOOM_FILTER_SIZE = 36000
MAX_BLOOM_HASH_FUNCS = 50

# 1,000,000 XEC in satoshis (legacy BCHA)
COIN = 100000000
# 1 XEC in satoshis
XEC = 100
MAX_MONEY = 21000000 * COIN

# Maximum length of incoming protocol messages
MAX_PROTOCOL_MESSAGE_LENGTH = 2 * 1024 * 1024
MAX_HEADERS_RESULTS = 2000  # Number of headers sent in one getheaders result
MAX_INV_SIZE = 50000  # Maximum number of entries in an 'inv' protocol message

NODE_NETWORK = 1 << 0
NODE_GETUTXO = 1 << 1
NODE_BLOOM = 1 << 2
# NODE_WITNESS = (1 << 3)
# NODE_XTHIN = (1 << 4) # removed in v0.22.12
NODE_COMPACT_FILTERS = 1 << 6
NODE_NETWORK_LIMITED = 1 << 10
NODE_AVALANCHE = 1 << 24

MSG_UNDEFINED = 0
MSG_TX = 1
MSG_BLOCK = 2
MSG_FILTERED_BLOCK = 3
MSG_CMPCT_BLOCK = 4
MSG_AVA_PROOF = 0x1F000001
MSG_AVA_STAKE_CONTENDER = 0x1F000002
MSG_TYPE_MASK = 0xFFFFFFFF >> 2

FILTER_TYPE_BASIC = 0

# Serialization/deserialization tools


def sha256(s):
    return hashlib.new("sha256", s).digest()


def hash256(s):
    return sha256(sha256(s))


def ser_compact_size(size: int) -> bytes:
    if size < 253:
        r = struct.pack("B", size)
    elif size < 0x10000:
        r = struct.pack("<BH", 253, size)
    elif size < 0x100000000:
        r = struct.pack("<BI", 254, size)
    else:
        r = struct.pack("<BQ", 255, size)
    return r


def deser_compact_size(f) -> int:
    nit = struct.unpack("<B", f.read(1))[0]
    if nit == 253:
        nit = struct.unpack("<H", f.read(2))[0]
    elif nit == 254:
        nit = struct.unpack("<I", f.read(4))[0]
    elif nit == 255:
        nit = struct.unpack("<Q", f.read(8))[0]
    return nit


def deser_string(f) -> bytes:
    nit = deser_compact_size(f)
    return f.read(nit)


def ser_string(s: bytes) -> bytes:
    return ser_compact_size(len(s)) + s


def deser_uint256(f):
    return int.from_bytes(f.read(32), "little")


def ser_uint256(u):
    return u.to_bytes(32, "little")


def uint256_from_str(s: bytes):
    return int.from_bytes(s[:32], "little")


def uint256_from_compact(c):
    nbytes = (c >> 24) & 0xFF
    v = (c & 0xFFFFFF) << (8 * (nbytes - 3))
    return v


# deser_function_name: Allow for an alternate deserialization function on the
# entries in the vector.
def deser_vector(f, c, deser_function_name=None):
    nit = deser_compact_size(f)
    r = []
    for _ in range(nit):
        t = c()
        if deser_function_name:
            getattr(t, deser_function_name)(f)
        else:
            t.deserialize(f)
        r.append(t)
    return r


# ser_function_name: Allow for an alternate serialization function on the
# entries in the vector.
def ser_vector(v, ser_function_name=None):
    r = ser_compact_size(len(v))
    for i in v:
        if ser_function_name:
            r += getattr(i, ser_function_name)()
        else:
            r += i.serialize()
    return r


def deser_uint256_vector(f):
    nit = deser_compact_size(f)
    r = []
    for _ in range(nit):
        t = deser_uint256(f)
        r.append(t)
    return r


def ser_uint256_vector(v):
    r = ser_compact_size(len(v))
    for i in v:
        r += ser_uint256(i)
    return r


def deser_string_vector(f):
    nit = deser_compact_size(f)
    r = []
    for _ in range(nit):
        t = deser_string(f)
        r.append(t)
    return r


def ser_string_vector(v):
    r = ser_compact_size(len(v))
    for sv in v:
        r += ser_string(sv)
    return r


def FromHex(obj, hex_string):
    """Deserialize from a hex string representation (eg from RPC)"""
    obj.deserialize(BytesIO(bytes.fromhex(hex_string)))
    return obj


def ToHex(obj):
    """Convert a binary-serializable object to hex
    (eg for submission via RPC)"""
    return obj.serialize().hex()


# Objects that map to bitcoind objects, which can be serialized/deserialized


class CAddress:
    __slots__ = ("net", "ip", "nServices", "port", "time")

    # see https://github.com/bitcoin/bips/blob/master/bip-0155.mediawiki
    NET_IPV4 = 1

    ADDRV2_NET_NAME = {NET_IPV4: "IPv4"}

    ADDRV2_ADDRESS_LENGTH = {NET_IPV4: 4}

    def __init__(self):
        self.time = 0
        self.nServices = 1
        self.net = self.NET_IPV4
        self.ip = "0.0.0.0"
        self.port = 0

    def deserialize(self, f, *, with_time=True):
        """Deserialize from addrv1 format (pre-BIP155)"""
        if with_time:
            # VERSION messages serialize CAddress objects without time
            self.time = struct.unpack("<I", f.read(4))[0]
        self.nServices = struct.unpack("<Q", f.read(8))[0]
        # We only support IPv4 which means skip 12 bytes and read the next 4 as
        # IPv4 address.
        f.read(12)
        self.net = self.NET_IPV4
        self.ip = socket.inet_ntoa(f.read(4))
        self.port = struct.unpack(">H", f.read(2))[0]

    def serialize(self, *, with_time=True) -> bytes:
        """Serialize in addrv1 format (pre-BIP155)"""
        assert self.net == self.NET_IPV4
        return (
            # VERSION messages serialize CAddress objects without time
            (struct.pack("<I", self.time) if with_time else b"")
            + struct.pack("<Q", self.nServices)
            + b"\x00" * 10
            + b"\xff" * 2
            + socket.inet_aton(self.ip)
            + struct.pack(">H", self.port)
        )

    def deserialize_v2(self, f):
        """Deserialize from addrv2 format (BIP155)"""
        self.time = struct.unpack("<I", f.read(4))[0]

        self.nServices = deser_compact_size(f)

        self.net = struct.unpack("B", f.read(1))[0]
        assert self.net == self.NET_IPV4

        address_length = deser_compact_size(f)
        assert address_length == self.ADDRV2_ADDRESS_LENGTH[self.net]

        self.ip = socket.inet_ntoa(f.read(4))

        self.port = struct.unpack(">H", f.read(2))[0]

    def serialize_v2(self) -> bytes:
        """Serialize in addrv2 format (BIP155)"""
        assert self.net == self.NET_IPV4
        return (
            struct.pack("<I", self.time)
            + ser_compact_size(self.nServices)
            + struct.pack("B", self.net)
            + ser_compact_size(self.ADDRV2_ADDRESS_LENGTH[self.net])
            + socket.inet_aton(self.ip)
            + struct.pack(">H", self.port)
        )

    def __repr__(self):
        return (
            f"CAddress(nServices={self.nServices} net={self.ADDRV2_NET_NAME[self.net]} "
            f"addr={self.ip} port={self.port})"
        )


class CInv:
    __slots__ = ("hash", "type")

    typemap = {
        MSG_UNDEFINED: "Error",
        MSG_TX: "TX",
        MSG_BLOCK: "Block",
        MSG_FILTERED_BLOCK: "filtered Block",
        MSG_CMPCT_BLOCK: "CompactBlock",
        MSG_AVA_PROOF: "avalanche proof",
        MSG_AVA_STAKE_CONTENDER: "avalanche stake contender",
    }

    def __init__(self, t=0, h=0):
        self.type = t
        self.hash = h

    def deserialize(self, f):
        self.type = struct.unpack("<i", f.read(4))[0]
        self.hash = deser_uint256(f)

    def serialize(self) -> bytes:
        return struct.pack("<i", self.type) + ser_uint256(self.hash)

    def __repr__(self):
        return f"CInv(type={self.typemap[self.type]} hash={uint256_hex(self.hash)})"

    def __eq__(self, other):
        return (
            isinstance(other, CInv)
            and self.hash == other.hash
            and self.type == other.type
        )


class CBlockLocator:
    __slots__ = ("nVersion", "vHave")

    def __init__(self):
        self.vHave = []

    def deserialize(self, f):
        # Ignore version field.
        struct.unpack("<i", f.read(4))[0]
        self.vHave = deser_uint256_vector(f)

    def serialize(self) -> bytes:
        # Bitcoin ABC ignores version field. Set it to 0.
        return struct.pack("<i", 0) + ser_uint256_vector(self.vHave)

    def __repr__(self):
        return f"CBlockLocator(vHave={self.vHave!r})"


class COutPoint:
    __slots__ = ("txid", "n")

    def __init__(self, txid=0, n=0):
        self.txid = txid
        self.n = n

    def deserialize(self, f):
        self.txid = deser_uint256(f)
        self.n = struct.unpack("<I", f.read(4))[0]

    def serialize(self) -> bytes:
        return ser_uint256(self.txid) + struct.pack("<I", self.n)

    def __repr__(self):
        return f"COutPoint(txid={uint256_hex(self.txid)} n={self.n})"


class CTxIn:
    __slots__ = ("nSequence", "prevout", "scriptSig")

    def __init__(self, outpoint=None, scriptSig=b"", nSequence=0):
        if outpoint is None:
            self.prevout = COutPoint()
        else:
            self.prevout = outpoint
        self.scriptSig = scriptSig
        self.nSequence = nSequence

    def deserialize(self, f):
        self.prevout = COutPoint()
        self.prevout.deserialize(f)
        self.scriptSig = deser_string(f)
        self.nSequence = struct.unpack("<I", f.read(4))[0]

    def serialize(self) -> bytes:
        return (
            self.prevout.serialize()
            + ser_string(self.scriptSig)
            + struct.pack("<I", self.nSequence)
        )

    def __repr__(self):
        return (
            f"CTxIn(prevout={self.prevout!r} scriptSig={self.scriptSig.hex()} "
            f"nSequence={self.nSequence})"
        )


class CTxOut:
    __slots__ = ("nValue", "scriptPubKey")

    def __init__(self, nValue=0, scriptPubKey=b""):
        self.nValue = nValue
        self.scriptPubKey = scriptPubKey

    def deserialize(self, f):
        self.nValue = struct.unpack("<q", f.read(8))[0]
        self.scriptPubKey = deser_string(f)

    def serialize(self) -> bytes:
        return struct.pack("<q", self.nValue) + ser_string(self.scriptPubKey)

    def __repr__(self):
        return (
            f"CTxOut(nValue={self.nValue // XEC}.{self.nValue % XEC:02d} "
            f"scriptPubKey={self.scriptPubKey.hex()})"
        )


class CTransaction:
    __slots__ = ("hash", "nLockTime", "nVersion", "sha256", "vin", "vout")

    def __init__(self, tx=None):
        if tx is None:
            self.nVersion = 1
            self.vin = []
            self.vout = []
            self.nLockTime = 0
            self.sha256 = None
            self.hash = None
        else:
            self.nVersion = tx.nVersion
            self.vin = copy.deepcopy(tx.vin)
            self.vout = copy.deepcopy(tx.vout)
            self.nLockTime = tx.nLockTime
            self.sha256 = tx.sha256
            self.hash = tx.hash

    def deserialize(self, f):
        self.nVersion = struct.unpack("<i", f.read(4))[0]
        self.vin = deser_vector(f, CTxIn)
        self.vout = deser_vector(f, CTxOut)
        self.nLockTime = struct.unpack("<I", f.read(4))[0]
        self.sha256 = None
        self.hash = None

    def billable_size(self):
        """
        Returns the size used for billing the against the transaction
        """
        return len(self.serialize())

    def serialize(self) -> bytes:
        return (
            struct.pack("<i", self.nVersion)
            + ser_vector(self.vin)
            + ser_vector(self.vout)
            + struct.pack("<I", self.nLockTime)
        )

    # Recalculate the txid
    def rehash(self):
        self.sha256 = None
        self.calc_sha256()
        return self.hash

    # self.sha256 and self.hash -- those are expected to be the txid.
    def calc_sha256(self):
        if self.sha256 is None:
            self.sha256 = uint256_from_str(hash256(self.serialize()))
        self.hash = hash256(self.serialize())[::-1].hex()

    def get_id(self):
        # For now, just forward the hash.
        self.calc_sha256()
        return self.hash

    def is_valid(self):
        self.calc_sha256()
        for tout in self.vout:
            if tout.nValue < 0 or tout.nValue > MAX_MONEY:
                return False
        return True

    def __repr__(self):
        return (
            f"CTransaction(nVersion={self.nVersion} vin={self.vin!r} "
            f"vout={self.vout!r} nLockTime={self.nLockTime})"
        )


class CBlockHeader:
    __slots__ = (
        "hash",
        "hashMerkleRoot",
        "hashPrevBlock",
        "nBits",
        "nNonce",
        "nTime",
        "nVersion",
        "sha256",
    )

    def __init__(self, header=None):
        if header is None:
            self.set_null()
        else:
            self.nVersion = header.nVersion
            self.hashPrevBlock = header.hashPrevBlock
            self.hashMerkleRoot = header.hashMerkleRoot
            self.nTime = header.nTime
            self.nBits = header.nBits
            self.nNonce = header.nNonce
            self.sha256 = header.sha256
            self.hash = header.hash
            self.calc_sha256()

    def set_null(self):
        self.nVersion = 1
        self.hashPrevBlock = 0
        self.hashMerkleRoot = 0
        self.nTime = 0
        self.nBits = 0
        self.nNonce = 0
        self.sha256 = None
        self.hash = None

    def deserialize(self, f):
        self.nVersion = struct.unpack("<i", f.read(4))[0]
        self.hashPrevBlock = deser_uint256(f)
        self.hashMerkleRoot = deser_uint256(f)
        self.nTime = struct.unpack("<I", f.read(4))[0]
        self.nBits = struct.unpack("<I", f.read(4))[0]
        self.nNonce = struct.unpack("<I", f.read(4))[0]
        self.sha256 = None
        self.hash = None

    def serialize(self) -> bytes:
        return (
            struct.pack("<i", self.nVersion)
            + ser_uint256(self.hashPrevBlock)
            + ser_uint256(self.hashMerkleRoot)
            + struct.pack("<I", self.nTime)
            + struct.pack("<I", self.nBits)
            + struct.pack("<I", self.nNonce)
        )

    def calc_sha256(self):
        if self.sha256 is None:
            r = (
                struct.pack("<i", self.nVersion)
                + ser_uint256(self.hashPrevBlock)
                + ser_uint256(self.hashMerkleRoot)
                + struct.pack("<I", self.nTime)
                + struct.pack("<I", self.nBits)
                + struct.pack("<I", self.nNonce)
            )
            self.sha256 = uint256_from_str(hash256(r))
            self.hash = hash256(r)[::-1].hex()

    def rehash(self):
        self.sha256 = None
        self.calc_sha256()
        return self.sha256

    def __repr__(self):
        return (
            f"CBlockHeader(nVersion={self.nVersion} "
            f"hashPrevBlock={uint256_hex(self.hashPrevBlock)} "
            f"hashMerkleRoot={uint256_hex(self.hashMerkleRoot)} nTime={self.nTime} "
            f"nBits={self.nBits:08x} nNonce={self.nNonce:08x})"
        )


BLOCK_HEADER_SIZE = len(CBlockHeader().serialize())
assert_equal(BLOCK_HEADER_SIZE, 80)


class CBlock(CBlockHeader):
    __slots__ = ("vtx",)

    def __init__(self, header=None):
        super().__init__(header)
        self.vtx: List[CTransaction] = []

    def deserialize(self, f):
        super().deserialize(f)
        self.vtx = deser_vector(f, CTransaction)

    def serialize(self) -> bytes:
        return super().serialize() + ser_vector(self.vtx)

    # Calculate the merkle root given a vector of transaction hashes
    def get_merkle_root(self, hashes):
        while len(hashes) > 1:
            newhashes = []
            for i in range(0, len(hashes), 2):
                i2 = min(i + 1, len(hashes) - 1)
                newhashes.append(hash256(hashes[i] + hashes[i2]))
            hashes = newhashes
        return uint256_from_str(hashes[0])

    def calc_merkle_root(self):
        hashes = []
        for tx in self.vtx:
            tx.calc_sha256()
            hashes.append(ser_uint256(tx.sha256))
        return self.get_merkle_root(hashes)

    def is_valid(self):
        self.calc_sha256()
        target = uint256_from_compact(self.nBits)
        if self.sha256 > target:
            return False
        for tx in self.vtx:
            if not tx.is_valid():
                return False
        if self.calc_merkle_root() != self.hashMerkleRoot:
            return False
        return True

    def solve(self):
        self.rehash()
        target = uint256_from_compact(self.nBits)
        while self.sha256 > target:
            self.nNonce += 1
            self.rehash()

    def __repr__(self):
        return (
            f"CBlock(nVersion={self.nVersion} "
            f"hashPrevBlock={uint256_hex(self.hashPrevBlock)} "
            f"hashMerkleRoot={uint256_hex(self.hashMerkleRoot)} "
            f"nTime={self.nTime} nBits={self.nBits:08x} "
            f"nNonce={self.nNonce:08x} vtx={self.vtx!r})"
        )


class PrefilledTransaction:
    __slots__ = ("index", "tx")

    def __init__(self, index=0, tx=None):
        self.index = index
        self.tx = tx

    def deserialize(self, f):
        self.index = deser_compact_size(f)
        self.tx = CTransaction()
        self.tx.deserialize(f)

    def serialize(self) -> bytes:
        return ser_compact_size(self.index) + self.tx.serialize()

    def __repr__(self):
        return f"PrefilledTransaction(index={self.index}, tx={self.tx!r})"


# This is what we send on the wire, in a cmpctblock message.
class P2PHeaderAndShortIDs:
    __slots__ = (
        "header",
        "nonce",
        "prefilled_txn",
        "prefilled_txn_length",
        "shortids",
        "shortids_length",
    )

    def __init__(self):
        self.header = CBlockHeader()
        self.nonce = 0
        self.shortids_length = 0
        self.shortids = []
        self.prefilled_txn_length = 0
        self.prefilled_txn = []

    def deserialize(self, f):
        self.header.deserialize(f)
        self.nonce = struct.unpack("<Q", f.read(8))[0]
        self.shortids_length = deser_compact_size(f)
        for _ in range(self.shortids_length):
            # shortids are defined to be 6 bytes in the spec, so append
            # two zero bytes and read it in as an 8-byte number
            self.shortids.append(struct.unpack("<Q", f.read(6) + b"\x00\x00")[0])
        self.prefilled_txn = deser_vector(f, PrefilledTransaction)
        self.prefilled_txn_length = len(self.prefilled_txn)

    def serialize(self) -> bytes:
        return (
            self.header.serialize()
            + struct.pack("<Q", self.nonce)
            + ser_compact_size(self.shortids_length)
            # We only want the first 6 bytes
            + b"".join(struct.pack("<Q", x)[0:6] for x in self.shortids)
            + ser_vector(self.prefilled_txn)
        )

    def __repr__(self):
        return (
            f"P2PHeaderAndShortIDs(header={self.header!r}, nonce={self.nonce}, "
            f"shortids_length={self.shortids_length}, shortids={self.shortids!r}, "
            f"prefilled_txn_length={self.prefilled_txn_length}, "
            f"prefilledtxn={self.prefilled_txn!r}"
        )


def calculate_shortid(k0, k1, tx_hash):
    """Calculate the BIP 152-compact blocks shortid for a given
    transaction hash"""
    expected_shortid = siphash256(k0, k1, tx_hash)
    expected_shortid &= 0x0000FFFFFFFFFFFF
    return expected_shortid


# This version gets rid of the array lengths, and reinterprets the differential
# encoding into indices that can be used for lookup.
class HeaderAndShortIDs:
    __slots__ = ("header", "nonce", "prefilled_txn", "shortids")

    def __init__(self, p2pheaders_and_shortids=None):
        self.header = CBlockHeader()
        self.nonce = 0
        self.shortids = []
        self.prefilled_txn = []

        if p2pheaders_and_shortids is not None:
            self.header = p2pheaders_and_shortids.header
            self.nonce = p2pheaders_and_shortids.nonce
            self.shortids = p2pheaders_and_shortids.shortids
            last_index = -1
            for x in p2pheaders_and_shortids.prefilled_txn:
                self.prefilled_txn.append(
                    PrefilledTransaction(x.index + last_index + 1, x.tx)
                )
                last_index = self.prefilled_txn[-1].index

    def to_p2p(self):
        ret = P2PHeaderAndShortIDs()
        ret.header = self.header
        ret.nonce = self.nonce
        ret.shortids_length = len(self.shortids)
        ret.shortids = self.shortids
        ret.prefilled_txn_length = len(self.prefilled_txn)
        ret.prefilled_txn = []
        last_index = -1
        for x in self.prefilled_txn:
            ret.prefilled_txn.append(
                PrefilledTransaction(x.index - last_index - 1, x.tx)
            )
            last_index = x.index
        return ret

    def get_siphash_keys(self):
        header_nonce = self.header.serialize()
        header_nonce += struct.pack("<Q", self.nonce)
        hash_header_nonce_as_str = sha256(header_nonce)
        key0 = struct.unpack("<Q", hash_header_nonce_as_str[0:8])[0]
        key1 = struct.unpack("<Q", hash_header_nonce_as_str[8:16])[0]
        return [key0, key1]

    def initialize_from_block(self, block, nonce=0, prefill_list=None):
        if prefill_list is None:
            prefill_list = [0]
        self.header = CBlockHeader(block)
        self.nonce = nonce
        self.prefilled_txn = [
            PrefilledTransaction(i, block.vtx[i]) for i in prefill_list
        ]
        self.shortids = []
        [k0, k1] = self.get_siphash_keys()
        for i in range(len(block.vtx)):
            if i not in prefill_list:
                tx_hash = block.vtx[i].sha256
                self.shortids.append(calculate_shortid(k0, k1, tx_hash))

    def __repr__(self):
        return (
            f"HeaderAndShortIDs(header={self.header!r}, nonce={self.nonce}, "
            f"shortids={self.shortids!r}, prefilledtxn={self.prefilled_txn!r}"
        )


class BlockTransactionsRequest:
    __slots__ = ("blockhash", "indexes")

    def __init__(self, blockhash=0, indexes=None):
        self.blockhash = blockhash
        self.indexes = indexes if indexes is not None else []

    def deserialize(self, f):
        self.blockhash = deser_uint256(f)
        indexes_length = deser_compact_size(f)
        for _ in range(indexes_length):
            self.indexes.append(deser_compact_size(f))

    def serialize(self) -> bytes:
        return (
            ser_uint256(self.blockhash)
            + ser_compact_size(len(self.indexes))
            + b"".join(ser_compact_size(x) for x in self.indexes)
        )

    # helper to set the differentially encoded indexes from absolute ones
    def from_absolute(self, absolute_indexes):
        self.indexes = []
        last_index = -1
        for x in absolute_indexes:
            self.indexes.append(x - last_index - 1)
            last_index = x

    def to_absolute(self):
        absolute_indexes = []
        last_index = -1
        for x in self.indexes:
            absolute_indexes.append(x + last_index + 1)
            last_index = absolute_indexes[-1]
        return absolute_indexes

    def __repr__(self):
        return (
            f"BlockTransactionsRequest(hash={uint256_hex(self.blockhash)} "
            f"indexes={self.indexes!r})"
        )


class BlockTransactions:
    __slots__ = ("blockhash", "transactions")

    def __init__(self, blockhash=0, transactions=None):
        self.blockhash = blockhash
        self.transactions = transactions if transactions is not None else []

    def deserialize(self, f):
        self.blockhash = deser_uint256(f)
        self.transactions = deser_vector(f, CTransaction)

    def serialize(self) -> bytes:
        return ser_uint256(self.blockhash) + ser_vector(self.transactions)

    def __repr__(self):
        return (
            f"BlockTransactions(hash={uint256_hex(self.blockhash)} "
            f"transactions={self.transactions!r})"
        )


class AvalancheStake:
    __slots__ = ("utxo", "amount", "height", "pubkey", "is_coinbase")

    def __init__(self, utxo=None, amount=0, height=0, pubkey=b"", is_coinbase=False):
        self.utxo: COutPoint = utxo or COutPoint()
        self.amount: int = amount
        """Amount in satoshis (int64)"""
        self.height: int = height
        """Block height containing this utxo (uint32)"""
        self.pubkey: bytes = pubkey
        """Public key"""

        self.is_coinbase: bool = is_coinbase

    def deserialize(self, f):
        self.utxo = COutPoint()
        self.utxo.deserialize(f)
        self.amount = struct.unpack("<q", f.read(8))[0]
        height_ser = struct.unpack("<I", f.read(4))[0]
        self.is_coinbase = bool(height_ser & 1)
        self.height = height_ser >> 1
        self.pubkey = deser_string(f)

    def serialize(self) -> bytes:
        height_ser = self.height << 1 | int(self.is_coinbase)
        return (
            self.utxo.serialize()
            + struct.pack("<q", self.amount)
            + struct.pack("<I", height_ser)
            + ser_compact_size(len(self.pubkey))
            + self.pubkey
        )

    def __repr__(self):
        return (
            f"AvalancheStake(utxo={self.utxo}, amount={self.amount},"
            f" height={self.height}, "
            f"pubkey={self.pubkey.hex()})"
        )


class AvalancheSignedStake:
    __slots__ = ("stake", "sig")

    def __init__(self, stake=None, sig=b""):
        self.stake: AvalancheStake = stake or AvalancheStake()
        self.sig: bytes = sig
        """Signature for this stake, bytes of length 64"""

    def deserialize(self, f):
        self.stake = AvalancheStake()
        self.stake.deserialize(f)
        self.sig = f.read(64)

    def serialize(self) -> bytes:
        return self.stake.serialize() + self.sig


class AvalancheProof:
    __slots__ = (
        "sequence",
        "expiration",
        "master",
        "stakes",
        "payout_script",
        "signature",
        "limited_proofid",
        "proofid",
    )

    def __init__(
        self,
        sequence=0,
        expiration=0,
        master=b"",
        signed_stakes=None,
        payout_script=b"",
        signature=b"",
    ):
        self.sequence: int = sequence
        self.expiration: int = expiration
        self.master: bytes = master

        self.stakes: List[AvalancheSignedStake] = signed_stakes or [
            AvalancheSignedStake()
        ]

        self.payout_script = payout_script
        self.signature = signature

        self.limited_proofid: int = None
        self.proofid: int = None
        self.compute_proof_id()

    def compute_proof_id(self):
        """Compute Bitcoin's 256-bit hash (double SHA-256) of the
        serialized proof data.
        """
        ss = struct.pack("<Qq", self.sequence, self.expiration)
        ss += ser_string(self.payout_script)
        ss += ser_compact_size(len(self.stakes))
        # Use unsigned stakes
        for s in self.stakes:
            ss += s.stake.serialize()
        h = hash256(ss)
        self.limited_proofid = uint256_from_str(h)
        h += ser_string(self.master)
        h = hash256(h)
        # make it an int, for comparing with Delegation.proofid
        self.proofid = uint256_from_str(h)

    def deserialize(self, f):
        self.sequence = struct.unpack("<Q", f.read(8))[0]
        self.expiration = struct.unpack("<q", f.read(8))[0]
        self.master = deser_string(f)
        self.stakes = deser_vector(f, AvalancheSignedStake)
        self.payout_script = deser_string(f)
        self.signature = f.read(64)
        self.compute_proof_id()

    def serialize(self) -> bytes:
        return (
            struct.pack("<Q", self.sequence)
            + struct.pack("<q", self.expiration)
            + ser_string(self.master)
            + ser_vector(self.stakes)
            + ser_string(self.payout_script)
            + self.signature
        )

    def __repr__(self):
        return (
            f"AvalancheProof(proofid={uint256_hex(self.proofid)}, "
            f"limited_proofid={uint256_hex(self.limited_proofid)}, "
            f"sequence={self.sequence}, "
            f"expiration={self.expiration}, "
            f"master={self.master.hex()}, "
            f"payout_script={self.payout_script.hex()}, "
            f"signature={b64encode(self.signature)}, "
            f"stakes={self.stakes})"
        )


class AvalanchePrefilledProof:
    __slots__ = ("index", "proof")

    def __init__(self, index=0, proof=None):
        self.index = index
        self.proof = proof or AvalancheProof()

    def deserialize(self, f):
        self.index = deser_compact_size(f)
        self.proof.deserialize(f)

    def serialize(self) -> bytes:
        return ser_compact_size(self.index) + self.proof.serialize()

    def __repr__(self):
        return f"AvalanchePrefilledProof(index={self.index}, proof={self.proof!r})"


class AvalanchePoll:
    __slots__ = ("round", "invs")

    def __init__(self, avaround=0, invs=None):
        self.round = avaround
        self.invs = invs if invs is not None else []

    def deserialize(self, f):
        self.round = struct.unpack("<q", f.read(8))[0]
        self.invs = deser_vector(f, CInv)

    def serialize(self) -> bytes:
        return struct.pack("<q", self.round) + ser_vector(self.invs)

    def __repr__(self):
        return f"AvalanchePoll(round={self.round}, invs={self.invs!r})"


class AvalancheVoteError(IntEnum):
    ACCEPTED = 0
    INVALID = 1
    PARKED = 2
    FORK = 3
    UNKNOWN = -1
    MISSING = -2
    PENDING = -3


class AvalancheProofVoteResponse(IntEnum):
    ACTIVE = 0
    REJECTED = 1
    IMMATURE = 2
    CONFLICT = 3
    UNKNOWN = -1


class AvalancheTxVoteError(IntEnum):
    ACCEPTED = 0
    INVALID = 1
    CONFLICTING = 2
    UNKNOWN = -1
    ORPHAN = -2


class AvalancheContenderVoteError(IntEnum):
    ACCEPTED = 0
    INVALID = 1
    UNKNOWN = -1
    PENDING = -2


class AvalancheVote:
    __slots__ = ("error", "hash")

    def __init__(self, e=0, h=0):
        self.error = e
        self.hash = h

    def deserialize(self, f):
        self.error = struct.unpack("<i", f.read(4))[0]
        self.hash = deser_uint256(f)

    def serialize(self) -> bytes:
        return struct.pack("<i", self.error) + ser_uint256(self.hash)

    def __repr__(self):
        return f"AvalancheVote(error={self.error}, hash={uint256_hex(self.hash)})"


class AvalancheResponse:
    __slots__ = ("round", "cooldown", "votes")

    def __init__(self, avaround=0, cooldown=0, votes=None):
        self.round = avaround
        self.cooldown = cooldown
        self.votes = votes if votes is not None else []

    def deserialize(self, f):
        self.round = struct.unpack("<q", f.read(8))[0]
        self.cooldown = struct.unpack("<i", f.read(4))[0]
        self.votes = deser_vector(f, AvalancheVote)

    def serialize(self) -> bytes:
        return (
            struct.pack("<q", self.round)
            + struct.pack("<i", self.cooldown)
            + ser_vector(self.votes)
        )

    def get_hash(self):
        return hash256(self.serialize())

    def __repr__(self):
        return (
            f"AvalancheResponse(round={self.round}, cooldown={self.cooldown}, "
            f"votes={self.votes!r})"
        )


class TCPAvalancheResponse:
    __slots__ = ("response", "sig")

    def __init__(self, response=AvalancheResponse(), sig=b"\0" * 64):
        self.response = response
        self.sig = sig

    def deserialize(self, f):
        self.response.deserialize(f)
        self.sig = f.read(64)

    def serialize(self) -> bytes:
        return self.response.serialize() + self.sig

    def __repr__(self):
        return f"TCPAvalancheResponse(response={self.response!r}, sig={self.sig})"


class AvalancheDelegationLevel:
    __slots__ = ("pubkey", "sig")

    def __init__(self, pubkey=b"", sig=b"\0" * 64):
        self.pubkey = pubkey
        self.sig = sig

    def deserialize(self, f):
        self.pubkey = deser_string(f)
        self.sig = f.read(64)

    def serialize(self) -> bytes:
        return ser_string(self.pubkey) + self.sig

    def __repr__(self):
        return f"AvalancheDelegationLevel(pubkey={self.pubkey.hex()}, sig={self.sig})"


class AvalancheDelegation:
    __slots__ = ("limited_proofid", "proof_master", "proofid", "levels")

    def __init__(self, limited_proofid=0, proof_master=b"", levels=None):
        self.limited_proofid: int = limited_proofid
        self.proof_master: bytes = proof_master
        self.levels: List[AvalancheDelegationLevel] = levels or []
        self.proofid: int = self.compute_proofid()

    def compute_proofid(self) -> int:
        return uint256_from_str(
            hash256(ser_uint256(self.limited_proofid) + ser_string(self.proof_master))
        )

    def deserialize(self, f):
        self.limited_proofid = deser_uint256(f)
        self.proof_master = deser_string(f)
        self.levels = deser_vector(f, AvalancheDelegationLevel)

        self.proofid = self.compute_proofid()

    def serialize(self) -> bytes:
        return (
            ser_uint256(self.limited_proofid)
            + ser_string(self.proof_master)
            + ser_vector(self.levels)
        )

    def __repr__(self):
        return (
            "AvalancheDelegation("
            f"limitedProofId={uint256_hex(self.limited_proofid)}, "
            f"proofMaster={self.proof_master.hex()}, "
            f"proofid={uint256_hex(self.proofid)}, "
            f"levels={self.levels})"
        )

    def getid(self):
        h = ser_uint256(self.proofid)
        for level in self.levels:
            h = hash256(h + ser_string(level.pubkey))
        return h


class AvalancheHello:
    __slots__ = ("delegation", "sig")

    def __init__(self, delegation=AvalancheDelegation(), sig=b"\0" * 64):
        self.delegation = delegation
        self.sig = sig

    def deserialize(self, f):
        self.delegation.deserialize(f)
        self.sig = f.read(64)

    def serialize(self) -> bytes:
        return self.delegation.serialize() + self.sig

    def __repr__(self):
        return f"AvalancheHello(delegation={self.delegation!r}, sig={self.sig})"

    def get_sighash(self, node):
        b = self.delegation.getid()
        b += struct.pack("<Q", node.remote_nonce)
        b += struct.pack("<Q", node.local_nonce)
        b += struct.pack("<Q", node.remote_extra_entropy)
        b += struct.pack("<Q", node.local_extra_entropy)
        return hash256(b)


class CPartialMerkleTree:
    __slots__ = ("nTransactions", "vBits", "vHash")

    def __init__(self):
        self.nTransactions = 0
        self.vHash = []
        self.vBits = []

    def deserialize(self, f):
        self.nTransactions = struct.unpack("<i", f.read(4))[0]
        self.vHash = deser_uint256_vector(f)
        vBytes = deser_string(f)
        self.vBits = []
        for i in range(len(vBytes) * 8):
            self.vBits.append(vBytes[i // 8] & (1 << (i % 8)) != 0)

    def serialize(self) -> bytes:
        vBytesArray = bytearray([0x00] * ((len(self.vBits) + 7) // 8))
        for i in range(len(self.vBits)):
            vBytesArray[i // 8] |= self.vBits[i] << (i % 8)
        return (
            struct.pack("<i", self.nTransactions)
            + ser_uint256_vector(self.vHash)
            + ser_string(bytes(vBytesArray))
        )

    def __repr__(self):
        return (
            f"CPartialMerkleTree(nTransactions={self.nTransactions}, "
            f"Hash={self.vHash!r}, vBits={self.vBits!r})"
        )


class CMerkleBlock:
    __slots__ = ("header", "txn")

    def __init__(self):
        self.header = CBlockHeader()
        self.txn = CPartialMerkleTree()

    def deserialize(self, f):
        self.header.deserialize(f)
        self.txn.deserialize(f)

    def serialize(self) -> bytes:
        return self.header.serialize() + self.txn.serialize()

    def __repr__(self):
        return f"CMerkleBlock(header={self.header!r}, txn={self.txn!r})"


# Objects that correspond to messages on the wire


class msg_version:
    __slots__ = (
        "addrFrom",
        "addrTo",
        "nNonce",
        "relay",
        "nServices",
        "nStartingHeight",
        "nTime",
        "nVersion",
        "strSubVer",
        "nExtraEntropy",
    )
    msgtype = b"version"

    def __init__(self):
        self.nVersion = 0
        self.nServices = 0
        self.nTime = int(time.time())
        self.addrTo = CAddress()
        self.addrFrom = CAddress()
        self.nNonce = random.getrandbits(64)
        self.strSubVer = ""
        self.nStartingHeight = -1
        self.relay = 0
        self.nExtraEntropy = random.getrandbits(64)

    def deserialize(self, f):
        self.nVersion = struct.unpack("<i", f.read(4))[0]
        self.nServices = struct.unpack("<Q", f.read(8))[0]
        self.nTime = struct.unpack("<q", f.read(8))[0]
        self.addrTo = CAddress()
        self.addrTo.deserialize(f, with_time=False)

        self.addrFrom = CAddress()
        self.addrFrom.deserialize(f, with_time=False)
        self.nNonce = struct.unpack("<Q", f.read(8))[0]
        self.strSubVer = deser_string(f).decode("utf-8")

        self.nStartingHeight = struct.unpack("<i", f.read(4))[0]

        self.relay = struct.unpack("<b", f.read(1))[0]

        self.nExtraEntropy = struct.unpack("<Q", f.read(8))[0]

    def serialize(self) -> bytes:
        return (
            struct.pack("<i", self.nVersion)
            + struct.pack("<Q", self.nServices)
            + struct.pack("<q", self.nTime)
            + self.addrTo.serialize(with_time=False)
            + self.addrFrom.serialize(with_time=False)
            + struct.pack("<Q", self.nNonce)
            + ser_string(self.strSubVer.encode("utf-8"))
            + struct.pack("<i", self.nStartingHeight)
            + struct.pack("<b", self.relay)
            + struct.pack("<Q", self.nExtraEntropy)
        )

    def __repr__(self):
        return (
            f"msg_version(nVersion={self.nVersion} nServices={self.nServices} "
            f"nTime={self.nTime} addrTo={self.addrTo!r} addrFrom={self.addrFrom!r} "
            f"nNonce=0x{self.nNonce:016X} strSubVer={self.strSubVer} "
            f"nStartingHeight={self.nStartingHeight} relay={self.relay} "
            f"nExtraEntropy={self.nExtraEntropy})"
        )


class msg_verack:
    __slots__ = ()
    msgtype = b"verack"

    def __init__(self):
        pass

    def deserialize(self, f):
        pass

    def serialize(self) -> bytes:
        return b""

    def __repr__(self):
        return "msg_verack()"


class msg_addr:
    __slots__ = ("addrs",)
    msgtype = b"addr"

    def __init__(self):
        self.addrs = []

    def deserialize(self, f):
        self.addrs = deser_vector(f, CAddress)

    def serialize(self) -> bytes:
        return ser_vector(self.addrs)

    def __repr__(self):
        return f"msg_addr(addrs={self.addrs!r})"


class msg_addrv2:
    __slots__ = ("addrs",)
    msgtype = b"addrv2"

    def __init__(self):
        self.addrs = []

    def deserialize(self, f):
        self.addrs = deser_vector(f, CAddress, "deserialize_v2")

    def serialize(self) -> bytes:
        return ser_vector(self.addrs, "serialize_v2")

    def __repr__(self):
        return f"msg_addrv2(addrs={self.addrs!r})"


class msg_sendaddrv2:
    __slots__ = ()
    msgtype = b"sendaddrv2"

    def __init__(self):
        pass

    def deserialize(self, f):
        pass

    def serialize(self) -> bytes:
        return b""

    def __repr__(self):
        return "msg_sendaddrv2()"


class msg_inv:
    __slots__ = ("inv",)
    msgtype = b"inv"

    def __init__(self, inv=None):
        if inv is None:
            self.inv = []
        else:
            self.inv = inv

    def deserialize(self, f):
        self.inv = deser_vector(f, CInv)

    def serialize(self) -> bytes:
        return ser_vector(self.inv)

    def __repr__(self):
        return f"msg_inv(inv={self.inv!r})"


class msg_getdata:
    __slots__ = ("inv",)
    msgtype = b"getdata"

    def __init__(self, inv=None):
        self.inv = inv if inv is not None else []

    def deserialize(self, f):
        self.inv = deser_vector(f, CInv)

    def serialize(self) -> bytes:
        return ser_vector(self.inv)

    def __repr__(self):
        return f"msg_getdata(inv={self.inv!r})"


class msg_getblocks:
    __slots__ = ("locator", "hashstop")
    msgtype = b"getblocks"

    def __init__(self):
        self.locator = CBlockLocator()
        self.hashstop = 0

    def deserialize(self, f):
        self.locator = CBlockLocator()
        self.locator.deserialize(f)
        self.hashstop = deser_uint256(f)

    def serialize(self) -> bytes:
        return self.locator.serialize() + ser_uint256(self.hashstop)

    def __repr__(self):
        return (
            f"msg_getblocks(locator={self.locator!r} "
            f"hashstop={uint256_hex(self.hashstop)})"
        )


class msg_tx:
    __slots__ = ("tx",)
    msgtype = b"tx"

    def __init__(self, tx=CTransaction()):
        self.tx = tx

    def deserialize(self, f):
        self.tx.deserialize(f)

    def serialize(self) -> bytes:
        return self.tx.serialize()

    def __repr__(self):
        return f"msg_tx(tx={self.tx!r})"


class msg_block:
    __slots__ = ("block",)
    msgtype = b"block"

    def __init__(self, block=None):
        if block is None:
            self.block = CBlock()
        else:
            self.block = block

    def deserialize(self, f):
        self.block.deserialize(f)

    def serialize(self) -> bytes:
        return self.block.serialize()

    def __repr__(self):
        return f"msg_block(block={self.block!r})"


# for cases where a user needs tighter control over what is sent over the wire
# note that the user must supply the name of the msgtype, and the data
class msg_generic:
    __slots__ = "data"

    def __init__(self, msgtype, data=None):
        self.msgtype = msgtype
        self.data = data

    def serialize(self) -> bytes:
        return self.data

    def __repr__(self):
        return "msg_generic()"


class msg_getaddr:
    __slots__ = ()
    msgtype = b"getaddr"

    def __init__(self):
        pass

    def deserialize(self, f):
        pass

    def serialize(self) -> bytes:
        return b""

    def __repr__(self):
        return "msg_getaddr()"


class msg_ping:
    __slots__ = ("nonce",)
    msgtype = b"ping"

    def __init__(self, nonce=0):
        self.nonce = nonce

    def deserialize(self, f):
        self.nonce = struct.unpack("<Q", f.read(8))[0]

    def serialize(self) -> bytes:
        return struct.pack("<Q", self.nonce)

    def __repr__(self):
        return f"msg_ping(nonce={self.nonce:08x})"


class msg_pong:
    __slots__ = ("nonce",)
    msgtype = b"pong"

    def __init__(self, nonce=0):
        self.nonce = nonce

    def deserialize(self, f):
        self.nonce = struct.unpack("<Q", f.read(8))[0]

    def serialize(self) -> bytes:
        return struct.pack("<Q", self.nonce)

    def __repr__(self):
        return f"msg_pong(nonce={self.nonce:08x})"


class msg_mempool:
    __slots__ = ()
    msgtype = b"mempool"

    def __init__(self):
        pass

    def deserialize(self, f):
        pass

    def serialize(self) -> bytes:
        return b""

    def __repr__(self):
        return "msg_mempool()"


class msg_notfound:
    __slots__ = ("vec",)
    msgtype = b"notfound"

    def __init__(self, vec=None):
        self.vec = vec or []

    def deserialize(self, f):
        self.vec = deser_vector(f, CInv)

    def serialize(self) -> bytes:
        return ser_vector(self.vec)

    def __repr__(self):
        return f"msg_notfound(vec={self.vec!r})"


class msg_sendheaders:
    __slots__ = ()
    msgtype = b"sendheaders"

    def __init__(self):
        pass

    def deserialize(self, f):
        pass

    def serialize(self) -> bytes:
        return b""

    def __repr__(self):
        return "msg_sendheaders()"


# getheaders message has
# number of entries
# vector of hashes
# hash_stop (hash of last desired block header, 0 to get as many as possible)
class msg_getheaders:
    __slots__ = (
        "hashstop",
        "locator",
    )
    msgtype = b"getheaders"

    def __init__(self):
        self.locator = CBlockLocator()
        self.hashstop = 0

    def deserialize(self, f):
        self.locator = CBlockLocator()
        self.locator.deserialize(f)
        self.hashstop = deser_uint256(f)

    def serialize(self) -> bytes:
        return self.locator.serialize() + ser_uint256(self.hashstop)

    def __repr__(self):
        return (
            f"msg_getheaders(locator={self.locator!r}, "
            f"stop={uint256_hex(self.hashstop)})"
        )


# headers message has
# <count> <vector of block headers>
class msg_headers:
    __slots__ = ("headers",)
    msgtype = b"headers"

    def __init__(self, headers=None):
        self.headers = headers if headers is not None else []

    def deserialize(self, f):
        # comment in bitcoind indicates these should be deserialized as blocks
        blocks = deser_vector(f, CBlock)
        for x in blocks:
            self.headers.append(CBlockHeader(x))

    def serialize(self) -> bytes:
        blocks = [CBlock(x) for x in self.headers]
        return ser_vector(blocks)

    def __repr__(self):
        return f"msg_headers(headers={self.headers!r})"


class msg_merkleblock:
    __slots__ = ("merkleblock",)
    msgtype = b"merkleblock"

    def __init__(self, merkleblock=None):
        if merkleblock is None:
            self.merkleblock = CMerkleBlock()
        else:
            self.merkleblock = merkleblock

    def deserialize(self, f):
        self.merkleblock.deserialize(f)

    def serialize(self) -> bytes:
        return self.merkleblock.serialize()

    def __repr__(self):
        return f"msg_merkleblock(merkleblock={self.merkleblock!r})"


class msg_filterload:
    __slots__ = ("data", "nHashFuncs", "nTweak", "nFlags")
    msgtype = b"filterload"

    def __init__(self, data=b"00", nHashFuncs=0, nTweak=0, nFlags=0):
        self.data = data
        self.nHashFuncs = nHashFuncs
        self.nTweak = nTweak
        self.nFlags = nFlags

    def deserialize(self, f):
        self.data = deser_string(f)
        self.nHashFuncs = struct.unpack("<I", f.read(4))[0]
        self.nTweak = struct.unpack("<I", f.read(4))[0]
        self.nFlags = struct.unpack("<B", f.read(1))[0]

    def serialize(self) -> bytes:
        return (
            ser_string(self.data)
            + struct.pack("<I", self.nHashFuncs)
            + struct.pack("<I", self.nTweak)
            + struct.pack("<B", self.nFlags)
        )

    def __repr__(self):
        return (
            f"msg_filterload(data={self.data}, nHashFuncs={self.nHashFuncs}, "
            f"nTweak={self.nTweak}, nFlags={self.nFlags})"
        )


class msg_filteradd:
    __slots__ = "data"
    msgtype = b"filteradd"

    def __init__(self, data):
        self.data = data

    def deserialize(self, f):
        self.data = deser_string(f)

    def serialize(self) -> bytes:
        return ser_string(self.data)

    def __repr__(self):
        return f"msg_filteradd(data={self.data})"


class msg_filterclear:
    __slots__ = ()
    msgtype = b"filterclear"

    def __init__(self):
        pass

    def deserialize(self, f):
        pass

    def serialize(self) -> bytes:
        return b""

    def __repr__(self):
        return "msg_filterclear()"


class msg_feefilter:
    __slots__ = ("feerate",)
    msgtype = b"feefilter"

    def __init__(self, feerate=0):
        self.feerate = feerate

    def deserialize(self, f):
        self.feerate = struct.unpack("<Q", f.read(8))[0]

    def serialize(self) -> bytes:
        return struct.pack("<Q", self.feerate)

    def __repr__(self):
        return f"msg_feefilter(feerate={self.feerate:08x})"


class msg_sendcmpct:
    __slots__ = ("announce", "version")
    msgtype = b"sendcmpct"

    def __init__(self, announce=False, version=1):
        self.announce = announce
        self.version = version

    def deserialize(self, f):
        self.announce = struct.unpack("<?", f.read(1))[0]
        self.version = struct.unpack("<Q", f.read(8))[0]

    def serialize(self) -> bytes:
        return struct.pack("<?", self.announce) + struct.pack("<Q", self.version)

    def __repr__(self):
        return f"msg_sendcmpct(announce={self.announce}, version={self.version})"


class msg_cmpctblock:
    __slots__ = ("header_and_shortids",)
    msgtype = b"cmpctblock"

    def __init__(self, header_and_shortids=None):
        self.header_and_shortids = header_and_shortids

    def deserialize(self, f):
        self.header_and_shortids = P2PHeaderAndShortIDs()
        self.header_and_shortids.deserialize(f)

    def serialize(self) -> bytes:
        return self.header_and_shortids.serialize()

    def __repr__(self):
        return f"msg_cmpctblock(HeaderAndShortIDs={self.header_and_shortids!r})"


class msg_getblocktxn:
    __slots__ = ("block_txn_request",)
    msgtype = b"getblocktxn"

    def __init__(self):
        self.block_txn_request = None

    def deserialize(self, f):
        self.block_txn_request = BlockTransactionsRequest()
        self.block_txn_request.deserialize(f)

    def serialize(self) -> bytes:
        return self.block_txn_request.serialize()

    def __repr__(self):
        return f"msg_getblocktxn(block_txn_request={self.block_txn_request!r})"


class msg_blocktxn:
    __slots__ = ("block_transactions",)
    msgtype = b"blocktxn"

    def __init__(self):
        self.block_transactions = BlockTransactions()

    def deserialize(self, f):
        self.block_transactions.deserialize(f)

    def serialize(self) -> bytes:
        return self.block_transactions.serialize()

    def __repr__(self):
        return f"msg_blocktxn(block_transactions={self.block_transactions!r})"


class msg_getcfilters:
    __slots__ = ("filter_type", "start_height", "stop_hash")
    msgtype = b"getcfilters"

    def __init__(self, filter_type, start_height, stop_hash):
        self.filter_type = filter_type
        self.start_height = start_height
        self.stop_hash = stop_hash

    def deserialize(self, f):
        self.filter_type = struct.unpack("<B", f.read(1))[0]
        self.start_height = struct.unpack("<I", f.read(4))[0]
        self.stop_hash = deser_uint256(f)

    def serialize(self) -> bytes:
        return (
            struct.pack("<B", self.filter_type)
            + struct.pack("<I", self.start_height)
            + ser_uint256(self.stop_hash)
        )

    def __repr__(self):
        return (
            f"msg_getcfilters(filter_type={self.filter_type:#x}, "
            f"start_height={self.start_height}, stop_hash={self.stop_hash:x})"
        )


class msg_cfilter:
    __slots__ = ("filter_type", "block_hash", "filter_data")
    msgtype = b"cfilter"

    def __init__(self, filter_type=None, block_hash=None, filter_data=None):
        self.filter_type = filter_type
        self.block_hash = block_hash
        self.filter_data = filter_data

    def deserialize(self, f):
        self.filter_type = struct.unpack("<B", f.read(1))[0]
        self.block_hash = deser_uint256(f)
        self.filter_data = deser_string(f)

    def serialize(self) -> bytes:
        return (
            struct.pack("<B", self.filter_type)
            + ser_uint256(self.block_hash)
            + ser_string(self.filter_data)
        )

    def __repr__(self):
        return (
            f"msg_cfilter(filter_type={self.filter_type:#x}, "
            f"block_hash={self.block_hash:x})"
        )


class msg_getcfheaders:
    __slots__ = ("filter_type", "start_height", "stop_hash")
    msgtype = b"getcfheaders"

    def __init__(self, filter_type, start_height, stop_hash):
        self.filter_type = filter_type
        self.start_height = start_height
        self.stop_hash = stop_hash

    def deserialize(self, f):
        self.filter_type = struct.unpack("<B", f.read(1))[0]
        self.start_height = struct.unpack("<I", f.read(4))[0]
        self.stop_hash = deser_uint256(f)

    def serialize(self) -> bytes:
        return (
            struct.pack("<B", self.filter_type)
            + struct.pack("<I", self.start_height)
            + ser_uint256(self.stop_hash)
        )

    def __repr__(self):
        return (
            f"msg_getcfheaders(filter_type={self.filter_type:#x}, "
            f"start_height={self.start_height}, stop_hash={self.stop_hash:x})"
        )


class msg_cfheaders:
    __slots__ = ("filter_type", "stop_hash", "prev_header", "hashes")
    msgtype = b"cfheaders"

    def __init__(self, filter_type=None, stop_hash=None, prev_header=None, hashes=None):
        self.filter_type = filter_type
        self.stop_hash = stop_hash
        self.prev_header = prev_header
        self.hashes = hashes

    def deserialize(self, f):
        self.filter_type = struct.unpack("<B", f.read(1))[0]
        self.stop_hash = deser_uint256(f)
        self.prev_header = deser_uint256(f)
        self.hashes = deser_uint256_vector(f)

    def serialize(self) -> bytes:
        return (
            struct.pack("<B", self.filter_type)
            + ser_uint256(self.stop_hash)
            + ser_uint256(self.prev_header)
            + ser_uint256_vector(self.hashes)
        )

    def __repr__(self):
        return (
            f"msg_cfheaders(filter_type={self.filter_type:#x}, "
            f"stop_hash={self.stop_hash:x})"
        )


class msg_getcfcheckpt:
    __slots__ = ("filter_type", "stop_hash")
    msgtype = b"getcfcheckpt"

    def __init__(self, filter_type, stop_hash):
        self.filter_type = filter_type
        self.stop_hash = stop_hash

    def deserialize(self, f):
        self.filter_type = struct.unpack("<B", f.read(1))[0]
        self.stop_hash = deser_uint256(f)

    def serialize(self) -> bytes:
        return struct.pack("<B", self.filter_type) + ser_uint256(self.stop_hash)

    def __repr__(self):
        return (
            f"msg_getcfcheckpt(filter_type={self.filter_type:#x}, "
            f"stop_hash={self.stop_hash:x})"
        )


class msg_cfcheckpt:
    __slots__ = ("filter_type", "stop_hash", "headers")
    msgtype = b"cfcheckpt"

    def __init__(self, filter_type=None, stop_hash=None, headers=None):
        self.filter_type = filter_type
        self.stop_hash = stop_hash
        self.headers = headers

    def deserialize(self, f):
        self.filter_type = struct.unpack("<B", f.read(1))[0]
        self.stop_hash = deser_uint256(f)
        self.headers = deser_uint256_vector(f)

    def serialize(self) -> bytes:
        return (
            struct.pack("<B", self.filter_type)
            + ser_uint256(self.stop_hash)
            + ser_uint256_vector(self.headers)
        )

    def __repr__(self):
        return (
            f"msg_cfcheckpt(filter_type={self.filter_type:#x}, "
            f"stop_hash={self.stop_hash:x})"
        )


class msg_avaproof:
    __slots__ = ("proof",)
    msgtype = b"avaproof"

    def __init__(self):
        self.proof = AvalancheProof()

    def deserialize(self, f):
        self.proof.deserialize(f)

    def serialize(self) -> bytes:
        return self.proof.serialize()

    def __repr__(self):
        return f"msg_avaproof(proof={self.proof!r})"


class msg_avapoll:
    MAX_ELEMENT_POLL = 16
    """Maximum number of items that can be polled at once.
    See AVALANCHE_MAX_ELEMENT_POLL in processor.h.
    """

    __slots__ = ("poll",)
    msgtype = b"avapoll"

    def __init__(self):
        self.poll = AvalanchePoll()

    def deserialize(self, f):
        self.poll.deserialize(f)

    def serialize(self) -> bytes:
        return self.poll.serialize()

    def __repr__(self):
        return f"msg_avapoll(poll={self.poll!r})"


class msg_avaresponse:
    __slots__ = ("response",)
    msgtype = b"avaresponse"

    def __init__(self):
        self.response = AvalancheResponse()

    def deserialize(self, f):
        self.response.deserialize(f)

    def serialize(self) -> bytes:
        return self.response.serialize()

    def __repr__(self):
        return f"msg_avaresponse(response={self.response!r})"


class msg_tcpavaresponse:
    __slots__ = ("response",)
    msgtype = b"avaresponse"

    def __init__(self):
        self.response = TCPAvalancheResponse()

    def deserialize(self, f):
        self.response.deserialize(f)

    def serialize(self) -> bytes:
        return self.response.serialize()

    def __repr__(self):
        return f"msg_tcpavaresponse(response={self.response!r})"


class msg_avahello:
    __slots__ = ("hello",)
    msgtype = b"avahello"

    def __init__(self):
        self.hello = AvalancheHello()

    def deserialize(self, f):
        self.hello.deserialize(f)

    def serialize(self) -> bytes:
        return self.hello.serialize()

    def __repr__(self):
        return f"msg_avahello(response={self.hello!r})"


class msg_getavaaddr:
    __slots__ = ()
    msgtype = b"getavaaddr"

    def __init__(self):
        pass

    def deserialize(self, f):
        pass

    def serialize(self) -> bytes:
        return b""

    def __repr__(self):
        return "msg_getavaaddr()"


class msg_getavaproofs:
    __slots__ = ()
    msgtype = b"getavaproofs"

    def __init__(self):
        pass

    def deserialize(self, f):
        pass

    def serialize(self) -> bytes:
        return b""

    def __repr__(self):
        return "msg_getavaproofs()"


class msg_avaproofs:
    __slots__ = ("key0", "key1", "shortids", "prefilled_proofs")
    msgtype = b"avaproofs"

    def __init__(self):
        self.key0 = 0
        self.key1 = 0
        self.shortids = []
        self.prefilled_proofs = []

    def deserialize(self, f):
        self.key0 = struct.unpack("<Q", f.read(8))[0]
        self.key1 = struct.unpack("<Q", f.read(8))[0]
        shortids_length = deser_compact_size(f)
        for _ in range(shortids_length):
            # shortids are defined to be 6 bytes in the spec, so append
            # two zero bytes and read it in as an 8-byte number
            self.shortids.append(struct.unpack("<Q", f.read(6) + b"\x00\x00")[0])

        # The indices are differentially encoded
        self.prefilled_proofs = deser_vector(f, AvalanchePrefilledProof)
        current_indice = -1
        for p in self.prefilled_proofs:
            current_indice += p.index + 1
            p.index = current_indice

    def serialize(self) -> bytes:
        r = struct.pack("<Q", self.key0)
        r += struct.pack("<Q", self.key1)
        r += ser_compact_size(len(self.shortids))
        for shortid in self.shortids:
            # We only want the first 6 bytes
            r += struct.pack("<Q", shortid)[0:6]

        r += ser_compact_size(len(self.prefilled_proofs))
        if len(self.prefilled_proofs) < 1:
            return r

        # The indices are differentially encoded
        r += self.prefilled_proofs[0].serialize()
        for i in range(len(self.prefilled_proofs[1:])):
            r += ser_compact_size(
                self.prefilled_proofs[i + 1].index - self.prefilled_proofs[i].index - 1
            )
            r += self.prefilled_proofs[i].proof.serialize()

        return r

    def __repr__(self):
        return (
            f"msg_avaproofs(key0={self.key0}, key1={self.key1}, "
            f"len(shortids)={len(self.shortids)}, shortids={self.shortids}), "
            f"len(prefilled_proofs)={len(self.prefilled_proofs)}, "
            f"prefilled_proofs={self.prefilled_proofs})"
        )


class msg_avaproofsreq:
    __slots__ = "indices"
    msgtype = b"avaproofsreq"

    def __init__(self):
        self.indices = []

    def deserialize(self, f):
        indices_length = deser_compact_size(f)

        # The indices are differentially encoded
        current_indice = -1
        for _ in range(indices_length):
            current_indice += deser_compact_size(f) + 1
            self.indices.append(current_indice)

    def serialize(self) -> bytes:
        r = ser_compact_size(len(self.indices))

        if len(self.indices) < 1:
            return r

        # The indices are differentially encoded
        r += ser_compact_size(self.indices[0])
        for i in range(len(self.indices[1:])):
            r += ser_compact_size(self.indices[i + 1] - self.indices[i] - 1)

        return r

    def __repr__(self):
        return (
            f"msg_avaproofsreq(len(shortids)={len(self.indices)}, "
            f"indices={self.indices})"
        )


class TestFrameworkMessages(unittest.TestCase):
    def test_avalanche_proof_serialization_round_trip(self):
        """Verify that an AvalancheProof object is unchanged after a round-trip
        of deserialization-serialization.
        """

        # Extracted from proof_tests.cpp
        proof_hex = (
            "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141"
            "c8bc67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cff"
            "e53967e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a3"
            "2102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6"
            "804534ca1f5e22670be3df5cbd5957d8dd83d05c8f17eae391f0e7ffdce4fb3def"
            "adb7c079473ebeccf88c1f8ce87c61e451447b89c445967335ffd1aadef4299823"
            "21023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dd"
            "e3ac7b0b7865200f63052ff980b93f965f398dda04917d411dd46e3c009a5fef35"
            "661fac28779b6a22760c00004f5ddf7d9865c7fead7e4a840b947939590261640f"
        )

        avaproof = FromHex(AvalancheProof(), proof_hex)
        self.assertEqual(ToHex(avaproof), proof_hex)

        self.assertEqual(
            uint256_hex(avaproof.proofid),
            "455f34eb8a00b0799630071c0728481bdb1653035b1484ac33e974aa4ae7db6d",
        )
        self.assertEqual(avaproof.sequence, 6296457553413371353)
        self.assertEqual(avaproof.expiration, -4129334692075929194)
        self.assertEqual(
            avaproof.master,
            bytes.fromhex(
                "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
            ),
        )
        # P2PK to master pubkey
        # We can't use a CScript() here because it would cause a circular
        # import
        self.assertEqual(
            avaproof.payout_script,
            bytes.fromhex(
                "21023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac"
            ),
        )
        self.assertEqual(
            avaproof.signature,
            b64decode(
                "ewt4ZSAPYwUv+YC5P5ZfOY3aBJF9QR3UbjwAml/vNWYfrCh3m2oidgwAAE9d332YZcf+rX5KhAuUeTlZAmFkDw=="
            ),
        )

        self.assertEqual(len(avaproof.stakes), 1)
        self.assertEqual(
            avaproof.stakes[0].sig,
            b64decode(
                "RTTKH14iZwvj31y9WVfY3YPQXI8X6uOR8Of/3OT7Pe+tt8B5Rz6+zPiMH4zofGHkUUR7icRFlnM1/9Gq3vQpmA=="
            ),
        )
        self.assertEqual(
            f"{avaproof.stakes[0].stake.utxo.txid:x}",
            "915d9cc742b46b77c52f69eb6be16739e5ff1cd82ad4fa4ac6581d3ef29fa769",
        )
        self.assertEqual(avaproof.stakes[0].stake.utxo.n, 567214302)
        self.assertEqual(avaproof.stakes[0].stake.amount, 444638638000000)
        self.assertEqual(avaproof.stakes[0].stake.height, 1370779804)
        self.assertEqual(avaproof.stakes[0].stake.is_coinbase, False)
        self.assertEqual(
            avaproof.stakes[0].stake.pubkey,
            bytes.fromhex(
                "02449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680"
            ),
        )

        msg_proof = msg_avaproof()
        msg_proof.proof = avaproof
        self.assertEqual(ToHex(msg_proof), proof_hex)
