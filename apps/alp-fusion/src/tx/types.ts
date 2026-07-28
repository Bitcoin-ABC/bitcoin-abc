// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { OutPoint, Script, Tx } from 'ecash-lib';

/** ALP token UTXO spent into a fused SEND (unsigned). */
export interface FusionTokenInput {
    prevOut: OutPoint;
    /** Sats locked in the UTXO (usually dust). */
    sats: bigint;
    /** Output script of the UTXO (for later signing). */
    script: Script;
    /** 64-char hex token ID (big-endian Chronik form). */
    tokenId: string;
    /** Token atoms carried by this UTXO. */
    atoms: bigint;
}

/**
 * Pure XEC UTXO spent as fee/dust fuel.
 * Must not carry token atoms — fuel inputs are omitted from atom accounting,
 * so a token UTXO here would be burned silently. Callers must pass
 * `atoms: 0n` from Chronik (or equivalent) metadata; nonzero is rejected.
 */
export interface FusionFuelInput {
    prevOut: OutPoint;
    sats: bigint;
    script: Script;
    /** Must be 0. Nonzero rejects a token UTXO used as fuel. */
    atoms: bigint;
}

/** Colored token output (tx output index 1..N). */
export interface FusionTokenOutput {
    script: Script;
    atoms: bigint;
    /** Defaults to dustSats when omitted. */
    sats?: bigint;
}

/** Uncolored XEC output after the token outs (change, fees sink, etc.). */
export interface FusionXecOutput {
    script: Script;
    sats: bigint;
}

export interface AssembleAlpSendParams {
    tokenId: string;
    tokenInputs: FusionTokenInput[];
    fuelInputs?: FusionFuelInput[];
    tokenOutputs: FusionTokenOutput[];
    /** Optional uncolored XEC outputs appended after token outs. */
    xecOutputs?: FusionXecOutput[];
    /**
     * Fee rate in sats/kB (CashFusion-style). Defaults to
     * {@link DEFAULT_FEE_SATS_PER_KB}. Required fee is computed from a
     * deterministic signed-size estimate (Schnorr P2PKH scriptSigs).
     */
    feePerKb?: bigint;
    /** Dust floor for colored (and any XEC) outputs; default DEFAULT_DUST_SATS. */
    dustSats?: bigint;
}

export interface AssembledAlpSend {
    /** Unsigned fused tx (empty scriptSigs). */
    tx: Tx;
    tokenId: string;
    /** ALP SEND atoms array (colors outputs 1..N). */
    sendAtomsArray: bigint[];
    inputAtoms: bigint;
    outputAtoms: bigint;
    inputSats: bigint;
    outputSats: bigint;
    /** Fee rate used for the size → fee calculation. */
    feePerKb: bigint;
    /**
     * Required fee: calcTxFee(signedSerSize, feePerKb).
     * Must equal inputSats - outputSats.
     */
    feeSats: bigint;
    /**
     * Serialized size with dummy Schnorr P2PKH scriptSigs on every input
     * (65-byte sig + 33-byte compressed pubkey).
     */
    signedSerSize: number;
}
