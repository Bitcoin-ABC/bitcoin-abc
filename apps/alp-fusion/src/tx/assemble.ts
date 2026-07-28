// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Offline assembly of a single-token fused ALP SEND transaction.
 *
 * Layout (CashFusion-shaped, ALP-colored):
 *   outputs[0]     = EMPP OP_RETURN with one ALP SEND push
 *   outputs[1..N]  = colored token outs (atoms[i] colors outputs[i+1])
 *   outputs[N+1..] = optional uncolored XEC outs
 *
 * Fee is computed from feePerKb × estimated signed size. ScriptSig size is
 * deterministic for Schnorr P2PKH (CashFusion default): 65-byte flagged sig +
 * 33-byte compressed pubkey. No signing, Chronik, coordinator, or chained
 * rounds in this slice.
 */
import {
    ALP_POLICY_MAX_OUTPUTS,
    ALP_STANDARD,
    alpSend,
    calcTxFee,
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    emppScript,
    MAX_TX_SERSIZE,
    OP_CHECKSIG,
    OP_DUP,
    OP_EQUALVERIFY,
    OP_HASH160,
    OP_RETURN_MAX_BYTES,
    SCHNORR_SIG_ESTIMATE_BYTES,
    Script,
    toHexRev,
    Tx,
    type OutPoint,
    type TxInput,
    type TxOutput,
} from 'ecash-lib';

import type {
    AssembleAlpSendParams,
    AssembledAlpSend,
    FusionFuelInput,
    FusionTokenInput,
    FusionTokenOutput,
    FusionXecOutput,
} from './types.js';

const TOKEN_ID_HEX_RE = /^[0-9a-f]{64}$/;

/** Dummy compressed pubkey for Schnorr P2PKH size estimation. */
const DUMMY_COMPRESSED_PK = (() => {
    const pk = new Uint8Array(33);
    pk[0] = 0x02;
    return pk;
})();

/** Shared plan from one validation pass — reused by assembleAlpSend. */
interface AlpSendPlan {
    fuelInputs: FusionFuelInput[];
    xecOutputs: FusionXecOutput[];
    sendAtomsArray: bigint[];
    /** Resolved token-output sats (dust default applied). */
    tokenOutputSats: bigint[];
    opreturnScript: Script;
    inputAtoms: bigint;
    outputAtoms: bigint;
    inputSats: bigint;
    outputSats: bigint;
    feePerKb: bigint;
    feeSats: bigint;
    signedSerSize: number;
}

/** Canonical key: big-endian hex txid (matches OutPoint string form) + outIdx. */
function outpointKey(prevOut: OutPoint): string {
    const txid =
        typeof prevOut.txid === 'string'
            ? prevOut.txid.toLowerCase()
            : toHexRev(prevOut.txid); // LE bytes → BE hex
    return `${txid}:${prevOut.outIdx}`;
}

function assertTokenId(tokenId: string): void {
    if (!TOKEN_ID_HEX_RE.test(tokenId)) {
        throw new Error(
            'tokenId must be 64 lowercase hex characters (Chronik big-endian)',
        );
    }
}

function assertPositiveAtoms(atoms: bigint, label: string): void {
    if (atoms <= 0n) {
        throw new Error(`${label} atoms must be > 0`);
    }
}

function assertNonNegSats(sats: bigint, label: string): void {
    if (sats < 0n) {
        throw new Error(`${label} sats must be >= 0`);
    }
}

function assertDust(sats: bigint, dustSats: bigint, label: string): void {
    if (sats < dustSats) {
        throw new Error(`${label} sats ${sats} below dust ${dustSats}`);
    }
}

/**
 * True for standard P2PKH locking scripts (matches CScript::IsPayToPubKeyHash).
 * Fee estimation assumes Schnorr P2PKH scriptSigs on every input.
 */
function isP2pkhScript(script: Script): boolean {
    const b = script.bytecode;
    return (
        b.length === 25 &&
        b[0] === OP_DUP &&
        b[1] === OP_HASH160 &&
        b[2] === 20 &&
        b[23] === OP_EQUALVERIFY &&
        b[24] === OP_CHECKSIG
    );
}

function assertP2pkhScript(script: Script, label: string): void {
    if (!isP2pkhScript(script)) {
        throw new Error(
            `${label} script must be P2PKH (signed-size estimate assumption)`,
        );
    }
}

/** Schnorr P2PKH scriptSig placeholder (sig + compressed pubkey). */
function dummyP2pkhSchnorrScriptSig(): Script {
    return Script.p2pkhSpend(
        DUMMY_COMPRESSED_PK,
        new Uint8Array(SCHNORR_SIG_ESTIMATE_BYTES),
    );
}

/**
 * Estimated serSize after Schnorr P2PKH signing of every input.
 * Satoshi amounts do not affect size — only input/output count and scripts.
 */
