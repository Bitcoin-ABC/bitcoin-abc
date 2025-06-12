# Copyright (c) 2015-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Utilities for manipulating blocks and transactions."""

import struct
import time
import unittest
from typing import Optional, Union

from .key import ECKey
from .messages import (
    XEC,
    CBlock,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    FromHex,
    ToHex,
)
from .script import (
    OP_1,
    OP_CHECKSIG,
    OP_DUP,
    OP_EQUALVERIFY,
    OP_HASH160,
    OP_RETURN,
    OP_TRUE,
    CScript,
    CScriptNum,
    CScriptOp,
)
from .signature_hash import (
    SIGHASH_ALL,
    SIGHASH_FORKID,
    SignatureHashForkId,
)
from .txtools import pad_tx
from .util import assert_equal, satoshi_round

# Genesis block data (regtest)
TIME_GENESIS_BLOCK = 1296688602
GENESIS_BLOCK_HASH = "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206"
GENESIS_BLOCK_HEADER = "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5494dffff7f2002000000"
GENESIS_CB_TXID = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
GENESIS_CB_PK = (
    "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38"
    "c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f"
)
GENESIS_CB_SCRIPT_PUBKEY = CScript.fromhex(f"41{GENESIS_CB_PK}ac")
GENESIS_CB_SCRIPT_SIG = CScript(
    b"\x04\xff\xff\x00\x1d\x01\x04EThe Times 03/Jan/2009 Chancellor on brink of "
    b"second bailout for banks"
)

MAX_FUTURE_BLOCK_TIME = 2 * 60 * 60

# Coinbase transaction outputs can only be spent after this number of new blocks
# (network rule)
COINBASE_MATURITY = 100

MIN_BLOCKS_TO_KEEP = 288


def create_block(
    hashprev: Optional[int] = None,
    coinbase: Optional[CTransaction] = None,
    ntime: Optional[int] = None,
    *,
    version: Optional[int] = None,
    tmpl: Optional[dict] = None,
    txlist: Optional[list] = None,
) -> CBlock:
    """Create a block (with regtest difficulty)."""
    block = CBlock()
    if tmpl is None:
        tmpl = {}
    block.nVersion = version or tmpl.get("version", 1)
    block.nTime = ntime or tmpl.get("curtime", int(time.time() + 600))
    block.hashPrevBlock = hashprev or int(tmpl["previousblockhash"], 0x10)
    if tmpl.get("bits") is not None:
        block.nBits = struct.unpack(">I", bytes.fromhex(tmpl["bits"]))[0]
    else:
        # difficulty retargeting is disabled in REGTEST chainparams
        block.nBits = 0x207FFFFF
    block.vtx.append(coinbase or create_coinbase(height=tmpl["height"]))
    if txlist:
        block.vtx.extend(txlist)
        make_conform_to_ctor(block)
    block.hashMerkleRoot = block.calc_merkle_root()
    return block


def make_conform_to_ctor(block: CBlock):
    block.vtx = [block.vtx[0]] + sorted(block.vtx[1:], key=lambda tx: tx.txid_hex)


def script_BIP34_coinbase_height(height: int) -> CScript:
    if height <= 16:
        res = CScriptOp.encode_op_n(height)
        # Append dummy to increase scriptSig size above 2
        # (see bad-cb-length consensus rule)
        return CScript([res, OP_1])
    return CScript([CScriptNum(height)])


def create_coinbase(
    height: int,
    pubkey: Optional[bytes] = None,
    *,
    script_pubkey: Optional[bytes] = None,
    nValue: int = 50_000_000,
) -> CTransaction:
    """Create a coinbase transaction, assuming no miner fees.

    If pubkey is passed in, the coinbase output will be a P2PK output;
    otherwise an anyone-can-spend output."""
    coinbase = CTransaction()
    coinbase.vin.append(
        CTxIn(
            COutPoint(0, 0xFFFFFFFF), script_BIP34_coinbase_height(height), 0xFFFFFFFF
        )
    )
    coinbaseoutput = CTxOut()
    coinbaseoutput.nValue = nValue * XEC
    if nValue == 50_000_000:
        halvings = int(height / 150)  # regtest
        coinbaseoutput.nValue >>= halvings
    if pubkey is not None:
        coinbaseoutput.scriptPubKey = CScript([pubkey, OP_CHECKSIG])
    elif script_pubkey is not None:
        coinbaseoutput.scriptPubKey = script_pubkey
    else:
        coinbaseoutput.scriptPubKey = CScript([OP_TRUE])
    coinbase.vout = [coinbaseoutput]

    # Make sure the coinbase is at least 100 bytes
    pad_tx(coinbase)

    return coinbase


