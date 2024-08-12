// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx } from 'chronik-client';
import cashaddr from 'ecashaddrjs';

/**
 * parse.ts
 * Parse data returned by ChronikClientNode for token-server purposes
 */

/**
 * Determine if any input in a given tx includes a given outputScript
 * Useful in determining if a tx was "sent" by a given outputScript
 * Inputs may come from different output scripts
 * However, if any input in a tx is from a given outputScript,
 * it does indeed "have inputs from outputScript"
 * @param tx
 * @param outputScript outputScript we are checking
 */
export function hasInputsFromOutputScript(
    tx: Tx,
    outputScript: string,
): boolean {
    const { inputs } = tx;
    for (const input of inputs) {
        if (input.outputScript === outputScript) {
            return true;
        }
    }
    return false;
}

/**
 * Determine if an address received a given tokenId in a given tx
 * @param tx
 * @param address this is the address we are checking for receipt of token with tokenId
 * @param tokenId
 */
export function addressReceivedToken(
    tx: Tx,
    address: string,
    tokenId: string,
): boolean {
    // Tx outputs have outputScript as a key, not address
    const outputScript = cashaddr.getOutputScriptFromAddress(address);

    const { outputs } = tx;

    // Check each output to see if it received tokenId at outputScript
    for (const output of outputs) {
        if (typeof output.token !== 'undefined') {
            // the key 'token' is only present if this output contains a token
            // for this function, we do not care if the given outputScript
            // received anything besides the specified token

            if (
                output.outputScript === outputScript &&
                output.token.tokenId === tokenId
            ) {
                return true;
            }
        }
    }

    // If we get through all the outputs and none have received tokenId at this address,
    // return false
    return false;
}

/**
 * Get timestamp from a chronik tx
 * @param tx
 * @returns timestamp (seconds)
 */
export function getTxTimestamp(tx: Tx): number {
    const { timeFirstSeen } = tx;

    if (timeFirstSeen !== 0) {
        // If we have timeFirstSeen from the node, this is the best timestamp
        return timeFirstSeen;
    }

    if (typeof tx.block === 'undefined') {
        // Edge case, it is possible we cannot tell the time for this tx
        // i.e. timeFirstSeen === 0 and the tx has not yet confirmed, so there is no block key in tx
        // We return -1 to denote this
        return -1;
    }

    // If we do not have timeFirstSeen but the tx is in a block, use the block time
    return tx.block.timestamp;
}
