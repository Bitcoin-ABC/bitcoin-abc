# -*- coding: utf-8 -*-
# -*- mode: python3 -*-
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020-2022 The Electrum ABC developers
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
"""This module deals with building avalanche proofs.

This requires serializing some keys and UTXO metadata (stakes), and signing
the hash of the stakes to prove ownership of the UTXO.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass
from functools import partial
from io import BytesIO
from typing import TYPE_CHECKING, List, Optional, Union

from ..crypto import Hash as sha256d
from ..serialize import (
    DeserializationError,
    SerializableObject,
    deserialize_blob,
    deserialize_sequence,
    serialize_blob,
    serialize_sequence,
)
from ..transaction import OutPoint, get_address_from_output_script
from ..uint256 import UInt256
from .primitives import Key, PublicKey

if TYPE_CHECKING:
    from .. import address
    from ..address import Address, ScriptOutput
    from ..wallet import AbstractWallet


NO_SIGNATURE = b"\0" * 64


@dataclass
class StakeAndSigningData:
    """Class storing a stake waiting to be signed (waiting for the stake commitment)"""

    stake: Stake
    address: Address


class Stake(SerializableObject):
    def __init__(
        self,
        outpoint: OutPoint,
        amount: int,
        height: int,
        is_coinbase: bool,
        pubkey: Optional[PublicKey] = None,
    ):
        self.outpoint = outpoint
        self.amount = amount
        """Amount in satoshis (int64)"""
        self.height = height
        """Block height containing this utxo (uint32)"""
        # Electrum ABC uses 0 and -1 for unconfirmed coins.
        assert height > 0
        self.pubkey = pubkey
        """Public key"""
        self.is_coinbase = is_coinbase

        self.stake_id = None
        """Stake id used for sorting stakes in a proof"""

    def compute_stake_id(self):
        self.stake_id = UInt256(sha256d(self.serialize()))

    def serialize(self) -> bytes:
        assert self.pubkey
        is_coinbase = int(self.is_coinbase)
        height_ser = self.height << 1 | is_coinbase

        return (
            self.outpoint.serialize()
            + struct.pack("qI", self.amount, height_ser)
            + self.pubkey.serialize()
        )

    def get_hash(self, commitment: bytes) -> bytes:
        """Return the bitcoin hash of the concatenation of proofid
        and the serialized stake."""
        return sha256d(commitment + self.serialize())

    @classmethod
    def deserialize(cls, stream: BytesIO) -> Stake:
        utxo = OutPoint.deserialize(stream)
        amount = struct.unpack("q", stream.read(8))[0]
        height_ser = struct.unpack("I", stream.read(4))[0]
        pubkey = PublicKey.deserialize(stream)
        return Stake(utxo, amount, height_ser >> 1, height_ser & 1, pubkey)


class ProofId(UInt256):
    pass


class LimitedProofId(UInt256):
    @classmethod
    def build(
        cls,
        sequence: int,
        expiration_time: int,
        stakes: List[Stake],
        payout_script_pubkey: bytes,
    ) -> LimitedProofId:
        """Build a limited proofid from the Proof parameters"""
        ss = struct.pack("<Qq", sequence, expiration_time)
        ss += serialize_blob(payout_script_pubkey)
        ss += serialize_sequence(stakes)
        return cls(sha256d(ss))

    def compute_proof_id(self, master: PublicKey) -> ProofId:
        ss = self.serialize()
        ss += master.serialize()
        return ProofId(sha256d(ss))


class SignedStake(SerializableObject):
    def __init__(self, stake, sig):
        self.stake: Stake = stake
        self.sig: bytes = sig
        """Signature for this stake, bytes of length 64"""

    def serialize(self) -> bytes:
        return self.stake.serialize() + self.sig

    @classmethod
    def deserialize(cls, stream: BytesIO) -> SignedStake:
        stake = Stake.deserialize(stream)
        sig = stream.read(64)
        return SignedStake(stake, sig)

    def verify_signature(self, commitment: bytes):
        return self.stake.pubkey.verify_schnorr(
            self.sig, self.stake.get_hash(commitment)
        )


class Proof(SerializableObject):
    def __init__(
        self,
        sequence: int,
        expiration_time: int,
        master_pub: PublicKey,
        signed_stakes: List[SignedStake],
        payout_script_pubkey: bytes,
        signature: bytes,
    ):
        self.sequence = sequence
        """uint64"""
        self.expiration_time = expiration_time
        """int64"""
        self.master_pub: PublicKey = master_pub
        """Master public key"""
        self.signed_stakes: List[SignedStake] = signed_stakes
        """List of signed stakes sorted by their stake ID."""
        self.payout_script_pubkey: bytes = payout_script_pubkey
        self.signature: bytes = signature
        """Schnorr signature of some of the proof's data by the master key."""

        self.limitedid = LimitedProofId.build(
            sequence,
            expiration_time,
            [ss.stake for ss in signed_stakes],
            payout_script_pubkey,
        )
        self.proofid = self.limitedid.compute_proof_id(master_pub)

        self.stake_commitment: bytes = sha256d(
            struct.pack("<q", self.expiration_time) + self.master_pub.serialize()
        )

    def serialize(self) -> bytes:
        p = struct.pack("<Qq", self.sequence, self.expiration_time)
        p += self.master_pub.serialize()
        p += serialize_sequence(self.signed_stakes)
        p += serialize_blob(self.payout_script_pubkey)
        p += self.signature
        return p

    @classmethod
    def deserialize(cls, stream: BytesIO) -> Proof:
        sequence, expiration_time = struct.unpack("<Qq", stream.read(16))
        master_pub = PublicKey.deserialize(stream)
        signed_stakes = deserialize_sequence(stream, SignedStake)
        payout_pubkey = deserialize_blob(stream)
        signature = stream.read(64)
        if len(signature) != 64:
            raise DeserializationError(
                "Could not deserialize proof data. Not enough data left for a "
                f"complete Schnorr signature (found {len(signature)} bytes, expected "
                "64 bytes)."
            )
        return Proof(
            sequence,
            expiration_time,
            master_pub,
            signed_stakes,
            payout_pubkey,
            signature,
        )

    def verify_master_signature(self) -> bool:
        return self.master_pub.verify_schnorr(
            self.signature, self.limitedid.serialize()
        )

    def get_payout_address(self) -> Union[Address, ScriptOutput, address.PublicKey]:
        _txout_type, addr = get_address_from_output_script(self.payout_script_pubkey)
        return addr

    def is_signed(self):
        return self.signature != NO_SIGNATURE


