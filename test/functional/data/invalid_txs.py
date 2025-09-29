# Copyright (c) 2015-2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Templates for constructing various sorts of invalid transactions.

These templates (or an iterator over all of them) can be reused in different
contexts to test using a number of invalid transaction types.

Hopefully this makes it easier to get coverage of a full variety of tx
validation checks through different interfaces (AcceptBlock, AcceptToMemPool,
etc.) without repeating ourselves.

Invalid tx cases not covered here can be found by running:

    $ diff \
      <(grep -IREho "bad-txns[a-zA-Z-]+" src | sort -u) \
      <(grep -IEho "bad-txns[a-zA-Z-]+" test/functional/data/invalid_txs.py | sort -u)

"""
import abc
from typing import Optional

from test_framework import script as sc
from test_framework.blocktools import create_tx_with_script
from test_framework.hash import hash160
from test_framework.messages import MAX_MONEY, COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.script import (
    OP_2DIV,
    OP_2MUL,
    OP_INVERT,
    OP_LSHIFT,
    OP_MUL,
    OP_RSHIFT,
    CScript,
)
from test_framework.txtools import pad_tx

basic_p2sh = sc.CScript([sc.OP_HASH160, hash160(sc.CScript([sc.OP_0])), sc.OP_EQUAL])


class BadTxTemplate:
    """Allows simple construction of a certain kind of invalid tx. Base class to be subclassed."""

    __metaclass__ = abc.ABCMeta

    # The expected error code given by bitcoind upon submission of the tx.
    reject_reason: Optional[str] = ""

    # Only specified if it differs from mempool acceptance error.
    block_reject_reason = ""

    # Do we expect to be disconnected after submitting this tx?
    expect_disconnect = False

    # Is this tx considered valid when included in a block, but not for acceptance into
    # the mempool (i.e. does it violate policy but not consensus)?
    valid_in_block = False

    def __init__(self, *, spend_tx=None, spend_block=None):
        self.spend_tx = spend_block.vtx[0] if spend_block else spend_tx
        self.spend_avail = sum(o.nValue for o in self.spend_tx.vout)
        self.valid_txin = CTxIn(COutPoint(self.spend_tx.txid_int, 0), b"", 0xFFFFFFFF)

    @abc.abstractmethod
    def get_tx(self, *args, **kwargs):
        """Return a CTransaction that is invalid per the subclass."""
        pass


class OutputMissing(BadTxTemplate):
    reject_reason = "bad-txns-vout-empty"
    expect_disconnect = True

    def get_tx(self):
        tx = CTransaction()
        tx.vin.append(self.valid_txin)
        return tx


class InputMissing(BadTxTemplate):
    reject_reason = "bad-txns-vin-empty"
    expect_disconnect = True

    def get_tx(self):
        tx = CTransaction()
        tx.vout.append(CTxOut(0, sc.CScript([sc.OP_TRUE] * 100)))
        return tx


class SizeTooSmall(BadTxTemplate):
    reject_reason = "bad-txns-undersize"
    expect_disconnect = False
    valid_in_block = True

    def get_tx(self):
        tx = CTransaction()
        tx.vin.append(self.valid_txin)
        tx.vout.append(CTxOut(0, sc.CScript([sc.OP_TRUE])))
        return tx


class BadInputOutpointIndex(BadTxTemplate):
    # Won't be rejected - nonexistent outpoint index is treated as an orphan since the coins
    # database can't distinguish between spent outpoints and outpoints which
    # never existed.
    reject_reason = None
    expect_disconnect = False

    def get_tx(self):
        num_indices = len(self.spend_tx.vin)
        bad_idx = num_indices + 100

        tx = CTransaction()
        tx.vin.append(
            CTxIn(COutPoint(self.spend_tx.txid_int, bad_idx), b"", 0xFFFFFFFF)
        )
        tx.vout.append(CTxOut(0, basic_p2sh))
        return tx


class DuplicateInput(BadTxTemplate):
    reject_reason = "bad-txns-inputs-duplicate"
    expect_disconnect = True

    def get_tx(self):
        tx = CTransaction()
        tx.vin.append(self.valid_txin)
        tx.vin.append(self.valid_txin)
        tx.vout.append(CTxOut(1, basic_p2sh))
        return tx


class PrevoutNullInput(BadTxTemplate):
    reject_reason = "bad-txns-prevout-null"
    expect_disconnect = True

    def get_tx(self):
        tx = CTransaction()
        tx.vin.append(self.valid_txin)
        tx.vin.append(CTxIn(COutPoint(txid=0, n=0xFFFFFFFF)))
        tx.vout.append(CTxOut(1, basic_p2sh))
        return tx


class NonexistentInput(BadTxTemplate):
    # Added as an orphan tx.
    reject_reason = None
    expect_disconnect = False

    def get_tx(self):
        tx = CTransaction()
        tx.vin.append(CTxIn(COutPoint(self.spend_tx.txid_int + 1, 0), b"", 0xFFFFFFFF))
        tx.vin.append(self.valid_txin)
        tx.vout.append(CTxOut(1, basic_p2sh))
        return tx


class SpendTooMuch(BadTxTemplate):
    reject_reason = "bad-txns-in-belowout"
    expect_disconnect = True

    def get_tx(self):
        return create_tx_with_script(
            self.spend_tx, 0, script_pub_key=basic_p2sh, amount=(self.spend_avail + 1)
        )


class CreateNegative(BadTxTemplate):
    reject_reason = "bad-txns-vout-negative"
    expect_disconnect = True

    def get_tx(self):
        return create_tx_with_script(self.spend_tx, 0, amount=-1)


class CreateTooLarge(BadTxTemplate):
    reject_reason = "bad-txns-vout-toolarge"
    expect_disconnect = True

    def get_tx(self):
        return create_tx_with_script(self.spend_tx, 0, amount=MAX_MONEY + 1)


class CreateSumTooLarge(BadTxTemplate):
    reject_reason = "bad-txns-txouttotal-toolarge"
    expect_disconnect = True

    def get_tx(self):
        tx = create_tx_with_script(self.spend_tx, 0, amount=MAX_MONEY)
        tx.vout = [tx.vout[0]] * 2
        return tx


class InvalidOPIFConstruction(BadTxTemplate):
    reject_reason = "mandatory-script-verify-flag-failed (Invalid OP_IF construction)"
    expect_disconnect = True
    valid_in_block = True

    def get_tx(self):
        return create_tx_with_script(
            self.spend_tx, 0, script_sig=b"\x64" * 35, amount=(self.spend_avail // 2)
        )


def getDisabledOpcodeTemplate(opcode):
    """Creates disabled opcode tx template class"""

    def get_tx(self):
        tx = CTransaction()
        vin = self.valid_txin
        vin.scriptSig = CScript([opcode])
        tx.vin.append(vin)
        tx.vout.append(CTxOut(1, basic_p2sh))
        pad_tx(tx)
        return tx

    return type(
        f"DisabledOpcode_{str(opcode)}",
        (BadTxTemplate,),
        {
            "reject_reason": "disabled opcode",
            "expect_disconnect": True,
            "get_tx": get_tx,
            "valid_in_block": True,
        },
    )


# Disabled opcode tx templates (CVE-2010-5137)
DisabledOpcodeTemplates = [
    getDisabledOpcodeTemplate(opcode)
    for opcode in [OP_INVERT, OP_2MUL, OP_2DIV, OP_MUL, OP_LSHIFT, OP_RSHIFT]
]


def iter_all_templates():
    """Iterate through all bad transaction template types."""
    return BadTxTemplate.__subclasses__()
