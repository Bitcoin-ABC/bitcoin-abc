// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx_InNode } from 'chronik-client';
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
    tx: Tx_InNode,
    outputScript: string,
): boolean {
    const { inputs } = tx; // TxInput_InNode[]
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
    tx: Tx_InNode,
    address: string,
    tokenId: string,
): boolean {
    // Tx_InNode outputs have outputScript as a key, not address
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
