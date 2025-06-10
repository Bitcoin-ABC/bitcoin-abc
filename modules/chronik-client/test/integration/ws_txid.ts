// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import { ChronikClient, WsEndpoint, WsMsgClient } from '../../index';
import initializeTestRunner, {
    cleanupMochaRegtest,
    expectWsMsgs,
    setMochaTimeout,
    TestInfo,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

/**
 * ws_txid.ts
 *
 * Tests for ws.subscribeToTxid
 *
 * Note that avalanche finalized msgs for this feature are tested in
 * websockets.ts; txids are not deterministic for that script, so
 * it is not practical to test subscribing to a txid before it is
 * added to a mempool in that script
 */

describe('Test expected websocket behavior of chronik-client when subscribing to a websocket', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;

    const statusEvent = new EventEmitter();
    // Collect websocket msgs in an array for analysis in each step
    let msgCollector: Array<WsMsgClient> = [];
    let get_test_info: Promise<TestInfo>;
    let chronikUrl: string[];
    let setupScriptTermination: ReturnType<typeof setTimeout>;

    before(async function () {
        // Initialize testRunner before mocha tests
        testRunner = initializeTestRunner(testName, statusEvent);

        // Handle IPC messages from the setup script
        testRunner.on('message', function (message: any) {
            if (message && message.test_info) {
                get_test_info = new Promise(resolve => {
                    resolve(message.test_info);
                });
            }
        });

        await once(statusEvent, 'ready');

        const testInfo = await get_test_info;

        chronikUrl = [testInfo.chronik];
        console.log(`chronikUrl set to ${JSON.stringify(chronikUrl)}`);

        setupScriptTermination = setMochaTimeout(
            this,
            testName,
            testInfo,
            testRunner,
        );

        testRunner.send('next');
    });

    after(async () => {
        await cleanupMochaRegtest(
            testName,
            testRunner,
            setupScriptTermination,
            statusEvent,
        );
    });

    beforeEach(async () => {
        await once(statusEvent, 'ready');
    });

    afterEach(() => {
        // Reset msgCollector
        msgCollector = [];
        testRunner.send('next');
    });

    // Will get these values from node ipc, then use in multiple steps
    const COIN_TX =
        '3fa435fca55edf447ef7539ecba141a6585fa71ac4062cdcc61f1235c40f4613';
    const TXID_ONE =
        'a6cb61b4cc2d3c538729c118a1735ccd6c51723f0efefe9bf76423f32b6870d5';
    const TXID_TWO =
        'f80dfe71a17292307725ce108aae92dcc30d8096792dc5f5c7053ba02581ed44';
    const TXID_THREE =
        '163a4c095b117d5523bd7b6fc2c1fa310e33e2ab3a698d0480279cd3bb140814';

    let ws: WsEndpoint;

    it('New clean chain', async () => {
        // Initialize a new instance of ChronikClient
        const chronik = new ChronikClient(chronikUrl);

        // Connect to the websocket with a testable onMessage handler
        ws = chronik.ws({
            onMessage: async msg => {
                msgCollector.push(msg);
            },
        });
        await ws.waitForOpen();

        // Subscribe to a yet-to-be-broadcast txids
        ws.subscribeToTxid(COIN_TX);
        ws.subscribeToTxid(TXID_ONE);
        ws.subscribeToTxid(TXID_TWO);
        ws.subscribeToTxid(TXID_THREE);
        expect(ws.subs.txids).to.deep.equal([
            COIN_TX,
            TXID_ONE,
            TXID_TWO,
            TXID_THREE,
        ]);
    });
    it('Txs sent', async () => {
        // Wait for expected ws msgs
        await expectWsMsgs(4, msgCollector);

        // The first msg will be for the cointx
        const coinTxMsg = msgCollector.shift();

        // We expect the coinTx to be confirmed
        expect(coinTxMsg).to.deep.equal({
            type: 'Tx',
            msgType: 'TX_CONFIRMED',
            txid: COIN_TX,
        });

        // We expect to see an AddedToMempool msg for each broadcast txid, in order of broadcast
        const txids = [TXID_ONE, TXID_TWO, TXID_THREE];
        for (const txid of txids) {
            const nextMsg = msgCollector.shift();
            expect(nextMsg).to.deep.equal({
                type: 'Tx',
                msgType: 'TX_ADDED_TO_MEMPOOL',
                txid: txid,
            });
        }

        // No other msgs
        expect(msgCollector.length).to.eql(0);
    });
    it('Conflicting block is mined', async () => {
        // Wait for expected ws msgs
        await expectWsMsgs(3, msgCollector);

        // The three txs AddedToMempool in the previous step are now TX_REMOVED_FROM_MEMPOOL
        // Msgs do not come in a deterministic order; running this test several times, seems like
        // they come TXID_THREE, TXID_TWO, TXID_ONE most of the time, but they also come
        // in every other possible order
        const txids = [TXID_ONE, TXID_TWO, TXID_THREE];
        for (const txid of txids) {
            const removedMsg = msgCollector.find(
                msg => 'txid' in msg && msg.txid === txid,
            );

            expect(removedMsg).to.deep.equal({
                type: 'Tx',
                msgType: 'TX_REMOVED_FROM_MEMPOOL',
                txid: txid,
            });
        }

        // We get no other msgs for this event
        // Note -- there is no TX_REMOVED_FROM_MEMPOOL for the coinbase tx that was previously confirmed
        expect(msgCollector.length).to.eql(txids.length);
    });
});
