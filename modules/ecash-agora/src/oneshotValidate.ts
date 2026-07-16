// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { parseSlp, SEND_STR, TxOutput } from 'ecash-lib';

/**
 * Error thrown when an ONESHOT offer has enforced outputs that would not
 * assign the offered token to the first taker-appended output.
 */
export const UNSAFE_ONESHOT_ENFORCED_OUTPUTS_MSG =
    'Refusing ONESHOT offer: enforcedOutputs must be exactly OP_RETURN SLP SEND [0, atoms] plus one maker payment so the token is assigned to the first taker output';

/**
 * Return true if ONESHOT enforced outputs match the safe NFT/sale shape used
 * by Agora marketplaces:
 *
 * - Exactly two enforced outputs (OP_RETURN + maker payment)
 * - OP_RETURN is an SLP SEND with amounts `[0, atoms]` and `atoms > 0`
 *
 * With that shape, `AgoraOffer.take()` appends the buyer's token/dust output
 * at index 2, which is where SLP assigns the non-zero amount. Extra enforced
 * outputs (or other SEND amount layouts) can redirect the token to a
 * maker-controlled output while the buyer still pays the ask.
 */
export function isSafeOneshotNftEnforcedOutputs(
    enforcedOutputs: TxOutput[],
): boolean {
    if (enforcedOutputs.length !== 2) {
        return false;
    }
    const opreturn = enforcedOutputs[0];
    if (opreturn.sats !== 0n) {
        return false;
    }
    let parsed;
    try {
        parsed = parseSlp(opreturn.script);
    } catch {
        return false;
    }
    if (parsed === undefined || parsed.txType !== SEND_STR) {
        return false;
    }
    const { sendAtomsArray } = parsed;
    return (
        sendAtomsArray.length === 2 &&
        sendAtomsArray[0] === 0n &&
        sendAtomsArray[1] > 0n
    );
}

/**
 * Throw if ONESHOT enforced outputs are not the safe marketplace shape.
 */
export function assertSafeOneshotNftEnforcedOutputs(
    enforcedOutputs: TxOutput[],
): void {
    if (!isSafeOneshotNftEnforcedOutputs(enforcedOutputs)) {
        throw new Error(UNSAFE_ONESHOT_ENFORCED_OUTPUTS_MSG);
    }
}