function estimateSignedSerSize(tx: Tx): number {
    return new Tx({
        version: tx.version,
        locktime: tx.locktime,
        inputs: tx.inputs.map(inp => ({
            ...inp,
            script: dummyP2pkhSchnorrScriptSig(),
        })),
        outputs: tx.outputs,
    }).serSize();
}

function toTxInput(prevOut: OutPoint, sats: bigint, script: Script): TxInput {
    return {
        prevOut,
        script: undefined,
        signData: {
            sats,
            outputScript: script,
        },
    };
}

function buildUnsignedTx(
    params: AssembleAlpSendParams,
    plan: Pick<
        AlpSendPlan,
        | 'fuelInputs'
        | 'xecOutputs'
        | 'tokenOutputSats'
        | 'opreturnScript'
        | 'sendAtomsArray'
    >,
): Tx {
    const outputs: TxOutput[] = [{ sats: 0n, script: plan.opreturnScript }];
    for (let i = 0; i < params.tokenOutputs.length; i++) {
        outputs.push({
            sats: plan.tokenOutputSats[i],
            script: params.tokenOutputs[i].script,
        });
    }
    for (const out of plan.xecOutputs) {
        outputs.push({ sats: out.sats, script: out.script });
    }

    const inputs: TxInput[] = [
        ...params.tokenInputs.map(inp =>
            toTxInput(inp.prevOut, inp.sats, inp.script),
        ),
        ...plan.fuelInputs.map(inp =>
            toTxInput(inp.prevOut, inp.sats, inp.script),
        ),
    ];

    return new Tx({ inputs, outputs });
}

/**
 * Validate params and compute aggregates / EMPP / fee once.
 * When `requireFeeMatch` is false, still computes feeSats from signed size but
 * does not require inputSats - outputSats === feeSats (for estimation).
 */
function planAlpSendAssembly(
    params: AssembleAlpSendParams,
    requireFeeMatch = true,
): AlpSendPlan {
    assertTokenId(params.tokenId);

    const feePerKb = params.feePerKb ?? DEFAULT_FEE_SATS_PER_KB;
    if (feePerKb <= 0n) {
        throw new Error('feePerKb must be > 0');
    }

    const dustSats = params.dustSats ?? DEFAULT_DUST_SATS;
    if (dustSats <= 0n) {
        throw new Error('dustSats must be > 0');
    }

    const tokenInputs = params.tokenInputs;
    const tokenOutputs = params.tokenOutputs;
    const fuelInputs = params.fuelInputs ?? [];
    const xecOutputs = params.xecOutputs ?? [];

    if (tokenInputs.length === 0) {
        throw new Error('at least one token input is required');
    }
    if (tokenOutputs.length === 0) {
        throw new Error('at least one token output is required');
    }
    if (tokenOutputs.length > ALP_POLICY_MAX_OUTPUTS) {
        throw new Error(
            `tokenOutputs.length ${tokenOutputs.length} exceeds ALP_POLICY_MAX_OUTPUTS (${ALP_POLICY_MAX_OUTPUTS})`,
        );
    }

    const seen = new Set<string>();
    const remember = (prevOut: OutPoint, label: string) => {
        const key = outpointKey(prevOut);
        if (seen.has(key)) {
            throw new Error(`duplicate outpoint in ${label}: ${key}`);
        }
        seen.add(key);
    };

    let inputAtoms = 0n;
    let inputSats = 0n;
    for (let i = 0; i < tokenInputs.length; i++) {
        const inp = tokenInputs[i];
        remember(inp.prevOut, `tokenInputs[${i}]`);
        if (inp.tokenId !== params.tokenId) {
            throw new Error(
                `tokenInputs[${i}].tokenId does not match params.tokenId`,
            );
        }
        assertPositiveAtoms(inp.atoms, `tokenInputs[${i}]`);
        assertNonNegSats(inp.sats, `tokenInputs[${i}]`);
        if (inp.sats === 0n) {
            throw new Error(`tokenInputs[${i}] sats must be > 0`);
        }
        assertP2pkhScript(inp.script, `tokenInputs[${i}]`);
        inputAtoms += inp.atoms;
        inputSats += inp.sats;
    }

    for (let i = 0; i < fuelInputs.length; i++) {
        const inp = fuelInputs[i];
        remember(inp.prevOut, `fuelInputs[${i}]`);
        assertNonNegSats(inp.sats, `fuelInputs[${i}]`);
        if (inp.sats === 0n) {
            throw new Error(`fuelInputs[${i}] sats must be > 0`);
        }
        // Fuel is omitted from atom accounting — a token UTXO here would burn.
        if (inp.atoms !== 0n) {
            throw new Error(
                `fuelInputs[${i}] must be pure XEC (atoms ${inp.atoms} != 0)`,
            );
        }
        assertP2pkhScript(inp.script, `fuelInputs[${i}]`);
        inputSats += inp.sats;
    }

    let outputAtoms = 0n;
    let outputSats = 0n;
    const sendAtomsArray: bigint[] = [];
    const tokenOutputSats: bigint[] = [];
    for (let i = 0; i < tokenOutputs.length; i++) {
        const out = tokenOutputs[i];
        assertPositiveAtoms(out.atoms, `tokenOutputs[${i}]`);
        const sats = out.sats ?? dustSats;
        assertDust(sats, dustSats, `tokenOutputs[${i}]`);
        sendAtomsArray.push(out.atoms);
        tokenOutputSats.push(sats);
        outputAtoms += out.atoms;
        outputSats += sats;
    }

    for (let i = 0; i < xecOutputs.length; i++) {
        const out = xecOutputs[i];
        assertDust(out.sats, dustSats, `xecOutputs[${i}]`);
        outputSats += out.sats;
    }

    if (inputAtoms !== outputAtoms) {
        if (outputAtoms < inputAtoms) {
            throw new Error(
                `atom burn forbidden: inputs ${inputAtoms} > outputs ${outputAtoms}`,
            );
        }
        throw new Error(
            `atom inflation: outputs ${outputAtoms} > inputs ${inputAtoms}`,
        );
    }

    // OP_RETURN size for this SEND (policy bound for ≤29 outs).
    const push = alpSend(params.tokenId, ALP_STANDARD, sendAtomsArray);
    const opreturnScript = emppScript([push]);
    if (opreturnScript.bytecode.length > OP_RETURN_MAX_BYTES) {
        throw new Error(
            `EMPP OP_RETURN ${opreturnScript.bytecode.length} bytes exceeds OP_RETURN_MAX_BYTES (${OP_RETURN_MAX_BYTES})`,
        );
    }

    const partial = {
        fuelInputs,
        xecOutputs,
        tokenOutputSats,
        opreturnScript,
        sendAtomsArray,
    };
    const unsignedTx = buildUnsignedTx(params, partial);
    const signedSerSize = estimateSignedSerSize(unsignedTx);
    if (signedSerSize > MAX_TX_SERSIZE) {
        throw new Error(
            `estimated signed size ${signedSerSize} exceeds MAX_TX_SERSIZE (${MAX_TX_SERSIZE})`,
        );
    }
    const feeSats = calcTxFee(signedSerSize, feePerKb);

    if (requireFeeMatch) {
        const actualFee = inputSats - outputSats;
        if (actualFee !== feeSats) {
            throw new Error(
                `fee mismatch: inputSats - outputSats = ${actualFee}, required feeSats ${feeSats} at ${feePerKb} sat/kB (signedSerSize ${signedSerSize})`,
            );
        }
    }

    return {
        ...partial,
        inputAtoms,
        outputAtoms,
        inputSats,
        outputSats,
        feePerKb,
        feeSats,
        signedSerSize,
    };
}

