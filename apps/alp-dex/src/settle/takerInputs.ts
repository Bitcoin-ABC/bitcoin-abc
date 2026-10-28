// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ChronikError,
    type ChronikClient,
    type Tx as ChronikTx,
} from 'chronik-client';
import { ValidationError } from '../methods/errors';
import type { ParsedPartiallySignedSwap } from './parseSwap';

export type TakerInputsConfig = {
    fromTokenId: string;
    /** Sats the taker claims its inputs carry (settle body). */
    prePostageInputSats: bigint;
    /** LP wallet scripts (seller, slush, fee) a taker must never spend. */
    lpScriptHexes: ReadonlySet<string>;
};

/**
 * Chronik answers 4xx when the tx itself is bad (missing / spent inputs,
 * bad serialization). Anything else is an outage and stays a 500.
 */
const isChronikRejection = (error: unknown): error is ChronikError =>
    error instanceof ChronikError && error.status >= 400 && error.status < 500;

/**
 * Resolve the taker's inputs against Chronik's UTXO set before the node
 * signs anything. Chronik's broadcast-time token checks would also catch
 * most of this, but those are a Chronik safety net, not consensus: do not
 * sign seller inventory into a tx whose taker side we have not verified.
 */
export const resolveTakerInputs = async (
    chronik: ChronikClient,
    serializedTxHex: string,
): Promise<ChronikTx['inputs']> => {
    try {
        const validated = await chronik.validateRawTx(serializedTxHex);
        return validated.inputs;
    } catch (error) {
        if (isChronikRejection(error)) {
            throw new ValidationError(
                `Taker inputs failed Chronik validation: ${error.message}`,
            );
        }
        throw error;
    }
};

/**
 * Taker inputs must be real, taker-owned, and fund exactly the fromToken
 * atoms and sats the tx and body claim.
 */
export const assertTakerInputs = (
    inputs: ChronikTx['inputs'],
    swap: ParsedPartiallySignedSwap,
    config: TakerInputsConfig,
): void => {
    const { fromTokenId, prePostageInputSats, lpScriptHexes } = config;
    let inputSats = 0n;
    let fromTokenInputAtoms = 0n;
    inputs.forEach((input, idx) => {
        if (input.outputScript === undefined) {
            throw new ValidationError(`Taker input ${idx} did not resolve`);
        }
        if (lpScriptHexes.has(input.outputScript)) {
            throw new ValidationError(
                `Taker input ${idx} spends an LP wallet UTXO`,
            );
        }
        inputSats += input.sats;
        if (input.token === undefined) {
            return;
        }
        if (
            input.token.tokenId.toLowerCase() !== fromTokenId ||
            input.token.isMintBaton
        ) {
            throw new ValidationError(
                `Taker input ${idx} carries a token other than fromToken`,
            );
        }
        fromTokenInputAtoms += input.token.atoms;
    });

    const fromTokenOutputAtoms = swap.outputs
        .filter(output => output.tokenId.toLowerCase() === fromTokenId)
        .reduce((sum, output) => sum + output.atoms, 0n);
    if (fromTokenInputAtoms !== fromTokenOutputAtoms) {
        throw new ValidationError(
            `Taker fromToken inputs (${fromTokenInputAtoms} atoms) must ` +
                `equal fromToken outputs (${fromTokenOutputAtoms} atoms)`,
        );
    }

    if (inputSats !== prePostageInputSats) {
        throw new ValidationError(
            `prePostageInputSats mismatch: body ${prePostageInputSats}, ` +
                `taker inputs ${inputSats}`,
        );
    }
};
