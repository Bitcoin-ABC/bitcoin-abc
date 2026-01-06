// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import { toHex, strToBytes, Script, parseEmppScript, fromHex } from 'ecash-lib';
import { LOKAD_ID } from '../src/constants';

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
 * Parse EMPP data push to extract action code
 * Format: <lokadId><versionByte><actionCode><msgId>
 * Returns action code or null if parsing fails
 */
const parseActionCode = (emppData: Uint8Array): number | null => {
    try {
        // Check minimum length: 4 (lokadId) + 1 (version) + 1 (action) + 4 (msgId) = 10 bytes
        if (emppData.length < 10) {
            return null;
        }

        // Skip lokadId (4 bytes) and versionByte (1 byte)
        // Action code is at index 5
        return emppData[5];
    } catch {
        return null;
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

        // Counters
        let claimCount = 0;
        let likeCount = 0;
        let dislikeCount = 0;
        let dislikedCount = 0;
        let unknownCount = 0;

        // Process each transaction
        for (const tx of txs) {
            // Find OP_RETURN output (should be at index 0 for EMPP transactions)
            if (!tx.outputs || tx.outputs.length === 0) {
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
                continue;
            }

            // Parse the script
            const script = new Script(
                fromHex(opReturnOutput.outputScript as string),
            );
            const emppPushes = parseEmppScript(script);

            if (!emppPushes || emppPushes.length === 0) {
                continue;
            }

            // Look for our LOKAD_ID in the EMPP pushes
            // The first push should be our data: <lokadId><versionByte><actionCode><msgId>
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
                    // This is our EMPP data push, parse the action code
                    const actionCode = parseActionCode(push);
                    if (actionCode === null) {
                        unknownCount++;
                        continue;
                    }

                    switch (actionCode) {
                        case 0x00:
                            claimCount++;
                            break;
                        case 0x01:
                            likeCount++;
                            break;
                        case 0x02:
                            dislikeCount++;
                            break;
                        case 0x03:
                            dislikedCount++;
                            break;
                        default:
                            unknownCount++;
                    }
                    // Only count the first matching push per transaction
                    break;
                }
            }
        }

        // Print results
        console.log('📈 Transaction Analysis Results:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`CLAIM transactions:        ${claimCount}`);
        console.log(`LIKE transactions:         ${likeCount}`);
        console.log(`DISLIKE transactions:      ${dislikeCount}`);
        console.log(`DISLIKED transactions:     ${dislikedCount}`);
        if (unknownCount > 0) {
            console.log(`Unknown/Invalid:           ${unknownCount}`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total analyzed:            ${txs.length}`);
        console.log(
            `Total counted:             ${claimCount + likeCount + dislikeCount + dislikedCount + unknownCount}`,
        );
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
