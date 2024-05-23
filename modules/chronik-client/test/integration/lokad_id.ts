// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import { ChronikClientNode, WsEndpoint_InNode, WsMsgClient } from '../../index';
import initializeTestRunner, {
    cleanupMochaRegtest,
    expectWsMsgs,
    setMochaTimeout,
    TestInfo,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('History endpoints and websocket for LOKAD ID', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;

    // Collect websocket msgs in an array for analysis in each step
    let msgCollectorLokadZero: Array<WsMsgClient> = [];
    let msgCollectorLokadsOneThroughThree: Array<WsMsgClient> = [];

    const statusEvent = new EventEmitter();
    let get_test_info: Promise<TestInfo>;
    let chronikUrl: string[];
    let chronik: ChronikClientNode;
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
        chronik = new ChronikClientNode(chronikUrl);
        console.info(`chronikUrl set to ${JSON.stringify(chronikUrl)}`);

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
        // Reset msgCollectors after each step
        msgCollectorLokadZero = [];
        msgCollectorLokadsOneThroughThree = [];

        testRunner.send('next');
    });

    const LOKAD0 = Buffer.from('lok0').toString('hex');
    const LOKAD1 = Buffer.from('lok1').toString('hex');
    const LOKAD2 = Buffer.from('lok2').toString('hex');
    const LOKAD3 = Buffer.from('lok3').toString('hex');
    const LOKAD4 = Buffer.from('lok4').toString('hex');
    let ws: WsEndpoint_InNode;
    let ws2: WsEndpoint_InNode;

    const BASE_ADDEDTOMEMPOOL_WSMSG: WsMsgClient = {
        type: 'Tx',
        msgType: 'TX_ADDED_TO_MEMPOOL',
        txid: '1111111111111111111111111111111111111111111111111111111111111111',
    };
    const BASE_REMOVEDFROMMEMPOOL_WSMSG: WsMsgClient = {
        type: 'Tx',
        msgType: 'TX_REMOVED_FROM_MEMPOOL',
        txid: '1111111111111111111111111111111111111111111111111111111111111111',
    };
    const BASE_CONFIRMED_WSMSG: WsMsgClient = {
        type: 'Tx',
        msgType: 'TX_CONFIRMED',
        txid: '1111111111111111111111111111111111111111111111111111111111111111',
    };

    const TX0_TXID =
        '963850dd9433358993b41184960ea73ee24c754fbccb512ff45976b594cb8876';
    const TX1_TXID =
        '1ef4bebdb5a1298877aed9b7f741e3e0903820514316a35f3e7c05957308471a';
    const TX2_TXID =
        'a989e07ae47f3925e911942e6dfbb0a5217fbd6617975b5c7a03a235c0c8a554';
    const TX3_TXID =
        '5d8e3f080fa9f7b399be2abd5ab78c9cd6857daadc0f84db1dcfd308ef209080';
    const CONFLICTING_TX_TXID =
        '3547cedaa111f8dfef551afed8affc4bc91fccc5b9b60a6a57141943d4737de9';

    it('New regtest chain', async () => {
        // We get empty history if no txs exist for a lokadid
        expect(await chronik.lokadId(LOKAD0).history()).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });
        expect(await chronik.lokadId(LOKAD0).unconfirmedTxs()).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });
        expect(await chronik.lokadId(LOKAD0).confirmedTxs()).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });

        // We throw an error if the endpoint is called with an invalid lokadId
        // Invalid tokenId is rejected
        await expect(
            chronik.lokadId('somestring').history(),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /lokad-id/somestring/history?page=0&page_size=25 (): 400: Invalid hex: Invalid character 's' at position 0`,
        );

        // Connect to the websocket with a testable onMessage handler
        ws = chronik.ws({
            onMessage: msg => {
                msgCollectorLokadZero.push(msg);
            },
        });
        await ws.waitForOpen();

        // We can subscribe to a lokadId
        ws.subscribeToLokadId(LOKAD0);

        // ws.subs.lokadIds is updated to include the lokadId
        expect(ws.subs.lokadIds).to.deep.equal([LOKAD0]);

        // We cannot unsubscribe from something not in this.subs.lokadIds
        expect(() => ws.unsubscribeFromLokadId('8badfood')).to.throw(
            `No existing sub at lokadId "8badfood"`,
        );

        // We can unsubscribe from a lokadId
        ws.unsubscribeFromLokadId(LOKAD0);

        // ws.subs.lokadIds is updated so that this lokadId is removed
        expect(ws.subs.lokadIds).to.deep.equal([]);

        // We cannot subscribe to an invalid lokadId
        expect(() => ws.subscribeToLokadId('not a lokadId')).to.throw(
            `Invalid lokadId: "not a lokadId". lokadId must be 4 bytes (8 chars) of lowercase hex.`,
        );
        // The invalid lokad id is not added to ws.subs.lokadIds
        expect(ws.subs.lokadIds).to.deep.equal([]);

        // Resubscribe to lokadId to listen for msgs in the next step
        ws.subscribeToLokadId(LOKAD0);

        // Create a separate websocket and subscribe to multiple lokad ids
        ws2 = chronik.ws({
            onMessage: msg => {
                msgCollectorLokadsOneThroughThree.push(msg);
            },
        });
        await ws2.waitForOpen();

        // Subscribe to multiple lokad ids
        ws2.subscribeToLokadId(LOKAD1);
        ws2.subscribeToLokadId(LOKAD2);
        ws2.subscribeToLokadId(LOKAD3);
        // ws.subs.lokadIds is updated to include the lokadId
        expect(ws2.subs.lokadIds).to.deep.equal([LOKAD1, LOKAD2, LOKAD3]);
    });
    it('Websocket and endpoints register a non-EMPP OP_RETURN lokadId tx added to the mempool', async () => {
        // The tx appears in the history endpoint
        const history = await chronik.lokadId(LOKAD0).history();
        expect(history.txs.length).to.eql(1);
        expect(history.txs[0].txid).to.eql(TX0_TXID);

        // The tx appears in the unconfirmedTxs endpoint
        const unconfirmedTxs = await chronik.lokadId(LOKAD0).unconfirmedTxs();
        expect(unconfirmedTxs.txs.length).to.eql(1);
        expect(unconfirmedTxs.txs[0].txid).to.eql(TX0_TXID);

        // The tx DOES NOT appear in the confirmedTxs endpoint
        const confirmedTxs = await chronik.lokadId(LOKAD0).confirmedTxs();
        expect(confirmedTxs.txs.length).to.eql(0);

        // We get ADDED_TO_MEMPOOL websocket msg
        expect(msgCollectorLokadZero).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: TX0_TXID },
        ]);
    });
    it('Websocket and endpoints correctly recognize txs with a lokadId in an input scriptSig and the same lokadId in OP_RETURN (non-EMPP)', async () => {
        // The txs appear in the history endpoint
        const history = await chronik.lokadId(LOKAD0).history();
        expect(history.txs.length).to.eql(2);
        // These are sorted anti-chronologically by timeFirstSeen, most recent is first. So we expect tx1 at index 0
        expect(history.txs[0].txid).to.eql(TX1_TXID);
        // and tx0 at index 1
        expect(history.txs[1].txid).to.eql(TX0_TXID);

        // Querying history from LOKAD1 gives the 1 LOKAD1 result
        const altHistory = await chronik.lokadId(LOKAD1).history();
        expect(altHistory.txs.length).to.eql(1);
        expect(altHistory.txs[0].txid).to.eql(TX1_TXID);

        // The txs appear in the unconfirmedTxs endpoint
        const unconfirmedTxs = await chronik.lokadId(LOKAD0).unconfirmedTxs();
        // These are sorted by chronologically by timeFirstSeen, most recent is LAST. So we expect tx0 at index 0
        expect(unconfirmedTxs.txs[0].txid).to.eql(TX0_TXID);
        // and tx0 at index 1
        expect(unconfirmedTxs.txs[1].txid).to.eql(TX1_TXID);

        // Querying unconfirmedTxs from LOKAD1 gives the 1 LOKAD1 result
        const altUnconfirmedTxs = await chronik
            .lokadId(LOKAD1)
            .unconfirmedTxs();
        expect(altUnconfirmedTxs.txs.length).to.eql(1);
        expect(altUnconfirmedTxs.txs[0].txid).to.eql(TX1_TXID);

        // The txs DO NOT appear in the confirmedTxs endpoint when querying with either lokad
        const confirmedTxs = await chronik.lokadId(LOKAD0).confirmedTxs();
        expect(confirmedTxs.txs.length).to.eql(0);
        const altConfirmedTxs = await chronik.lokadId(LOKAD1).confirmedTxs();
        expect(altConfirmedTxs.txs.length).to.eql(0);

        // Wait for expected msg
        await expectWsMsgs(1, msgCollectorLokadZero);

        // We get ADDED_TO_MEMPOOL websocket msg for this txid at ws
        expect(msgCollectorLokadZero).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: TX1_TXID },
        ]);

        // Wait for expected msg
        await expectWsMsgs(1, msgCollectorLokadsOneThroughThree);

        // We get ADDED_TO_MEMPOOL websocket msg for this txid at ws2
        expect(msgCollectorLokadsOneThroughThree).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: TX1_TXID },
        ]);

        // Unsub ws2 from lokad2
        ws2.unsubscribeFromLokadId(LOKAD2);
        expect(ws2.subs.lokadIds).to.deep.equal([LOKAD1, LOKAD3]);
    });
    it('Websocket and endpoints correctly recognize a tx with a new lokadId in a spend input and a new lokad id in EMPP OP_RETURN', async () => {
        // The txs appear in the history endpoint
        const history = await chronik.lokadId(LOKAD0).history();
        expect(history.txs.length).to.eql(3);
        // These are sorted anti-chronologically by timeFirstSeen, most recent is first
        expect(history.txs[0].txid).to.eql(TX2_TXID);
        expect(history.txs[1].txid).to.eql(TX1_TXID);
        expect(history.txs[2].txid).to.eql(TX0_TXID);

        // Querying history from LOKAD2 gives the 1 LOKAD2 result
        const altHistory = await chronik.lokadId(LOKAD2).history();
        expect(altHistory.txs.length).to.eql(1);
        expect(altHistory.txs[0].txid).to.eql(TX2_TXID);

        // The txs appear in the unconfirmedTxs endpoint
        const unconfirmedTxs = await chronik.lokadId(LOKAD0).unconfirmedTxs();
        // These are sorted by chronologically by timeFirstSeen, most recent is LAST. So we expect tx0 at index 0
        expect(unconfirmedTxs.txs[0].txid).to.eql(TX0_TXID);
        expect(unconfirmedTxs.txs[1].txid).to.eql(TX1_TXID);
        expect(unconfirmedTxs.txs[2].txid).to.eql(TX2_TXID);

        // Querying unconfirmedTxs from LOKAD2 gives the 1 LOKAD2 result
        const altUnconfirmedTxs = await chronik
            .lokadId(LOKAD2)
            .unconfirmedTxs();
        expect(altUnconfirmedTxs.txs.length).to.eql(1);
        expect(altUnconfirmedTxs.txs[0].txid).to.eql(TX2_TXID);

        // The txs DO NOT appear in the confirmedTxs endpoint
        expect(
            (await chronik.lokadId(LOKAD0).confirmedTxs()).txs.length,
        ).to.eql(0);
        expect(
            (await chronik.lokadId(LOKAD1).confirmedTxs()).txs.length,
        ).to.eql(0);
        expect(
            (await chronik.lokadId(LOKAD2).confirmedTxs()).txs.length,
        ).to.eql(0);

        // Wait for expected msg
        await expectWsMsgs(1, msgCollectorLokadZero);
        expect(msgCollectorLokadZero).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: TX2_TXID },
        ]);
    });
    it('After these txs are mined, chronik-client returns this info appropriately', async () => {
        // The txs appear in the history endpoint
        const history = await chronik.lokadId(LOKAD0).history();
        expect(history.txs.length).to.eql(3);
        // These are sorted anti-chronologically by timeFirstSeen, most recent is first
        expect(history.txs[0].txid).to.eql(TX2_TXID);
        expect(history.txs[1].txid).to.eql(TX1_TXID);
        expect(history.txs[2].txid).to.eql(TX0_TXID);
        // Each tx now has a 'block' key
        for (const tx of history.txs) {
            expect('block' in tx).to.eql(true);
        }

        // Querying history from LOKAD1 gives the 1 LOKAD1 result
        const altHistoryLokad1 = await chronik.lokadId(LOKAD1).history();
        expect(altHistoryLokad1.txs.length).to.eql(1);
        expect(altHistoryLokad1.txs[0].txid).to.eql(TX1_TXID);
        // It's confirmed
        expect('block' in altHistoryLokad1.txs[0]).to.eql(true);

        // Querying history from LOKAD2 gives the 1 LOKAD2 result
        const altHistoryLokad2 = await chronik.lokadId(LOKAD2).history();
        expect(altHistoryLokad2.txs.length).to.eql(1);
        expect(altHistoryLokad2.txs[0].txid).to.eql(TX2_TXID);
        // It's confirmed
        expect('block' in altHistoryLokad2.txs[0]).to.eql(true);

        // The txs DO NOT appear in the unconfirmedTxs endpoint
        expect(
            (await chronik.lokadId(LOKAD0).unconfirmedTxs()).txs,
        ).to.deep.equal([]);
        expect(
            (await chronik.lokadId(LOKAD1).unconfirmedTxs()).txs,
        ).to.deep.equal([]);
        expect(
            (await chronik.lokadId(LOKAD2).unconfirmedTxs()).txs,
        ).to.deep.equal([]);

        // The txs now appear in the confirmedTxs endpoint
        const confirmedTxs = await chronik.lokadId(LOKAD0).confirmedTxs();
        expect(confirmedTxs.txs.length).to.eql(3);
        // These are sorted by block order, i.e. alphabetically by txid
        const confirmedTxids = confirmedTxs.txs.map(tx => {
            return tx.txid;
        });
        expect(confirmedTxids).to.deep.equal(
            [TX0_TXID, TX1_TXID, TX2_TXID].sort(),
        );
        // Each tx has a 'block' key
        for (const tx of confirmedTxs.txs) {
            expect('block' in tx).to.eql(true);
        }

        // We get TX_CONFIRMED websocket msgs for all three txs at ws1
        // The msgs come in block order, i.e. alphabetical by txid
        // Wait for expected msgs
        await expectWsMsgs(3, msgCollectorLokadZero);
        expect(msgCollectorLokadZero).to.deep.equal([
            { ...BASE_CONFIRMED_WSMSG, txid: TX1_TXID }, // 1ef4bebdb5a1298877aed9b7f741e3e0903820514316a35f3e7c05957308471a
            { ...BASE_CONFIRMED_WSMSG, txid: TX0_TXID }, // 963850dd9433358993b41184960ea73ee24c754fbccb512ff45976b594cb8876
            { ...BASE_CONFIRMED_WSMSG, txid: TX2_TXID }, // a989e07ae47f3925e911942e6dfbb0a5217fbd6617975b5c7a03a235c0c8a554
        ]);
        // We get TX1_TXID confirmed at ws2
        // Wait for expected msg
        await expectWsMsgs(1, msgCollectorLokadsOneThroughThree);
        expect(msgCollectorLokadsOneThroughThree).to.deep.equal([
            { ...BASE_CONFIRMED_WSMSG, txid: TX1_TXID }, // 1ef4bebdb5a1298877aed9b7f741e3e0903820514316a35f3e7c05957308471a
        ]);
    });
    it('We can detect a mix of confirmed and unconfirmed txs by lokad id', async () => {
        // The txs appear in the history endpoint
        const history = await chronik.lokadId(LOKAD0).history();
        expect(history.txs.length).to.eql(4);
        // These are sorted anti-chronologically by timeFirstSeen, most recent is first
        expect(history.txs[0].txid).to.eql(TX3_TXID);
        expect(history.txs[1].txid).to.eql(TX2_TXID);
        expect(history.txs[2].txid).to.eql(TX1_TXID);
        expect(history.txs[3].txid).to.eql(TX0_TXID);

        // Querying history from LOKAD1 gives the 1 LOKAD1 result
        const altHistoryLokad1 = await chronik.lokadId(LOKAD1).history();
        expect(altHistoryLokad1.txs.length).to.eql(1);
        expect(altHistoryLokad1.txs[0].txid).to.eql(TX1_TXID);
        // It's confirmed
        expect('block' in altHistoryLokad1.txs[0]).to.eql(true);

        // Querying history from LOKAD2 gives the 1 confirmed LOKAD2 result and the 1 unconfirmed LOKAD2 result
        const altHistoryLokad2 = await chronik.lokadId(LOKAD2).history();
        expect(altHistoryLokad2.txs.length).to.eql(2);
        // These are sorted anti-chronologically by timeFirstSeen, most recent is first
        expect(altHistoryLokad2.txs[0].txid).to.eql(TX3_TXID);
        expect(altHistoryLokad2.txs[1].txid).to.eql(TX2_TXID);

        // Querying history from LOKAD3 gives the 1 unconfirmed LOKAD3 result
        const altHistoryLokad3 = await chronik.lokadId(LOKAD3).history();
        expect(altHistoryLokad3.txs.length).to.eql(1);
        expect(altHistoryLokad3.txs[0].txid).to.eql(TX3_TXID);

        // We get TX3_TXID in the unconfirmedTxs() endpoint for LOKAD0, LOKAD2, AND LOKAD3
        const unconfirmedTxsLokadZero = await chronik
            .lokadId(LOKAD0)
            .unconfirmedTxs();
        expect(unconfirmedTxsLokadZero.txs.length).to.eql(1);
        expect(unconfirmedTxsLokadZero.txs[0].txid).to.eql(TX3_TXID);
        expect(
            (await chronik.lokadId(LOKAD1).unconfirmedTxs()).txs,
        ).to.deep.equal([]);
        const unconfirmedTxsLokadTwo = await chronik
            .lokadId(LOKAD2)
            .unconfirmedTxs();
        expect(unconfirmedTxsLokadTwo.txs.length).to.eql(1);
        expect(unconfirmedTxsLokadTwo.txs[0].txid).to.eql(TX3_TXID);
        const unconfirmedTxsLokadThree = await chronik
            .lokadId(LOKAD3)
            .unconfirmedTxs();
        expect(unconfirmedTxsLokadThree.txs.length).to.eql(1);
        expect(unconfirmedTxsLokadThree.txs[0].txid).to.eql(TX3_TXID);

        // We do not get this unconfirmed tx in the confirmed endpoint result
        const confirmedTxs = await chronik.lokadId(LOKAD0).confirmedTxs();
        expect(confirmedTxs.txs.length).to.eql(3);
        // These are sorted by block order, i.e. alphabetically by txid
        const confirmedTxids = confirmedTxs.txs.map(tx => {
            return tx.txid;
        });
        expect(confirmedTxids).to.deep.equal(
            [TX0_TXID, TX1_TXID, TX2_TXID].sort(),
        );
        // Each tx has a 'block' key
        for (const tx of confirmedTxs.txs) {
            expect('block' in tx).to.eql(true);
        }

        // We get this msg at ws
        // Wait for expected msg
        await expectWsMsgs(1, msgCollectorLokadZero);
        expect(msgCollectorLokadZero).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: TX3_TXID }, // 5d8e3f080fa9f7b399be2abd5ab78c9cd6857daadc0f84db1dcfd308ef209080
        ]);

        // Wait for expected msg
        await expectWsMsgs(1, msgCollectorLokadsOneThroughThree);
        expect(msgCollectorLokadsOneThroughThree).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: TX3_TXID }, // 5d8e3f080fa9f7b399be2abd5ab78c9cd6857daadc0f84db1dcfd308ef209080
        ]);
    });
    it('If a tx is removed from the mempool, we get expected websocket msg and no longer see this tx from endpoints', async () => {
        // We no longer see TX3_TXID in history
        const history = await chronik.lokadId(LOKAD0).history();
        expect(history.txs.length).to.eql(3);
        // These are sorted anti-chronologically by timeFirstSeen, most recent is first
        expect(history.txs[0].txid).to.eql(TX2_TXID);
        expect(history.txs[1].txid).to.eql(TX1_TXID);
        expect(history.txs[2].txid).to.eql(TX0_TXID);

        // Querying history from LOKAD2 gives the 1 confirmed LOKAD2 result and the 1 unconfirmed LOKAD2 result
        const altHistoryLokad2 = await chronik.lokadId(LOKAD2).history();
        expect(altHistoryLokad2.txs.length).to.eql(1);
        expect(altHistoryLokad2.txs[0].txid).to.eql(TX2_TXID);

        // Querying history from LOKAD3 now gives the conflicting tx
        const altHistoryLokad3 = await chronik.lokadId(LOKAD3).history();
        expect(altHistoryLokad3.txs.length).to.eql(1);
        expect(altHistoryLokad3.txs[0].txid).to.eql(CONFLICTING_TX_TXID);

        // We now have history for LOKAD4
        const altHistoryLokad4 = await chronik.lokadId(LOKAD4).history();
        expect(altHistoryLokad4.txs.length).to.eql(1);
        expect(altHistoryLokad4.txs[0].txid).to.eql(CONFLICTING_TX_TXID);

        // We get no longer get TX3_TXID in the unconfirmedTxs() endpoint for LOKAD0, LOKAD2, AND LOKAD3
        expect(
            (await chronik.lokadId(LOKAD0).unconfirmedTxs()).txs,
        ).to.deep.equal([]);
        expect(
            (await chronik.lokadId(LOKAD2).unconfirmedTxs()).txs,
        ).to.deep.equal([]);
        expect(
            (await chronik.lokadId(LOKAD3).unconfirmedTxs()).txs,
        ).to.deep.equal([]);

        // Confirmed results unchanged for LOKAD0
        const confirmedTxs = await chronik.lokadId(LOKAD0).confirmedTxs();
        expect(confirmedTxs.txs.length).to.eql(3);
        // These are sorted by block order, i.e. alphabetically by txid
        const confirmedTxids = confirmedTxs.txs.map(tx => {
            return tx.txid;
        });
        expect(confirmedTxids).to.deep.equal(
            [TX0_TXID, TX1_TXID, TX2_TXID].sort(),
        );
        // Each tx has a 'block' key
        for (const tx of confirmedTxs.txs) {
            expect('block' in tx).to.eql(true);
        }

        // We now have a confirmed tx for LOKAD4
        const confirmedTxsLokadFour = await chronik
            .lokadId(LOKAD4)
            .confirmedTxs();
        expect(confirmedTxsLokadFour.txs.length).to.eql(1);
        expect(confirmedTxsLokadFour.txs[0].txid).to.eql(CONFLICTING_TX_TXID);

        // We get removed from mempool msg at ws
        // Wait for expected msg
        await expectWsMsgs(1, msgCollectorLokadZero);
        expect(msgCollectorLokadZero).to.deep.equal([
            { ...BASE_REMOVEDFROMMEMPOOL_WSMSG, txid: TX3_TXID }, // 5d8e3f080fa9f7b399be2abd5ab78c9cd6857daadc0f84db1dcfd308ef209080
        ]);

        // We get removed from mempool msg at w2, and confirmed for the invalidating tx
        // Wait for expected msgs
        await expectWsMsgs(2, msgCollectorLokadsOneThroughThree);

        expect(msgCollectorLokadsOneThroughThree).to.deep.equal([
            {
                type: 'Tx',
                msgType: 'TX_REMOVED_FROM_MEMPOOL',
                txid: '5d8e3f080fa9f7b399be2abd5ab78c9cd6857daadc0f84db1dcfd308ef209080',
            },
            {
                type: 'Tx',
                msgType: 'TX_CONFIRMED',
                txid: '3547cedaa111f8dfef551afed8affc4bc91fccc5b9b60a6a57141943d4737de9',
            },
        ]);
    });
    it('If block with conflicting tx is invalidated, the conflicting tx is added to the mempool and endpoints update appropriately', async () => {
        // The txs appear in the history endpoint
        // Note the original TX3_TXID is not restored to the mempool
        const history = await chronik.lokadId(LOKAD0).history();
        expect(history.txs.length).to.eql(3);
        // These are sorted anti-chronologically by timeFirstSeen, most recent is first
        expect(history.txs[0].txid).to.eql(TX2_TXID);
        expect(history.txs[1].txid).to.eql(TX1_TXID);
        expect(history.txs[2].txid).to.eql(TX0_TXID);

        // Querying history from LOKAD1 gives the 1 LOKAD1 result
        const altHistoryLokad1 = await chronik.lokadId(LOKAD1).history();
        expect(altHistoryLokad1.txs.length).to.eql(1);
        expect(altHistoryLokad1.txs[0].txid).to.eql(TX1_TXID);
        // It's confirmed
        expect('block' in altHistoryLokad1.txs[0]).to.eql(true);

        // Querying history from LOKAD2 gives the 1 confirmed LOKAD2 result and the 1 unconfirmed LOKAD2 result
        const altHistoryLokad2 = await chronik.lokadId(LOKAD2).history();
        expect(altHistoryLokad2.txs.length).to.eql(1);
        expect(altHistoryLokad2.txs[0].txid).to.eql(TX2_TXID);

        // Querying history from LOKAD3 gives 1 now-unconfirmed LOKAD3 result
        const altHistoryLokad3 = await chronik.lokadId(LOKAD3).history();
        expect(altHistoryLokad3.txs.length).to.eql(1);
        expect(altHistoryLokad3.txs[0].txid).to.eql(CONFLICTING_TX_TXID);

        // We get the conflicting tx from unconfirmed txs for lokad4
        const unconfirmedTxsLokadFour = await chronik
            .lokadId(LOKAD4)
            .unconfirmedTxs();
        expect(unconfirmedTxsLokadFour.txs.length).to.eql(1);
        expect(unconfirmedTxsLokadFour.txs[0].txid).to.eql(CONFLICTING_TX_TXID);

        // We do not get this unconfirmed tx in the confirmed endpoint result
        const confirmedTxs = await chronik.lokadId(LOKAD4).confirmedTxs();
        expect(confirmedTxs.txs.length).to.eql(0);

        expect(msgCollectorLokadZero).to.deep.equal([]);

        // Wait for expected msg
        await expectWsMsgs(1, msgCollectorLokadsOneThroughThree);
        expect(msgCollectorLokadsOneThroughThree).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: CONFLICTING_TX_TXID },
        ]);
    });
});
