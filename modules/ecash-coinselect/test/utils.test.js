// Copyright (c) 2018 Daniel Cousens
// Copyright (c) 2023 Bitcoin ABC
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { sumValues, isToken } = require('../src/utils');

describe('ecash-coinselect utils.js functions', async function () {
    it('sumValues() returns total value of an array of stub utxos with value as string type as a number', function () {
        const stubUtxos = [
            { value: '100' },
            { value: '200' },
            { value: '300' },
        ];
        assert.strictEqual(sumValues(stubUtxos), 600);
    });
    it('sumValues() returns total value of an array of stub utxos with value as number type as a number', function () {
        const stubUtxos = [{ value: 100 }, { value: 200 }, { value: 300 }];
        assert.strictEqual(sumValues(stubUtxos), 600);
    });
    it('sumValues() throws an error if provided with unsupported input objects', function () {
        // no 'value' key
        const badKeyUtxos = [{ valu: '100' }, { valu: '200' }, { valu: '300' }];
        assert.throws(() => {
            sumValues(badKeyUtxos);
        }, new assert.AssertionError({ message: `Input must be an object with 'value' as a key and an integer representing the amount in satoshis as a value`, actual: false, expected: true, operator: '==' }));

        // value is infinity (number)
        const badValueUtxosNumber = [{ value: Number.POSITIVE_INFINITY }];
        assert.throws(() => {
            sumValues(badValueUtxosNumber);
        }, new assert.AssertionError({ message: `Input must be an object with 'value' as a key and an integer representing the amount in satoshis as a value`, actual: false, expected: true, operator: '==' }));

        // value is infinity (string)
        const badValueUtxosString = [{ value: 'infinity' }];
        assert.throws(() => {
            sumValues(badValueUtxosString);
        }, new assert.AssertionError({ message: `Input must be an object with 'value' as a key and an integer representing the amount in satoshis as a value`, actual: false, expected: true, operator: '==' }));
    });
    it(`isToken() returns true for a stub SLP utxo from NNG chronik-client, i.e. an object with key 'slpToken'`, function () {
        assert.equal(isToken({ slpToken: {} }), true);
    });
    it(`isToken() returns true for a stub SLP utxo from in-node chronik-client, i.e. an object with key 'token'`, function () {
        assert.equal(isToken({ token: {} }), true);
    });
    it(`isToken() returns false for a stub non-SLP utxo, i.e. an object without key 'slpToken'`, function () {
        assert.equal(isToken({}), false);
    });
});
