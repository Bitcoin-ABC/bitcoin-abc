// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { initializeWebsocket } = require('../../src/chronik/wsHandler');
const { MockChronikClient } = require('../../../mock-chronik-client');

describe('chronik/wsHandler.js', async function () {
    it('initializeWebsocket returns expected websocket object', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const result = await initializeWebsocket(mockedChronik);

        // Confirm websocket opened
        assert.equal(mockedChronik.wsWaitForOpenCalled, true);

        // Confirm we have subscribed to blocks
        assert.equal(result.isSubscribedBlocks, true);

        // Confirm onMessage has been set
        assert.strictEqual(typeof result.onMessage, 'function');
    });
});
