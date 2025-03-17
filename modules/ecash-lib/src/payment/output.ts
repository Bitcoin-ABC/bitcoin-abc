// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Script } from '../script.js';

/** A special output type used to prepare an Action (see action.ts) */
export type PaymentOutput = PaymentNonTokenOutput | PaymentTokenOutput;

/**
 * All "XEC-only" transaction outputs specified in
 * Action will have this shape
 *
 * Note than an OP_RETURN output is a NonTokenPaymentOutput
 */
export interface PaymentNonTokenOutput {
    /** The amount of satoshis in this tx output */
    sats?: bigint;
    /** The outputScript of this tx output */
    script?: Script;
}

/**
 * All token transaction outputs specified in Action have this shape
 */
export interface PaymentTokenOutput extends PaymentNonTokenOutput {
    /** The tokenId of the token associated with this tx output */
    tokenId: string;
    /**
     * The atoms of this tokenId associated with this tx output
     * Can be a MINT or SEND amount
     * 0n for a mint baton
     */
    atoms: bigint;
    /** Is this tx output a mint baton */
    isMintBaton: boolean;
}
