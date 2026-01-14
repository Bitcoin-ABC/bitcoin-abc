// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Script, fromHex, parseEmppScript } from 'ecash-lib';
import { getOutputScriptFromAddress } from 'ecashaddrjs';
import { ChronikClient } from 'chronik-client';
import { EmppAction, parseEmppActionCode } from './empp';

/**
 * Check if user has withdrawn in the last 24 hours by checking transaction history
 * Parses OP_RETURN outputs to find EMPP WITHDRAW transactions
 * @param userAddress - User's address
 * @param chronik - Chronik client for querying blockchain
 * @returns true if user has withdrawn in last 24 hours, false otherwise
 */
export const hasWithdrawnInLast24Hours = async (
    userAddress: string,
    chronik: ChronikClient,
): Promise<boolean> => {
    try {
        // Get timestamp 24 hours ago (in seconds)
        const timeOfRequest = Math.ceil(Date.now() / 1000);
        const timestamp24HoursAgo = timeOfRequest - 86400; // 24 hours in seconds

        // Fetch transactions in pages of 25 until we have all or hit one older than 24 hours
        let page = 0;
        const pageSize = 25;
        let foundOldTx = false;

        while (true) {
            const history = await chronik
                .address(userAddress)
                .history(page, pageSize);
            const { txs, numPages } = history;

            // Check each transaction in this page
            for (const tx of txs) {
                // Get transaction timestamp
                const txTimestamp =
                    tx.timeFirstSeen !== 0
                        ? tx.timeFirstSeen
                        : tx.block?.timestamp || -1;

                // If transaction is older than 24 hours, we can stop
                if (txTimestamp < timestamp24HoursAgo && txTimestamp !== -1) {
                    foundOldTx = true;
                    break;
                }

                // Check if user sent this transaction (has inputs from user's address)
                const userOutputScript =
                    getOutputScriptFromAddress(userAddress);
                let hasUserInput = false;
                for (const input of tx.inputs) {
                    if (input.outputScript === userOutputScript) {
                        hasUserInput = true;
                        break;
                    }
                }

                if (!hasUserInput) {
                    continue;
                }

                // Look for OP_RETURN output (starts with 0x6a)
                let opReturnOutput = null;
                if (tx.outputs && tx.outputs.length > 0) {
                    for (const output of tx.outputs) {
                        if (
                            output.outputScript &&
                            output.outputScript.startsWith('6a')
                        ) {
                            opReturnOutput = output;
                            break;
                        }
                    }
                }

                if (!opReturnOutput || !opReturnOutput.outputScript) {
                    continue;
                }

                // Parse the OP_RETURN script to extract EMPP data
                try {
                    const script = new Script(
                        fromHex(opReturnOutput.outputScript as string),
                    );
                    const emppPushes = parseEmppScript(script);

                    if (!emppPushes || emppPushes.length === 0) {
                        continue;
                    }

                    // Look for our LOKAD_ID in the EMPP pushes
                    for (const push of emppPushes) {
                        const actionCode = parseEmppActionCode(push);
                        if (actionCode === EmppAction.WITHDRAW) {
                            // Found a WITHDRAW transaction in the last 24 hours
                            return true;
                        }
                    }
                } catch {
                    // Skip transactions that fail to parse
                    continue;
                }
            }

            // If we found an old transaction, we can stop
            if (foundOldTx) {
                break;
            }

            // Move to next page
            page++;
            if (page >= numPages) {
                // No more pages
                break;
            }
        }

        return false;
    } catch (err) {
        // If we can't check history, allow the withdraw (fail open)
        // This prevents blocking users due to chronik errors
        console.error('Error checking withdraw history:', err);
        return false;
    }
};
