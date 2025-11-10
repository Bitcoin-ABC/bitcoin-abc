# -*- coding: utf-8 -*-
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2022 The Electrum ABC developers
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
"""This module deals with building avalanche proof delegation."""

from __future__ import annotations

import base64
from io import BytesIO
from typing import Callable, List, Optional, Sequence, Tuple

from ..crypto import Hash as sha256d
from ..serialize import (
    DeserializationError,
    SerializableObject,
    deserialize_sequence,
    serialize_sequence,
)
from ..uint256 import UInt256
from .primitives import Key, PublicKey
from .proof import LimitedProofId, Proof, ProofId


class WrongDelegatorKeyError(Exception):
    pass


class DelegationId(UInt256):
    @classmethod
    def from_proof_id(cls, proof_id: ProofId):
        return cls(proof_id.data)


class Level(SerializableObject):
    def __init__(
        self,
        pubkey: PublicKey,
        signature: bytes,
    ):
        self.pubkey = pubkey
        """Public key for this new level"""
        self.sig = signature
        """Signature by the previous level's key (or proof master key if this is the
        first level) of a hash of the new public key and the delegation ID."""

    def serialize(self) -> bytes:
        return self.pubkey.serialize() + self.sig

    @classmethod
    def deserialize(cls, stream: BytesIO) -> Level:
        pubkey = PublicKey.deserialize(stream)
        sig = stream.read(64)
        if len(sig) != 64:
            raise DeserializationError(
                "Could not deserialize delegation Level data. Not enough data left "
                f"for a complete Schnorr signature (found {len(sig)} bytes, expected "
                "64 bytes)."
            )

        return Level(pubkey, sig)

    def __repr__(self):
        sig = base64.b64encode(self.sig).decode("ascii")
        return f"Level(pubkey={self.pubkey}, sig={sig})"

    def __eq__(self, other):
        return self.pubkey == other.pubkey and self.sig == other.sig


def reduce_levels(
    hash_: bytes,
    levels: Sequence[Level],
    verification_function: Callable[[bytes, Level], bool] = lambda h, level: True,
) -> Tuple[bool, bytes]:
    """Hash the concatenation of the previous hash and the current pubkey for each
    level. Call the optional verification function on each level, and abort if it
    returns False."""
    for level in levels:
        ss = hash_ + level.pubkey.serialize()
        hash_ = sha256d(ss)

        if not verification_function(hash_, level):
            return False, hash_

    return True, hash_


class Delegation(SerializableObject):
    def __init__(
        self,
        limited_proofid: LimitedProofId,
        proof_master: PublicKey,
        levels: Sequence[Level],
        dgid: Optional[DelegationId] = None,
    ):
        self.limited_proofid = limited_proofid
        self.proof_master = proof_master
        """Master public key of the proof."""
        self.levels = levels

        self.dgid = dgid or self.compute_delegation_id()

    def get_delegated_public_key(self) -> PublicKey:
        if self.levels:
            return self.levels[-1].pubkey
        return self.proof_master

    def get_proof_id(self) -> ProofId:
        return self.limited_proofid.compute_proof_id(self.proof_master)

    def compute_delegation_id(self) -> DelegationId:
        success, hash_ = reduce_levels(self.get_proof_id().serialize(), self.levels)
        return DelegationId(hash_)

    def serialize(self) -> bytes:
        return (
            self.limited_proofid.serialize()
            + self.proof_master.serialize()
            + serialize_sequence(self.levels)
        )

    @classmethod
    def deserialize(cls, stream: BytesIO) -> Delegation:
        ltd_id = LimitedProofId.deserialize(stream)
        proof_master = PublicKey.deserialize(stream)
        levels = deserialize_sequence(stream, Level)
        return Delegation(ltd_id, proof_master, levels)

    def verify(self) -> Tuple[bool, PublicKey]:
        """Verify this delegation, return a tuple with the success status and the
        final public key."""

        hash_ = self.get_proof_id().serialize()
        auth = self.proof_master

        def verify_level(h, level: Level) -> bool:
            nonlocal auth
            if not auth.verify_schnorr(level.sig, h):
                return False
            auth = level.pubkey
            return True

        ret, _ = reduce_levels(hash_, self.levels, verify_level)
        return ret, auth

    def __repr__(self) -> str:
        return (
            "Delegation("
            f"limited_proofid={self.limited_proofid}, "
            f"proof_master={self.proof_master}, "
            f"levels={self.levels})"
        )

    def __eq__(self, other: Delegation) -> bool:
        return self.serialize() == other.serialize()


class DelegationBuilder:
    def __init__(
        self,
        limited_proofid: LimitedProofId,
        proof_master: PublicKey,
        delegation_id: Optional[DelegationId] = None,
    ):
        self.limited_proofid = limited_proofid
        self.proof_master = proof_master
        self.dgid = delegation_id or DelegationId.from_proof_id(
            limited_proofid.compute_proof_id(proof_master)
        )

        self.levels: List[Level] = [Level(proof_master, b"")]

    @classmethod
    def from_proof(cls, p: Proof) -> DelegationBuilder:
        return cls(p.limitedid, p.master_pub, DelegationId.from_proof_id(p.proofid))

    @classmethod
    def from_delegation(cls, dg: Delegation) -> DelegationBuilder:
        dg_builder = cls(dg.limited_proofid, dg.proof_master, dg.dgid)
        for level in dg.levels:
            dg_builder.levels[-1].sig = level.sig
            dg_builder.levels.append(Level(level.pubkey, b""))
        return dg_builder

    def add_level(self, delegator_key: Key, delegated_pubkey: PublicKey):
        if self.levels[-1].pubkey != delegator_key.get_pubkey():
            raise WrongDelegatorKeyError(
                "Delegator private key does not match most recently added public key."
            )
        hash_ = sha256d(self.dgid.serialize() + delegated_pubkey.serialize())
        self.levels[-1].sig = delegator_key.sign_schnorr(hash_)
        self.dgid = DelegationId(hash_)
        self.levels.append(Level(delegated_pubkey, b""))

    def build(self) -> Delegation:
        dg_levels = []
        for i in range(1, len(self.levels)):
            dg_levels.append(Level(self.levels[i].pubkey, self.levels[i - 1].sig))

        dg = Delegation(self.limited_proofid, self.levels[0].pubkey, dg_levels)
        assert dg.dgid == self.dgid
        return dg
