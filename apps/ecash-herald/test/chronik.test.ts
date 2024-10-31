// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import assert from 'assert';
import { GenesisInfo } from 'chronik-client';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import {
    getTokenInfoMap,
    getAllBlockTxs,
    getBlocksAgoFromChaintipByTimestamp,
    TokenInfoMap,
} from '../src/chronik';
import {
    mockTxCalls,
    mockTokenCalls,
    bearNipTokenId,
    alitaTokenId,
    powTokenId,
    swapTxid,
} from './mocks/mockChronikCalls';

describe('chronik.js functions', function () {
    it('getTokenInfoMap returns a map of expected format given an array of tokenIds', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Tell mockedChronik what responses we expect
        // and build expected result
        const expectedTokenInfoMap: TokenInfoMap = new Map();
        mockTokenCalls.forEach((tokenInfo, tokenId) => {
            mockedChronik.setMock('token', {
                input: tokenId,
                output: tokenInfo,
            });
            expectedTokenInfoMap.set(tokenId, tokenInfo.genesisInfo);
        });
        const tokenInfoMap = await getTokenInfoMap(
            mockedChronik,
            new Set([alitaTokenId, bearNipTokenId, powTokenId]),
        );

        assert.deepEqual(tokenInfoMap, expectedTokenInfoMap);
    });
    it('getTokenInfoMap returns a map of expected format given an array of one tokenId', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const expectedTokenInfoMap: TokenInfoMap = new Map();
        // Tell mockedChronik what responses we expect
        // Also build the expected map result from these responses

        // Create a set of only one token id
        const tokenIdSet: Set<string> = new Set([alitaTokenId]);
        mockedChronik.setMock('token', {
            input: alitaTokenId,
            output: mockTokenCalls.get(alitaTokenId),
        });
        expectedTokenInfoMap.set(
            alitaTokenId,
            mockTokenCalls.get(alitaTokenId)!.genesisInfo as GenesisInfo,
        );
        const tokenInfoMap = await getTokenInfoMap(mockedChronik, tokenIdSet);

        assert.deepEqual(tokenInfoMap, expectedTokenInfoMap);
    });
    it('getTokenInfoMap returns false if there is an error in any chronik call', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const tokenIdSet = new Set([alitaTokenId, bearNipTokenId, powTokenId]);
        // Tell mockedChronik what responses we expect
        // Include one error response
        mockedChronik.setMock('tx', {
            input: alitaTokenId,
            output: mockTxCalls.get(alitaTokenId),
        });
        mockedChronik.setMock('tx', {
            input: bearNipTokenId,
            output: mockTxCalls.get(bearNipTokenId),
        });
        mockedChronik.setMock('tx', {
            input: powTokenId,
            output: new Error('some error'),
        });

        const tokenInfoMap = await getTokenInfoMap(mockedChronik, tokenIdSet);

        assert.strictEqual(tokenInfoMap, false);
    });
    it('getTokenInfoMap returns false if one of the tokenIds in the set is not actually a tokenId', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const setWithNonToken = new Set([alitaTokenId, swapTxid]);
        // Tell mockedChronik what responses we expect
        // Include one error response
        mockedChronik.setMock('tx', {
            input: alitaTokenId,
            output: mockTxCalls.get(alitaTokenId),
        });
        mockedChronik.setMock('tx', {
            input: swapTxid,
            output: mockTxCalls.get(swapTxid),
        });

        const tokenInfoMap = await getTokenInfoMap(
            mockedChronik,
            setWithNonToken,
        );

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
