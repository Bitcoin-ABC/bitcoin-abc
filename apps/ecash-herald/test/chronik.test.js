// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { MockChronikClient } = require('mock-chronik-client');
const { getTokenInfoMap } = require('../src/chronik');
const { tx } = require('./mocks/chronikResponses');
// Initialize chronik on app startup

const TOKEN_ID_SET = new Set([
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109', // BearNip
    'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a', // POW
    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484', // Alita
]);

const TOKEN_ID_SET_BUGGED = new Set([
    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484', // Alita
    '3ce19774ed20535458bb98e864168e6d7d0a68e80f166a7fb00bc9015980ce6d', // SWaP tx
]);

describe('chronik.js functions', function () {
    it('getTokenInfoMap returns a map of expected format given an array of tokenIds', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const expectedTokenInfoMap = new Map();
        // Tell mockedChronik what responses we expect
        // Also build the expected map result from these responses
        TOKEN_ID_SET.forEach(tokenId => {
            mockedChronik.setMock('tx', {
                input: tokenId,
                output: tx[tokenId],
            });
            expectedTokenInfoMap.set(
                tokenId,
                tx[tokenId].slpTxData.genesisInfo,
            );
        });
        const tokenInfoMap = await getTokenInfoMap(mockedChronik, TOKEN_ID_SET);

        assert.deepEqual(tokenInfoMap, expectedTokenInfoMap);
    });
    it('getTokenInfoMap returns a map of expected format given an array of one tokenId', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const expectedTokenInfoMap = new Map();
        // Tell mockedChronik what responses we expect
        // Also build the expected map result from these responses

        // Create a set of only one token id
        const thisTokenId = TOKEN_ID_SET.values().next().value;
        const tokenIdSet = new Set();
        tokenIdSet.add(thisTokenId);
        mockedChronik.setMock('tx', {
            input: thisTokenId,
            output: tx[thisTokenId],
        });
        expectedTokenInfoMap.set(
            thisTokenId,
            tx[thisTokenId].slpTxData.genesisInfo,
        );
        const tokenInfoMap = await getTokenInfoMap(mockedChronik, tokenIdSet);

        assert.deepEqual(tokenInfoMap, expectedTokenInfoMap);
    });
    it('getTokenInfoMap returns false if there is an error in any chronik call', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const TOKEN_ID_ARRAY = Array.from(TOKEN_ID_SET);
        // Tell mockedChronik what responses we expect
        // Include one error response
        mockedChronik.setMock('tx', {
            input: TOKEN_ID_ARRAY[0],
            output: tx[TOKEN_ID_ARRAY[0]],
        });
        mockedChronik.setMock('tx', {
            input: TOKEN_ID_ARRAY[1],
            output: tx[TOKEN_ID_ARRAY[1]],
        });
        mockedChronik.setMock('tx', {
            input: TOKEN_ID_ARRAY[2],
            output: new Error('some error'),
        });

        const tokenInfoMap = await getTokenInfoMap(mockedChronik, TOKEN_ID_SET);

        assert.strictEqual(tokenInfoMap, false);
    });
    it('getTokenInfoMap returns false if one of the tokenIds in the set is not actually a tokenId', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const TOKEN_ID_ARRAY = Array.from(TOKEN_ID_SET_BUGGED);
        // Tell mockedChronik what responses we expect
        // Include one error response
        mockedChronik.setMock('tx', {
            input: TOKEN_ID_ARRAY[0],
            output: tx[TOKEN_ID_ARRAY[0]],
        });
        mockedChronik.setMock('tx', {
            input: TOKEN_ID_ARRAY[1],
            output: tx[TOKEN_ID_ARRAY[1]],
        });

        const tokenInfoMap = await getTokenInfoMap(mockedChronik, TOKEN_ID_SET);

        assert.strictEqual(tokenInfoMap, false);
    });
});
