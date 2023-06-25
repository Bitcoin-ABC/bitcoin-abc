// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
import { parseAddressForParams } from '../Ticker';

test('parseAddressForParams() returns valid info for query string based input', () => {
    const inputString =
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=500000';
    const expectedObject = {
        address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
        amount: 500000,
        queryString: 'amount=500000',
    };
    const addressInfo = parseAddressForParams(inputString);
    assert.deepEqual(addressInfo, expectedObject);
});

test('parseAddressForParams() returns no amount for a malformed query string input', () => {
    const inputString =
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?*&@^&%@amount=-500000';
    const expectedObject = {
        address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
        amount: null,
        queryString: '*&@^&%@amount=-500000',
    };
    const addressInfo = parseAddressForParams(inputString);
    assert.deepEqual(addressInfo, expectedObject);
});

test('parseAddressForParams() returns valid address info for a non-query string based input', () => {
    const inputString = 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';
    const expectedObject = {
        address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
        amount: null,
        queryString: null,
    };
    const addressInfo = parseAddressForParams(inputString);
    assert.deepEqual(addressInfo, expectedObject);
});

test('parseAddressForParams() returns valid address info for a valid prefix-less eCash address', () => {
    const inputString = 'qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';
    const expectedObject = {
        address: 'qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
        amount: null,
        queryString: null,
    };
    const addressInfo = parseAddressForParams(inputString);
    assert.deepEqual(addressInfo, expectedObject);
});
