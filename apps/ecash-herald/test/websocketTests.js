// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const cashaddr = require('ecashaddrjs');
const { initializeWebsocket } = require('../src/websocket');
const { MockChronikClient } = require('./mocks/chronikMock');

describe('ecash-herald websocket.js', async function () {
    it('initializeWebsocket returns expected websocket object for a p2pkh address', async function () {
        const wsTestAddress =
            'ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8';
        const { type, hash } = cashaddr.decode(wsTestAddress, true);
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient(wsTestAddress, []);
        const telegramBot = null;
        const channelId = null;

        const result = await initializeWebsocket(
            mockedChronik,
            wsTestAddress,
            telegramBot,
            channelId,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribe was called on expected type and hash
        assert.deepEqual(mockedChronik.wsSubscribeCalled, { type, hash });
        assert.deepEqual(result.wsResult, {
            success: true,
            address: wsTestAddress,
        });
    });
    it('initializeWebsocket returns expected websocket object for a p2sh address', async function () {
        const wsTestAddress =
            'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
        const { type, hash } = cashaddr.decode(wsTestAddress, true);
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient(wsTestAddress, []);
        const telegramBot = null;
        const channelId = null;

        const result = await initializeWebsocket(
            mockedChronik,
            wsTestAddress,
            telegramBot,
            channelId,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribe was called on expected type and hash
        assert.deepEqual(mockedChronik.wsSubscribeCalled, { type, hash });
        assert.deepEqual(result.wsResult, {
            success: true,
            address: wsTestAddress,
        });
    });
});
