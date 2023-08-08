// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { listenForConfirmation } = require('../scripts/listenForConfirmation');
const { MockChronikClient } = require('../mocks/chronikMock');

describe('App dev example code: listenForConfirmation.js', function () {
    it('listenForConfirmation() successfully processes a txid confirmation event', async function () {
        // Initialize mock chronik
        const address = 'ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8';
        const txid =
            'f7d71433af9a4e0081ea60349becf2a60efed8890df7c3e8e079b3427f51d5ea';
        const mockedChronik = new MockChronikClient();

        // Create websocket subscription
        await listenForConfirmation(mockedChronik, address, txid);

        // Mock the 'Confirmed' ws event
        const wsMsg = {
            type: 'Confirmed',
            txid: txid,
        };
        // Tell mockedChronik what response we expect
        mockedChronik.setMock('ws', {
            output: wsMsg,
        });
        mockedChronik.wsClose();

        // Verify subscription functions were called
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        assert.strictEqual(mockedChronik.wsSubscribeCalled, true);
        assert.strictEqual(mockedChronik.manuallyClosed, true);

        // Verify ws confirmation event on the given txid
        assert.strictEqual(mockedChronik.mockedResponses.ws.type, 'Confirmed');
        assert.strictEqual(mockedChronik.mockedResponses.ws.txid, txid);
    });
});
