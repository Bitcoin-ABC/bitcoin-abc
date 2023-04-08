// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const cashaddr = require('ecashaddrjs');
const {
    initializeWebsocket,
    parseWebsocketMessage,
} = require('../src/websocket');
const { MockChronikClient } = require('./mocks/chronikMock');

describe('alias-server websocket.js', async function () {
    it('initializeWebsocket returns expected websocket object for a p2pkh address', async function () {
        const wsTestAddress =
            'ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8';
        const { type, hash } = cashaddr.decode(wsTestAddress, true);
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient(wsTestAddress, []);
        const db = null;
        const telegramBot = null;
        const channelId = null;

        const result = await initializeWebsocket(
            mockedChronik,
            wsTestAddress,
            db,
            telegramBot,
            channelId,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribe was called
        assert.deepEqual(mockedChronik.wsSubscribeCalled, true);
        // Confirm ws is subscribed to expected type and hash
        assert.deepEqual(result._subs, [
            { scriptType: type, scriptPayload: hash },
        ]);
    });
    it('initializeWebsocket returns expected websocket object for a p2sh address', async function () {
        const wsTestAddress =
            'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
        const { type, hash } = cashaddr.decode(wsTestAddress, true);
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const db = null;
        const telegramBot = null;
        const channelId = null;

        const result = await initializeWebsocket(
            mockedChronik,
            wsTestAddress,
            db,
            telegramBot,
            channelId,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribe was called
        assert.deepEqual(mockedChronik.wsSubscribeCalled, true);
        // Confirm ws is subscribed to expected type and hash
        assert.deepEqual(result._subs, [
            { scriptType: type, scriptPayload: hash },
        ]);
    });
    it('parseWebsocketMessage correctly processes a chronik websocket BlockConnected message', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const db = null;
        const telegramBot = null;
        const channelId = null;
        const wsMsg = {
            type: 'BlockConnected',
            blockHash:
                '000000000000000015713b0407590ab1481fd7b8430f87e19cf768bec285ad55',
        };
        const mockBlock = {
            blockInfo: {
                height: 786878,
            },
        };
        // Tell mockedChronik what response we expect
        mockedChronik.setMock('block', {
            input: wsMsg.blockHash,
            output: mockBlock,
        });
        const result = await parseWebsocketMessage(
            mockedChronik,
            db,
            telegramBot,
            channelId,
            wsMsg,
        );

        assert.strictEqual(
            result,
            `Alias registrations updated to block ${wsMsg.blockHash} at height ${mockBlock.blockInfo.height}`,
        );
    });
});