def create_tx_with_script(
    prevtx, n, script_sig=b"", *, amount, script_pub_key=CScript()
):
    """Return one-input, one-output transaction object
    spending the prevtx's n-th output with the given amount.

    Can optionally pass scriptPubKey and scriptSig, default is anyone-can-spend output.
    """
    tx = CTransaction()
    assert n < len(prevtx.vout)
    tx.vin.append(CTxIn(COutPoint(prevtx.txid_int, n), script_sig, 0xFFFFFFFF))
    tx.vout.append(CTxOut(amount, script_pub_key))
    pad_tx(tx)
    return tx


def create_transaction(node, txid, to_address, *, amount):
    """Return signed transaction spending the first output of the
    input txid. Note that the node must be able to sign for the
    output that is being spent, and the node must not be running
    multiple wallets.
    """
    raw_tx = create_raw_transaction(node, txid, to_address, amount=amount)
    tx = FromHex(CTransaction(), raw_tx)
    return tx


def create_raw_transaction(node, txid, to_address, *, amount):
    """Return raw signed transaction spending the first output of the
    input txid. Note that the node must be able to sign for the
    output that is being spent, and the node must not be running
    multiple wallets.
    """
    rawtx = node.createrawtransaction(
        inputs=[{"txid": txid, "vout": 0}], outputs={to_address: amount}
    )
    signresult = node.signrawtransactionwithwallet(rawtx)
    assert_equal(signresult["complete"], True)
    return signresult["hex"]


def create_confirmed_utxos(test_framework, node, count, age=101, **kwargs):
    """
    Helper to create at least "count" utxos
    """
    to_generate = int(0.5 * count) + age
    while to_generate > 0:
        test_framework.generate(node, min(25, to_generate), **kwargs)
        to_generate -= 25
    utxos = node.listunspent()
    iterations = count - len(utxos)
    addr1 = node.getnewaddress()
    addr2 = node.getnewaddress()
    if iterations <= 0:
        return utxos
    for i in range(iterations):
        t = utxos.pop()
        inputs = []
        inputs.append({"txid": t["txid"], "vout": t["vout"]})
        outputs = {}
        outputs[addr1] = satoshi_round(t["amount"] / 2)
        outputs[addr2] = satoshi_round(t["amount"] / 2)
        raw_tx = node.createrawtransaction(inputs, outputs)
        ctx = FromHex(CTransaction(), raw_tx)
        fee = node.calculate_fee(ctx) // 2
        ctx.vout[0].nValue -= fee
        # Due to possible truncation, we go ahead and take another satoshi in
        # fees to ensure the transaction gets through
        ctx.vout[1].nValue -= fee + 1
        signed_tx = node.signrawtransactionwithwallet(ToHex(ctx))["hex"]
        node.sendrawtransaction(signed_tx)

    while node.getmempoolinfo()["size"] > 0:
        test_framework.generate(node, 1, **kwargs)

    utxos = node.listunspent()
    assert len(utxos) >= count
    return utxos


def mine_big_block(test_framework, node, utxos=None):
    # generate a 66k transaction,
    # and 14 of them is close to the 1MB block limit
    num = 14
    utxos = utxos if utxos is not None else []
    if len(utxos) < num:
        utxos.clear()
        utxos.extend(node.listunspent())
    send_big_transactions(node, utxos, num, 100)
    test_framework.generate(node, 1)


def send_big_transactions(node, utxos, num, fee_multiplier):
    from .cashaddr import decode

    txids = []
    padding = "1" * 512
    addrHash = decode(node.getnewaddress())[2]

    for _ in range(num):
        ctx = CTransaction()
        utxo = utxos.pop()
        txid = int(utxo["txid"], 16)
        ctx.vin.append(CTxIn(COutPoint(txid, int(utxo["vout"])), b""))
        ctx.vout.append(
            CTxOut(
                int(satoshi_round(utxo["amount"] * XEC)),
                CScript([OP_DUP, OP_HASH160, addrHash, OP_EQUALVERIFY, OP_CHECKSIG]),
            )
        )
        for i in range(0, 127):
            ctx.vout.append(CTxOut(0, CScript([OP_RETURN, bytes(padding, "utf-8")])))
        # Create a proper fee for the transaction to be mined
        ctx.vout[0].nValue -= int(fee_multiplier * node.calculate_fee(ctx))
        signresult = node.signrawtransactionwithwallet(ToHex(ctx), None, "NONE|FORKID")
        txid = node.sendrawtransaction(signresult["hex"], 0)
        txids.append(txid)
    return txids


