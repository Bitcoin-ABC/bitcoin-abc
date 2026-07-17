// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { encodeCashAddress } from 'ecashaddrjs';

/**
 * Convert a raw output script hex to a display string:
 * - p2pkh (76a914<20B>88ac) -> p2pkh cashaddr
 * - p2sh  (a914<20B>87)     -> p2sh cashaddr
 * - anything else           -> the raw output script hex (as explorer.e.cash
 *   shows non-address scripts)
 */
export function scriptToAddress(outputScript: string): string {
    try {
        const p2pkh = /^76a914([0-9a-f]{40})88ac$/i.exec(outputScript);
        if (p2pkh) {
            return encodeCashAddress('ecash', 'p2pkh', p2pkh[1]);
        }

        const p2sh = /^a914([0-9a-f]{40})87$/i.exec(outputScript);
        if (p2sh) {
            return encodeCashAddress('ecash', 'p2sh', p2sh[1]);
        }
    } catch {
        // Fall through to returning the raw script below
    }

    return outputScript;
}
