// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { getTokenDetails } = require('../scripts/getTokenDetails');
const { mockToken } = require('../mocks/chronikResponses');

// Mock chronik
const { MockChronikClient } = require('../mocks/chronikMock');

describe('App dev example code: getTokenDetails.js', function () {
    it('getTokenDetails() correctly returns a token JSON response object', async function () {
        const tokenId =
            '861dede36f7f73f0af4e979fc3a3f77f37d53fe27be4444601150c21619635f4';

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('token', {
            input: tokenId,
            output: mockToken,
        });

        const result = await getTokenDetails(mockedChronik, tokenId);

        // Check that the token details match
        assert.deepEqual(result, mockToken);
    });

    it('getTokenDetails throws error from the chronik.token() call for an invalid token id', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const invalidTokenId =
            '861dede36f7f73f0af4e979INVALIDDDDDe4444601150c21619635f4';
        const expectedChronikError = new Error(
            `(token-txid-not-found): Token txid not found: ${invalidTokenId}`,
        );

        // Tell mockedChronik what responses we expect
        mockedChronik.setMock('token', {
            input: invalidTokenId,
            output: expectedChronikError,
        });

        await assert.rejects(
            async () => {
                await getTokenDetails(mockedChronik, invalidTokenId);
            },
            {
                name: 'Error',
                message: `(token-txid-not-found): Token txid not found: ${invalidTokenId}`,
            },
        );
    });
});
