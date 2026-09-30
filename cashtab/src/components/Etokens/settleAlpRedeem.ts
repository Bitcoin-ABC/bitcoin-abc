// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { alpSwap } from 'config/alpSwap';
import { buildAlpSwapPostageTx } from 'components/AlpSwap/buildPostage';
import {
    fetchStatus,
    findPair,
    pairsFromStatus,
    priceLegCoversFeeOutputs,
    receivingOutputAtoms,
    roundSwapQty,
    settleSwap,
    toTokenAtoms,
    utxoQtyByTokenIdFromStatus,
    SwapOutput,
    SwapTemplateResponse,
} from 'services/alpSwapService';
import { Wallet } from 'ecash-wallet';

/**
 * Map alp-dex / network errors to a short user-facing string.
 * Reachability failures share one banner; the real error is logged.
 */
export const alpRedeemUserMessage = (
    err: unknown,
    fallback: string,
): string => {
    console.error(err);
    if (
        err instanceof TypeError ||
        (err instanceof Error &&
            (err.message === 'Failed to fetch' ||
                err.message.startsWith('AlpSwap request failed')))
    ) {
        return alpSwap.unavailableMessage;
    }
    return err instanceof Error ? err.message : fallback;
};

export interface SettleAlpRedeemResult {
    txid: string;
    /** Human receive qty from the settled template. */
    amountOut: number;
}

const REDEEM_QUOTE_MISMATCH = 'Swap quote does not match the accepted amount';

/**
 * Require the template already shown on the redeem screen.
 * From-token atoms must equal the accepted qty, and no other token may appear.
 *
 * @param outputs Template outputs the user already accepted
 * @param fromTokenId Pay-side token
 * @param toTokenId Receive-side token
 * @param fromQty Accepted human pay qty
 * @param fromDecimals Pay-token decimals
 */
export function assertAcceptedRedeemTemplate(params: {
    outputs: SwapOutput[];
    fromTokenId: string;
    toTokenId: string;
    fromQty: number;
    fromDecimals: number;
}): void {
    const { outputs, fromTokenId, toTokenId, fromQty, fromDecimals } = params;
    if (!Array.isArray(outputs) || outputs.length === 0) {
        throw new Error(REDEEM_QUOTE_MISMATCH);
    }
    const expectedFrom = toTokenAtoms(
        Number(roundSwapQty(fromQty, fromDecimals)),
        fromDecimals,
    );
    let fromAtoms = 0n;
    let receiveCount = 0;
    for (const output of outputs) {
        if (output.tokenId !== fromTokenId && output.tokenId !== toTokenId) {
            throw new Error(REDEEM_QUOTE_MISMATCH);
        }
        let atoms: bigint;
        try {
            atoms = BigInt(output.atoms);
        } catch {
            throw new Error(REDEEM_QUOTE_MISMATCH);
        }
        if (atoms <= 0n) {
            throw new Error(REDEEM_QUOTE_MISMATCH);
        }
        const scripted =
            typeof output.script === 'string' && output.script.length > 0;
        if (output.tokenId === toTokenId) {
            if (scripted) {
                throw new Error(REDEEM_QUOTE_MISMATCH);
            }
            receiveCount += 1;
        } else if (!scripted) {
            throw new Error(REDEEM_QUOTE_MISMATCH);
        } else {
            fromAtoms += atoms;
        }
    }
    if (receiveCount !== 1 || fromAtoms !== expectedFrom) {
        throw new Error(REDEEM_QUOTE_MISMATCH);
    }
}

/**
 * Exact-in AlpDex redeem (XECX↔FIRMA) from the token redeem screen.
 * Builds postage from the template the user already accepted.
 */
export const settleAlpRedeemExactIn = async ({
    wallet,
    fromTokenId,
    toTokenId,
    fromQty,
    fromDecimals,
    toDecimals,
    template,
}: {
    wallet: Wallet;
    fromTokenId: string;
    toTokenId: string;
    fromQty: number;
    fromDecimals: number;
    toDecimals: number;
    template: SwapTemplateResponse;
}): Promise<SettleAlpRedeemResult> => {
    if (!Number.isFinite(fromQty) || fromQty <= 0) {
        throw new Error('Enter a redeem amount');
    }

    const status = await fetchStatus();
    const pairs = pairsFromStatus(status);
    const pair = findPair(pairs, fromTokenId, toTokenId);
    if (!pair || typeof pair.feePct !== 'number') {
        throw new Error(alpSwap.unavailableMessage);
    }

    const utxoById = utxoQtyByTokenIdFromStatus(status);
    const receivingUtxoQty = utxoById[toTokenId];
    if (
        typeof receivingUtxoQty !== 'number' ||
        !Number.isFinite(receivingUtxoQty) ||
        receivingUtxoQty <= 0
    ) {
        throw new Error(
            'Missing maker UTXO size for the receiving token. Try again later.',
        );
    }

    assertAcceptedRedeemTemplate({
        outputs: template.outputs,
        fromTokenId,
        toTokenId,
        fromQty,
        fromDecimals,
    });

    const feePct =
        typeof template.feePct === 'number' && Number.isFinite(template.feePct)
            ? template.feePct
            : pair.feePct;

    const recvAtoms = receivingOutputAtoms(template.outputs, toTokenId);
    if (
        !priceLegCoversFeeOutputs(template.price, fromDecimals, feePct, 0) ||
        recvAtoms < 1n
    ) {
        throw new Error('Amount too small to cover fees');
    }

    const built = buildAlpSwapPostageTx({
        wallet,
        outputs: template.outputs,
        receivingTokenId: toTokenId,
        receivingDecimals: toDecimals,
        receivingUtxoQty,
        slushScriptHex: template.slushScript,
    });

    const result = await settleSwap(fromTokenId, toTokenId, {
        serializedTxHex: built.serializedTxHex,
        prePostageInputSats: built.prePostageInputSats.toString(),
        tokenId: built.receivingTokenId,
        atoms: built.receivingTokenAtoms.toString(),
    });

    if (!result.txid) {
        throw new Error('Swap succeeded but no txid returned');
    }

    const amountOut = Number(built.receivingTokenAtoms) / 10 ** toDecimals;
    return { txid: result.txid, amountOut };
};
