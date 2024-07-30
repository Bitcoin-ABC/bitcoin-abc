# Copyright (c) 2020 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""A limited-functionality wallet, which may replace a real wallet in tests"""

from copy import deepcopy
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
    base58_to_byte,
    key_to_p2pkh,
)
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.hash import hash160
from test_framework.key import ECKey
from test_framework.messages import XEC, COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.script import (
    OP_CHECKSIG,
    OP_DUP,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_HASH160,
    CScript,
)
from test_framework.signature_hash import (
    SIGHASH_ALL,
    SIGHASH_FORKID,
    SignatureHashForkId,
)
from test_framework.txtools import pad_tx
from test_framework.util import (
    assert_equal,
    assert_greater_than_or_equal,
    satoshi_round,
)

DEFAULT_FEE = Decimal("100.00")


class MiniWalletMode(Enum):
    """Determines the transaction type the MiniWallet is creating and spending.

    For most purposes, the default mode ADDRESS_OP_TRUE should be sufficient;
    it simply uses a fixed bech32 P2WSH address whose coins are spent with a
    witness stack of OP_TRUE, i.e. following an anyone-can-spend policy.
    However, if the transactions need to be modified by the user (e.g. prepending
    scriptSig for testing opcodes that are activated by a soft-fork), or the txs
    should contain an actual signature, the raw modes RAW_OP_TRUE and RAW_P2PK
    can be useful. Summary of modes:

                    |      output       |           |  tx is   | can modify |  needs
         mode       |    description    |  address  | standard | scriptSig  | signing
    ----------------+-------------------+-----------+----------+------------+----------
    ADDRESS_OP_TRUE | anyone-can-spend  |  bech32   |   yes    |    no      |   no
    RAW_P2PK        | pay-to-public-key |  - (raw)  |   yes    |    yes     |   yes
    """

    ADDRESS_OP_TRUE = 1
    RAW_P2PK = 3


