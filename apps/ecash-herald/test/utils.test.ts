// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import assert from 'assert';
import BigNumber from 'bignumber.js';
import config from '../config';
import {
    returnAddressPreview,
    jsonReplacer,
    jsonReviver,
    mapToKeyValueArray,
    formatXecAmount,
    satsToFormattedValue,
    getEmojiFromBalanceSats,
    bigNumberAmountToLocaleString,
    containsOnlyPrintableAscii,
    toXec,
} from '../src/utils';
import templates from './mocks/templates';
const { addressPreviews, mockCoingeckoPrices } = templates;

describe('ecash-telegram-bot utils.js functions', function () {
    it('returnAddressPreview converts a valid ecash: address into an abbreviated preview at various slice sizes', function () {
        for (let i = 0; i < addressPreviews.length; i += 1) {
            const { address, preview, sliceSize } = addressPreviews[i];
            assert.strictEqual(
                returnAddressPreview(address, sliceSize),
                preview,
            );
        }
    });
    it('formatXecAmount returns a string with 2 decimal places if XEC amount < 10', function () {
        assert.strictEqual(formatXecAmount(9.99), `9.99 XEC`);
    });
    it('formatXecAmount returns a string with no decimal places if XEC amount < 10 and round number', function () {
        assert.strictEqual(formatXecAmount(9), `9 XEC`);
    });
    it('formatXecAmount returns a string with no decimal places if 10 <= XEC amount < 100', function () {
        assert.strictEqual(formatXecAmount(12.51), `13 XEC`);
    });
    it('formatXecAmount returns a string with no decimal places if 100 < XEC amount <  1000', function () {
        assert.strictEqual(formatXecAmount(125), `125 XEC`);
    });
    it('formatXecAmount returns a thousands string with no decimal places if 1000 < XEC amount < 1 million', function () {
        assert.strictEqual(formatXecAmount(1000), `1k XEC`);
    });
    it('formatXecAmount returns a rounded thousands string with no decimal places if 1000 < XEC amount < 1 million', function () {
        assert.strictEqual(formatXecAmount(555555.55), `556k XEC`);
    });
    it('formatXecAmount returns a string with no decimal places if XEC amount is 1 trillion', function () {
        assert.strictEqual(formatXecAmount(1000000000000), `1T XEC`);
    });
    it('formatXecAmount returns a rounded millions string with no decimal places if 1M < XEC amount < 1B', function () {
        assert.strictEqual(formatXecAmount(555555555.55), `556M XEC`);
    });
    it('formatXecAmount returns a rounded billions string with no decimal places if 1B < XEC amount < 1T', function () {
        assert.strictEqual(formatXecAmount(555555555555.55), `556B XEC`);
    });
    it('formatXecAmount returns a rounded trillions string with no decimal places if XEC amount > 50T', function () {
        assert.strictEqual(formatXecAmount(55555555555555.55), `56T XEC`);
    });
    it('formatXecAmount returns a rounded trillions string with no decimal places if XEC amount > 1T', function () {
        assert.strictEqual(formatXecAmount(19999999999999.99), `20T XEC`);
    });
    it('formatXecAmount returns a trillions string with no decimal places for max possible XEC amount', function () {
        assert.strictEqual(formatXecAmount(21000000000000), `21T XEC`);
    });
    it('satsToFormattedValue returns a 6-decimal formatted fiat amount if total fiat value is less than $0.00001', function () {
        assert.strictEqual(
            satsToFormattedValue(10, mockCoingeckoPrices[0].price),
            `$0.000003`,
        );
    });
    it('satsToFormattedValue returns a 5-decimal formatted fiat amount if total fiat value is less than $0.0001', function () {
        assert.strictEqual(
            satsToFormattedValue(100, mockCoingeckoPrices[0].price),
            `$0.00003`,
        );
    });
    it('satsToFormattedValue returns a 4-decimal formatted fiat amount if total fiat value is less than $0.001', function () {
        assert.strictEqual(
            satsToFormattedValue(1000, mockCoingeckoPrices[0].price),
            `$0.0003`,
        );
    });
    it('satsToFormattedValue returns a 3-decimal formatted fiat amount if total fiat value is less than $0.01', function () {
        assert.strictEqual(
            satsToFormattedValue(10000, mockCoingeckoPrices[0].price),
            `$0.003`,
        );
    });
    it('satsToFormattedValue returns a 2-decimal formatted fiat amount if total fiat value is less than $1', function () {
        assert.strictEqual(
            satsToFormattedValue(1000000, mockCoingeckoPrices[0].price),
            `$0.30`,
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if total fiat value is less than $10', function () {
        assert.strictEqual(
            satsToFormattedValue(10000000, mockCoingeckoPrices[0].price),
            '$3',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if $100 < total fiat value < $1k', function () {
        assert.strictEqual(
            satsToFormattedValue(1234567890, mockCoingeckoPrices[0].price),
            '$370',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if $1k < total fiat value < $1M', function () {
        assert.strictEqual(
            satsToFormattedValue(55555555555, mockCoingeckoPrices[0].price),
            '$16.67k',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount of $1M if $1M < total fiat value < $1B', function () {
        assert.strictEqual(
            satsToFormattedValue(3367973856209, mockCoingeckoPrices[0].price),
            '$1.01M',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if $1M < total fiat value < $1B', function () {
        assert.strictEqual(
            satsToFormattedValue(55555555555555, mockCoingeckoPrices[0].price),
            '$16.67M',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if  total fiat value > $1B', function () {
        assert.strictEqual(
            satsToFormattedValue(
                21000000000000000,
                mockCoingeckoPrices[0].price,
            ),
            '$6.3B',
        );
    });
    it('satsToFormattedValue returns a formatted XEC amount if we have no fiat price for xec', function () {
        assert.strictEqual(satsToFormattedValue(55555555555555), '556B XEC');
    });
    it('satsToFormattedValue returns a USD amount with 7 decimal places if fiat qty is less than 0.000001', function () {
        assert.strictEqual(
            satsToFormattedValue(1, mockCoingeckoPrices[0].price),
            '$0.0000003',
        );
    });
    it('jsonReplacer and jsonReviver can encode and decode a Map to and from JSON', function () {
        const map = new Map([
            [1, 'one'],
            [2, 'two'],
            [3, 'three'],
        ]);

        const jsonText = JSON.stringify(map, jsonReplacer);
        const roundTrip = JSON.parse(jsonText, jsonReviver);

        assert.deepEqual(map, roundTrip);
    });
    it('jsonReplacer and jsonReviver can encode and decode Map containing a BigNumber', function () {
        const bigNumberMap = new Map([
            [
                '76a9144c1efd024f560e4e1aaf4b62416cd1e82fbed24f88ac',
                new BigNumber(36),
            ],
            [
                '76a9144c1efd024f560e4e1aaf4b62416cd1e82fbed24f88ac',
                new BigNumber(72),
            ],
        ]);

        const jsonText = JSON.stringify(bigNumberMap, jsonReplacer);
        const roundTrip = JSON.parse(jsonText, jsonReviver);

        assert.deepEqual(bigNumberMap, roundTrip);
    });
    it('jsonReplacer and jsonReviver can encode and decode Map containing a bigint', function () {
        const bigintMap = new Map([
            ['76a9144c1efd024f560e4e1aaf4b62416cd1e82fbed24f88ac', 36n],
            ['76a9144c1efd024f560e4e1aaf4b62416cd1e82fbed24f88ac', 72n],
        ]);

        const jsonText = JSON.stringify(bigintMap, jsonReplacer);
        const roundTrip = JSON.parse(jsonText, jsonReviver);

        assert.deepEqual(bigintMap, roundTrip);
    });
    it('jsonReplacer and jsonReviver can encode and decode a Set to and from JSON', function () {
        const set = new Set(['one', 'two', 'three']);

        const jsonText = JSON.stringify(set, jsonReplacer);
        const roundTrip = JSON.parse(jsonText, jsonReviver);

        assert.deepEqual(set, roundTrip);
    });
    it('jsonReplacer and jsonReviver can encode and decode a bigint to and from JSON', function () {
        const test = 17n;

        const jsonText = JSON.stringify(test, jsonReplacer);
        const roundTrip = JSON.parse(jsonText, jsonReviver);

        assert.deepEqual(test, roundTrip);
    });
    it('jsonReplacer and jsonReviver can encode and decode an object including a Set and a Map to and from JSON', async function () {
        const map = new Map([
            [1, 'one'],
            [2, 'two'],
            [3, 'three'],
        ]);
        const set = new Set(['one', 'two', 'three']);

        const jsonText = JSON.stringify({ map, set }, jsonReplacer);
        const roundTrip = JSON.parse(jsonText, jsonReviver);

        assert.deepEqual({ map, set }, roundTrip);
    });
    it('mapToKeyValueArray converts a map to a key value array and back to the same map', function () {
        const map = new Map([
            [1, 'one'],
            [2, 'two'],
            [3, 'three'],
        ]);

        const kvArray = mapToKeyValueArray(map);

        const roundTrip = new Map(kvArray);

        assert.deepEqual(map, roundTrip);
    });
    it('getEmojiFromBalanceSats provides all correct threshold emojis', function () {
        const { whaleSats, emojis } = config;
        const names = Object.keys(whaleSats);
        for (let i = 0; i < names.length; i += 1) {
            // Really bad types in the config as app was written without ts
            // TODO fixme
            // @ts-expect-error config object developed before typescript implementation
            const balanceSats = whaleSats[names[i]];
            assert.strictEqual(
                getEmojiFromBalanceSats(balanceSats),
                // @ts-expect-error config object developed before typescript implementation
                emojis[names[i]],
            );
        }
    });
    it('bigNumberAmountToLocaleString correctly formats a token send amount with no decimal places', async function () {
        const tokenSendAmountString = '1000000';
        const decimals = 0;

        assert.strictEqual(
            bigNumberAmountToLocaleString(tokenSendAmountString, decimals),
            '1,000,000',
        );
    });
    it('bigNumberAmountToLocaleString correctly formats a token send amount with 1 decimal place', async function () {
        const tokenSendAmountString = '10000000000000001';
        const decimals = 1;

        assert.strictEqual(
            bigNumberAmountToLocaleString(tokenSendAmountString, decimals),
            '1,000,000,000,000,000.1',
        );
    });
    it('bigNumberAmountToLocaleString correctly formats a token send amount with 9 decimal places', async function () {
        const tokenSendAmountString = '123456789123456789';
        const decimals = 9;

        assert.strictEqual(
            bigNumberAmountToLocaleString(tokenSendAmountString, decimals),
            '123,456,789.123456789',
        );
    });
    it('containsOnlyPrintableAscii correctly identifies a hex string containing only ascii ranged values as probably ascii', async function () {
        const hexString =
            '3d3a4554482e4554483a3078613961614633304636353935354336396331364233333435423531443432364439423838426138373a3834313332313a74723a30';

        assert.strictEqual(containsOnlyPrintableAscii(hexString), true);
    });
    it('containsOnlyPrintableAscii recognizes a string of odd length is probably not ascii', async function () {
        const hexString =
            '3d3a4554482e4554483a3078613961614633304636353935354336396331364233333435423531443432364439423838426138373a3834313332313a74723a3';

        assert.strictEqual(containsOnlyPrintableAscii(hexString), false);
    });
    it('containsOnlyPrintableAscii recognizes a string containing characters out of ascii range is probably not ascii', async function () {
        const hexString = '663ddd99990bcd969994ec2288a2a86dc532e1a8';

        assert.strictEqual(containsOnlyPrintableAscii(hexString), false);
    });
    it('containsOnlyPrintableAscii returns false for a string that contains all valid ascii characters but also a control character < 32', async function () {
        const hexString = '1f663ddd99990bcd969994ec2288a2a86dc532e1a8';

        assert.strictEqual(containsOnlyPrintableAscii(hexString), false);
    });
    it('containsOnlyPrintableAscii returns false for a string that contains all valid ascii characters but also a control character > 126', async function () {
        const hexString = '7f663ddd99990bcd969994ec2288a2a86dc532e1a8';

        assert.strictEqual(containsOnlyPrintableAscii(hexString), false);
    });
    it('We can convert bigint sats to exact qty XEC', function () {
        assert.equal(toXec(0n), 0);
        assert.equal(toXec(2100000000000000n), 21000000000000);
        assert.equal(toXec(1n), 0.01);
    });
});
