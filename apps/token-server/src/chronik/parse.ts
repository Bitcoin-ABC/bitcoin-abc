// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx_InNode } from 'chronik-client';

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
