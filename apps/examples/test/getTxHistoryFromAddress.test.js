// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const {
    getTxHistoryFromAddress,
} = require('../scripts/getTxHistoryFromAddress');
const { txHistoryMock } = require('../mocks/chronikResponses');
const ecashaddr = require('ecashaddrjs');

// Mock chronik
const { MockChronikClient } = require('../mocks/chronikMock');

describe('App dev example code: getTxHistoryFromAddress.js', async function () {
    it('getTxHistoryFromAddress() correctly returns a tx history JSON response object', async function () {
        const address = 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';

        // Initialize chronik mock with a mocked tx history
        const mockedChronik = new MockChronikClient(address, txHistoryMock.txs);

        // Set the script
        const { type, hash } = ecashaddr.decode(address, true);
        mockedChronik.setScript(type, hash);

        // Set the mock tx history
        mockedChronik.setTxHistory(txHistoryMock.txs);

        const txHistory = await getTxHistoryFromAddress(
            mockedChronik,
            address,
            0,
            5,
        );

        // Check that the tx histories match
        assert.deepEqual(txHistory.txs, txHistoryMock.txs);
    });
    it('getTxHistoryFromAddress returns an empty tx history array from the chronik.script().history() call for an invalid page index', async function () {
        const address = 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Set the script
        const { type, hash } = ecashaddr.decode(address, true);
        mockedChronik.setScript(type, hash);

        // Set the empty history response
        mockedChronik.setTxHistory([]);

        const invalidPageIndex = 999999999;
        const txHistory = await getTxHistoryFromAddress(
            mockedChronik,
            address,
            invalidPageIndex,
            5,
        );
        assert.deepEqual(txHistory.txs, []);
    });
});
