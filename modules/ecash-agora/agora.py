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
from io import BytesIO
from typing import Optional, Union

from chronik_plugin.etoken import Token
from chronik_plugin.plugin import Plugin, PluginOutput
from chronik_plugin.script import (
    OP_0,
    OP_0NOTEQUAL,
    OP_2,
    OP_2DUP,
    OP_2OVER,
    OP_2SWAP,
    OP_3,
    OP_3DUP,
    OP_8,
    OP_9,
    OP_12,
    OP_ADD,
    OP_BIN2NUM,
    OP_CAT,
    OP_CHECKDATASIGVERIFY,
    OP_CHECKSIG,
    OP_CHECKSIGVERIFY,
    OP_CODESEPARATOR,
    OP_DIV,
    OP_DROP,
    OP_DUP,
    OP_ELSE,
    OP_ENDIF,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_FROMALTSTACK,
    OP_GREATERTHANOREQUAL,
    OP_HASH160,
    OP_HASH256,
    OP_IF,
    OP_MOD,
    OP_NIP,
    OP_NOTIF,
    OP_NUM2BIN,
    OP_OVER,
    OP_PICK,
    OP_PUSHDATA1,
    OP_RESERVED,
    OP_RETURN,
    OP_REVERSEBYTES,
    OP_ROT,
    OP_SHA256,
    OP_SIZE,
    OP_SPLIT,
    OP_SUB,
    OP_SWAP,
    OP_TOALTSTACK,
    OP_TUCK,
    OP_VERIFY,
    CScript,
)
from chronik_plugin.slp import slp_send

LOKAD_ID = b"AGR0"
SLP_INT_SIZE = 8
SLP_INT_PUSHOP = bytes([SLP_INT_SIZE])

ALL_ANYONECANPAY_BIP143 = 0x80 | 0x40 | 0x01


def hash160(m):
    ripemd160 = hashlib.new("ripemd160")
    ripemd160.update(hashlib.sha256(m).digest())
    return ripemd160.digest()


def alp_send_intro(token_id: str) -> bytes:
    result = bytearray()
    result.extend(b"SLP2")
    result.append(0)
    result.extend(b"\x04SEND")
    result.extend(bytes.fromhex(token_id)[::-1])
    return bytes(result)


class AgoraPlugin(Plugin):
    def lokad_id(self):
        return LOKAD_ID

    def version(self):
        return "0.1.0"

    def run(self, tx):
        return self.run_ad_input(tx) or self.run_ad_empp(tx)

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
        token_entry = tx.token_entries[0]

        pushdata = parse_ad_script_sig(ad_input.script)
        if pushdata is None:
            return []

        covenant_variant, *pushdata, ad_redeem_bytecode = pushdata
        ad_redeem_script = CScript(ad_redeem_bytecode)

        if covenant_variant == b"ONESHOT":
            # Offer output is always output 1
            offer_idx = 1
            offer_output = tx.outputs[offer_idx]
            # Offer must have a token
            if offer_output.token is None:
                return []
            agora_oneshot = AgoraOneshot.parse_redeem_script(
                ad_redeem_script,
                offer_output.token,
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
        elif covenant_variant == b"PARTIAL":
            offer_output, offer_idx = AgoraPartial.find_offered_output(tx)
            # Offer must have a token
            if offer_output.token is None:
                return []

            agora_partial = AgoraPartial.parse_redeem_script(
                ad_redeem_script, offer_output.token
            )
            if agora_partial is None:
                return []

            expected_agora_script = agora_partial.script()
            expected_agora_sh = hash160(expected_agora_script)
            expected_agora_p2sh = CScript(
                bytes([OP_HASH160, 20]) + expected_agora_sh + bytes([OP_EQUAL])
            )

            if offer_output.script != expected_agora_p2sh:
                # Offered output doesn't have the advertized P2SH script
                return [
                    PluginOutput(
                        idx=offer_idx,
                        data=[b"ERROR", expected_agora_script],
                        groups=[],
                    )
                ]

            data = agora_partial.data()
            pubkey = agora_partial.maker_pk
        else:
            return []

        token_id_bytes = bytes.fromhex(token_entry.token_id)
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
                idx=offer_idx,
                data=data,
                groups=groups,
            )
        ]

    def run_ad_empp(self, tx):
        if not tx.empp_data:
            return []
        agr0_data = bytes(tx.empp_data[0])
        if not agr0_data.startswith(LOKAD_ID):
            return []
        if len(tx.outputs) < 2:
            return []
        offer_output, offer_idx = AgoraPartial.find_offered_output(tx)
        if offer_output.token is None:
            return []
        agora_partial = parse_partial(agr0_data, offer_output.token)
        if agora_partial is None:
            return []
        expected_agora_script = agora_partial.script()
        expected_agora_sh = hash160(expected_agora_script)
        expected_agora_p2sh = CScript(
            bytes([OP_HASH160, 20]) + expected_agora_sh + bytes([OP_EQUAL])
        )
        if offer_output.script != expected_agora_p2sh:
            return [
                PluginOutput(
                    idx=offer_idx,
                    data=[b"ERROR", expected_agora_script],
                    groups=[],
                )
            ]

        token_id_bytes = bytes.fromhex(offer_output.token.token_id)
        return [
            PluginOutput(
                idx=offer_idx,
                data=agora_partial.data(),
                groups=[
                    b"P" + agora_partial.maker_pk,
                    b"T" + token_id_bytes,
                    b"F" + token_id_bytes,
                ],
            )
        ]


