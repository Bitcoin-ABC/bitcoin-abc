// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient } from 'chronik-client';

/**
 * Build a Chronik client using config URL order (primary first, then
 * failover). Prefer listing a private instance before public mirrors.
 */
export const createChronikClient = (urls: string[]): ChronikClient => {
    return new ChronikClient(urls);
};