class BlockTestMixin:
    """A mixin for functional test classes to factor some common code."""

    BlockNumber = Union[int, str]
    """Shortcut for type used for block numbers. Can be an int or a string when branch
    information is to be stored (e.g. "64a", "b56p2"...)"""

    blocks: dict[BlockNumber, CBlock] = {}

    tip: Optional[CBlock] = None

    genesis_hash = int(GENESIS_BLOCK_HASH, 16)

    block_heights: dict[int, int] = {genesis_hash: 0}
    """A sha256 to block height map"""

    coinbase_key: Optional[ECKey] = None
    """The key used to sign the coinbase transactions. If None, coinbase transactions
    will be anyone-can-spend.
    """

    coinbase_pubkey: Optional[bytes] = None

    # move the tip back to a previous block
    def move_tip(self, number: BlockNumber):
        self.tip = self.blocks[number]

    # adds transactions to the block and updates state
    def update_block(
        self,
        block_number: Union[int, str],
        new_transactions: list[CTransaction],
        reorder=True,
        *,
        nTime: Optional[int] = None,
    ) -> CBlock:
        block = self.blocks[block_number]
        block.vtx.extend(new_transactions)
        old_sha256 = block.hash_int
        if nTime is not None:
            block.nTime = nTime
        if reorder:
            make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        # Update the internal state just like in next_block
        self.tip = block
        if block.hash_int != old_sha256:
            self.block_heights[block.hash_int] = self.block_heights[old_sha256]
            del self.block_heights[old_sha256]
        self.blocks[block_number] = block
        return block

    def generate_coinbase_key(self):
        self.coinbase_key = ECKey()
        self.coinbase_key.generate()
        self.coinbase_pubkey = self.coinbase_key.get_pubkey().get_bytes()

    # sign a transaction, using the key we know about
    # this signs input 0 in tx, which is assumed to be spending output n in
    # spend_tx
    def sign_tx(self, tx: CTransaction, spend_tx: CTransaction):
        assert self.coinbase_key is not None
        scriptPubKey = bytearray(spend_tx.vout[0].scriptPubKey)
        if scriptPubKey[0] == OP_TRUE:  # an anyone-can-spend
            tx.vin[0].scriptSig = CScript()
            return
        sighash = SignatureHashForkId(
            spend_tx.vout[0].scriptPubKey,
            tx,
            0,
            SIGHASH_ALL | SIGHASH_FORKID,
            spend_tx.vout[0].nValue,
        )
        tx.vin[0].scriptSig = CScript(
            [
                self.coinbase_key.sign_ecdsa(sighash)
                + bytes(bytearray([SIGHASH_ALL | SIGHASH_FORKID]))
            ]
        )

    # this is a little handier to use than create_tx_with_script
    def create_tx(self, spend_tx, n, value: int, script=CScript([OP_TRUE])):
        return create_tx_with_script(spend_tx, n, amount=value, script_pub_key=script)

    def create_and_sign_transaction(
        self, spend_tx: CTransaction, value: int, script=CScript([OP_TRUE])
    ) -> CTransaction:
        tx = self.create_tx(spend_tx, 0, value, script)
        self.sign_tx(tx, spend_tx)
        return tx

    def next_block(
        self,
        number: BlockNumber,
        *,
        additional_coinbase_value=0,
        script=CScript([OP_TRUE]),
        spend: Optional[CTransaction] = None,
        version=4,
        coinbase_time: Optional[int] = None,
    ) -> CBlock:
        """Create a new block building on the current tip, and advance the tip to it.
        The caller is responsible for broadcasting the generated block, either by storing
        the returned block or by immediately broadcasting self.tip after this method returns.
        """
        if self.tip is None:
            base_block_hash = self.genesis_hash
            block_time = coinbase_time or int(time.time()) + 1
        else:
            base_block_hash = self.tip.hash_int
            block_time = self.tip.nTime + 1
        # First create the coinbase
        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height, self.coinbase_pubkey)
        coinbase.vout[0].nValue += additional_coinbase_value
        if spend is None:
            block = create_block(base_block_hash, coinbase, block_time, version=version)
        else:
            # all but one satoshi to fees
            coinbase.vout[0].nValue += spend.vout[0].nValue - 1
            # spend 1 satoshi
            tx = self.create_tx(spend, 0, 1, script)
            self.sign_tx(tx, spend)
            block = create_block(
                base_block_hash, coinbase, block_time, version=version, txlist=[tx]
            )
        # Block is created. Find a valid nonce.
        block.solve()
        self.tip = block
        self.block_heights[block.hash_int] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block


class TestFrameworkBlockTools(unittest.TestCase):
    def test_create_coinbase(self):
        height = 20
        coinbase_tx = create_coinbase(height=height)
        assert_equal(CScriptNum.decode(coinbase_tx.vin[0].scriptSig), height)
