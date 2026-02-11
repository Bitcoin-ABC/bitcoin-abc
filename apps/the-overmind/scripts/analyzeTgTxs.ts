// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import { toHex, strToBytes, Script, parseEmppScript, fromHex } from 'ecash-lib';
import { LOKAD_ID } from '../src/constants';
import { parseEmppActionCode, EmppAction } from '../src/empp';

/**
 * Get all transaction history for a LOKAD_ID (handles pagination)
 */
const getAllLokadHistory = async (
    chronik: ChronikClient,
    lokadIdHex: string,
): Promise<any[]> => {
    const firstPage = await chronik.lokadId(lokadIdHex).history();
    const { txs, numPages } = firstPage;

    // Get rest of history if there are multiple pages
    if (numPages > 1) {
        const txsPromises = [];
        for (let i = 1; i < numPages; i += 1) {
            txsPromises.push(
                chronik
                    .lokadId(lokadIdHex)
                    .history(i, 200) // Max page size
                    .then(result => result.txs),
            );
        }
        const restOfTxs = await Promise.all(txsPromises);
        txs.push(...restOfTxs.flat());
    }

    return txs;
};

/**
 * Get action name from action code
 */
const getActionName = (actionCode: number): string => {
    switch (actionCode) {
        case EmppAction.CLAIM:
            return 'CLAIM';
        case EmppAction.LIKE:
            return 'LIKE';
        case EmppAction.DISLIKE:
            return 'DISLIKE';
        case EmppAction.DISLIKED:
            return 'DISLIKED';
        case EmppAction.RESPAWN:
            return 'RESPAWN';
        case EmppAction.WITHDRAW:
            return 'WITHDRAW';
        case EmppAction.BOTTLE_REPLY:
            return 'BOTTLE_REPLY';
        case EmppAction.BOTTLE_REPLIED:
            return 'BOTTLE_REPLIED';
        case EmppAction.CHILI_REPLY:
            return 'CHILI_REPLY';
        default:
            return `UNKNOWN (0x${actionCode.toString(16).padStart(2, '0')})`;
    }
};

/**
 * Analyze Telegram transactions by LOKAD_ID
 */
const analyzeTgTxs = async () => {
    // Use the same chronik URLs and connection strategy as in index.ts
    const chronikUrls = [
        'https://chronik-native3.fabien.cash',
        'https://chronik-native2.fabien.cash',
        'https://chronik-native1.fabien.cash',
    ];
    const chronik = await ChronikClient.useStrategy(
        ConnectionStrategy.ClosestFirst,
        chronikUrls,
    );

    // Convert LOKAD_ID to hex
    const lokadIdHex = toHex(strToBytes(LOKAD_ID));

    console.log(
        `📊 Analyzing transactions for LOKAD_ID: ${LOKAD_ID} (${lokadIdHex})`,
    );
    console.log('Fetching transaction history...\n');

    try {
        // Get all transactions
        const txs = await getAllLokadHistory(chronik, lokadIdHex);

        console.log(`Found ${txs.length} total transactions\n`);

        // Counters for all action types
        const actionCounts = new Map<number, number>();
        let unknownCount = 0;
        let noEmppDataCount = 0;
        let noOpReturnCount = 0;

        // Process each transaction
        for (const tx of txs) {
            // Find OP_RETURN output (should be at index 0 for EMPP transactions)
            if (!tx.outputs || tx.outputs.length === 0) {
                noOpReturnCount++;
                continue;
            }

            // Look for OP_RETURN output (starts with 0x6a)
            let opReturnOutput = null;
            for (const output of tx.outputs) {
                if (
                    output.outputScript &&
                    output.outputScript.startsWith('6a')
                ) {
                    opReturnOutput = output;
                    break;
                }
            }

            if (!opReturnOutput || !opReturnOutput.outputScript) {
                noOpReturnCount++;
                continue;
            }

            // Parse the script
            const script = new Script(
                fromHex(opReturnOutput.outputScript as string),
            );
            const emppPushes = parseEmppScript(script);

            if (!emppPushes || emppPushes.length === 0) {
                noEmppDataCount++;
                continue;
            }

            // Look for our LOKAD_ID in the EMPP pushes
            let foundOurEmpp = false;
            for (const push of emppPushes) {
                // Check if this push starts with our LOKAD_ID
                const lokadIdBytes = strToBytes(LOKAD_ID);
                if (push.length < lokadIdBytes.length) {
                    continue;
                }

                // Compare first 4 bytes with LOKAD_ID
                let matches = true;
                for (let i = 0; i < lokadIdBytes.length; i++) {
                    if (push[i] !== lokadIdBytes[i]) {
                        matches = false;
                        break;
                    }
                }

                if (matches) {
                    // This is our EMPP data push, parse the action code using the proper function
                    const actionCode = parseEmppActionCode(push);
                    if (actionCode === null) {
                        unknownCount++;
                        foundOurEmpp = true;
                        break;
                    }

                    // Increment counter for this action code
                    const currentCount = actionCounts.get(actionCode) || 0;
                    actionCounts.set(actionCode, currentCount + 1);
                    foundOurEmpp = true;

                    // Only count the first matching push per transaction
                    break;
                }
            }

            // If we didn't find any matching EMPP data, count it
            if (!foundOurEmpp) {
                noEmppDataCount++;
            }
        }

        // Print results
        console.log('📈 Transaction Analysis Results:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Action Breakdown:');
        console.log('');

        // Sort action codes for consistent output
        const sortedActions = Array.from(actionCounts.entries()).sort(
            (a, b) => a[0] - b[0],
        );

        for (const [actionCode, count] of sortedActions) {
            const actionName = getActionName(actionCode);
            console.log(
                `  ${actionName.padEnd(20)} ${count.toString().padStart(8)}`,
            );
        }

        if (unknownCount > 0) {
            console.log(
                `  ${'Unknown/Invalid'.padEnd(20)} ${unknownCount.toString().padStart(8)}`,
            );
        }

        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const totalCounted =
            Array.from(actionCounts.values()).reduce(
                (sum, count) => sum + count,
                0,
            ) + unknownCount;
        console.log(`Total transactions:        ${txs.length}`);
        console.log(`Total with our EMPP:      ${totalCounted}`);
        console.log(`No OP_RETURN:             ${noOpReturnCount}`);
        console.log(
            `Other EMPP data:           ${noEmppDataCount - noOpReturnCount}`,
        );
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (err) {
        console.error('❌ Error analyzing transactions:', err);
        process.exit(1);
    }
};

// Run the analysis
analyzeTgTxs().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
