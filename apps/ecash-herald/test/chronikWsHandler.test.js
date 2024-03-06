// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const config = require('../config');
const cashaddr = require('ecashaddrjs');
const unrevivedBlock = require('./mocks/block');
const { jsonReviver, getCoingeckoApiUrl } = require('../src/utils');
const block = JSON.parse(JSON.stringify(unrevivedBlock), jsonReviver);
const {
    initializeWebsocket,
    parseWebsocketMessage,
} = require('../src/chronikWsHandler');
const { MockChronikClient } = require('../../../modules/mock-chronik-client');
const { MockTelegramBot, mockChannelId } = require('./mocks/telegramBotMock');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const recentStakersApiResponse = require('../test/mocks/recentStakersApiResponse');

describe('ecash-herald chronikWsHandler.js', async function () {
    it('initializeWebsocket returns expected websocket object for a p2pkh address', async function () {
        const wsTestAddress =
            'ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8';
        const { type, hash } = cashaddr.decode(wsTestAddress, true);
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const result = await initializeWebsocket(
            mockedChronik,
            wsTestAddress,
            telegramBot,
            channelId,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribe was called on expected type and hash
        assert.deepEqual(mockedChronik.wsSubscribeCalled, true);
        assert.deepEqual(result.subs, [
            { scriptType: type, scriptPayload: hash },
        ]);
    });
    it('initializeWebsocket returns expected websocket object for a p2sh address', async function () {
        const wsTestAddress =
            'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
        const { type, hash } = cashaddr.decode(wsTestAddress, true);
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const result = await initializeWebsocket(
            mockedChronik,
            wsTestAddress,
            telegramBot,
            channelId,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribe was called on expected type and hash
        assert.deepEqual(mockedChronik.wsSubscribeCalled, true);
        assert.deepEqual(result.subs, [
            { scriptType: type, scriptPayload: hash },
        ]);
    });
    it('parseWebsocketMessage returns false for a msg other than BlockConnected', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const thisBlock = block;
        const thisBlockHash = thisBlock.blockDetails.blockInfo.hash;
        const thisBlockChronikBlockResponse = thisBlock.blockDetails;

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setMock('block', {
            input: thisBlockHash,
            output: thisBlockChronikBlockResponse,
        });

        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const unsupportedWebsocketMsgs = [
            {
                type: 'AddedToMempool',
            },
            {
                type: 'Confirmed',
            },
            {
                type: 'SomeUnknownType',
            },
        ];

        for (let i = 0; i < unsupportedWebsocketMsgs.length; i += 1) {
            const thisUnsupportedMsg = unsupportedWebsocketMsgs[i];
            const result = await parseWebsocketMessage(
                mockedChronik,
                thisUnsupportedMsg,
                telegramBot,
                channelId,
            );

            // Check that sendMessage was not called
            assert.strictEqual(telegramBot.messageSent, false);

            assert.deepEqual(result, false);
        }
    });
    it('parseWebsocketMessage creates and sends a telegram msg with prices and token send info for mocked block on successful API calls', async function () {
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

        // Mock a chronik websocket msg of correct format
        const mockWsMsg = {
            type: 'BlockConnected',
            blockHash: thisBlockHash,
        };
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
        mock.onGet(config.stakerPeerApi).reply(200, recentStakersApiResponse);

        const result = await parseWebsocketMessage(
            mockedChronik,
            mockWsMsg,
            telegramBot,
            channelId,
        );

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
    it('parseWebsocketMessage creates and sends a telegram msg without prices or token send info for mocked block on failed API calls', async function () {
        // Initialize new chronik mock for each block
        const mockedChronik = new MockChronikClient();
        const thisBlock = block;
        const thisBlockHash = thisBlock.blockDetails.blockInfo.hash;
        const thisBlockChronikBlockResponse = thisBlock.blockDetails;

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setMock('block', {
            input: thisBlockHash,
            output: thisBlockChronikBlockResponse,
        }); // Tell mockedChronik what response we expect for chronik.tx
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

        // Mock a chronik websocket msg of correct format
        const mockWsMsg = {
            type: 'BlockConnected',
            blockHash: thisBlockHash,
        };
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        // Mock coingecko price response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a failed API request
        mock.onGet(getCoingeckoApiUrl(config)).reply(500, { error: 'error' });
        mock.onGet(config.stakerPeerApi).reply(500, { error: 'some error' });

        const result = await parseWebsocketMessage(
            mockedChronik,
            mockWsMsg,
            telegramBot,
            channelId,
        );

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

        // Check that sendMessage was called successfully
        assert.strictEqual(telegramBot.messageSent, true);

        // Check that the correct msg info was sent
        assert.deepEqual(result, msgSuccessArray);
    });
    it('parseWebsocketMessage returns false if telegram msg fails to send', async function () {
        // Initialize new chronik mock for each block
        const mockedChronik = new MockChronikClient();

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

        // Mock a chronik websocket msg of correct format
        const mockWsMsg = {
            type: 'BlockConnected',
            blockHash: thisBlockHash,
        };
        const telegramBot = new MockTelegramBot();
        telegramBot.setExpectedError(
            'sendMessage',
            'Error: message failed to send',
        );
        const channelId = mockChannelId;

        const result = await parseWebsocketMessage(
            mockedChronik,
            mockWsMsg,
            telegramBot,
            channelId,
        );

        // Check that the function returns false
        assert.strictEqual(result, false);
    });
});
