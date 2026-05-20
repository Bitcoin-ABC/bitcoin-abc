// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BroadcastConfig } from 'ecash-wallet';

/**
 * Optional finalization wait for agora methods that build and broadcast txs.
 */
export interface AgoraBroadcastParams {
    /**
     * If set to a positive number, use Chronik's broadcastAndFinalizeTx(s) and wait
     * for Avalanche finalization for up to this many seconds before returning.
     * If omitted, use broadcastTx(s) and return after the tx(s) are accepted to mempool.
     *
     * Requires chronik-client >= 4.1.0.
     */
    finalizationTimeoutSecs?: number;
}

/**
 * Build ecash-wallet {@link BroadcastConfig} from agora broadcast params.
 */
export const toBroadcastConfig = (
    params: AgoraBroadcastParams,
): BroadcastConfig => {
    const { finalizationTimeoutSecs } = params;
    if (finalizationTimeoutSecs == null) {
        return { retryOnUtxoConflict: true };
    }
    return { finalizationTimeoutSecs, retryOnUtxoConflict: true };
};
