// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { SETTLE_MAX_QUEUE_AGE_MS } from '../src/constants';
import { HttpError } from '../src/methods/errors';
import { assertSettleRequestFresh } from '../src/methods/settleAge';

const isExpired408 = (error: unknown, maxAgeMs: number): boolean =>
    error instanceof HttpError &&
    error.status === 408 &&
    error.message === `Settle request expired after ${maxAgeMs}ms in queue`;

describe('assertSettleRequestFresh', () => {
    it('allows age strictly below maxAgeMs', () => {
        assert.doesNotThrow(() =>
            assertSettleRequestFresh(1_000, 1_000 + 19_999, 20_000),
        );
        assert.doesNotThrow(() => assertSettleRequestFresh(0, 0, 20_000));
    });

    it('rejects age at or past maxAgeMs with HTTP 408', () => {
        assert.throws(
            () => assertSettleRequestFresh(0, 20_000, 20_000),
            (error: unknown) => isExpired408(error, 20_000),
        );
        assert.throws(
            () => assertSettleRequestFresh(1_000, 1_000 + 20_001, 20_000),
            (error: unknown) => isExpired408(error, 20_000),
        );
    });

    it('defaults to SETTLE_MAX_QUEUE_AGE_MS (20s)', () => {
        assert.strictEqual(SETTLE_MAX_QUEUE_AGE_MS, 20_000);
        assert.throws(
            () => assertSettleRequestFresh(0, SETTLE_MAX_QUEUE_AGE_MS),
            (error: unknown) => isExpired408(error, SETTLE_MAX_QUEUE_AGE_MS),
        );
    });

    it('same createdAt is fresh then stale as now advances', () => {
        const createdAtMs = 1_000_000;
        assert.doesNotThrow(() =>
            assertSettleRequestFresh(
                createdAtMs,
                createdAtMs + SETTLE_MAX_QUEUE_AGE_MS - 1,
            ),
        );
        assert.throws(
            () =>
                assertSettleRequestFresh(
                    createdAtMs,
                    createdAtMs + SETTLE_MAX_QUEUE_AGE_MS,
                ),
            (error: unknown) => isExpired408(error, SETTLE_MAX_QUEUE_AGE_MS),
        );
    });

    it('rejects non-finite timestamps as expired (do not settle)', () => {
        assert.throws(
            () => assertSettleRequestFresh(Number.NaN, 1_000, 20_000),
            (error: unknown) =>
                error instanceof HttpError && error.status === 408,
        );
        assert.throws(
            () => assertSettleRequestFresh(0, Number.POSITIVE_INFINITY, 20_000),
            (error: unknown) =>
                error instanceof HttpError && error.status === 408,
        );
    });
});
