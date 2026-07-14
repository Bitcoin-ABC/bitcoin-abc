// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import {
    toFormattedCompactAmount,
    toFormattedFiatNotification,
    toFormattedTokenQty,
    toFormattedXec,
} from './formatting';

describe('notification amount formatting', () => {
    it('toFormattedXec uses 2 decimals below 1k', () => {
        assert.strictEqual(toFormattedXec(550, 'en-US'), '5.50');
        assert.strictEqual(toFormattedXec(4200, 'en-US'), '42.00');
    });

    it('toFormattedXec uses k/M/B/T for large amounts', () => {
        assert.strictEqual(toFormattedXec(62500897, 'en-US'), '625.01k');
        assert.strictEqual(toFormattedXec(100000000, 'en-US'), '1M');
        assert.strictEqual(toFormattedXec(100000000000, 'en-US'), '1B');
        assert.strictEqual(toFormattedXec(100000000000000, 'en-US'), '1T');
    });

    it('toFormattedXec avoids 1,000k when rounding up', () => {
        assert.strictEqual(toFormattedXec(99999999, 'en-US'), '1M');
    });

    it('toFormattedXec respects locale decimal separator', () => {
        assert.strictEqual(toFormattedXec(62500897, 'fr-FR'), '625,01k');
    });

    it('toFormattedTokenQty keeps small amounts precise', () => {
        assert.strictEqual(toFormattedTokenQty('14.0667', 'en-US'), '14.0667');
        assert.strictEqual(toFormattedTokenQty('375', 'en-US'), '375');
    });

    it('toFormattedTokenQty compactifies large amounts', () => {
        assert.strictEqual(toFormattedTokenQty('1500', 'en-US'), '1.5k');
        assert.strictEqual(toFormattedTokenQty('2500000', 'en-US'), '2.5M');
    });

    it('toFormattedCompactAmount rounds for readability', () => {
        assert.strictEqual(
            toFormattedCompactAmount(555555.55, 'en-US'),
            '555.56k',
        );
    });

    it('toFormattedFiatNotification keeps currency style below 1k', () => {
        assert.strictEqual(
            toFormattedFiatNotification(20.63, 'en-US', 'USD'),
            '$20.63 USD',
        );
    });

    it('toFormattedFiatNotification compactifies large fiat', () => {
        assert.strictEqual(
            toFormattedFiatNotification(1500, 'en-US', 'USD'),
            '1.5k USD',
        );
    });
});