class MiniWallet:
    def __init__(self, test_node, *, mode=MiniWalletMode.ADDRESS_OP_TRUE):
        self._test_node = test_node
        self._utxos = []
        self._mode = mode

        assert isinstance(mode, MiniWalletMode)
        if mode == MiniWalletMode.RAW_P2PK:
            # use simple deterministic private key (k=1)
            self._priv_key = ECKey()
            self._priv_key.set((1).to_bytes(32, "big"), True)
            pub_key = self._priv_key.get_pubkey()
            self._scriptPubKey = bytes(CScript([pub_key.get_bytes(), OP_CHECKSIG]))
        elif mode == MiniWalletMode.ADDRESS_OP_TRUE:
            self._address = ADDRESS_ECREG_P2SH_OP_TRUE
            self._scriptPubKey = bytes.fromhex(
                self._test_node.validateaddress(self._address)["scriptPubKey"]
            )
        else:
            raise AssertionError(f"Unsupported MiniWalletMode {mode}")

        # When the pre-mined test framework chain is used, it contains coinbase
        # outputs to the MiniWallet's default address in blocks 76-100
        # (see method BitcoinTestFramework._initialize_chain())
        # The MiniWallet needs to rescan_utxos() in order to account
        # for those mature UTXOs, so that all txs spend confirmed coins
        self.rescan_utxos()

    def _create_utxo(self, *, txid, vout, value, height, coinbase, confirmations):
        return {
            "txid": txid,
            "vout": vout,
            "value": value,
            "height": height,
            "coinbase": coinbase,
            "confirmations": confirmations,
        }

    def rescan_utxos(self, *, include_mempool=True):
        """Drop all utxos and rescan the utxo set"""
        self._utxos = []
        res = self._test_node.scantxoutset(
            action="start", scanobjects=[self.get_descriptor()]
        )
        assert_equal(True, res["success"])
        for utxo in res["unspents"]:
            self._utxos.append(
                self._create_utxo(
                    txid=utxo["txid"],
                    vout=utxo["vout"],
                    value=utxo["amount"],
                    height=utxo["height"],
                    coinbase=utxo["coinbase"],
                    confirmations=res["height"] - utxo["height"] + 1,
                )
            )
        if include_mempool:
            mempool = self._test_node.getrawmempool()
            # Sort tx by txid.
            sorted_mempool = sorted(mempool)
            for txid in sorted_mempool:
                self.scan_tx(self._test_node.getrawtransaction(txid=txid, verbose=True))

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
                        txid=tx["txid"],
                        vout=out["n"],
                        value=out["value"],
                        height=0,
                        coinbase=False,
                        confirmations=0,
                    )
                )

    def sign_tx(self, tx, amount=None, fixed_length=True):
        """Sign tx that has been created by MiniWallet"""
        if self._mode == MiniWalletMode.RAW_P2PK:
            assert amount is not None, "Amount is required to sign in P2PK mode"

            sighash = SignatureHashForkId(
                CScript(self._scriptPubKey), tx, 0, SIGHASH_ALL | SIGHASH_FORKID, amount
            )
            # for exact fee calculation, create only signatures with fixed size by
            # default (>49.89% probability):
            #   65 bytes: high-R val (33 bytes) + low-S val (32 bytes)
            # with the DER header/skeleton data of 6 bytes added, this leads to a
            # target size of 71 bytes
            der_sig = b""
            while not len(der_sig) == 71:
                der_sig = self._priv_key.sign_ecdsa(sighash)
                if not fixed_length:
                    break
            tx.vin[0].scriptSig = CScript(
                [der_sig + bytes(bytearray([SIGHASH_ALL | SIGHASH_FORKID]))]
            )
        elif self._mode == MiniWalletMode.ADDRESS_OP_TRUE:
            for i in range(len(tx.vin)):
                tx.vin[i].scriptSig = SCRIPTSIG_OP_TRUE
        else:
            assert False
        pad_tx(tx, 100)

    def generate(self, num_blocks, **kwargs):
        """Generate blocks with coinbase outputs to the internal address, and call rescan_utxos"""
        blocks = self._test_node.generatetodescriptor(
            num_blocks, self.get_descriptor(), **kwargs
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

    def get_descriptor(self):
        return self._test_node.getdescriptorinfo(f"raw({self._scriptPubKey.hex()})")[
            "descriptor"
        ]

    def get_scriptPubKey(self):
        return self._scriptPubKey

    def get_utxo(
        self,
        *,
        txid: str = "",
        vout: Optional[int] = None,
        mark_as_spent=True,
        confirmed_only=False,
    ):
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
        if confirmed_only:
            utxo_filter = filter(lambda utxo: utxo["confirmations"] > 0, utxo_filter)
        index = self._utxos.index(next(utxo_filter))

        if mark_as_spent:
            return self._utxos.pop(index)
        else:
            return self._utxos[index]

    def get_utxos(
        self,
        *,
        include_immature_coinbase=False,
        mark_as_spent=True,
        confirmed_only=False,
    ):
        """Returns the list of all utxos and optionally mark them as spent"""
        if not include_immature_coinbase:
            utxo_filter = filter(
                lambda utxo: not utxo["coinbase"]
                or COINBASE_MATURITY <= utxo["confirmations"],
                self._utxos,
            )
        else:
            utxo_filter = self._utxos
        if confirmed_only:
            utxo_filter = filter(lambda utxo: utxo["confirmations"] > 0, utxo_filter)
        utxos = deepcopy(list(utxo_filter))
        if mark_as_spent:
            self._utxos = []
        return utxos

    def send_self_transfer(self, *, from_node, **kwargs):
        """Call create_self_transfer and send the transaction."""
        tx = self.create_self_transfer(**kwargs)
        self.sendrawtransaction(from_node=from_node, tx_hex=tx["hex"])
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
        tx = self.create_self_transfer(fee_rate=0)["tx"]
        assert_greater_than_or_equal(tx.vout[0].nValue, amount + fee)
        # change output -> MiniWallet
        tx.vout[0].nValue -= amount + fee
        # arbitrary output -> to be returned
        tx.vout.append(CTxOut(amount, scriptPubKey))
        txid = self.sendrawtransaction(from_node=from_node, tx_hex=tx.serialize().hex())
        return txid, len(tx.vout) - 1

    def send_self_transfer_multi(self, *, from_node, **kwargs):
        """Call create_self_transfer_multi and send the transaction."""
        tx = self.create_self_transfer_multi(**kwargs)
        self.sendrawtransaction(from_node=from_node, tx_hex=tx["hex"])
        return tx

    def create_self_transfer_multi(
        self,
        *,
        utxos_to_spend=None,
        num_outputs=1,
        amount_per_output=0,
        locktime=0,
        sequence=0,
        fee_per_output=1000,
        target_size=0,
        confirmed_only=False,
    ):
        """
        Create and return a transaction that spends the given UTXOs and creates a
        certain number of outputs with equal amounts. The output amounts can be
        set by amount_per_output or automatically calculated with a fee_per_output.
        """
        utxos_to_spend = utxos_to_spend or [
            self.get_utxo(confirmed_only=confirmed_only)
        ]
        sequence = (
            [sequence] * len(utxos_to_spend) if type(sequence) is int else sequence
        )
        assert_equal(len(utxos_to_spend), len(sequence))

        # calculate output amount
        inputs_value_total = sum([int(XEC * utxo["value"]) for utxo in utxos_to_spend])
        outputs_value_total = inputs_value_total - fee_per_output * num_outputs
        amount_per_output = amount_per_output or (outputs_value_total // num_outputs)
        assert amount_per_output > 0
        outputs_value_total = amount_per_output * num_outputs
        fee = Decimal(inputs_value_total - outputs_value_total) / XEC

        # create tx
        tx = CTransaction()
        tx.vin = [
            CTxIn(
                COutPoint(int(utxo_to_spend["txid"], 16), utxo_to_spend["vout"]),
                nSequence=seq,
            )
            for utxo_to_spend, seq in zip(utxos_to_spend, sequence)
        ]
        tx.vout = [
            CTxOut(amount_per_output, bytearray(self._scriptPubKey))
            for _ in range(num_outputs)
        ]
        tx.nLockTime = locktime

        self.sign_tx(
            tx,
            sum(
                [int(utxo_to_spend["value"] * XEC) for utxo_to_spend in utxos_to_spend]
            ),
        )

        if target_size:
            pad_tx(tx, target_size)

        txid = tx.rehash()
        return {
            "new_utxos": [
                self._create_utxo(
                    txid=txid,
                    vout=i,
                    value=Decimal(tx.vout[i].nValue) / XEC,
                    height=0,
                    coinbase=False,
                    confirmations=0,
                )
                for i in range(len(tx.vout))
            ],
            "fee": fee,
            "txid": txid,
            "hex": tx.serialize().hex(),
            "tx": tx,
        }

    def create_self_transfer(
        self,
        *,
        fee_rate=Decimal("3000.00"),
        fee=Decimal("0"),
        utxo_to_spend=None,
        locktime=0,
        sequence=0,
        target_size=0,
        confirmed_only=False,
    ):
        """Create and return a tx with the specified fee. If fee is 0, use fee_rate, where the resulting fee may be exact or at most one satoshi higher than needed."""
        utxo_to_spend = utxo_to_spend or self.get_utxo(confirmed_only=confirmed_only)
        assert fee_rate >= 0
        assert fee >= 0

        if self._mode == MiniWalletMode.ADDRESS_OP_TRUE:
            # anyone-can-spend, the size will be enforced by pad_tx()
            size = 100
        elif self._mode == MiniWalletMode.RAW_P2PK:
            # P2PK (73 bytes scriptSig + 35 bytes scriptPubKey + 60 bytes other)
            size = 168
        else:
            assert False

        send_value = satoshi_round(
            utxo_to_spend["value"] - (fee or (fee_rate * (Decimal(size) / 1000)))
        )

        # create tx
        tx = self.create_self_transfer_multi(
            utxos_to_spend=[utxo_to_spend],
            locktime=locktime,
            sequence=sequence,
            amount_per_output=int(XEC * send_value),
            target_size=target_size,
        )
        if not target_size:
            assert_equal(len(tx["tx"].serialize()), size)

        tx["new_utxo"] = tx.pop("new_utxos")[0]

        return tx

    def sendrawtransaction(self, *, from_node, tx_hex):
        txid = from_node.sendrawtransaction(tx_hex)
        self.scan_tx(from_node.decoderawtransaction(tx_hex))
        return txid

    def create_self_transfer_chain(self, *, chain_length, utxo_to_spend=None):
        """
        Create a "chain" of chain_length transactions. The nth transaction in
        the chain is a child of the n-1th transaction and parent of the n+1th transaction.
        """
        chaintip_utxo = utxo_to_spend or self.get_utxo()
        chain = []

        for _ in range(chain_length):
            tx = self.create_self_transfer(utxo_to_spend=chaintip_utxo)
            chaintip_utxo = tx["new_utxo"]
            chain.append(tx)

        return chain

    def send_self_transfer_chain(self, *, from_node, **kwargs):
        """Create and send a "chain" of chain_length transactions. The nth
        transaction in the chain is a child of the n-1th transaction and parent
        of the n+1th transaction.

        Returns a list of objects for each tx (see create_self_transfer_multi).
        """
        chain = self.create_self_transfer_chain(**kwargs)
        for t in chain:
            self.sendrawtransaction(from_node=from_node, tx_hex=t["hex"])

        return chain


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
