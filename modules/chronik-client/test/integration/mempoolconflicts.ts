// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import cashaddr from 'ecashaddrjs';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import {
    ChronikClientNode,
    MsgTxClient,
    ScriptType_InNode,
    WsEndpoint_InNode,
    WsMsgClient,
    WsSubScriptClient,
} from '../../index';
import initializeTestRunner from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Test expected websocket behavior of chronik-client when txs are removed from the mempool', () => {
    // Define variables used in scope of this test
    let testRunner: ChildProcess;
    let chronik_url: Promise<Array<string>>;
    let get_cointx: Promise<string>;
    let get_tx1_txid: Promise<string>;
    let get_tx2_txid: Promise<string>;
    let get_tx3_txid: Promise<string>;
    const statusEvent = new EventEmitter();
    // Collect websocket msgs in an array for analysis in each step
    let msgCollector: Array<WsMsgClient> = [];

    before(async function () {
        // Initialize testRunner before mocha tests
        testRunner = initializeTestRunner('chronik-client_mempool_conflicts');

        // Handle IPC messages from the setup script
        testRunner.on('message', function (message: any) {
            if (message && message.chronik) {
                console.log('Setting chronik url to ', message.chronik);
                chronik_url = new Promise(resolve => {
                    resolve([message.chronik]);
                });
            }

            if (message && message.cointx) {
                get_cointx = new Promise(resolve => {
                    resolve(message.cointx);
                });
            }

            if (message && message.tx1_txid) {
                get_tx1_txid = new Promise(resolve => {
                    resolve(message.tx1_txid);
                });
            }

            if (message && message.tx2_txid) {
                get_tx2_txid = new Promise(resolve => {
                    resolve(message.tx2_txid);
                });
            }

            if (message && message.tx3_txid) {
                get_tx3_txid = new Promise(resolve => {
                    resolve(message.tx3_txid);
                });
            }

            if (message && message.status) {
                statusEvent.emit(message.status);
            }
        });
    });

    after(() => {
        testRunner.send('stop');
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
    let chronikUrl = [''];

    const P2SH_OP_TRUE = 'a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87';
    let coinTx = '';
    let tx1Txid = '';
    let tx2Txid = '';
    let tx3Txid = '';

    let ws: WsEndpoint_InNode;

    let subscriptions: Array<WsSubScriptClient> = [];

    it('New clean chain', async () => {
        // Get chronik URL (used in all tests)
        chronikUrl = await chronik_url;

        const { type, hash } =
            cashaddr.getTypeAndHashFromOutputScript(P2SH_OP_TRUE);

        // Initialize a new instance of ChronikClientNode
        const chronik = new ChronikClientNode(chronikUrl);

        // Connect to the websocket with a testable onMessage handler
        ws = chronik.ws({
            onMessage: async msg => {
                msgCollector.push(msg);
            },
        });
        await ws.waitForOpen();

        // Subscribe to addresses and scripts
        subscriptions = [
            {
                scriptType: type as ScriptType_InNode,
                payload: hash,
            },
        ];

        for (const sub of subscriptions) {
            const { scriptType, payload } = sub;
            ws.subscribeToScript(scriptType, payload);
        }

        // We are subscribed to the expected script
        // The ws object is updated with expected subscriptions
        expect(ws.subs).to.deep.equal(subscriptions);
    });
    it('Txs sent', async () => {
        coinTx = await get_cointx;
        tx1Txid = await get_tx1_txid;
        tx2Txid = await get_tx2_txid;
        tx3Txid = await get_tx3_txid;

        // The first msg will be for the cointx
        const coinTxMsg = msgCollector.shift();

        // We expect the coinTx to be confirmed
        expect(coinTxMsg).to.deep.equal({
            type: 'Tx',
            msgType: 'TX_CONFIRMED',
            txid: coinTx,
        });

        // We expect to see an AddedToMempool msg for each broadcast txid, in order of broadcast
        const txids = [tx1Txid, tx2Txid, tx3Txid];
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
        // The three txs AddedToMempool in the previous step are now RemovedFromMempool
        // Msgs come in order, with the most-recently broadcast tx removed first
        for (const txid of [tx3Txid, tx2Txid, tx1Txid]) {
            const removedMsg = msgCollector.shift();

            expect(removedMsg).to.deep.equal({
                type: 'Tx',
                msgType: 'TX_REMOVED_FROM_MEMPOOL',
                txid: txid,
            });
        }

        // The tx confirmed msg comes after the removed from mempool msgs
        const txConfirmedMsg = msgCollector.shift();
        expect((txConfirmedMsg as MsgTxClient).msgType).to.eql('TX_CONFIRMED');

        // We get no other msgs for this event
        expect(msgCollector.length).to.eql(0);
    });
});
