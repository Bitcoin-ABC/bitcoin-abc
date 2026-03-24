// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Partially Signed Bitcoin Transaction (PSBT) per **BIP 174**:
 * - Spec: https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
 *
 * Decode/encode aligned with Bitcoin ABC (`{@link Psbt.fromBytes}`,
 * `{@link Psbt.toBytes}`), plus multisig workflows: per-input `PSBT_IN_UTXO`
 * (`0x00`), redeem script, partial signatures; unknown pairs preserved (BIP 174).
 *
 * **Input key `0x00` (`PSBT_IN_UTXO`):** BIP 174 also defines type `0x01` (“witness
 * UTXO”) for the same *value* shape. **Bitcoin ABC only implements `0x00`:** value
 * is `CTxOut` or full previous tx (non-witness UTXO). We match the node; `0x01`
 * entries are preserved as unknown keys on round-trip.
 *
 * High-level merge/sign helpers: {@link Tx.addMultisigSignature},
 * {@link Tx.addMultisigSignatureFromKey}; {@link Psbt.fromTx} builds a PSBT from a
 * partially signed {@link Tx}; {@link Psbt.toTx} rebuilds scriptSigs from partial sigs.
 */

import { Bytes } from './io/bytes.js';
import { fromHex, toHex, toHexRev } from './io/hex.js';
import { readVarSize, writeVarSize } from './io/varsize.js';
import { WriterBytes } from './io/writerbytes.js';
import { WriterLength } from './io/writerlength.js';
import { Writer } from './io/writer.js';
import { Ecc } from './ecc.js';
import { shaRmd160, sha256d } from './hash.js';
import { Script } from './script.js';
import { ALL_BIP143, type SigHashType } from './sigHashType.js';
import {
    copyTxInput,
    copyTxOutput,
    OutPoint,
    SignData,
    Tx,
    TxInput,
} from './tx.js';
import { UnsignedTx } from './unsignedTx.js';

/**
 * BIP 174 **magic bytes** for PSBT version 0: ASCII `psbt` + `0xff`.
 * Defined in BIP 174 “Specification > Version 0” (must be first bytes of a `.psbt`).
 * - https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#specification
 * - https://bips.dev/174/#specification
 */
export const PSBT_MAGIC = new Uint8Array([0x70, 0x73, 0x62, 0x74, 0xff]);

const PSBT_GLOBAL_UNSIGNED_TX = 0x00;
/**
 * Bitcoin ABC `PSBT_IN_UTXO` (BIP 174 input type `0x00`): value is either the full
 * previous transaction (BIP “non-witness UTXO”) or a serialized `CTxOut` (amount +
 * scriptPubKey). This is the **only** key we use for spent-output data; BIP type
 * `0x01` is not handled like the node (see module TSDoc). Resolved in
 * {@link resolveWitnessFromKey00}.
 */
export const PSBT_IN_UTXO = 0x00;
const PSBT_IN_PARTIAL_SIG = 0x02;
const PSBT_IN_SIGHASH = 0x03;
const PSBT_IN_REDEEM_SCRIPT = 0x04;
/** BIP 174 / Bitcoin ABC — input HD keypaths */
const PSBT_IN_BIP32_DERIVATION = 0x06;
const PSBT_IN_SCRIPTSIG = 0x07;
/** Bitcoin ABC — output redeem script (same first byte as global unsigned tx key type). */
const PSBT_OUT_REDEEMSCRIPT = 0x00;
/** Bitcoin ABC — output HD keypaths */
const PSBT_OUT_BIP32_DERIVATION = 0x02;

function compareLex(a: Uint8Array, b: Uint8Array): number {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
        if (a[i] !== b[i]) return a[i]! - b[i]!;
    }
    return a.length - b.length;
}

function sortPairs(pairs: { key: Uint8Array; value: Uint8Array }[]): void {
    pairs.sort((x, y) => compareLex(x.key, y.key));
}

function writePsbtKeyValue(writer: Writer, key: Uint8Array, value: Uint8Array) {
    writeVarSize(key.length, writer);
    writer.putBytes(key);
    writeVarSize(value.length, writer);
    writer.putBytes(value);
}