MIN_NUM_SCRIPTSIG_PUSHOPS = 3


def parse_ad_script_sig(script) -> Optional[list[Union[bytes, int]]]:
    pushdata = []
    for op in script:
        if not isinstance(op, (bytes, int)):
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
            amounts=[0, self.token.atoms],
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


@dataclass
class AgoraPartial:
    trunc_tokens: int
    num_token_trunc_bytes: int
    token_scale_factor: int
    scaled_trunc_tokens_per_trunc_sat: int
    num_sats_trunc_bytes: int
    maker_pk: bytes
    min_accepted_scaled_trunc_tokens: int
    token_id: str
    token_type: int
    token_protocol: str
    script_len: int
    enforced_locktime: int
    dust_amount: int

    @classmethod
    def parse_redeem_script(cls, redeem_script, token):
        consts = next(iter(redeem_script))
        len_slp_intro = len(
            slp_send(
                token_type=token.token_type,
                token_id=token.token_id,
                amounts=[0],
            )
        )
        ad_pushdata = consts[len_slp_intro:]
        return parse_partial(ad_pushdata, token)

    @classmethod
    def find_offered_output(cls, tx):
        # Offer output is either output 1 or 2
        offer_idx = 1
        offer_output = tx.outputs[offer_idx]
        if len(tx.outputs) >= 3 and offer_output.token is None:
            offer_idx = 2
            offer_output = tx.outputs[offer_idx]
        return offer_output, offer_idx

    def ad_pushdata(self):
        pushdata = bytearray()
        if self.token_protocol == "ALP":
            pushdata.extend(b"AGR0")
            pushdata.extend(b"\x07PARTIAL")
        pushdata.append(self.num_token_trunc_bytes)
        pushdata.append(self.num_sats_trunc_bytes)
        pushdata.extend(self.token_scale_factor.to_bytes(8, "little"))
        pushdata.extend(self.scaled_trunc_tokens_per_trunc_sat.to_bytes(8, "little"))
        pushdata.extend(self.min_accepted_scaled_trunc_tokens.to_bytes(8, "little"))
        pushdata.extend(self.enforced_locktime.to_bytes(4, "little"))
        pushdata.extend(self.maker_pk)
        return bytes(pushdata)

    def data(self) -> list[bytes]:
        return [
            b"PARTIAL",
            bytes([self.num_token_trunc_bytes]),
            bytes([self.num_sats_trunc_bytes]),
            self.token_scale_factor.to_bytes(8, "little"),
            self.scaled_trunc_tokens_per_trunc_sat.to_bytes(8, "little"),
            self.min_accepted_scaled_trunc_tokens.to_bytes(8, "little"),
            self.enforced_locktime.to_bytes(4, "little"),
        ]

    def script(self) -> CScript:
        # See partial.ts in ecash-agora for a commented version of this Script
        scaled_trunc_tokens_8le = (
            self.trunc_tokens * self.token_scale_factor
        ).to_bytes(8, "little")

        ad_pushdata = self.ad_pushdata()

        # Consts are of slightly different form
        if self.token_protocol == "SLP":
            slp_intro = slp_send(
                token_type=self.token_type,
                token_id=self.token_id,
                amounts=[0],
            )
            covenant_consts = bytes(slp_intro) + ad_pushdata
            token_intro_len = len(slp_intro)
        elif self.token_protocol == "ALP":
            alp_intro = alp_send_intro(self.token_id)
            empp_intro = CScript([OP_RETURN, OP_RESERVED, self.ad_pushdata()])
            covenant_consts = alp_intro + bytes(empp_intro)
            token_intro_len = len(alp_intro)
        else:
            raise NotImplementedError

        return CScript(
            [
                covenant_consts,
                scaled_trunc_tokens_8le,
                OP_CODESEPARATOR,
                OP_ROT,
                OP_IF,
                OP_BIN2NUM,
                OP_ROT,
                OP_2DUP,
                OP_GREATERTHANOREQUAL,
                OP_VERIFY,
                OP_DUP,
                self.min_accepted_scaled_trunc_tokens,
                OP_GREATERTHANOREQUAL,
                OP_VERIFY,
                OP_DUP,
                self.token_scale_factor,
                OP_MOD,
                OP_0,
                OP_EQUALVERIFY,
                OP_TUCK,
                OP_SUB,
                2,
                OP_PICK,
                token_intro_len,
                OP_SPLIT,
                OP_DROP,
                OP_OVER,
                OP_0NOTEQUAL,
                *self._script_build_op_return(token_intro_len),
                bytes(self.num_sats_trunc_bytes),
                OP_CAT,
                OP_ROT,
                self.scaled_trunc_tokens_per_trunc_sat - 1,
                OP_ADD,
                self.scaled_trunc_tokens_per_trunc_sat,
                OP_DIV,
                8 - self.num_sats_trunc_bytes,
                OP_NUM2BIN,
                OP_CAT,
                bytes([25, OP_DUP, OP_HASH160, 20]),
                OP_2OVER,
                OP_DROP,
                len(covenant_consts) - 33,
                OP_SPLIT,
                OP_NIP,
                OP_HASH160,
                OP_CAT,
                bytes([OP_EQUALVERIFY, OP_CHECKSIG]),
                OP_CAT,
                OP_CAT,
                OP_TOALTSTACK,
                OP_TUCK,
                self.dust_amount,
                OP_8,
                OP_NUM2BIN,
                bytes([23, OP_HASH160, 20]),
                OP_CAT,
                bytes(
                    [OP_PUSHDATA1, len(covenant_consts)]
                    if len(covenant_consts) >= OP_PUSHDATA1
                    else [len(covenant_consts)]
                ),
                OP_2SWAP,
                OP_8,
                OP_TUCK,
                OP_NUM2BIN,
                OP_CAT,
                OP_CAT,
                OP_CAT,
                bytes([OP_CODESEPARATOR]),
                OP_CAT,
                3,
                OP_PICK,
                36 + (1 if self.script_len < 0xFD else 3),
                OP_SPLIT,
                OP_NIP,
                self.script_len,
                OP_SPLIT,
                OP_12,
                OP_SPLIT,
                OP_NIP,
                32,
                OP_SPLIT,
                4,
                OP_SPLIT,
                OP_DROP,
                self.enforced_locktime.to_bytes(4, "little"),
                OP_EQUALVERIFY,
                OP_TOALTSTACK,
                OP_CAT,
                OP_HASH160,
                OP_CAT,
                bytes([OP_EQUAL]),
                OP_CAT,
                OP_SWAP,
                OP_0NOTEQUAL,
                OP_NOTIF,
                OP_DROP,
                b"",
                OP_ENDIF,
                OP_ROT,
                OP_SIZE,
                OP_0NOTEQUAL,
                OP_VERIFY,
                OP_CAT,
                OP_FROMALTSTACK,
                OP_FROMALTSTACK,
                OP_ROT,
                OP_CAT,
                OP_HASH256,
                OP_EQUALVERIFY,
                OP_2,
                4 + 32 + 32,
                OP_NUM2BIN,
                OP_SWAP,
                OP_CAT,
                OP_SHA256,
                OP_3DUP,
                OP_ROT,
                OP_CHECKDATASIGVERIFY,
                OP_DROP,
                bytes([ALL_ANYONECANPAY_BIP143]),
                OP_CAT,
                OP_SWAP,
                OP_ELSE,
                OP_DROP,
                len(covenant_consts) - 33,
                OP_SPLIT,
                OP_NIP,
                OP_ENDIF,
                *self._script_outro(),
            ]
        )

    def _script_build_op_return(self, token_intro_len):
        if self.token_protocol == "SLP":
            return self._script_build_slp_op_return()
        elif self.token_protocol == "ALP":
            return self._script_build_alp_op_return(token_intro_len)
        else:
            raise NotImplementedError

    def _script_build_slp_op_return(self):
        return [
            OP_IF,
            OP_8,
            OP_CAT,
            OP_OVER,
            self.token_scale_factor,
            OP_DIV,
            *self._script_ser_trunc_tokens(),
            OP_REVERSEBYTES,
            bytes(self.num_token_trunc_bytes),
            OP_CAT,
            OP_CAT,
            OP_ENDIF,
            OP_8,
            OP_CAT,
            2,
            OP_PICK,
            self.token_scale_factor,
            OP_DIV,
            *self._script_ser_trunc_tokens(),
            OP_REVERSEBYTES,
            bytes(self.num_token_trunc_bytes),
            OP_CAT,
            OP_CAT,
            OP_SIZE,
            OP_9,
            OP_NUM2BIN,
            OP_REVERSEBYTES,
            OP_SWAP,
            OP_CAT,
        ]

    def _script_build_alp_op_return(self, token_intro_len):
        return [
            OP_IF,
            OP_3,
            7 + self.num_token_trunc_bytes,
            OP_NUM2BIN,
            OP_CAT,
            OP_OVER,
            self.token_scale_factor,
            OP_DIV,
            6,
            OP_ELSE,
            OP_2,
            7 + self.num_token_trunc_bytes,
            OP_ENDIF,
            OP_NUM2BIN,
            OP_CAT,
            2,
            OP_PICK,
            self.token_scale_factor,
            OP_DIV,
            *self._script_ser_trunc_tokens(),
            OP_CAT,
            OP_SIZE,
            OP_SWAP,
            OP_CAT,
            3,
            OP_PICK,
            token_intro_len,
            OP_SPLIT,
            OP_NIP,
            OP_SWAP,
            OP_CAT,
            OP_SIZE,
            OP_9,
            OP_NUM2BIN,
            OP_REVERSEBYTES,
            OP_SWAP,
            OP_CAT,
        ]

    def _script_ser_trunc_tokens(self):
        if self.token_protocol == "SLP":
            num_bytes_token_amount = 8
        elif self.token_protocol == "ALP":
            num_bytes_token_amount = 6
        else:
            raise NotImplementedError
        if self.num_token_trunc_bytes == num_bytes_token_amount - 3:
            return [
                4,
                OP_NUM2BIN,
                3,
                OP_SPLIT,
                OP_DROP,
            ]
        return [
            num_bytes_token_amount - self.num_token_trunc_bytes,
            OP_NUM2BIN,
        ]

    def _script_outro(self):
        if self.token_protocol == "SLP":
            return [
                OP_CHECKSIGVERIFY,
                b"PARTIAL",
                OP_EQUALVERIFY,
                LOKAD_ID,
                OP_EQUAL,
            ]
        elif self.token_protocol == "ALP":
            return [OP_CHECKSIG]
        else:
            raise NotImplementedError


