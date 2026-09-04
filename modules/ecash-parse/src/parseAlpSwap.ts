// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx } from 'chronik-client';
import { ALP_SWAP_PLATFORM_FEE_SCRIPT_SET } from './alpSwapFees';
import { AlpSwapParsed } from './types';

const scriptIsWallet = (outputScript: string, hashes: string[]): boolean =>
    hashes.some(hash => outputScript.includes(hash));

interface AlpSwapLegs {
    fromTokenId: string;
    toTokenId: string;
    priceAtoms: bigint;
    feeOuts: Array<{ outputScript: string; atoms: bigint }>;
    /** First to-token output (buyer receive) */
    buyerToAtoms: bigint;
    buyerToScript: string;
}

/**
 * Structural alp-dex settle legs from output order (buildSwapOutputs):
 * price (slush) → maker fee? → platform fee? → buyer to → …
 *
 * from-token is the first non-zero ALP SEND out. Do not require a seller
 * postage input — some settles fund miner fee from token dust only
 * (e.g. e02902d547debea9f2537c8fedfb5c7c13d74647b20af07bcfa5ad5438bbc81c).
 */
export const extractAlpSwapLegs = (tx: Tx): AlpSwapLegs | null => {
    const { tokenEntries, outputs } = tx;

    const alpSendEntries = tokenEntries.filter(
        entry =>
            entry.tokenType.protocol === 'ALP' &&
            entry.txType === 'SEND' &&
            !entry.isInvalid,
    );
    if (alpSendEntries.length !== 2) {
        return null;
    }

    const sendTokenIds = new Set(alpSendEntries.map(entry => entry.tokenId));

    let fromTokenId: string | undefined;
    for (let i = 1; i < outputs.length; i++) {
        const output = outputs[i];
        if (typeof output.token === 'undefined' || output.token.atoms === 0n) {
            continue;
        }
        if (sendTokenIds.has(output.token.tokenId)) {
            fromTokenId = output.token.tokenId;
            break;
        }
    }
    if (typeof fromTokenId === 'undefined') {
        return null;
    }

    const toTokenId = alpSendEntries
        .map(e => e.tokenId)
        .find(id => id !== fromTokenId);
    if (typeof toTokenId === 'undefined') {
        return null;
    }

    let priceAtoms = 0n;
    let seenPrice = false;
    const feeOuts: Array<{ outputScript: string; atoms: bigint }> = [];
    let buyerToAtoms = 0n;
    let buyerToScript = '';
    let seenBuyerTo = false;

    for (let i = 1; i < outputs.length; i++) {
        const output = outputs[i];
        if (typeof output.token === 'undefined') {
            continue;
        }
        const { tokenId, atoms } = output.token;
        if (atoms === 0n) {
            continue;
        }

        if (!seenBuyerTo && tokenId === fromTokenId) {
            // Consecutive from-token outs before first to-token: price then fees
            if (!seenPrice) {
                priceAtoms = atoms;
                seenPrice = true;
            } else {
                feeOuts.push({ outputScript: output.outputScript, atoms });
            }
            continue;
        }

        if (!seenBuyerTo && tokenId === toTokenId) {
            buyerToAtoms = atoms;
            buyerToScript = output.outputScript;
            seenBuyerTo = true;
        }
    }

    if (
        !seenPrice ||
        !seenBuyerTo ||
        priceAtoms === 0n ||
        buyerToAtoms === 0n
    ) {
        return null;
    }

    return {
        fromTokenId,
        toTokenId,
        priceAtoms,
        feeOuts,
        buyerToAtoms,
        buyerToScript,
    };
};

/**
 * Classify an alp-dex settle for the given wallet hashes
 * (buyer / seller / fee payout).
 * Priority: buyer > platformFee > makerFee > seller
 */
export const tryParseAlpSwap = (
    tx: Tx,
    hashes: string[],
): AlpSwapParsed | undefined => {
    if (hashes.length === 0) {
        return undefined;
    }

    const legs = extractAlpSwapLegs(tx);
    if (legs === null) {
        return undefined;
    }

    const { fromTokenId, toTokenId, priceAtoms, feeOuts, buyerToAtoms } = legs;
    const totalFeeAtoms = feeOuts.reduce((sum, f) => sum + f.atoms, 0n);

    // Buyer: wallet spent from-token
    let walletSpentFrom = false;
    for (const input of tx.inputs) {
        if (
            typeof input.outputScript === 'string' &&
            input.token &&
            input.token.tokenId === fromTokenId &&
            scriptIsWallet(input.outputScript, hashes)
        ) {
            walletSpentFrom = true;
            break;
        }
    }

    if (walletSpentFrom) {
        let receivedTo = 0n;
        for (const output of tx.outputs) {
            if (
                typeof output.token !== 'undefined' &&
                output.token.tokenId === toTokenId &&
                scriptIsWallet(output.outputScript, hashes)
            ) {
                receivedTo += output.token.atoms;
            }
        }
        if (receivedTo === 0n) {
            return undefined;
        }
        return {
            role: 'buyer',
            fromTokenId,
            toTokenId,
            feeTokenId: fromTokenId,
            fromAtoms: (priceAtoms + totalFeeAtoms).toString(),
            toAtoms: buyerToAtoms.toString(),
            feeAtoms: totalFeeAtoms.toString(),
        };
    }

    // Fee recipients: sum from-token fee outs paid to this wallet
    let platformAtoms = 0n;
    let makerAtoms = 0n;
    for (const fee of feeOuts) {
        if (!scriptIsWallet(fee.outputScript, hashes)) {
            continue;
        }
        if (ALP_SWAP_PLATFORM_FEE_SCRIPT_SET.has(fee.outputScript)) {
            platformAtoms += fee.atoms;
        } else {
            makerAtoms += fee.atoms;
        }
    }

    if (platformAtoms > 0n) {
        return {
            role: 'platformFee',
            tokenId: fromTokenId,
            atoms: platformAtoms.toString(),
        };
    }
    if (makerAtoms > 0n) {
        return {
            role: 'makerFee',
            tokenId: fromTokenId,
            atoms: makerAtoms.toString(),
        };
    }

    // Seller / LP sales wallet: spent to-token inventory (postage optional)
    let sellerSpentTo = false;
    for (const input of tx.inputs) {
        if (
            typeof input.outputScript !== 'string' ||
            !scriptIsWallet(input.outputScript, hashes)
        ) {
            continue;
        }
        if (input.token && input.token.tokenId === toTokenId) {
            sellerSpentTo = true;
            break;
        }
    }
    if (sellerSpentTo) {
        return {
            role: 'seller',
            fromTokenId,
            toTokenId,
            fromAtoms: priceAtoms.toString(),
            toAtoms: buyerToAtoms.toString(),
        };
    }

    return undefined;
};