function serializeMap(
    pairs: { key: Uint8Array; value: Uint8Array }[],
): Uint8Array {
    sortPairs(pairs);
    const wl = new WriterLength();
    for (const p of pairs) {
        writePsbtKeyValue(wl, p.key, p.value);
    }
    writeVarSize(0, wl);
    const out = new WriterBytes(wl.length);
    for (const p of pairs) {
        writePsbtKeyValue(out, p.key, p.value);
    }
    writeVarSize(0, out);
    return out.data;
}

function parseMap(bytes: Bytes): { key: Uint8Array; value: Uint8Array }[] {
    const pairs: { key: Uint8Array; value: Uint8Array }[] = [];
    while (true) {
        const keyLen = readVarSize(bytes);
        if (keyLen === 0) break;
        const key = bytes.readBytes(Number(keyLen));
        const valLen = readVarSize(bytes);
        const value = bytes.readBytes(Number(valLen));
        pairs.push({ key, value });
    }
    return pairs;
}

/** BIP 174 / Bitcoin ABC: duplicate keys in a map are forbidden (see `PSBTInput::Unserialize`). */
function assertUniquePsbtKeys(
    pairs: { key: Uint8Array; value: Uint8Array }[],
    mapLabel: string,
): void {
    const seen = new Set<string>();
    for (const { key } of pairs) {
        if (key.length === 0) continue;
        const id = toHex(key);
        if (seen.has(id)) {
            throw new Error(`PSBT: duplicate key in ${mapLabel} map`);
        }
        seen.add(id);
    }
}

/** Global unsigned transaction must have empty scriptSigs (Bitcoin ABC `PartiallySignedTransaction::Unserialize`). */
function assertUnsignedTxEmptyScriptSigs(tx: Tx): void {
    for (let i = 0; i < tx.inputs.length; i++) {
        const sc = tx.inputs[i]?.script;
        const len = sc?.bytecode.length ?? 0;
        if (len > 0) {
            throw new Error('PSBT: unsigned tx must have empty scriptSigs');
        }
    }
}

/** Partial signature key: 1 byte type + 33 (compressed) or 65 (uncompressed) byte pubkey. */
function isValidPartialSigKeyLength(keyLen: number): boolean {
    return keyLen === 34 || keyLen === 66;
}

/** CPubKey-style prefix check (matches `DeserializeHDKeypaths` length rules; not full curve validation). */
function pubkeyBytesLookPlausible(pk: Uint8Array): boolean {
    if (pk.length === 33) {
        return pk[0] === 0x02 || pk[0] === 0x03;
    }
    if (pk.length === 65) {
        return pk[0] === 0x04;
    }
    return false;
}

/**
 * `DeserializeHDKeypaths` in `src/script/sign.h` (Bitcoin ABC) reads a leading
 * compact size `value_len`, then exactly `value_len` bytes (fingerprint + path).
 *
 * Some `rpc_psbt.json` valid vectors use the same logical payload **without** that
 * length prefix (fingerprint + uint32 path only), matching BIP 174’s description
 * of the value bytes; we accept both shapes so `decodepsbt`-valid PSBTs parse.
 */
function validateBip32DerivationKeyValue(
    key: Uint8Array,
    value: Uint8Array,
): void {
    if (key.length !== 34 && key.length !== 66) {
        throw new Error(
            'PSBT: size of key was not the expected size for the type BIP32 keypath',
        );
    }
    const pk = key.slice(1);
    if (!pubkeyBytesLookPlausible(pk)) {
        throw new Error('PSBT: invalid pubkey in BIP32 derivation key');
    }
    const tryPrefixedLength = (): boolean => {
        const b = new Bytes(value);
        let valueLen: number;
        try {
            valueLen = Number(readVarSize(b));
        } catch {
            return false;
        }
        if (valueLen === 0 || valueLen % 4 !== 0) {
            return false;
        }
        if (value.length - b.idx < valueLen) {
            return false;
        }
        b.readBytes(4);
        for (let i = 4; i < valueLen; i += 4) {
            b.readU32();
        }
        return b.idx === value.length;
    };

    if (tryPrefixedLength()) {
        return;
    }

    if (value.length < 4 || value.length % 4 !== 0) {
        throw new Error('PSBT: invalid length for HD key path');
    }
    const b = new Bytes(value);
    b.readBytes(4);
    for (let i = 4; i < value.length; i += 4) {
        b.readU32();
    }
    if (b.idx !== value.length) {
        throw new Error('PSBT: invalid BIP32 derivation value');
    }
}