def parse_partial(pushdata: bytes, token) -> Optional[AgoraPartial]:
    data_reader = BytesIO(pushdata)
    # AGR0 PARTIAL pushdata always has the same length
    if token.token_protocol == "SLP":
        if len(pushdata) != 63:
            return None
    elif token.token_protocol == "ALP":
        if len(pushdata) != 75:
            return None
        if data_reader.read(4) != b"AGR0":
            return None
        if data_reader.read(8) != b"\x07PARTIAL":
            return None
    else:
        raise NotImplementedError
    num_token_trunc_bytes = data_reader.read(1)[0]
    num_sats_trunc_bytes = data_reader.read(1)[0]
    token_scale_factor = int.from_bytes(data_reader.read(8), "little")
    scaled_trunc_tokens_per_trunc_sat = int.from_bytes(data_reader.read(8), "little")
    min_accepted_scaled_trunc_tokens = int.from_bytes(data_reader.read(8), "little")
    enforced_locktime = int.from_bytes(data_reader.read(4), "little")
    maker_pk = data_reader.read(33)

    token_trunc_factor = 1 << (8 * num_token_trunc_bytes)

    # Offers must have a losslessly truncatable token amount
    if token.atoms % token_trunc_factor != 0:
        return None

    partial_alp = AgoraPartial(
        trunc_tokens=token.atoms // token_trunc_factor,
        num_token_trunc_bytes=num_token_trunc_bytes,
        token_scale_factor=token_scale_factor,
        scaled_trunc_tokens_per_trunc_sat=scaled_trunc_tokens_per_trunc_sat,
        num_sats_trunc_bytes=num_sats_trunc_bytes,
        maker_pk=maker_pk,
        min_accepted_scaled_trunc_tokens=min_accepted_scaled_trunc_tokens,
        token_id=token.token_id,
        token_type=token.token_type,
        token_protocol=token.token_protocol,
        script_len=0x7F,
        enforced_locktime=enforced_locktime,
        dust_amount=546,
    )
    measured_len = len(cut_out_codesep(partial_alp.script()))
    if measured_len > 0x80:
        partial_alp.script_len = measured_len
        measured_len = len(cut_out_codesep(partial_alp.script()))
    partial_alp.script_len = measured_len
    return partial_alp


def cut_out_codesep(script):
    script_iter = iter(script)
    for op in script_iter:
        if op == OP_CODESEPARATOR:
            break
    else:
        return script
    return CScript(script_iter)
