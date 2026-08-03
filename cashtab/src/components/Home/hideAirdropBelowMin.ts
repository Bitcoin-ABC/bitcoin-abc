// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { opReturn } from 'config/opreturn';
import { CashtabTx, toSatoshis } from 'wallet';

/**
 * True when this tx is an airdrop below the user's min display floor.
 * Used to suppress airdrop message content in tx history (not to hide the tx).
 */
export const shouldFilterAirdropMsg = (
    tx: CashtabTx,
    minAirdropXec: number,
): boolean => {
    if (
        typeof tx.parsed === 'undefined' ||
        !Array.isArray(tx.parsed.appActions)
    ) {
        return false;
    }
    const isAirdrop = tx.parsed.appActions.some(
        action => action.lokadId === opReturn.appPrefixesHex.airdrop,
    );
    if (!isAirdrop) {
        return false;
    }
    return tx.parsed.satoshisSent < toSatoshis(minAirdropXec);
};