/** Strip input scripts for PSBT global unsigned transaction (BIP 174). */
export function txToUnsigned(tx: Tx): Tx {
    return new Tx({
        version: tx.version,
        inputs: tx.inputs.map(inp => ({
            prevOut: inp.prevOut,
            script: new Script(),
            sequence: inp.sequence,
        })),
        outputs: tx.outputs.map(o => copyTxOutput(o)),
        locktime: tx.locktime,
    });
}

/** `CTxOut` bytes for a {@link PSBT_IN_UTXO} map value (same layout BIP 174 labels “witness UTXO”). */
function encodeWitnessUtxo(sats: bigint, scriptPubKey: Uint8Array): Uint8Array {
    const wl = new WriterLength();
    wl.putU64(sats);
    writeVarSize(scriptPubKey.length, wl);
    wl.putBytes(scriptPubKey);
    const w = new WriterBytes(wl.length);
    w.putU64(sats);
    writeVarSize(scriptPubKey.length, w);
    w.putBytes(scriptPubKey);
    return w.data;
}

function decodeWitnessUtxo(data: Uint8Array): {
    sats: bigint;
    scriptPubKey: Uint8Array;
} {
    const b = new Bytes(data);
    const sats = b.readU64();
    const sl = readVarSize(b);
    const scriptPubKey = b.readBytes(Number(sl));
    return { sats, scriptPubKey };
}

function prevOutTxidHex(po: OutPoint): string {
    return typeof po.txid === 'string' ? po.txid : toHexRev(po.txid);
}

/**
 * Value for input key type `0x00` (`PSBT_IN_UTXO` in Bitcoin ABC): either BIP 174 non-witness
 * UTXO (full prev tx) or a `CTxOut`-shaped blob (amount + scriptPubKey), as in
 * Bitcoin ABC.
 */
function resolveWitnessFromKey00(
    value: Uint8Array,
    prevOut: OutPoint,
): { sats: bigint; scriptPubKey: Uint8Array } | undefined {
    if (value.length >= 50) {
        const tx = Tx.tryDeserExact(value);
        if (tx !== undefined && tx.inputs.length > 0) {
            if (tx.txid() === prevOutTxidHex(prevOut)) {
                const out = tx.outputs[prevOut.outIdx];
                if (out !== undefined) {
                    return {
                        sats: out.sats,
                        scriptPubKey: out.script.bytecode,
                    };
                }
            }
        }
    }
    try {
        return decodeWitnessUtxo(value);
    } catch {
        return undefined;
    }
}

function pubkeyHex(pk: Uint8Array): string {
    return toHex(pk);
}

function scriptPubKeyFromSignData(signData: SignData): Uint8Array {
    if (signData.redeemScript !== undefined) {
        const h = shaRmd160(signData.redeemScript.bytecode);
        return Script.p2sh(h).bytecode;
    }
    if (signData.outputScript !== undefined) {
        return signData.outputScript.bytecode;
    }
    throw new Error('SignData needs redeemScript or outputScript for PSBT');
}

/**
 * The multisig **redeem** script used to interpret partial sigs: P2SH `redeemScript`,
 * or bare `outputScript` (the locking script is the multisig template itself).
 */
function multisigLockingScript(signData: SignData): Script {
    if (signData.redeemScript !== undefined) {
        return signData.redeemScript;
    }
    if (signData.outputScript !== undefined) {
        return signData.outputScript;
    }
    throw new Error('SignData needs redeemScript or outputScript');
}

/**
 * Build the input `scriptSig` for a multisig spend from the PSBT partial-signature
 * map (pubkey hex → signature with sighash byte). Used by {@link Psbt.toTx} only.
 *
 * Matches pubkey order from {@link multisigLockingScript}'s `parseMultisigRedeemScript`,
 * then dispatches:
 * - **Schnorr** if any partial sig has length 65 (Schnorr + sighash): uses
 *   {@link Script.multisigSpend} with `pubkeyIndices` derived from which pubkeys
 *   have sigs (bare passes `numPubkeys`; P2SH passes `redeemScript`).
 * - **ECDSA** otherwise: fills `m` slots left-to-right from present sigs (same
 *   convention as {@link BareMultisigSignatory} / {@link P2SHMultisigSignatory}).
 */
