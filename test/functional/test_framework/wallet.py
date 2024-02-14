# Copyright (c) 2020 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""A limited-functionality wallet, which may replace a real wallet in tests"""

from copy import deepcopy
from decimal import Decimal
from typing import Any, Optional

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
    base58_to_byte,
    key_to_p2pkh,
)
from test_framework.key import ECKey
from test_framework.messages import (
    XEC,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    FromHex,
    ToHex,
)
from test_framework.script import (
    OP_CHECKSIG,
    OP_DUP,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_HASH160,
    CScript,
    hash160,
)
from test_framework.txtools import pad_tx
from test_framework.util import (
    assert_equal,
    assert_greater_than_or_equal,
    satoshi_round,
)

DEFAULT_FEE = Decimal("100.00")


class MiniWallet:
    def __init__(self, test_node):
        self._test_node = test_node
        self._utxos = []
        self._address = ADDRESS_ECREG_P2SH_OP_TRUE
        self._scriptPubKey = bytes.fromhex(
            self._test_node.validateaddress(self._address)["scriptPubKey"]
        )

    def _create_utxo(self, *, txid, vout, value, height):
        return {"txid": txid, "vout": vout, "value": value, "height": height}

    def rescan_utxos(self):
        """Drop all utxos and rescan the utxo set"""
        self._utxos = []
        res = self._test_node.scantxoutset(
            action="start", scanobjects=[f"raw({self._scriptPubKey.hex()})"]
        )
        assert_equal(True, res["success"])
        for utxo in res["unspents"]:
            self._utxos.append(
                self._create_utxo(
                    txid=utxo["txid"],
                    vout=utxo["vout"],
                    value=utxo["amount"],
                    height=utxo["height"],
                )
            )

    def scan_tx(self, tx):
        """Scan the tx and adjust the internal list of owned utxos"""
        for spent in tx["vin"]:
            # Mark spent. This may happen when the caller has ownership of a
            # utxo that remained in this wallet. For example, by passing
            # mark_as_spent=False to get_utxo or by using an utxo returned by a
            # create_self_transfer* call.
            try:
                self.get_utxo(txid=spent["txid"], vout=spent["vout"])
            except StopIteration:
                pass
        for out in tx["vout"]:
            if out["scriptPubKey"]["hex"] == self._scriptPubKey.hex():
                self._utxos.append(
                    self._create_utxo(
                        txid=tx["txid"], vout=out["n"], value=out["value"], height=0
                    )
                )

    def generate(self, num_blocks, **kwargs):
        """Generate blocks with coinbase outputs to the internal address, and call rescan_utxos"""
        blocks = self._test_node.generatetodescriptor(
            num_blocks, f"raw({self._scriptPubKey.hex()})", **kwargs
        )
        # Calling rescan_utxos here makes sure that after a generate the utxo
        # set is in a clean state. For example, the wallet will update
        # - if the caller consumed utxos, but never used them
        # - if the caller sent a transaction that is not mined
        # - after block re-orgs
        # - the utxo height for mined mempool txs
        # - However, the wallet will not consider remaining mempool txs
        self.rescan_utxos()
        return blocks

    def get_scriptPubKey(self):
        return self._scriptPubKey

    def get_utxo(self, *, txid: str = "", vout: Optional[int] = None):
        """
        Returns a utxo and marks it as spent (pops it from the internal list)

        Args:
        txid: get the first utxo we find from a specific transaction
        """
        # Put the largest utxo last
        self._utxos = sorted(self._utxos, key=lambda k: (k["value"], -k["height"]))
        if txid:
            utxo_filter: Any = filter(lambda utxo: txid == utxo["txid"], self._utxos)
        else:
            # By default the largest utxo
            utxo_filter = reversed(self._utxos)
        if vout is not None:
            utxo_filter = filter(lambda utxo: vout == utxo["vout"], utxo_filter)
        index = self._utxos.index(next(utxo_filter))

        return self._utxos.pop(index)

    def send_self_transfer(self, **kwargs):
        """Create and send a tx with the specified fee_rate. Fee may be exact or at most one satoshi higher than needed."""
        tx = self.create_self_transfer(**kwargs)
        self.sendrawtransaction(from_node=kwargs["from_node"], tx_hex=tx["hex"])
        return tx

    def send_to(self, *, from_node, scriptPubKey, amount, fee=1000):
        """
        Create and send a tx with an output to a given scriptPubKey/amount,
        plus a change output to our internal address. To keep things simple, a
        fixed fee given in Satoshi is used.
        Note that this method fails if there is no single internal utxo
        available that can cover the cost for the amount and the fixed fee
        (the utxo with the largest value is taken).
        Returns a tuple (txid, n) referring to the created external utxo outpoint.
        """
        tx = self.create_self_transfer(from_node=from_node, fee_rate=0)["tx"]
        assert_greater_than_or_equal(tx.vout[0].nValue, amount + fee)
        # change output -> MiniWallet
        tx.vout[0].nValue -= amount + fee
        # arbitrary output -> to be returned
        tx.vout.append(CTxOut(amount, scriptPubKey))
        txid = self.sendrawtransaction(from_node=from_node, tx_hex=tx.serialize().hex())
        return txid, len(tx.vout) - 1

    def create_self_transfer(
        self, *, fee_rate=Decimal("3000.00"), from_node, utxo_to_spend=None, locktime=0
    ):
        """Create and return a tx with the specified fee_rate. Fee may be exact or at most one satoshi higher than needed."""
        utxo_to_spend = utxo_to_spend or self.get_utxo()

        # The size will be enforced by pad_tx()
        size = 100
        send_value = satoshi_round(
            utxo_to_spend["value"] - fee_rate * (Decimal(size) / 1000)
        )
        assert send_value > 0

        tx = CTransaction()
        tx.vin = [
            CTxIn(COutPoint(int(utxo_to_spend["txid"], 16), utxo_to_spend["vout"]))
        ]
        tx.vout = [CTxOut(int(send_value * XEC), self._scriptPubKey)]
        tx.nLockTime = locktime
        tx.vin[0].scriptSig = SCRIPTSIG_OP_TRUE
        pad_tx(tx, size)
        tx_hex = tx.serialize().hex()

        assert_equal(len(tx.serialize()), size)
        new_utxo = self._create_utxo(
            txid=tx.rehash(), vout=0, value=send_value, height=0
        )

        return {"txid": new_utxo["txid"], "hex": tx_hex, "tx": tx, "new_utxo": new_utxo}

    def sendrawtransaction(self, *, from_node, tx_hex):
        txid = from_node.sendrawtransaction(tx_hex)
        self.scan_tx(from_node.decoderawtransaction(tx_hex))
        return txid


