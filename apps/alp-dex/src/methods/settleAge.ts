// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { SETTLE_MAX_QUEUE_AGE_MS } from '../constants';
import { HttpError } from './errors';

/**
 * Refuse a settle that has waited at least `maxAgeMs` since receipt.
 *
 * Throws {@link HttpError} 408 (not a 400 ValidationError) so Telegram
 * ops do not classify a stale queue drop as an invalid swap. Age >=
 * `maxAgeMs` is stale so a request that hits the max-age window exactly
 * is never broadcast.
 */
export const assertSettleRequestFresh = (
    receivedAtMs: number,
    nowMs: number = Date.now(),
    maxAgeMs: number = SETTLE_MAX_QUEUE_AGE_MS,
): void => {
    if (
        !Number.isFinite(receivedAtMs) ||
        !Number.isFinite(nowMs) ||
        !Number.isFinite(maxAgeMs) ||
        maxAgeMs < 0
    ) {
        throw new HttpError(
            408,
            `Settle request expired after ${SETTLE_MAX_QUEUE_AGE_MS}ms in queue`,
        );
    }
    if (nowMs - receivedAtMs >= maxAgeMs) {
        throw new HttpError(
            408,
            `Settle request expired after ${maxAgeMs}ms in queue`,
        );
    }
};