function buildScriptSigFromPartialSigs(
    signData: SignData,
    partialSigs: Map<string, Uint8Array>,
): Script {
    const lock = multisigLockingScript(signData);
    const { numSignatures, numPubkeys, pubkeys } =
        lock.parseMultisigRedeemScript();
    const perPk = pubkeys.map(pk => partialSigs.get(pubkeyHex(pk)));
    const signatures = perPk.filter((s): s is Uint8Array => s !== undefined);

    const anySchnorr = [...partialSigs.values()].some(s => s.length === 65);
    if (anySchnorr) {
        const pubkeyIndices = new Set(
            perPk.flatMap((s, i) => (s !== undefined ? [i] : [])),
        );
        if (signData.redeemScript !== undefined) {
            return Script.multisigSpend({
                signatures,
                redeemScript: signData.redeemScript,
                pubkeyIndices,
            });
        }
        return Script.multisigSpend({
            signatures,
            pubkeyIndices,
            numPubkeys,
        });
    }

    const sigsForScript: (Uint8Array | undefined)[] =
        signatures.length >= numSignatures
            ? signatures.slice(0, numSignatures)
            : [
                  ...signatures,
                  ...Array(numSignatures - signatures.length).fill(undefined),
              ];

    return Script.multisigSpend({
        signatures: sigsForScript,
        redeemScript: signData.redeemScript,
    });
}

/**
 * Extract pubkey → signature (with sighash byte) from a multisig scriptSig.
 */
function extractPartialSigsFromInput(
    script: Script,
    signData: SignData,
    unsignedTx: Tx,
    inputIdx: number,
    ecc: Ecc,
): Map<string, Uint8Array> {
    const map = new Map<string, Uint8Array>();
    if (!script.bytecode.length) return map;

    const inputs: TxInput[] = unsignedTx.inputs.map((inp, i) => ({
        ...copyTxInput(inp),
        signData: i === inputIdx ? signData : undefined,
    }));
    inputs[inputIdx] = {
        ...copyTxInput(unsignedTx.inputs[inputIdx]!),
        script,
        signData,
    };

    const txForPreimage = new Tx({
        version: unsignedTx.version,
        inputs,
        outputs: unsignedTx.outputs.map(copyTxOutput),
        locktime: unsignedTx.locktime,
    });

    const msgHash = sha256d(
        UnsignedTx.fromTx(txForPreimage)
            .inputAt(inputIdx)
            .sigHashPreimage(ALL_BIP143).bytes,
    );

    if (signData.redeemScript !== undefined) {
        const parsed = script.parseP2shMultisigSpend();
        if (parsed.isSchnorr) {
            const sorted = [...(parsed.pubkeyIndices ?? [])].sort(
                (a, b) => a - b,
            );
            for (let i = 0; i < sorted.length; i++) {
                const pkIdx = sorted[i]!;
                const pk = parsed.pubkeys[pkIdx]!;
                const sig = parsed.signatures[i];
                if (sig !== undefined) map.set(pubkeyHex(pk), sig);
            }
            return map;
        }
        for (const sig of parsed.signatures) {
            if (sig === undefined) continue;
            const sigNo = sig.slice(0, -1);
            for (const pk of parsed.pubkeys) {
                try {
                    ecc.ecdsaVerify(sigNo, msgHash, pk);
                    map.set(pubkeyHex(pk), sig);
                    break;
                } catch {
                    /* next */
                }
            }
        }
        return map;
    }

    if (signData.outputScript !== undefined) {
        const parsed = script.parseBareMultisigSpend(signData.outputScript);
        if (parsed.isSchnorr) {
            const sorted = [...(parsed.pubkeyIndices ?? [])].sort(
                (a, b) => a - b,
            );
            for (let i = 0; i < sorted.length; i++) {
                const pkIdx = sorted[i]!;
                const pk = parsed.pubkeys[pkIdx]!;
                const sig = parsed.signatures[i];
                if (sig !== undefined) map.set(pubkeyHex(pk), sig);
            }
            return map;
        }
        for (const sig of parsed.signatures) {
            if (sig === undefined) continue;
            const sigNo = sig.slice(0, -1);
            for (const pk of parsed.pubkeys) {
                try {
                    ecc.ecdsaVerify(sigNo, msgHash, pk);
                    map.set(pubkeyHex(pk), sig);
                    break;
                } catch {
                    /* next */
                }
            }
        }
    }
    return map;
}