def getnewdestination():
    """Generate a random destination and return the corresponding public key,
    scriptPubKey and address. Can be used when a random destination is
    needed, but no compiled wallet is available (e.g. as replacement to the
    getnewaddress/getaddressinfo RPCs)."""
    key = ECKey()
    key.generate()
    pubkey = key.get_pubkey().get_bytes()
    scriptpubkey = CScript(
        [OP_DUP, OP_HASH160, hash160(pubkey), OP_EQUALVERIFY, OP_CHECKSIG]
    )
    return pubkey, scriptpubkey, key_to_p2pkh(pubkey)


def address_to_scriptpubkey(address):
    """Converts a given address to the corresponding output script (scriptPubKey)."""
    payload, version = base58_to_byte(address)
    if version == 111:  # testnet pubkey hash
        return CScript([OP_DUP, OP_HASH160, payload, OP_EQUALVERIFY, OP_CHECKSIG])
    elif version == 196:  # testnet script hash
        return CScript([OP_HASH160, payload, OP_EQUAL])
    # TODO: also support other address formats
    else:
        assert False


def make_chain(
    node,
    address,
    privkeys,
    parent_txid,
    parent_value,
    n=0,
    parent_locking_script=None,
    fee=DEFAULT_FEE,
):
    """Build a transaction that spends parent_txid.vout[n] and produces one
    output with amount = parent_value with a fee deducted.
    Return tuple (CTransaction object, raw hex, nValue, scriptPubKey of the
    output created).
    """
    inputs = [{"txid": parent_txid, "vout": n}]
    my_value = parent_value - fee
    outputs = {address: my_value}
    rawtx = node.createrawtransaction(inputs, outputs)
    prevtxs = (
        [
            {
                "txid": parent_txid,
                "vout": n,
                "scriptPubKey": parent_locking_script,
                "amount": parent_value,
            }
        ]
        if parent_locking_script
        else None
    )
    signedtx = node.signrawtransactionwithkey(
        hexstring=rawtx, privkeys=privkeys, prevtxs=prevtxs
    )
    assert signedtx["complete"]
    tx = FromHex(CTransaction(), signedtx["hex"])
    return (tx, signedtx["hex"], my_value, tx.vout[0].scriptPubKey.hex())


def create_child_with_parents(
    node, address, privkeys, parents_tx, values, locking_scripts, fee=DEFAULT_FEE
):
    """Creates a transaction that spends the first output of each parent in parents_tx."""
    num_parents = len(parents_tx)
    total_value = sum(values)
    inputs = [{"txid": tx.get_id(), "vout": 0} for tx in parents_tx]
    outputs = {address: total_value - fee}
    rawtx_child = node.createrawtransaction(inputs, outputs)
    prevtxs = []
    for i in range(num_parents):
        prevtxs.append(
            {
                "txid": parents_tx[i].get_id(),
                "vout": 0,
                "scriptPubKey": locking_scripts[i],
                "amount": values[i],
            }
        )
    signedtx_child = node.signrawtransactionwithkey(
        hexstring=rawtx_child, privkeys=privkeys, prevtxs=prevtxs
    )
    assert signedtx_child["complete"]
    return signedtx_child["hex"]


def create_raw_chain(node, first_coin, address, privkeys, chain_length=50):
    """Helper function: create a "chain" of chain_length transactions.
    The nth transaction in the chain is a child of the n-1th transaction and
    parent of the n+1th transaction.
    """
    parent_locking_script = None
    txid = first_coin["txid"]
    chain_hex = []
    chain_txns = []
    value = first_coin["amount"]

    for _ in range(chain_length):
        (tx, txhex, value, parent_locking_script) = make_chain(
            node, address, privkeys, txid, value, 0, parent_locking_script
        )
        txid = tx.get_id()
        chain_hex.append(txhex)
        chain_txns.append(tx)

    return (chain_hex, chain_txns)


def bulk_transaction(
    tx: CTransaction, node, target_size: int, privkeys=None, prevtxs=None
) -> CTransaction:
    """Return a padded and signed transaction. The original transaction is left
    unaltered.
    If privkeys is not specified, it is assumed that the transaction has an
    anyone-can-spend output as unique output.
    """
    tx_heavy = deepcopy(tx)
    pad_tx(tx_heavy, target_size)
    assert_greater_than_or_equal(tx_heavy.billable_size(), target_size)
    if privkeys is not None:
        signed_tx = node.signrawtransactionwithkey(ToHex(tx_heavy), privkeys, prevtxs)
        return FromHex(CTransaction(), signed_tx["hex"])
    # OP_TRUE
    tx_heavy.vin[0].scriptSig = SCRIPTSIG_OP_TRUE
    return tx_heavy
