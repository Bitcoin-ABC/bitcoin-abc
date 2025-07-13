// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, TxHistoryPage, Tx } from 'chronik-client';
import { getTxTimestamp } from './parse';

/**
 * clientHandler.ts
 * Methods that make calls to a chronik server
 */

/**
 * @param chronik initialized ChronikClient
 * @param address a valid ecash address
 * @param timestamp timestamp in seconds.
 * We only return txs with timestamp >= this value, i.e. txs that were broadcast after timestamp
 * @param pageSize txs per page, chronik defaults to 25
 */
export async function getHistoryAfterTimestamp(
    chronik: ChronikClient,
    address: string,
    timestamp: number,
    pageSize = 25,
): Promise<Tx[]> {
    // The history endpoint is called with (pageNumber, pageSize), where 0 is the first page
    const firstPageHistory = await getTxHistoryPage(
        chronik,
        address,
        0,
        pageSize,
    );

    // Intialize your return object
    const txsAfterTimestamp = [];

    // Iterate over available pages in tx history
    for (let i = 0; i <= firstPageHistory.numPages; i += 1) {
        let txs;
        if (i > 0) {
            // If i > 0, get the next page
            const nextPageHistory = await getTxHistoryPage(
                chronik,
                address,
                i,
                pageSize,
            );
            txs = nextPageHistory.txs;
        } else {
            // If i is 0, you already have this page of txs
            txs = firstPageHistory.txs;
        }

        // Iterate over txs, adding them if they meet the given condition
        for (const tx of txs) {
            const thisTxTimestamp = getTxTimestamp(tx);
            if (thisTxTimestamp >= timestamp || thisTxTimestamp === -1) {
                // If this tx was sent AFTER timestamp or if its timestamp is unknown
                // Note: we can only have an unknown timestamp for an unconfirmed tx
                txsAfterTimestamp.push(tx);
            } else {
                // If we hit a tx that is from BEFORE timestamp, we have everything we need
                return txsAfterTimestamp;
            }
        }
    }
    // If we get through the entire history and they are still all from AFTER timestamp, return them all
    return txsAfterTimestamp;
}

/**
 * Get a single page of tx history from an in-node instance of chronik-client
 * @param chronik
 * @param address
 * @param pageNumber
 * @param pageSize
 * @returns
 */
async function getTxHistoryPage(
    chronik: ChronikClient,
    address: string,
    pageNumber: number,
    pageSize = 25,
): Promise<TxHistoryPage> {
    return await chronik.address(address).history(pageNumber, pageSize);
}