class ProofBuilder:
    def __init__(
        self,
        sequence: int,
        expiration_time: int,
        payout_address: Union[Address, ScriptOutput, address.PublicKey],
        wallet: AbstractWallet,
        master: Optional[Key] = None,
        master_pub: Optional[PublicKey] = None,
        pwd: Optional[str] = None,
    ):
        self.sequence = sequence
        """uint64"""
        self.expiration_time = expiration_time
        """int64"""
        self.master: Optional[Key] = master
        """Master private key. If not specified, the proof signature will be invalid."""
        if self.master is not None:
            if master_pub is not None and self.master.get_pubkey() != master_pub:
                raise RuntimeError("Mismatching master and master_pub")
            self.master_pub = self.master.get_pubkey()
        elif master_pub is not None:
            self.master_pub = master_pub
        else:
            raise RuntimeError("One of master or master_pub must be specified")
        self.payout_address = payout_address
        self.payout_script_pubkey = payout_address.to_script()

        self.signed_stakes: List[SignedStake] = []
        """List of signed stakes sorted by stake ID.
        Adding stakes through :meth:`add_signed_stake` takes care of the sorting.
        """

        self.pwd = pwd
        """Password if any"""

        self.wallet = wallet
        """The signing wallet"""

    @classmethod
    def from_proof(
        cls, proof: Proof, wallet: AbstractWallet, master: Optional[Key] = None
    ) -> ProofBuilder:
        """Create a proof builder using the data from an existing proof.
        This is useful for adding more stakes to it.

        The provided master private key must match the proof's master public key,
        because changing the key would invalidate previous signed stakes.

        If no master key is provided, the generated proof will have an invalid
        signature.
        """
        if master is not None and master.get_pubkey() != proof.master_pub:
            raise KeyError("Mismatching master and master_pub")
        builder = cls(
            proof.sequence,
            proof.expiration_time,
            proof.get_payout_address(),
            wallet,
            master,
            proof.master_pub,
        )
        builder.signed_stakes = proof.signed_stakes
        return builder

    def sign_and_add_stake(self, stake: StakeAndSigningData):
        task = partial(
            self.wallet.sign_stake,
            stake,
            self.expiration_time,
            self.master_pub,
            self.pwd,
        )

        def add_signed_stake(signature):
            if not signature:
                return

            self.add_signed_stake(SignedStake(stake.stake, signature))

        self.wallet.thread.add(task, on_success=add_signed_stake)

    def add_signed_stake(self, ss: SignedStake):
        # At this stage the stake pubkey should be set, so we can compute the
        # stake id. This has to be delayed because the pubkey is returned by the
        # hardware wallet so we can't determine it in advance in this case.
        ss.stake.compute_stake_id()

        self.signed_stakes.append(ss)
        # Enforce a unique sorting for stakes in a proof. The sorting key is a UInt256.
        # See UInt256.compare for the specifics about sorting these objects.
        self.signed_stakes.sort(key=lambda ss: ss.stake.stake_id)

    def build(self, on_completion):
        # Make sure all the stakes are signed by the time we compute the proof.
        # We achieve this by queuing a dummy task in the wallet thread and only
        # build the proof when it completed so we end up serializing the calls.
        def build_proof(_):
            ltd_id = LimitedProofId.build(
                self.sequence,
                self.expiration_time,
                [ss.stake for ss in self.signed_stakes],
                self.payout_script_pubkey,
            )

            signature = (
                self.master.sign_schnorr(ltd_id.serialize())
                if self.master is not None
                else NO_SIGNATURE
            )

            on_completion(
                Proof(
                    self.sequence,
                    self.expiration_time,
                    self.master_pub,
                    self.signed_stakes,
                    self.payout_script_pubkey,
                    signature,
                )
            )

        task = partial(lambda: None)
        self.wallet.thread.add(task, on_success=build_proof)