export interface PsbtInputMaps {
    witnessUtxo: { sats: bigint; scriptPubKey: Uint8Array };
    redeemScript?: Script;
    partialSigs: Map<string, Uint8Array>;
}

/** One PSBT key-value pair (BIP 174). */
export type PsbtKeyValue = { key: Uint8Array; value: Uint8Array };

function parseInputMapPairs(
    inPairs: PsbtKeyValue[],
    prevOut: OutPoint,
): {
    witness: { sats: bigint; scriptPubKey: Uint8Array } | undefined;
    redeemScript?: Script;
    partialSigs: Map<string, Uint8Array>;
    unknown: PsbtKeyValue[];
} {
    const partialSigs = new Map<string, Uint8Array>();
    const unknown: PsbtKeyValue[] = [];
    let redeemScript: Script | undefined;
    let pair00: PsbtKeyValue | undefined;

    for (const p of inPairs) {
        if (p.key.length === 0) continue;
        const t = p.key[0]!;
        // Bitcoin ABC PSBTInput::Unserialize: these types require a 1-byte key only.
        if (t === PSBT_IN_SIGHASH) {
            if (p.key.length !== 1) {
                throw new Error(
                    'PSBT: sighash type key must be exactly one byte',
                );
            }
            unknown.push(p);
            continue;
        }
        if (t === PSBT_IN_SCRIPTSIG) {
            if (p.key.length !== 1) {
                throw new Error(
                    'PSBT: final scriptSig key must be exactly one byte',
                );
            }
            unknown.push(p);
            continue;
        }
        if (t === PSBT_IN_REDEEM_SCRIPT) {
            if (p.key.length !== 1) {
                throw new Error(
                    'PSBT: redeemScript key must be exactly one byte',
                );
            }
            redeemScript = new Script(p.value);
            continue;
        }
        // Bitcoin ABC PSBT_IN_UTXO: key is type byte only (see psbt.h).
        if (t === PSBT_IN_UTXO && p.key.length !== 1) {
            throw new Error('PSBT: input UTXO key must be exactly one byte');
        }
        if (t === PSBT_IN_UTXO && p.key.length === 1) {
            pair00 = p;
        } else if (t === PSBT_IN_PARTIAL_SIG) {
            if (!isValidPartialSigKeyLength(p.key.length)) {
                throw new Error(
                    'PSBT: invalid partial signature pubkey key size',
                );
            }
            partialSigs.set(pubkeyHex(p.key.slice(1)), p.value);
        } else if (t === PSBT_IN_BIP32_DERIVATION) {
            validateBip32DerivationKeyValue(p.key, p.value);
            unknown.push(p);
        } else {
            unknown.push(p);
        }
    }

    let witness: { sats: bigint; scriptPubKey: Uint8Array } | undefined;
    if (pair00 !== undefined) {
        const w = resolveWitnessFromKey00(pair00.value, prevOut);
        if (w === undefined) {
            throw new Error('PSBT input: invalid PSBT_IN_UTXO (0x00) value');
        }
        witness = w;
    }

    return { witness, redeemScript, partialSigs, unknown };
}

/**
 * BIP 174 PSBT for eCash multisig and ABC-aligned decode/encode.
 * See https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#serialization
 *
 * Typical flow: {@link Psbt.fromTx} from a partially signed {@link Tx} plus
 * {@link SignData} per input → {@link Psbt.toBytes} → share → {@link Psbt.fromBytes}.
 * Unknown key-value pairs are preserved (BIP 174).
 */
