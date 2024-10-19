// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { MockChronikClient } = require('../../../modules/mock-chronik-client');
const {
    getTokenInfoMap,
    getAllBlockTxs,
    getBlocksAgoFromChaintipByTimestamp,
} = require('../src/chronik');
const { tx } = require('./mocks/chronikResponses');
// Initialize chronik on app startup

const TOKEN_ID_SET = new Set([
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109', // BearNip
    'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a', // POW
    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484', // Alita
]);
const TOKEN_INFO = new Map();
TOKEN_INFO.set(
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
    {
        tokenId:
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: 0,
        genesisInfo: {
            tokenTicker: 'BEAR',
            tokenName: 'BearNip',
            url: 'https://cashtab.com/',
            decimals: 0,
            hash: '',
        },
        block: {
            height: 782665,
            hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
            timestamp: 1678408305,
        },
    },
);
TOKEN_INFO.set(
    'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
    {
        tokenId:
            'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: 0,
        genesisInfo: {
            tokenTicker: 'POW',
            tokenName: 'ProofofWriting.com Token',
            url: 'https://www.proofofwriting.com/26',
            decimals: 0,
            hash: '',
        },
        block: {
            height: 685949,
            hash: '0000000000000000436e71d5291d2fb067decc838dcb85a99ff6da1d28b89fad',
            timestamp: 1620712051,
        },
    },
);
TOKEN_INFO.set(
    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
    {
        tokenId:
            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: 0,
        genesisInfo: {
            tokenTicker: 'Alita',
            tokenName: 'Alita',
            url: 'alita.cash',
            decimals: 4,
            hash: '',
        },
        block: {
            height: 756373,
            hash: '00000000000000000d62f1b66c08f0976bcdec2f08face2892ae4474b50100d9',
            timestamp: 1662611972,
        },
    },
);

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
            mockedChronik.setMock('token', {
                input: tokenId,
                output: TOKEN_INFO.get(tokenId),
            });
            expectedTokenInfoMap.set(
                tokenId,
                TOKEN_INFO.get(tokenId).genesisInfo,
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
        mockedChronik.setMock('token', {
            input: thisTokenId,
            output: TOKEN_INFO.get(thisTokenId),
        });
        expectedTokenInfoMap.set(
            thisTokenId,
            TOKEN_INFO.get(thisTokenId).genesisInfo,
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
    it('getAllBlockTxs can get all block txs if a block has only one page of txs', async function () {
        const MOCK_HEIGHT = 800000;
        const MOCK_TXS = [
            { txid: '1' },
            { txid: '2' },
            { txid: '3' },
            { txid: '4' },
            { txid: '5' },
        ];
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        mockedChronik.setTxHistoryByBlock(MOCK_HEIGHT, MOCK_TXS);
        const txsInBlock = await getAllBlockTxs(mockedChronik, MOCK_HEIGHT);
        assert.deepEqual(txsInBlock, MOCK_TXS);
    });
    it('getAllBlockTxs can get all block txs if a block has more than one page of txs', async function () {
        const MOCK_HEIGHT = 800000;
        const MOCK_TXS = [
            { txid: '1' },
            { txid: '2' },
            { txid: '3' },
            { txid: '4' },
            { txid: '5' },
            { txid: '6' },
            { txid: '7' },
            { txid: '8' },
            { txid: '9' },
            { txid: '10' },
        ];
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        mockedChronik.setTxHistoryByBlock(MOCK_HEIGHT, MOCK_TXS);
        // Call with pageSize smaller than tx size
        const txsInBlock = await getAllBlockTxs(mockedChronik, MOCK_HEIGHT, 2);
        assert.deepEqual(txsInBlock, MOCK_TXS);
    });
    it('getBlocksAgoFromChaintipByTimestamp will get start and end blockheights for a given timestamp and window if we have fewer than expected blocks in that window', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Mock the chaintip
        const mockChaintip = 800000;
        mockedChronik.setMock('blockchainInfo', {
            output: { tipHeight: mockChaintip },
        });

        // Arbitrary timestamp to test
        const now = 17290290190;

        // Test for 24 hour window
        const SECONDS_PER_DAY = 86400;
        const secondsAgo = SECONDS_PER_DAY;

        const SECONDS_PER_BLOCK = 600;
        const guessedBlockheight =
            mockChaintip - secondsAgo / SECONDS_PER_BLOCK;

        // Guessed block is older than secondsAgo
        mockedChronik.setMock('block', {
            input: guessedBlockheight,
            output: { blockInfo: { timestamp: now - secondsAgo - 1 } },
        });

        // Set 2 newer blocks
        // So this one, at guessedBlockheight + 1, is in the window
        const expectedStartBlockheight = guessedBlockheight + 1;
        mockedChronik.setMock('block', {
            input: expectedStartBlockheight,
            output: { blockInfo: { timestamp: now - secondsAgo + 2 } },
        });
        mockedChronik.setMock('block', {
            input: guessedBlockheight + 2,
            output: { blockInfo: { timestamp: now - secondsAgo + 3 } },
        });

        assert.deepEqual(
            await getBlocksAgoFromChaintipByTimestamp(
                mockedChronik,
                now,
                secondsAgo,
            ),
            {
                chaintip: mockChaintip,
                startBlockheight: expectedStartBlockheight,
            },
        );
    });
    it('getBlocksAgoFromChaintipByTimestamp will get start and end blockheights for a given timestamp and window if we have more than expected blocks in that window', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Mock the chaintip
        const mockChaintip = 800000;
        mockedChronik.setMock('blockchainInfo', {
            output: { tipHeight: mockChaintip },
        });

        // Arbitrary timestamp to test
        const now = 17290290190;

        // Test for 24 hour window
        const SECONDS_PER_DAY = 86400;
        const secondsAgo = SECONDS_PER_DAY;

        const SECONDS_PER_BLOCK = 600;
        const guessedBlockheight =
            mockChaintip - secondsAgo / SECONDS_PER_BLOCK;

        // Guessed block is NEWER than secondsAgo
        mockedChronik.setMock('block', {
            input: guessedBlockheight,
            output: { blockInfo: { timestamp: now - secondsAgo + 5 } },
        });

        // Set 3 older blocks, with 1 still in the window
        const expectedStartBlockheight = guessedBlockheight - 1;
        mockedChronik.setMock('block', {
            input: expectedStartBlockheight,
            output: { blockInfo: { timestamp: now - secondsAgo + 4 } },
        });
        // Since this block is out of the window, we expect the start height to be proceeding block
        mockedChronik.setMock('block', {
            input: guessedBlockheight - 2,
            output: { blockInfo: { timestamp: now - secondsAgo - 3 } },
        });

        assert.deepEqual(
            await getBlocksAgoFromChaintipByTimestamp(
                mockedChronik,
                now,
                secondsAgo,
            ),
            {
                chaintip: mockChaintip,
                startBlockheight: expectedStartBlockheight,
            },
        );
    });
    it('getBlocksAgoFromChaintipByTimestamp will get start and end blockheights for a given timestamp and window if we have exactly the expected blocks in that window', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Mock the chaintip
        const mockChaintip = 800000;
        mockedChronik.setMock('blockchainInfo', {
            output: { tipHeight: mockChaintip },
        });

        // Arbitrary timestamp to test
        const now = 17290290190;

        // Test for 24 hour window
        const SECONDS_PER_DAY = 86400;
        const secondsAgo = SECONDS_PER_DAY;

        const SECONDS_PER_BLOCK = 600;
        const guessedBlockheight =
            mockChaintip - secondsAgo / SECONDS_PER_BLOCK;

        // Guessed block is exactly secondsAgo
        mockedChronik.setMock('block', {
            input: guessedBlockheight,
            output: { blockInfo: { timestamp: now - secondsAgo } },
        });

        // Set 1 older block
        mockedChronik.setMock('block', {
            input: guessedBlockheight - 1,
            output: { blockInfo: { timestamp: now - secondsAgo - 1 } },
        });

        assert.deepEqual(
            await getBlocksAgoFromChaintipByTimestamp(
                mockedChronik,
                now,
                secondsAgo,
            ),
            {
                chaintip: mockChaintip,
                startBlockheight: guessedBlockheight,
            },
        );
    });
    it('getBlocksAgoFromChaintipByTimestamp will throw expected error if we cannot find startHeight in more than 200 guesses of more recent blocks', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Mock the chaintip
        const mockChaintip = 800000;
        mockedChronik.setMock('blockchainInfo', {
            output: { tipHeight: mockChaintip },
        });

        // Arbitrary timestamp to test
        const now = 17290290190;

        // Test for 24 hour window
        const SECONDS_PER_DAY = 86400;
        const secondsAgo = SECONDS_PER_DAY;

        const SECONDS_PER_BLOCK = 600;
        const guessedBlockheight =
            mockChaintip - secondsAgo / SECONDS_PER_BLOCK;

        // Guessed block is older than secondsAgo
        mockedChronik.setMock('block', {
            input: guessedBlockheight,
            output: { blockInfo: { timestamp: now - secondsAgo - 1 } },
        });

        // Set 100 newer blocks, all of them still outside the window
        for (let i = 0; i < 200; i += 1) {
            mockedChronik.setMock('block', {
                input: guessedBlockheight + 1 + i,
                output: { blockInfo: { timestamp: now - secondsAgo - 1 } },
            });
        }

        await assert.rejects(
            async () => {
                await getBlocksAgoFromChaintipByTimestamp(
                    mockedChronik,
                    now,
                    secondsAgo,
                );
            },
            {
                name: 'Error',
                message: 'Start block more than 200 off our original guess',
            },
        );
    });
    it('getBlocksAgoFromChaintipByTimestamp will throw expected error if we cannot find startHeight in more than 200 guesses of older blocks', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Mock the chaintip
        const mockChaintip = 800000;
        mockedChronik.setMock('blockchainInfo', {
            output: { tipHeight: mockChaintip },
        });

        // Arbitrary timestamp to test
        const now = 17290290190;

        // Test for 24 hour window
        const SECONDS_PER_DAY = 86400;
        const secondsAgo = SECONDS_PER_DAY;

        const SECONDS_PER_BLOCK = 600;
        const guessedBlockheight =
            mockChaintip - secondsAgo / SECONDS_PER_BLOCK;

        // Guessed block is newer than secondsAgo, i.e. within the window
        mockedChronik.setMock('block', {
            input: guessedBlockheight,
            output: { blockInfo: { timestamp: now - secondsAgo + 5 } },
        });

        // Set 200 older blocks, all of them still within the window
        for (let i = 0; i < 200; i += 1) {
            mockedChronik.setMock('block', {
                input: guessedBlockheight - 1 - i,
                output: { blockInfo: { timestamp: now - secondsAgo + 5 } },
            });
        }

        await assert.rejects(
            async () => {
                await getBlocksAgoFromChaintipByTimestamp(
                    mockedChronik,
                    now,
                    secondsAgo,
                );
            },
            {
                name: 'Error',
                message: 'Start block more than 200 off our original guess',
            },
        );
    });
});
