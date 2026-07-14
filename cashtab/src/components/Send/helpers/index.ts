// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BigNumber from 'bignumber.js';
import { toast } from 'react-toastify';

export {
    getAddressFromRecipientInput,
    getRecipientDisplayLabel,
    looksLikeAddressInput,
    searchSendRecipients,
} from './recipientResolve';
export type {
    RecipientMatchKind,
    RecipientSearchMatch,
} from './recipientResolve';

/**
 * Get the total XEC amount sent in a one-to-many XEC tx
 * @param destinationAddressAndValueArray
 * Array constructed by user input of addresses and values
 * e.g. [
 *  "<address>, <value>",
 *   "<address>, <value>"
 *  ]
 * @returns total value of XEC
 */
export const sumOneToManyXec = (
    destinationAddressAndValueArray: string[],
): number => {
    return destinationAddressAndValueArray.reduce((prev, curr) => {
        return prev + parseFloat(curr.split(',')[1]);
    }, 0);
};

/**
 * Sum decimalized token quantities from send-to-many lines (address,qty per line).
 * @param destinationAddressAndValueArray lines split on newline
 * @returns decimalized total as string (for display / comparison)
 */
export const sumOneToManyToken = (
    destinationAddressAndValueArray: string[],
): string => {
    let total = new BigNumber(0);
    for (const line of destinationAddressAndValueArray) {
        if (line.trim() === '') {
            continue;
        }
        const qtyPart = line.split(',')[1];
        if (typeof qtyPart === 'undefined') {
            return 'NaN';
        }
        total = total.plus(new BigNumber(qtyPart.trim()));
    }
    return total.toFixed();
};

export const confirmRawTx = (notification: React.ReactNode) => {
    /**
     * This notification is used by tests to confirm we build the expected rawtx
     * But Cashtab has better notifications from the useWallet websocket
     *
     * The user should see the improved notifications in the websocket
     * But we want to preserve this notification in the tests
     */
    if (process.env.NODE_ENV === 'test') {
        toast(notification);
    }
};