export class Psbt {
    /** Unsigned transaction (empty scriptSigs). */
    public readonly unsignedTx: Tx;
    /** Per-input signing data (amount, scripts, partial sig maps). */
    public readonly signDataPerInput: SignData[];
    /** Per-input partial signatures: hex(pubkey) → signature incl. sighash byte. */
    public readonly inputPartialSigs: Map<string, Uint8Array>[];
    /**
     * Unknown global key-value pairs (BIP 174: implementations must preserve
     * unknown keys on round-trip).
     */
    public readonly unknownGlobalPairs: PsbtKeyValue[];
    /** Unknown per-input pairs (excluding consumed `PSBT_IN_UTXO` / `0x00` entries). */
    public readonly unknownInputPairs: PsbtKeyValue[][];
    /** Unknown per-output pairs. */
    public readonly unknownOutputPairs: PsbtKeyValue[][];
    /**
     * When true, this input had no `PSBT_IN_UTXO` (`0x00`) field in the PSBT (e.g.
     * creator-only PSBT or finalized script fields only). {@link toBytes} will
     * not emit that entry for the input.
     */
    public readonly inputWitnessIncomplete: boolean[];

    public constructor(params: {
        unsignedTx: Tx;
        signDataPerInput: SignData[];
        inputPartialSigs: Map<string, Uint8Array>[];
        unknownGlobalPairs?: PsbtKeyValue[];
        unknownInputPairs?: PsbtKeyValue[][];
        unknownOutputPairs?: PsbtKeyValue[][];
        inputWitnessIncomplete?: boolean[];
    }) {
        if (
            params.signDataPerInput.length !== params.unsignedTx.inputs.length
        ) {
            throw new Error('signDataPerInput length must match inputs');
        }
        if (
            params.inputPartialSigs.length !== params.unsignedTx.inputs.length
        ) {
            throw new Error('inputPartialSigs length must match inputs');
        }
        this.unsignedTx = params.unsignedTx;
        this.signDataPerInput = params.signDataPerInput;
        this.inputPartialSigs = params.inputPartialSigs;
        this.unknownGlobalPairs = params.unknownGlobalPairs ?? [];
        this.unknownInputPairs =
            params.unknownInputPairs ?? params.unsignedTx.inputs.map(() => []);
        this.unknownOutputPairs =
            params.unknownOutputPairs ??
            params.unsignedTx.outputs.map(() => []);
        if (this.unknownInputPairs.length !== this.unsignedTx.inputs.length) {
            throw new Error('unknownInputPairs length must match inputs');
        }
        if (this.unknownOutputPairs.length !== this.unsignedTx.outputs.length) {
            throw new Error('unknownOutputPairs length must match outputs');
        }
        this.inputWitnessIncomplete =
            params.inputWitnessIncomplete ??
            params.unsignedTx.inputs.map(() => false);
        if (
            this.inputWitnessIncomplete.length !== this.unsignedTx.inputs.length
        ) {
            throw new Error('inputWitnessIncomplete length must match inputs');
        }
    }

    /**
     * Build a PSBT from a transaction that may already include partial scriptSigs.
     * Populates `PSBT_IN_UTXO` (`0x00`) + redeem script + partial signatures.
     */
    public static fromTx(tx: Tx, signDataPerInput: SignData[], ecc: Ecc): Psbt {
        const unsignedTx = txToUnsigned(tx);
        const inputPartialSigs: Map<string, Uint8Array>[] = [];
        for (let i = 0; i < tx.inputs.length; i++) {
            const script = tx.inputs[i]?.script ?? new Script();
            const sigs = extractPartialSigsFromInput(
                script,
                signDataPerInput[i]!,
                unsignedTx,
                i,
                ecc,
            );
            inputPartialSigs.push(sigs);
        }
        return new Psbt({
            unsignedTx,
            signDataPerInput,
            inputPartialSigs,
            unknownGlobalPairs: [],
            unknownInputPairs: unsignedTx.inputs.map(() => []),
            unknownOutputPairs: unsignedTx.outputs.map(() => []),
            inputWitnessIncomplete: unsignedTx.inputs.map(() => false),
        });
    }

