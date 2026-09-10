// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Reconstruct a fused ALP SEND from shared covert components and apply
 * CashFusion-shaped covert Schnorr signatures (64-byte sig + ALL_BIP143).
 *
 * Output order follows the shared component list (no extra shuffle) so every
 * player rebuilds the same unsigned tx. Blame proofs stay out of scope.
 */
import {
    ALL_BIP143,
    DEFAULT_DUST_SATS,
    Ecc,
    Script,
    UnsignedTx,
    flagSignature,
    sha256d,
    shaRmd160,
    toHexRev,
    type OutPoint,
    type Tx,
} from 'ecash-lib';

import { asBytes, componentsToContribution } from '../protocol/components.js';
import { decodeComponent } from '../protocol/messages.js';

import { assembleAlpSend, type AssembledAlpSend } from './assemble.js';
import type { FusionTokenOutput } from './types.js';

/** Compressed pubkey plus the seckey that unlocks a P2PKH fusion input. */
export interface FusionInputKey {
    sk: Uint8Array;
    pubkey: Uint8Array;
}

export interface CovertInputSignature {
    whichInput: number;
    /** 64-byte Schnorr (flag added when the scriptSig is applied). */
    signature: Uint8Array;
}

/**
 * Pubkeys in {@link assembleAlpSend} input order: token inputs, then fuel,
 * walking the shared component list once.
 */
export function pubkeysFromComponents(
    componentBytes: Uint8Array[],
): Uint8Array[] {
    const token: Uint8Array[] = [];
    const fuel: Uint8Array[] = [];
    for (const raw of componentBytes) {
        const dec = decodeComponent(Buffer.from(raw));
        if (!dec.input) {
            continue;
        }
        const input = dec.input as Record<string, unknown>;
        const pk = asBytes(input.pubkey, 'input.pubkey');
        const atoms = input.tokenAtoms;
        if (atoms === undefined || atoms === 0n) {
            fuel.push(pk);
        } else {
            token.push(pk);
        }
    }
    return [...token, ...fuel];
}

/**
 * Deterministic assemble from the shared covert component list.
 * Token / fuel / output order matches {@link componentsToContribution}.
 */
export function assembleFromComponents(
    tokenId: string,
    componentBytes: Uint8Array[],
    feePerKb?: bigint,
): { assembled: AssembledAlpSend; pubkeys: Uint8Array[] } {
    const merged = componentsToContribution('round', tokenId, componentBytes);
    const assembled = assembleAlpSend({
        tokenId,
        tokenInputs: merged.tokenInputs,
        fuelInputs: merged.fuelInputs,
        tokenOutputs: merged.tokenOutputs,
        feePerKb,
    });
    const pubkeys = pubkeysFromComponents(componentBytes);
    if (pubkeys.length !== assembled.tx.inputs.length) {
        throw new Error(
            'assembleFromComponents: pubkey count does not match inputs',
        );
    }
    return { assembled, pubkeys };
}

/**
 * Canonical outpoint key: Chronik BE hex txid + outIdx.
 */
export function prevOutKey(prevOut: OutPoint): string {
    const txid =
        typeof prevOut.txid === 'string'
            ? prevOut.txid.toLowerCase()
            : toHexRev(prevOut.txid);
    return `${txid}:${prevOut.outIdx}`;
}

/**
 * Multiset key for a colored token output: script + sats + ALP atoms.
 * Atoms come from the EMPP SEND array, not the tx output itself.
 */
function tokenOutKey(script: Script, sats: bigint, atoms: bigint): string {
    return `${Buffer.from(script.bytecode).toString('hex')}:${sats}:${atoms}`;
}

/**
 * Require every contributed token output to appear in the assembled SEND
 * (script, dust sats, atoms), counting duplicates by multiplicity.
 * The coordinator controls the shared component list; conservation alone
 * does not stop it from paying this player's atoms elsewhere.
 */
