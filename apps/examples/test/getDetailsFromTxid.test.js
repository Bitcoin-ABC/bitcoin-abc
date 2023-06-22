// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { getDetailsFromTxid } = require('../scripts/getDetailsFromTxid');
const { tx } = require('../mocks/chronikResponses');

// Mock chronik
const { MockChronikClient } = require('../mocks/chronikMock');

describe('App dev example code: getDetailsFromTxidTests.js', function () {
    it('getDetailsFromTxid() takes in a chronik instance and txid and correctly returns a tx JSON response object', async function () {
        const txid =
            '816d32c855e40c4221482eb85390a72ba0906360197c297a787125e6979e674e';

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('tx', {
            input: txid,
            output: tx[txid],
        });

        const result = await getDetailsFromTxid(mockedChronik, txid);

        // Check that the tx details match
        assert.deepEqual(result, tx[txid]);
    });

    it('getDetailsFromTxid() takes in a chronik instance and an eToken id as txid and correctly returns a tx JSON response object', async function () {
        const eTokenId =
            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa';

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('tx', {
            input: eTokenId,
            output: tx[eTokenId],
        });

        const result = await getDetailsFromTxid(mockedChronik, eTokenId);

        // Check that the tx details match
        assert.deepEqual(result, tx[eTokenId]);
    });

    it('getDetailsFromTxid throws error from the chronik.tx() call for an invalid txid', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const invalidTxid =
            '40d3da44d497a52b87495e2edabafb178365d715f69c76a09ca376b17f641311';
        const expectedChronikError = new Error(
            `(tx-not-found): Txid not found: ${invalidTxid}`,
        );

        // Tell mockedChronik what responses we expect
        mockedChronik.setMock('tx', {
            input: invalidTxid,
            output: expectedChronikError,
        });

        let errorThrown;
        try {
            await getDetailsFromTxid(mockedChronik, invalidTxid);
        } catch (err) {
            errorThrown = err;
        }

        // Check the chronik exception is thrown
        assert.deepEqual(errorThrown, expectedChronikError);
    });
});