    /** Deserialize PSBT bytes (BIP 174). */
    public static fromBytes(data: Uint8Array): Psbt {
        const bytes = new Bytes(data);
        for (let i = 0; i < PSBT_MAGIC.length; i++) {
            if (bytes.readU8() !== PSBT_MAGIC[i]) {
                throw new Error('Invalid PSBT: bad magic');
            }
        }

        const globalPairs = parseMap(bytes);
        assertUniquePsbtKeys(globalPairs, 'global');
        let unsignedRaw: Uint8Array | undefined;
        const unknownGlobalPairs: PsbtKeyValue[] = [];
        for (const { key, value } of globalPairs) {
            if (key.length === 0) continue;
            if (key[0] === PSBT_GLOBAL_UNSIGNED_TX && key.length === 1) {
                unsignedRaw = value;
            } else {
                unknownGlobalPairs.push({ key, value });
            }
        }
        if (unsignedRaw === undefined) {
            throw new Error('PSBT missing global unsigned transaction');
        }

        const unsignedTx = Tx.deser(unsignedRaw);
        assertUnsignedTxEmptyScriptSigs(unsignedTx);
        const inputPartialSigs: Map<string, Uint8Array>[] = [];
        const signDataPerInput: SignData[] = [];
        const unknownInputPairs: PsbtKeyValue[][] = [];
        const inputWitnessIncomplete: boolean[] = [];

        for (let i = 0; i < unsignedTx.inputs.length; i++) {
            const inPairs = parseMap(bytes);
            assertUniquePsbtKeys(inPairs, `input ${i}`);
            const prevOut = unsignedTx.inputs[i]!.prevOut;
            const { witness, redeemScript, partialSigs, unknown } =
                parseInputMapPairs(inPairs, prevOut);
            unknownInputPairs.push(unknown);
            const incomplete = witness === undefined;
            inputWitnessIncomplete.push(incomplete);

            let signData: SignData;
            if (incomplete) {
                signData =
                    redeemScript !== undefined
                        ? { sats: 0n, redeemScript }
                        : { sats: 0n, outputScript: new Script() };
            } else if (redeemScript !== undefined) {
                signData = {
                    sats: witness.sats,
                    redeemScript,
                };
            } else {
                signData = {
                    sats: witness.sats,
                    outputScript: new Script(witness.scriptPubKey),
                };
            }
            signDataPerInput.push(signData);
            inputPartialSigs.push(partialSigs);
        }

        const unknownOutputPairs: PsbtKeyValue[][] = [];
        for (let o = 0; o < unsignedTx.outputs.length; o++) {
            const outPairs = parseMap(bytes);
            assertUniquePsbtKeys(outPairs, `output ${o}`);
            for (const p of outPairs) {
                if (p.key.length === 0) continue;
                const ot = p.key[0]!;
                // PSBTOutput::Unserialize (Bitcoin ABC): redeem script key is type byte only.
                if (ot === PSBT_OUT_REDEEMSCRIPT && p.key.length !== 1) {
                    throw new Error(
                        'PSBT: output redeemScript key must be exactly one byte',
                    );
                }
                if (ot === PSBT_OUT_BIP32_DERIVATION) {
                    validateBip32DerivationKeyValue(p.key, p.value);
                }
            }
            unknownOutputPairs.push(outPairs.filter(p => p.key.length > 0));
        }

        if (bytes.idx !== data.length) {
            throw new Error('PSBT: trailing bytes after output maps');
        }

        return new Psbt({
            unsignedTx,
            signDataPerInput,
            inputPartialSigs,
            unknownGlobalPairs,
            unknownInputPairs,
            unknownOutputPairs,
            inputWitnessIncomplete,
        });
    }

