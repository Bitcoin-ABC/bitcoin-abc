# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
eCash Agora Plugin

Allows users to create UTXOs that can be accepted by anyone if the spending tx
has outputs enforced by the Script of the UTXO.

This allows users to offer UTXOs for other UTXOs in a single, direct, atomic,
peer-to-peer, non-custodial transaction.
"""

import hashlib
from dataclasses import dataclass
from typing import Optional

from chronik_plugin.plugin import Plugin, PluginOutput
from chronik_plugin.script import (
    OP_2,
    OP_3DUP,
    OP_CAT,
    OP_CHECKDATASIGVERIFY,
    OP_CHECKSIG,
    OP_CHECKSIGVERIFY,
    OP_CODESEPARATOR,
    OP_DROP,
    OP_ELSE,
    OP_ENDIF,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_HASH160,
    OP_HASH256,
    OP_IF,
    OP_NIP,
    OP_NUM2BIN,
    OP_OVER,
    OP_ROT,
    OP_SHA256,
    OP_SPLIT,
    OP_SWAP,
    CScript,
)
from chronik_plugin.slp import slp_send
from chronik_plugin.token import Token

LOKAD_ID = b"AGR0"
SLP_INT_SIZE = 8
SLP_INT_PUSHOP = bytes([SLP_INT_SIZE])

ALL_ANYONECANPAY_BIP143 = 0x80 | 0x40 | 0x01


def hash160(m):
    ripemd160 = hashlib.new("ripemd160")
    ripemd160.update(hashlib.sha256(m).digest())
    return ripemd160.digest()


class AgoraPlugin(Plugin):
    def lokad_id(self):
        return LOKAD_ID

    def version(self):
        return "0.1.0"

    def run(self, tx):
        return self.run_ad_input(tx)

    def run_ad_input(self, tx):
        """
        Parse the Agora variant that has an "ad" as the first input
        """
        if not tx.inputs:
            return []
        if len(tx.outputs) < 2:
            return []
        if not tx.token_entries:
            return []

        ad_input = tx.inputs[0]
        offer_output = tx.outputs[1]
        token = offer_output.token

        # Offer must have a token
        if token is None:
            return []

        token_entry = tx.token_entries[0]
        if token.token_id != token_entry.token_id:
            return []

        pushdata = parse_ad_script_sig(ad_input.script)
        if pushdata is None:
            return []

        covenant_variant, *pushdata, ad_redeem_bytecode = pushdata
        ad_redeem_script = CScript(ad_redeem_bytecode)

        if covenant_variant == b"ONESHOT":
            agora_oneshot = AgoraOneshot.parse_redeem_script(
                ad_redeem_script,
                token,
            )
            if agora_oneshot is None:
                return []

            expected_agora_script = agora_oneshot.script()
            expected_agora_p2sh = CScript(
                [OP_HASH160, hash160(expected_agora_script), OP_EQUAL]
            )

            if offer_output.script != expected_agora_p2sh:
                # Offered output doesn't have the advertized P2SH script
                return [
                    PluginOutput(
                        idx=1,
                        data=[b"ERROR", expected_agora_script],
                        groups=[],
                    )
                ]
            data = agora_oneshot.data()
            pubkey = agora_oneshot.cancel_pk
        else:
            return []

        token_id_bytes = bytes.fromhex(token.token_id)
        groups = [
            b"P" + pubkey,
            b"T" + token_id_bytes,
        ]
        if token_entry.group_token_id:
            groups.append(b"G" + bytes.fromhex(token_entry.group_token_id))
        else:
            groups.append(b"F" + token_id_bytes)

        return [
            PluginOutput(
                idx=1,
                data=data,
                groups=groups,
            )
        ]


MIN_NUM_SCRIPTSIG_PUSHOPS = 3


def parse_ad_script_sig(script) -> Optional[list[bytes]]:
    pushdata = []
    for op in script:
        if not isinstance(op, bytes):
            return None
        pushdata.append(op)
    if len(pushdata) < MIN_NUM_SCRIPTSIG_PUSHOPS:
        return None
    if pushdata[0] != LOKAD_ID:
        return None
    return pushdata[1:]


@dataclass
class AgoraOneshot:
    cancel_pk: bytes
    extra_outputs_ser: bytes
    token: Token

    @classmethod
    def parse_redeem_script(
        cls, redeem_script: CScript, token: Token
    ) -> Optional["AgoraOneshot"]:
        if token.token_protocol != "SLP":
            # Only SLP implemented
            return None

        ops = list(redeem_script)

        extra_outputs_ser = ops[0]
        if not isinstance(extra_outputs_ser, bytes):
            # Op 0 expected to be pushop for outputsSer
            return None

        if ops[1] != OP_DROP:
            # Op 1 expected to be OP_DROP
            return None

        cancel_pk = ops[2]
        if not isinstance(cancel_pk, bytes) or len(cancel_pk) != 33:
            # Op 2 expected to be pushop for cancelPk and 33 bytes long
            return None

        if ops[3] != OP_CHECKSIGVERIFY:
            # Op 3 expected to be OP_CHECKSIGVERIFY
            return None

        covenant_variant = ops[4]
        if not isinstance(covenant_variant, bytes):
            # Op 4 expected to be pushop for covenantVariant
            return None

        if ops[5] != OP_EQUALVERIFY:
            # Op 5 expected to be OP_EQUALVERIFY
            return None

        lokad_id = ops[6]
        if not isinstance(lokad_id, bytes):
            # Op 6 expected to be pushop for LOKAD ID
            return None

        return AgoraOneshot(cancel_pk, extra_outputs_ser, token)

    def data(self) -> list[bytes]:
        return [b"ONESHOT", self.extra_outputs_ser]

    def enforced_outputs_ser(self):
        op_return_script = slp_send(
            token_type=self.token.token_type,
            token_id=self.token.token_id,
            amounts=[0, self.token.amount],
        )
        return (
            bytes(8)
            + bytes([len(op_return_script)])
            + op_return_script
            + self.extra_outputs_ser
        )

    def script(self) -> CScript:
        return CScript(
            [
                OP_IF,  # if is_accept
                self.enforced_outputs_ser(),  # push enforced_outputs
                OP_SWAP,  # swap buyer_outputs, enforced_outputs
                OP_CAT,  # outputs = OP_CAT(enforced_outputs, buyer_outputs)
                OP_HASH256,  # expected_hash_outputs = OP_HASH256(outputs)
                OP_OVER,  # duplicate preimage_4_10,
                # push hash_outputs_idx:
                36
                + 2  # 4. outpoint
                + 8  # 5. scriptCode, truncated to 01ac via OP_CODESEPARATOR
                + 4,  # 6. value  # 7. sequence
                OP_SPLIT,  # split into preimage_4_7 and preimage_8_10
                OP_NIP,  # remove preimage_4_7
                32,  # push 32 onto the stack
                OP_SPLIT,  # split into actual_hash_outputs and preimage_9_10
                OP_DROP,  # drop preimage_9_10
                OP_EQUALVERIFY,  # expected_hash_outputs == actual_hash_outputs
                OP_2,  # push tx version
                # length of BIP143 preimage parts 1 to 3
                4 + 32 + 32,
                # build BIP143 preimage parts 1 to 3 for ANYONECANPAY using OP_NUM2BIN
                OP_NUM2BIN,
                OP_SWAP,  # swap preimage_4_10 and preimage_1_3
                OP_CAT,  # preimage = OP_CAT(preimage_1_3, preimage_4_10)
                OP_SHA256,  # preimage_sha256 = OP_SHA256(preimage)
                OP_3DUP,  # OP_3DUP(covenant_pk, covenant_sig, preimage_sha256)
                OP_ROT,  # -> covenant_sig | preimage_sha256 | covenant_pk
                OP_CHECKDATASIGVERIFY,  # verify preimage matches covenant_sig
                OP_DROP,  # drop preimage_sha256
                # push ALL|ANYONECANPAY|BIP143 onto the stack
                bytes([ALL_ANYONECANPAY_BIP143]),
                OP_CAT,  # append sighash flags onto covenant_sig
                OP_SWAP,  # swap covenant_pk, covenant_sig_flagged
                OP_ELSE,  # cancel path
                self.cancel_pk,  # pubkey that can cancel the covenant
                OP_ENDIF,
                # cut out everything except the OP_CHECKSIG from the BIP143 scriptCode
                OP_CODESEPARATOR,
                OP_CHECKSIG,
            ]
        )
