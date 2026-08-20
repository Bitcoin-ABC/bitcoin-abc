// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import {
    humanExchangeRate,
    logSwapOutcome,
    type SwapRecord,
} from '../src/settle/audit';

const baseRecord = (): SwapRecord => ({
    serializedTxHex: '0200000001abc123',
    isValid: true,
    broadcasted: true,
    txid: 'def456',
    fromTokenId: 'aa'.repeat(32),
    toTokenId: 'bb'.repeat(32),
    postagePaidSats: 1000,
    clientIp: '203.0.113.1',
    takerAddress: 'ecash:qprc8r5472elcru0m8x05a44v05688qc4sdzuxvtwu',
    qtyFrom: 100.5,
    qtyTo: 90.25,
    qtyFee: 2,
    serverExchangeRate: 0.95,
    serverFee: 0.02,
});

describe('humanExchangeRate', () => {
    it('matches the atoms ratio when decimals are equal', () => {
        assert.strictEqual(humanExchangeRate(4997n, 10_000n, 4, 4), 0.4997);
    });

    it('scales when decimals differ', () => {
        // 100 atoms of 2-dec from → 1.00 human; 1000 atoms of 3-dec to → 1.00
        assert.strictEqual(humanExchangeRate(1000n, 100n, 2, 3), 1);
    });

    it('is 0 when the price leg is 0', () => {
        assert.strictEqual(humanExchangeRate(100n, 0n, 4, 4), 0);
    });
});

describe('logSwapOutcome', () => {
    let infoArgs: unknown[][];
    let errorArgs: unknown[][];
    let origInfo: typeof console.info;
    let origError: typeof console.error;

    beforeEach(() => {
        infoArgs = [];
        errorArgs = [];
        origInfo = console.info;
        origError = console.error;
        console.info = ((...args: unknown[]) => {
            infoArgs.push(args);
        }) as typeof console.info;
        console.error = ((...args: unknown[]) => {
            errorArgs.push(args);
        }) as typeof console.error;
    });

    afterEach(() => {
        console.info = origInfo;
        console.error = origError;
    });

    it('logs success with console.info and hex length only', () => {
        logSwapOutcome('success', baseRecord());
        assert.strictEqual(infoArgs.length, 1);
        assert.strictEqual(errorArgs.length, 0);
        const details = infoArgs[0]![1] as Record<string, unknown>;
        assert.strictEqual(details.outcome, 'success');
        assert.strictEqual(details.clientIp, '203.0.113.1');
        assert.strictEqual(details.taker, baseRecord().takerAddress);
        assert.strictEqual(details.serializedTxHexLength, 16);
        assert.ok(!('serializedTxHex' in details));
        assert.ok(!('error' in details));
    });

    it('logs invalid / broadcast-failed / failed with console.error', () => {
        logSwapOutcome('invalid', baseRecord(), 'bad hex');
        logSwapOutcome('broadcast-failed', baseRecord(), 'Broadcast failed');
        logSwapOutcome('failed', baseRecord(), 'chronik sync failed');
        assert.strictEqual(infoArgs.length, 0);
        assert.strictEqual(errorArgs.length, 3);
        assert.strictEqual(
            (errorArgs[0]![1] as { outcome: string }).outcome,
            'invalid',
        );
        assert.strictEqual(
            (errorArgs[1]![1] as { error: string }).error,
            'Broadcast failed',
        );
        assert.strictEqual(
            (errorArgs[2]![1] as { clientIp: string }).clientIp,
            '203.0.113.1',
        );
        for (const args of errorArgs) {
            const details = args[1] as Record<string, unknown>;
            assert.ok(!('serializedTxHex' in details));
        }
    });
});