    /** Serialize to BIP 174 bytes. */
    public toBytes(): Uint8Array {
        const unsignedSer = this.unsignedTx.ser();
        const globalPairs: PsbtKeyValue[] = [
            {
                key: new Uint8Array([PSBT_GLOBAL_UNSIGNED_TX]),
                value: unsignedSer,
            },
            ...this.unknownGlobalPairs,
        ];

        const parts: Uint8Array[] = [PSBT_MAGIC, serializeMap(globalPairs)];

        for (let i = 0; i < this.unsignedTx.inputs.length; i++) {
            const sd = this.signDataPerInput[i]!;
            const inPairs: PsbtKeyValue[] = [];
            if (!this.inputWitnessIncomplete[i]) {
                const spk = scriptPubKeyFromSignData(sd);
                inPairs.push({
                    key: new Uint8Array([PSBT_IN_UTXO]),
                    value: encodeWitnessUtxo(sd.sats, spk),
                });
            }
            if (sd.redeemScript !== undefined) {
                inPairs.push({
                    key: new Uint8Array([PSBT_IN_REDEEM_SCRIPT]),
                    value: sd.redeemScript.bytecode,
                });
            }
            const pSig = this.inputPartialSigs[i]!;
            for (const [pkHex, sig] of pSig) {
                const pk = fromHex(pkHex);
                const key = new Uint8Array(1 + pk.length);
                key[0] = PSBT_IN_PARTIAL_SIG;
                key.set(pk, 1);
                inPairs.push({ key, value: sig });
            }
            inPairs.push(...(this.unknownInputPairs[i] ?? []));
            parts.push(serializeMap(inPairs));
        }

        for (let o = 0; o < this.unsignedTx.outputs.length; o++) {
            parts.push(serializeMap(this.unknownOutputPairs[o] ?? []));
        }

        const wl = new WriterLength();
        for (const p of parts) {
            wl.putBytes(p);
        }
        const w = new WriterBytes(wl.length);
        for (const p of parts) {
            w.putBytes(p);
        }
        return w.data;
    }

    /**
     * Current transaction with scriptSigs built from partial signatures.
     * Attach each input's `signData` for signing and validation helpers.
     */
    public toTx(): Tx {
        return new Tx({
            version: this.unsignedTx.version,
            inputs: this.unsignedTx.inputs.map((inp, i) => {
                const sd = this.signDataPerInput[i]!;
                const script = buildScriptSigFromPartialSigs(
                    sd,
                    this.inputPartialSigs[i]!,
                );
                return {
                    ...copyTxInput(inp),
                    script,
                    signData: sd,
                };
            }),
            outputs: this.unsignedTx.outputs.map(copyTxOutput),
            locktime: this.unsignedTx.locktime,
        });
    }

    /**
     * Add or merge a multisig signature on an input (same semantics as
     * {@link Tx.addMultisigSignature}).
     */
    public addMultisigSignature(params: {
        inputIdx: number;
        signature: Uint8Array;
        signData: SignData;
        ecc?: Ecc;
    }): Psbt {
        const tx = this.toTx();
        const nextTx = tx.addMultisigSignature(params);
        const next = Psbt.fromTx(
            nextTx,
            this.signDataPerInput,
            params.ecc ?? new Ecc(),
        );
        return new Psbt({
            unsignedTx: next.unsignedTx,
            signDataPerInput: next.signDataPerInput,
            inputPartialSigs: next.inputPartialSigs,
            unknownGlobalPairs: this.unknownGlobalPairs,
            unknownInputPairs: this.unknownInputPairs,
            unknownOutputPairs: this.unknownOutputPairs,
            inputWitnessIncomplete: this.inputWitnessIncomplete,
        });
    }

    /**
     * Like {@link addMultisigSignature}, but signs with a secret key (see
     * {@link Tx.addMultisigSignatureFromKey}).
     */
    public addMultisigSignatureFromKey(params: {
        inputIdx: number;
        sk: Uint8Array;
        signData: SignData;
        sigHashType?: SigHashType;
        ecc?: Ecc;
    }): Psbt {
        const tx = this.toTx();
        const nextTx = tx.addMultisigSignatureFromKey(params);
        const next = Psbt.fromTx(
            nextTx,
            this.signDataPerInput,
            params.ecc ?? new Ecc(),
        );
        return new Psbt({
            unsignedTx: next.unsignedTx,
            signDataPerInput: next.signDataPerInput,
            inputPartialSigs: next.inputPartialSigs,
            unknownGlobalPairs: this.unknownGlobalPairs,
            unknownInputPairs: this.unknownInputPairs,
            unknownOutputPairs: this.unknownOutputPairs,
            inputWitnessIncomplete: this.inputWitnessIncomplete,
        });
    }

    /**
     * Same as {@link Tx.isFullySignedMultisig} on {@link toTx} (including
     * vacuous `true` when there are no multisig inputs).
     */
    public isFullySignedMultisig(): boolean {
        return this.toTx().isFullySignedMultisig();
    }
}