/**
 * Validate fused ALP SEND params. Throws on any policy / conservation error.
 * Does not build a Tx.
 */
export function validateAlpSendAssembly(params: AssembleAlpSendParams): void {
    planAlpSendAssembly(params, true);
}

/**
 * Required fee for this input/output *shape* at feePerKb (Schnorr P2PKH
 * signed-size estimate). Size depends on input/output counts and scripts,
 * not sat amounts — so include every intended input and output (fuel
 * included) with placeholder sats before calling; then set fuel sats so
 * inputSats - outputSats equals the returned feeSats.
 */
export function estimateAlpSendFeeSats(params: AssembleAlpSendParams): {
    feeSats: bigint;
    feePerKb: bigint;
    signedSerSize: number;
} {
    const plan = planAlpSendAssembly(params, false);
    return {
        feeSats: plan.feeSats,
        feePerKb: plan.feePerKb,
        signedSerSize: plan.signedSerSize,
    };
}

/**
 * Build an unsigned fused ALP SEND tx after validating conservation and policy.
 */
export function assembleAlpSend(
    params: AssembleAlpSendParams,
): AssembledAlpSend {
    const plan = planAlpSendAssembly(params, true);
    const tx = buildUnsignedTx(params, plan);

    return {
        tx,
        tokenId: params.tokenId,
        sendAtomsArray: plan.sendAtomsArray,
        inputAtoms: plan.inputAtoms,
        outputAtoms: plan.outputAtoms,
        inputSats: plan.inputSats,
        outputSats: plan.outputSats,
        feePerKb: plan.feePerKb,
        feeSats: plan.feeSats,
        signedSerSize: plan.signedSerSize,
    };
}

/** Re-export types for convenience. */
export type {
    AssembleAlpSendParams,
    AssembledAlpSend,
    FusionFuelInput,
    FusionTokenInput,
    FusionTokenOutput,
    FusionXecOutput,
};