export function assertOwnOutputsPresent(
    assembled: AssembledAlpSend,
    contrib: { tokenOutputs: FusionTokenOutput[] },
    dustSats: bigint = DEFAULT_DUST_SATS,
): void {
    const n = assembled.sendAtomsArray.length;
    if (assembled.tx.outputs.length < n + 1) {
        throw new Error('assembled tx missing token outputs');
    }
    const available = new Map<string, number>();
    for (let i = 0; i < n; i++) {
        const out = assembled.tx.outputs[i + 1];
        const key = tokenOutKey(
            out.script,
            out.sats,
            assembled.sendAtomsArray[i],
        );
        available.set(key, (available.get(key) ?? 0) + 1);
    }
    for (const want of contrib.tokenOutputs) {
        const key = tokenOutKey(want.script, want.sats ?? dustSats, want.atoms);
        const left = available.get(key) ?? 0;
        if (left < 1) {
            throw new Error('assembled tx missing contributed output');
        }
        available.set(key, left - 1);
    }
}

/**
 * Outpoints this player actually contributed (token + fuel).
 */
export function prevOutsFromContribution(contrib: {
    tokenInputs: { prevOut: OutPoint }[];
    fuelInputs?: { prevOut: OutPoint }[];
}): Set<string> {
    const keys = new Set<string>();
    for (const inp of [...contrib.tokenInputs, ...(contrib.fuelInputs ?? [])]) {
        keys.add(prevOutKey(inp.prevOut));
    }
    return keys;
}

/**
 * Schnorr-sign inputs that are in `ownPrevOuts` and whose P2PKH script
 * matches one of `keys`. Script match alone is not enough — a malicious
 * coordinator can insert another UTXO that pays the same address.
 */
export function signOwnedInputs(
    tx: Tx,
    keys: FusionInputKey[],
    ownPrevOuts: ReadonlySet<string>,
): CovertInputSignature[] {
    const unsigned = UnsignedTx.fromTx(tx);
    const ecc = new Ecc();
    const out: CovertInputSignature[] = [];
    for (let i = 0; i < tx.inputs.length; i++) {
        if (!ownPrevOuts.has(prevOutKey(tx.inputs[i].prevOut))) {
            continue;
        }
        const outputScript = tx.inputs[i].signData?.outputScript;
        if (!outputScript) {
            continue;
        }
        const key = keys.find(k =>
            Buffer.from(Script.p2pkh(shaRmd160(k.pubkey)).bytecode).equals(
                Buffer.from(outputScript.bytecode),
            ),
        );
        if (!key) {
            continue;
        }
        const preimage = unsigned.inputAt(i).sigHashPreimage(ALL_BIP143);
        out.push({
            whichInput: i,
            signature: ecc.schnorrSign(key.sk, sha256d(preimage.bytes)),
        });
    }
    return out;
}

/**
 * Verify a covert 64-byte Schnorr sig and write the P2PKH scriptSig.
 * `unsigned` must be built from the pre-sign tx so sighashes stay stable.
 */
export function applyCovertSignature(
    tx: Tx,
    unsigned: UnsignedTx,
    whichInput: number,
    signature: Uint8Array,
    pubkey: Uint8Array,
): void {
    if (signature.length !== 64) {
        throw new Error('txsignature must be 64-byte Schnorr');
    }
    if (whichInput < 0 || whichInput >= tx.inputs.length) {
        throw new Error('whichInput out of range');
    }
    const existing = tx.inputs[whichInput].script;
    if (existing !== undefined && existing.bytecode.length > 0) {
        throw new Error('input already signed');
    }
    const preimage = unsigned.inputAt(whichInput).sigHashPreimage(ALL_BIP143);
    new Ecc().schnorrVerify(signature, sha256d(preimage.bytes), pubkey);
    tx.inputs[whichInput].script = Script.p2pkhSpend(
        pubkey,
        flagSignature(signature, ALL_BIP143),
    );
}

/**
 * Keys from a wire contribution that include a seckey.
 */
export function keysFromContribution(contrib: {
    tokenInputs: { sk?: Uint8Array; pubkey: Uint8Array }[];
    fuelInputs?: { sk?: Uint8Array; pubkey: Uint8Array }[];
}): FusionInputKey[] {
    const keys: FusionInputKey[] = [];
    for (const inp of [...contrib.tokenInputs, ...(contrib.fuelInputs ?? [])]) {
        if (inp.sk === undefined) {
            continue;
        }
        keys.push({ sk: inp.sk, pubkey: inp.pubkey });
    }
    return keys;
}
