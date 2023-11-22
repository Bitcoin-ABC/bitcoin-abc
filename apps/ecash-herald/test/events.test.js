// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const config = require('../config');
const unrevivedBlock = require('./mocks/block');
const { jsonReviver, getCoingeckoApiUrl } = require('../src/utils');
const block = JSON.parse(JSON.stringify(unrevivedBlock), jsonReviver);
const cashaddr = require('ecashaddrjs');
const recentStakersApiResponse = require('../test/mocks/recentStakersApiResponse');

const { handleBlockConnected } = require('../src/events');
const { MockChronikClient } = require('../../mock-chronik-client');
const { MockTelegramBot, mockChannelId } = require('./mocks/telegramBotMock');

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

describe('ecash-herald events.js', async function () {
    it('handleBlockConnected creates and sends a telegram msg with price and token send info for mocked block if api call succeeds', async function () {
        // Initialize new chronik mock for each block
        const mockedChronik = new MockChronikClient();
        const thisBlock = block;
        const thisBlockHash = thisBlock.blockDetails.blockInfo.hash;
        const thisBlockChronikBlockResponse = thisBlock.blockDetails;

        // Tell mockedChronik what response we expect for chronik.script(type, hash).utxos
        const { outputScriptInfoMap } = thisBlock;
        outputScriptInfoMap.forEach((info, outputScript) => {
            let { type, hash } =
                cashaddr.getTypeAndHashFromOutputScript(outputScript);
            type = type.toLowerCase();
            const { utxos } = info;
            mockedChronik.setScript(type, hash);
            mockedChronik.setUtxos(type, hash, utxos);
        });

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setMock('block', {
            input: thisBlockHash,
            output: thisBlockChronikBlockResponse,
        });

        // Tell mockedChronik what response we expect for chronik.tx
        const { parsedBlock, tokenInfoMap } = thisBlock;
        const { tokenIds } = parsedBlock;
        // Will only have chronik call if the set is not empty
        if (tokenIds.size > 0) {
            // Instead of saving all the chronik responses as mocks, which would be very large
            // Just set them as mocks based on tokenInfoMap, which contains the info we need
            tokenIds.forEach(tokenId => {
                mockedChronik.setMock('tx', {
                    input: tokenId,
                    output: {
                        slpTxData: {
                            genesisInfo: tokenInfoMap.get(tokenId),
                        },
                    },
                });
            });
        }

        const thisBlockExpectedMsgs = thisBlock.blockSummaryTgMsgs;

        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        // Mock coingecko price response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        const mockResult = thisBlock.coingeckoResponse;

        // Mock a successful API request
        mock.onGet(getCoingeckoApiUrl(config)).reply(200, mockResult);

        // Mock successful peername request
        mock.onGet(config.stakerPeerApi).reply(200, recentStakersApiResponse);

        const result = await handleBlockConnected(
            mockedChronik,
            telegramBot,
            channelId,
            thisBlockHash,
        );

        // Check that sendMessage was called successfully
        assert.strictEqual(telegramBot.messageSent, true);

        // Build expected array of successful msg returns
        let msgSuccessArray = [];
        for (let i = 0; i < thisBlockExpectedMsgs.length; i += 1) {
            msgSuccessArray.push({
                success: true,
                channelId,
                msg: thisBlockExpectedMsgs[i],
                options: config.tgMsgOptions,
            });
        }

        // Check that the correct msg info was sent
        assert.deepEqual(result, msgSuccessArray);
    });
    it('handleBlockConnected creates and sends a telegram msg without price or token info for mocked block if api calls fail', async function () {
        const thisBlock = block;
        const thisBlockHash = thisBlock.blockDetails.blockInfo.hash;
        const thisBlockChronikBlockResponse = thisBlock.blockDetails;

        // Initialize chronik mock for each block
        const mockedChronik = new MockChronikClient();

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setMock('block', {
            input: thisBlockHash,
            output: thisBlockChronikBlockResponse,
        });
        // Tell mockedChronik what response we expect for chronik.tx
        const { parsedBlock, tokenInfoMap } = thisBlock;
        const { tokenIds } = parsedBlock;
        // Will only have chronik call if the set is not empty
        if (tokenIds.size > 0) {
            // Instead of saving all the chronik responses as mocks, which would be very large
            // Just set them as mocks based on tokenInfoMap, which contains the info we need
            let index = 0;
            tokenIds.forEach(tokenId => {
                // If this is the first one, set an error response
                if (index === 0) {
                    mockedChronik.setMock('tx', {
                        input: tokenId,
                        output: new Error('some error'),
                    });
                } else {
                    index += 1;
                    mockedChronik.setMock('tx', {
                        input: tokenId,
                        output: {
                            slpTxData: {
                                genesisInfo: tokenInfoMap.get(tokenId),
                            },
                        },
                    });
                }
            });
        }
        const thisBlockExpectedMsgs = thisBlock.blockSummaryTgMsgsApiFailure;

        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        // Mock coingecko price response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a failed API request
        mock.onGet(getCoingeckoApiUrl(config)).reply(500, { error: 'error' });
        // Mock failed staker peerName API request
        mock.onGet(config.stakerPeerApi).reply(500, { error: 'some error' });

        const result = await handleBlockConnected(
            mockedChronik,
            telegramBot,
            channelId,
            thisBlockHash,
        );

        // Check that sendMessage was called successfully
        assert.strictEqual(telegramBot.messageSent, true);

        // Build expected array of successful msg returns
        let msgSuccessArray = [];
        for (let i = 0; i < thisBlockExpectedMsgs.length; i += 1) {
            msgSuccessArray.push({
                success: true,
                channelId,
                msg: thisBlockExpectedMsgs[i],
                options: config.tgMsgOptions,
            });
        }

        // Check that the correct msg info was sent
        assert.deepEqual(result, msgSuccessArray);
    });
    it('handleBlockConnected sends desired backup msg if it encounters an error in message creation', async function () {
        // Initialize new chronik mock for each block
        const mockedChronik = new MockChronikClient();
        const thisBlock = block;
        const thisBlockHash = thisBlock.blockDetails.blockInfo.hash;

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setMock('block', {
            input: thisBlockHash,
            output: null,
        });

        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const result = await handleBlockConnected(
            mockedChronik,
            telegramBot,
            channelId,
            thisBlockHash,
        );

        // Check that sendMessage was called successfully
        assert.strictEqual(telegramBot.messageSent, true);

        // Expect the backup msg
        const expectedMsg = `New Block Found\n\n${thisBlockHash}\n\n<a href="https://explorer.e.cash/block/${thisBlockHash}">explorer</a>`;

        // Check that the correct msg info was sent
        assert.deepEqual(result, {
            success: true,
            channelId,
            msg: expectedMsg,
            options: config.tgMsgOptions,
        });
    });
    it('handleBlockConnected returns false if it encounters an error in telegram bot sendMessage routine', async function () {
        const wsTestAddress =
            'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';

        // Initialize new chronik mock for each block
        const mockedChronik = new MockChronikClient(wsTestAddress, []);

        const thisBlock = block;
        const thisBlockHash = thisBlock.blockDetails.blockInfo.hash;
        const thisBlockChronikBlockResponse = thisBlock.blockDetails;

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setMock('block', {
            input: thisBlockHash,
            output: thisBlockChronikBlockResponse,
        });

        // Tell mockedChronik what response we expect for chronik.tx
        const { parsedBlock, tokenInfoMap } = thisBlock;
        const { tokenIds } = parsedBlock;
        // Will only have chronik call if the set is not empty
        if (tokenIds.size > 0) {
            // Instead of saving all the chronik responses as mocks, which would be very large
            // Just set them as mocks based on tokenInfoMap, which contains the info we need
            let index = 0;
            tokenIds.forEach(tokenId => {
                // If this is the first one, set an error response
                if (index === 0) {
                    mockedChronik.setMock('tx', {
                        input: tokenId,
                        output: new Error('some error'),
                    });
                } else {
                    index += 1;
                    mockedChronik.setMock('tx', {
                        input: tokenId,
                        output: {
                            slpTxData: {
                                genesisInfo: tokenInfoMap.get(tokenId),
                            },
                        },
                    });
                }
            });
        }

        const telegramBot = new MockTelegramBot();
        telegramBot.setExpectedError(
            'sendMessage',
            'Error: message failed to send',
        );
        const channelId = mockChannelId;

        const result = await handleBlockConnected(
            mockedChronik,
            telegramBot,
            channelId,
            thisBlockHash,
        );

        // Check that the correct msg info was sent
        assert.deepEqual(result, false);
    });
});
