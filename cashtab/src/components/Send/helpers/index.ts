// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { toast } from 'react-toastify';

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
