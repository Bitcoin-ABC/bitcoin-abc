// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * getHistoryAfterTimestamp.ts
 *
 * Call the getHistoryAfterTimestamp function from src/chronik/clientHandler.ts
 * May call with default input, e.g.
 *
 * ts-node scripts/getHistoryAfterTimestamp.ts
 *
 * or custom input, e.g.
 *
 * ts-node scripts/getHistoryAfterTimestamp.ts <address> <timestamp> <pageSize>
 */

import config from '../config';
import { ChronikClientNode } from 'chronik-client';
import { getHistoryAfterTimestamp } from '../src/chronik/clientHandler';
import { getTxTimestamp } from '../src/chronik/parse';

// Initialize new in-node chronik connection
const chronik = new ChronikClientNode(config.chronikUrls);

// Get input from bash or use defaults
const address =
    typeof process.argv[2] !== 'undefined'
        ? process.argv[2]
        : // Default IFP
          'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';

const timestamp =
    typeof process.argv[3] !== 'undefined'
        ? parseInt(process.argv[3])
        : // Default March 1, 2024, when I added this
          1709332318;

const pageSize =
    typeof process.argv[4] !== 'undefined'
        ? parseInt(process.argv[4])
        : // Default undefined, chronik will use default = 25
          undefined;

getHistoryAfterTimestamp(chronik, address, timestamp, pageSize).then(
    result => {
        console.log(`HistoryAfterTimestamp`, result);
        const oldestTxTimestamp = getTxTimestamp(result[result.length - 1]);
        if (oldestTxTimestamp > timestamp) {
            console.log(
                '\x1b[32m%s\x1b[0m',
                `✔ The oldest tx had timestamp ${oldestTxTimestamp} (${new Date(
                    1000 * oldestTxTimestamp,
                )})`,
            );
            console.log(
                '\x1b[32m%s\x1b[0m',
                `✔ Received ${
                    result.length
                } txs from ${address} broadcast after ${timestamp} (${new Date(
                    1000 * timestamp,
                )})`,
            );
        } else {
            console.log(
                '\x1b[31m%s\x1b[0m',
                `ERROR: The oldest tx received from getTxsAfterTimestamp had timestamp ${oldestTxTimestamp} (${new Date(
                    1000 * oldestTxTimestamp,
                )}), which is before ${timestamp} (${new Date(
                    1000 * timestamp,
                )})`,
            );
        }
        process.exit(0);
    },
    err => {
        console.log(`Error`, err);
        process.exit(1);
    },
);
