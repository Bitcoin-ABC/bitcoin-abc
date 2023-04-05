// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { parseWebsocketMessage } = require('../src/websocket');

describe('alias-server websocket.js', async function () {
    it('parseWebsocketMessage correctly recognizes a call from app startup', async function () {
        const db = null;
        const telegramBot = null;
        const channelId = null;
        const wsMsg = { type: 'BlockConnected' };
        const result = await parseWebsocketMessage(
            db,
            telegramBot,
            channelId,
            wsMsg,
        );

        assert.strictEqual(
            result,
            `Alias registrations updated on app startup`,
        );
    });
    it('parseWebsocketMessage correctly recognizes a call a chronik websocket BlockConnected message', async function () {
        const db = null;
        const telegramBot = null;
        const channelId = null;
        const wsMsg = {
            type: 'BlockConnected',
            blockHash:
                '000000000000000015713b0407590ab1481fd7b8430f87e19cf768bec285ad55',
        };
        const result = await parseWebsocketMessage(
            db,
            telegramBot,
            channelId,
            wsMsg,
        );

        assert.strictEqual(
            result,
            `Alias registrations updated to block ${wsMsg.blockHash}`,
        );
    });
});
