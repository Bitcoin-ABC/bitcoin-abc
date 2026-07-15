// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * AlpSwap already toasts the from→to result. Chronik WS may also fire a
 * generic "Sent …" (or a parsed buyer swap line), often before settle()
 * returns the txid. Suppress that second toast while a swap is in flight
 * and for the remembered settle txid.
 */
const recentSettleTxids = new Set<string>();
let buyerToastSuppressed = false;

/**
 * Record a settle txid just broadcast by the AlpSwap UI.
 */
export const rememberAlpSwapSettleTxid = (txid: string): void => {
    if (txid === '') {
        return;
    }
    recentSettleTxids.add(txid);
};

/**
 * True (and consumed) if this mempool tx was already toasted by AlpSwap.
 */
export const consumeAlpSwapSettleTxid = (txid: string): boolean => {
    if (!recentSettleTxids.has(txid)) {
        return false;
    }
    recentSettleTxids.delete(txid);
    return true;
};

/**
 * While true, useWallet skips the websocket toast for this wallet's swap.
 */
export const setAlpSwapBuyerToastSuppressed = (suppressed: boolean): void => {
    buyerToastSuppressed = suppressed;
};

/**
 * True if AlpSwap is handling the buyer notification itself.
 */
export const isAlpSwapBuyerToastSuppressed = (): boolean =>
    buyerToastSuppressed;
