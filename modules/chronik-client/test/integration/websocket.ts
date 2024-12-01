// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { decodeCashAddress } from 'ecashaddrjs';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import {
    ChronikClient,
    WsEndpoint,
    WsMsgClient,
    WsSubScriptClient,
} from '../../index';
import initializeTestRunner, {
    cleanupMochaRegtest,
    expectWsMsgs,
    setMochaTimeout,
    TestInfo,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Test expected websocket behavior of chronik-client', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;
    let get_p2pkh_address: Promise<string>;
    let get_p2pkh_txid: Promise<string>;
    let get_p2sh_address: Promise<string>;
    let get_p2sh_txid: Promise<string>;
    let get_p2pk_script: Promise<string>;
    let get_p2pk_txid: Promise<string>;
    let get_other_script: Promise<string>;
    let get_other_txid: Promise<string>;
    let get_next_blockhash: Promise<string>;
    let get_finalized_block_blockhash: Promise<string>;
    let get_finalized_height: Promise<number>;
    let get_block_timestamp: Promise<number>;
    let get_coinbase_scriptsig: Promise<string>;
    let get_coinbase_out_value: Promise<number>;
    let get_coinbase_out_scriptpubkey: Promise<string>;
    let get_mixed_output_txid: Promise<string>;
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

            if (message && message.p2pkh_address) {
                get_p2pkh_address = new Promise(resolve => {
                    resolve(message.p2pkh_address);
                });
            }

            if (message && message.p2sh_address) {
                get_p2sh_address = new Promise(resolve => {
                    resolve(message.p2sh_address);
                });
            }

            if (message && message.p2pk_script) {
                get_p2pk_script = new Promise(resolve => {
                    resolve(message.p2pk_script);
                });
            }

            if (message && message.other_script) {
                get_other_script = new Promise(resolve => {
                    resolve(message.other_script);
                });
            }

            if (message && message.p2pk_txid) {
                get_p2pk_txid = new Promise(resolve => {
                    resolve(message.p2pk_txid);
                });
            }

            if (message && message.p2pkh_txid) {
                get_p2pkh_txid = new Promise(resolve => {
                    resolve(message.p2pkh_txid);
                });
            }

            if (message && message.p2sh_txid) {
                get_p2sh_txid = new Promise(resolve => {
                    resolve(message.p2sh_txid);
                });
            }

            if (message && message.other_txid) {
                get_other_txid = new Promise(resolve => {
                    resolve(message.other_txid);
                });
            }

            if (message && message.next_blockhash) {
                get_next_blockhash = new Promise(resolve => {
                    resolve(message.next_blockhash);
                });
            }

            if (message && message.finalized_block_blockhash) {
                get_finalized_block_blockhash = new Promise(resolve => {
                    resolve(message.finalized_block_blockhash);
                });
            }

            if (message && message.finalized_height) {
                get_finalized_height = new Promise(resolve => {
                    resolve(message.finalized_height);
                });
            }

            if (message && message.block_timestamp) {
                get_block_timestamp = new Promise(resolve => {
                    resolve(message.block_timestamp);
                });
            }

            if (message && message.coinbase_scriptsig) {
                get_coinbase_scriptsig = new Promise(resolve => {
                    resolve(message.coinbase_scriptsig);
                });
            }

            if (message && message.coinbase_out_value) {
                get_coinbase_out_value = new Promise(resolve => {
                    resolve(message.coinbase_out_value);
                });
            }

            if (message && message.coinbase_out_scriptpubkey) {
                get_coinbase_out_scriptpubkey = new Promise(resolve => {
                    resolve(message.coinbase_out_scriptpubkey);
                });
            }

            if (message && message.mixed_output_txid) {
                get_mixed_output_txid = new Promise(resolve => {
                    resolve(message.mixed_output_txid);
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
        // Reset msgCollector after each step
        msgCollector = [];

        testRunner.send('next');
    });

    // Will get these values from node ipc, then use in multiple steps
    let p2pkhAddress = '';
    let p2pkhHash = '';
    let p2pkhTxid = '';

    let p2shAddress = '';
    let p2shHash = '';
    let p2shTxid = '';

    let p2pkScript = '';
    let p2pkTxid = '';

    let otherScript = '';
    let otherTxid = '';

    let finalizedBlockhash = '';
    let finalizedHeight = 0;
    let blockTimestamp = 0;
    let nextBlockhash = '';

    let coinbaseScriptsig = '';
    let coinbaseOutValue = 0;
    let coinbaseOutScriptpubkey = '';

    let mixedOutputTxid = '';

    let ws: WsEndpoint;

    let subscriptions: Array<WsSubScriptClient> = [];

    it('New regtest chain', async () => {
        // Get addresses / scripts (used in all tests)
        p2pkhAddress = await get_p2pkh_address;
        p2pkhHash = decodeCashAddress(p2pkhAddress).hash;
        p2shAddress = await get_p2sh_address;
        p2shHash = decodeCashAddress(p2shAddress).hash;
        p2pkScript = await get_p2pk_script;
        otherScript = await get_other_script;

        // Initialize a new instance of ChronikClient
        const chronik = new ChronikClient(chronikUrl);

        // Connect to the websocket with a testable onMessage handler
        ws = chronik.ws({
            onMessage: msg => {
                return msgCollector.push(msg);
            },
        });
        await ws.waitForOpen();

        // We can subscribe to addresses and scripts
        subscriptions = [
            { scriptType: 'p2pkh', payload: p2pkhHash },
            { scriptType: 'p2sh', payload: p2shHash },
            { scriptType: 'p2pk', payload: p2pkScript },
            { scriptType: 'other', payload: otherScript },
        ];
        for (const sub of subscriptions) {
            const { scriptType, payload } = sub;
            ws.subscribeToScript(scriptType, payload);
        }

        // The ws object is updated with expected subscriptions
        expect(ws.subs.scripts).to.deep.equal(subscriptions);

        // No change if we unsub from a valid hash we were never subscribed to
        expect(() =>
            ws.unsubscribeFromScript(
                'p2pkh',
                '1111111111111111111111111111111111111111111111111111111111111111',
            ),
        ).to.throw(
            'No existing sub at p2pkh, 1111111111111111111111111111111111111111111111111111111111111111',
        );

        // We do not need to validate unsub requests as an error is thrown if they are not in ws.subs
        expect(() =>
            ws.unsubscribeFromScript('not a type' as any, 'who knows'),
        ).to.throw('No existing sub at not a type, who knows');

        // We can unsubscribe from addresses and scripts
        const remainingSubscriptions = JSON.parse(
            JSON.stringify(subscriptions),
        );
        for (let i = 0; i < subscriptions.length; i += 1) {
            const unsub = remainingSubscriptions.shift();
            ws.unsubscribeFromScript(
                (unsub as WsSubScriptClient).scriptType,
                (unsub as WsSubScriptClient).payload,
            );
            // The ws object has removed this subscription
            expect(ws.subs.scripts).to.deep.equal(remainingSubscriptions);
        }

        // We can subscribe to p2sh and p2pkh scripts with subscribeToAddress
        ws.subscribeToAddress(p2pkhAddress);
        ws.subscribeToAddress(p2shAddress);

        // The ws object is updated with expected subscriptions
        expect(ws.subs.scripts).to.deep.equal([
            { scriptType: 'p2pkh', payload: p2pkhHash },
            { scriptType: 'p2sh', payload: p2shHash },
        ]);

        // We can unsubscribe from p2sha nd p2pkh scripts with unsubscribeFromAddress
        ws.unsubscribeFromAddress(p2pkhAddress);
        ws.unsubscribeFromAddress(p2shAddress);

        // The ws object is updated with expected subscriptions
        expect(ws.subs.scripts).to.deep.equal([]);

        // We get the validation error from ecashaddrjs if we attempt to subscribe or unsubscribe
        // from anything that is not a valid p2pkh or p2sh address
        expect(() => ws.subscribeToAddress('notAnAddress')).to.throw(
            'Invalid address: notAnAddress.',
        );
        expect(() => ws.unsubscribeFromAddress('alsoNotAnAddress')).to.throw(
            'Invalid address: alsoNotAnAddress.',
        );

        // We can subscribe to blocks
        ws.subscribeToBlocks();
        expect(ws.subs.blocks).to.eql(true);

        // We can unsubscribe from blocks
        ws.unsubscribeFromBlocks();
        expect(ws.subs.blocks).to.eql(false);

        // Test some thrown errors
        // These are exhaustively unit tested in src/test/test.ts
        expect(() => ws.subscribeToScript('p2pkh', 'deadbeefe')).to.throw(
            'Odd hex length: deadbeefe',
        );
        expect(() => ws.subscribeToScript('p2pkh', 'nothex')).to.throw(
            `Invalid hex: "nothex". Payload must be lowercase hex string.`,
        );
        expect(() =>
            ws.subscribeToScript('notavalidtype' as any, 'deadbeef'),
        ).to.throw('Invalid scriptType: notavalidtype');
        // Uppercase payload input is rejected
        expect(() => ws.subscribeToScript('other', 'DEADBEEF')).to.throw(
            'Invalid hex: "DEADBEEF". Payload must be lowercase hex string.',
        );
        // Mixed case payload input is rejected
        expect(() => ws.subscribeToScript('other', 'DEADbeef')).to.throw(
            'Invalid hex: "DEADbeef". Payload must be lowercase hex string.',
        );

        // Resubscribe for next step
        for (const sub of subscriptions) {
            const { scriptType, payload } = sub;
            ws.subscribeToScript(scriptType, payload);
        }

        // Unsubscribe from p2pkh script, and resubscribe to it as address,
        // to confirm the sub is active in the same was as the script sub
        // in later steps
        ws.unsubscribeFromScript('p2pkh', p2pkhHash);
        ws.subscribeToAddress(p2pkhAddress);

        // Resubscribe to blocks
        ws.subscribeToBlocks();
    });
    it('After a block is avalanche finalized', async () => {
        finalizedBlockhash = await get_finalized_block_blockhash;
        finalizedHeight = await get_finalized_height;
        blockTimestamp = await get_block_timestamp;

        // Wait for expected ws msg
        await expectWsMsgs(1, msgCollector);

        // We get a Block Finalized msg
        const finalizedBlockMsg = msgCollector.shift();

        expect(finalizedBlockMsg).to.deep.equal({
            type: 'Block',
            msgType: 'BLK_FINALIZED',
            blockHash: finalizedBlockhash,
            blockHeight: finalizedHeight,
            blockTimestamp: blockTimestamp,
        });

        // We only get this msg
        expect(msgCollector.length).to.eql(0);
    });
    it('After some txs have been broadcast', async () => {
        // Wait for expected ws msgs
        await expectWsMsgs(4, msgCollector);

        p2pkhTxid = await get_p2pkh_txid;
        expect(msgCollector[0]).to.deep.equal({
            type: 'Tx',
            msgType: 'TX_ADDED_TO_MEMPOOL',
            txid: p2pkhTxid,
        });

        p2shTxid = await get_p2sh_txid;
        expect(msgCollector[1]).to.deep.equal({
            type: 'Tx',
            msgType: 'TX_ADDED_TO_MEMPOOL',
            txid: p2shTxid,
        });

        p2pkTxid = await get_p2pk_txid;
        expect(msgCollector[2]).to.deep.equal({
            type: 'Tx',
            msgType: 'TX_ADDED_TO_MEMPOOL',
            txid: p2pkTxid,
        });

        otherTxid = await get_other_txid;
        expect(msgCollector[3]).to.deep.equal({
            type: 'Tx',
            msgType: 'TX_ADDED_TO_MEMPOOL',
            txid: otherTxid,
        });

        // These are the only msgs we receive in this step
        expect(msgCollector.length).to.eql(4);
    });
    it('After a block is mined', async () => {
        nextBlockhash = await get_next_blockhash;

        // Wait for expected ws msgs
        await expectWsMsgs(5, msgCollector);

        // The block connected msg comes first
        const blockConnectedMsg = msgCollector.shift();

        expect(blockConnectedMsg).to.deep.equal({
            type: 'Block',
            msgType: 'BLK_CONNECTED',
            blockHash: nextBlockhash,
            blockHeight: finalizedHeight + 1,
            blockTimestamp: blockTimestamp,
        });

        // The order of confirmed and finalized txs from multiple script subscriptions is indeterminate
        // See https://reviews.bitcoinabc.org/D15452
        const txids = [p2pkhTxid, p2shTxid, p2pkTxid, otherTxid];
        const expectedTxConfirmedMsgs = [];
        for (const txid of txids) {
            expectedTxConfirmedMsgs.push({
                type: 'Tx',
                msgType: 'TX_CONFIRMED',
                txid: txid,
            });
        }

        // Expect a msg for each confirmed tx
        expect(msgCollector).to.have.deep.members(expectedTxConfirmedMsgs);

        // Only the 4 Tx Confirmed msgs are left in msgCollector
        expect(msgCollector.length).to.eql(4);
    });
    it('After this block is finalized by Avalanche', async () => {
        // Wait for expected ws msgs
        await expectWsMsgs(5, msgCollector);

        // The Block Finalized msg comes first
        const blockConnectedMsg = msgCollector.shift();

        expect(blockConnectedMsg).to.deep.equal({
            type: 'Block',
            msgType: 'BLK_FINALIZED',
            blockHash: nextBlockhash,
            blockHeight: finalizedHeight + 1,
            blockTimestamp: blockTimestamp,
        });

        // The order of confirmed and finalized txs from multiple script subscriptions is indeterminate
        // See https://reviews.bitcoinabc.org/D15452
        const txids = [p2pkhTxid, p2shTxid, p2pkTxid, otherTxid];
        const expectedTxConfirmedMsgs = [];
        for (const txid of txids) {
            expectedTxConfirmedMsgs.push({
                type: 'Tx',
                msgType: 'TX_FINALIZED',
                txid: txid,
            });
        }

        // Expect a msg for each Finalized tx
        expect(msgCollector).to.have.deep.members(expectedTxConfirmedMsgs);

        // Only the 4 Tx Finalized msgs are left in msgCollector
        expect(msgCollector.length).to.eql(4);
    });
    it('After this block is parked', async () => {
        nextBlockhash = await get_next_blockhash;
        coinbaseScriptsig = await get_coinbase_scriptsig;
        coinbaseOutValue = await get_coinbase_out_value;
        coinbaseOutScriptpubkey = await get_coinbase_out_scriptpubkey;

        // Wait for expected ws msgs
        await expectWsMsgs(5, msgCollector);

        // The Block Disconnected msg comes first
        const blockMsg = msgCollector.shift();

        // We get Block Disconnected on parked block
        expect(blockMsg).to.deep.equal({
            type: 'Block',
            msgType: 'BLK_DISCONNECTED',
            blockHash: nextBlockhash,
            blockHeight: finalizedHeight + 1,
            blockTimestamp: blockTimestamp,
            coinbaseData: {
                scriptsig: coinbaseScriptsig,
                outputs: [
                    {
                        value: coinbaseOutValue,
                        outputScript: coinbaseOutScriptpubkey,
                    },
                ],
            },
        });

        // Tx msgs on Block Disconnected come in alphabetical order
        const txids = [p2pkhTxid, p2shTxid, p2pkTxid, otherTxid].sort();
        for (let i = 0; i < txids.length; i += 1) {
            // We get msgs for TX_ADDED_TO_MEMPOOL when the connected block is parked
            const thisTxMsg = msgCollector.shift();
            expect(thisTxMsg).to.deep.equal({
                type: 'Tx',
                msgType: 'TX_ADDED_TO_MEMPOOL',
                txid: txids[i],
            });
        }

        // These are the only msgs we receive
        expect(msgCollector.length).to.eql(0);
    });
    it('After this block is unparked', async () => {
        // As when the block was first mined, we get Tx Confirmed msgs and Block Connected msg

        // Wait for expected ws msgs
        await expectWsMsgs(5, msgCollector);

        // Remove this msg from msgCollector
        const blockMsg = msgCollector.shift();

        // We get Block Connected on an unparked block
        expect(blockMsg).to.deep.equal({
            type: 'Block',
            msgType: 'BLK_CONNECTED',
            blockHash: nextBlockhash,
            blockHeight: finalizedHeight + 1,
            blockTimestamp: blockTimestamp,
        });

        // The order of confirmed and finalized txs from multiple script subscriptions is indeterminate
        // See https://reviews.bitcoinabc.org/D15452
        const txids = [p2pkhTxid, p2shTxid, p2pkTxid, otherTxid];
        const expectedTxMsgs = [];
        for (const txid of txids) {
            // We get msgs for Tx Confirmed when the parked block containing the txs is unparked
            expectedTxMsgs.push({
                type: 'Tx',
                msgType: 'TX_CONFIRMED',
                txid: txid,
            });
        }

        // Expect a msg for each confirmed tx
        expect(msgCollector).to.have.deep.members(expectedTxMsgs);

        // Only the 4 Tx msgs are left in msgCollector
        expect(msgCollector.length).to.eql(4);
    });
    it('After this block is invalidated', async () => {
        // Wait for expected ws msgs
        await expectWsMsgs(5, msgCollector);

        // The Block Disconnected msg comes first
        const blockMsg = msgCollector.shift();

        // We get Block Disconnected on invalidated block
        expect(blockMsg).to.deep.equal({
            type: 'Block',
            msgType: 'BLK_DISCONNECTED',
            blockHash: nextBlockhash,
            blockHeight: finalizedHeight + 1,
            blockTimestamp: blockTimestamp,
            coinbaseData: {
                scriptsig: coinbaseScriptsig,
                outputs: [
                    {
                        value: coinbaseOutValue,
                        outputScript: coinbaseOutScriptpubkey,
                    },
                ],
            },
        });

        // Tx msgs come in alphabetical order for Block Disconnected events
        const txids = [p2pkhTxid, p2shTxid, p2pkTxid, otherTxid].sort();
        for (let i = 0; i < txids.length; i += 1) {
            // We get msgs for TX_ADDED_TO_MEMPOOL when the connected block is invalidated
            const thisTxMsg = msgCollector.shift();
            expect(thisTxMsg).to.deep.equal({
                type: 'Tx',
                msgType: 'TX_ADDED_TO_MEMPOOL',
                txid: txids[i],
            });
        }

        // These are the only msgs we receive
        expect(msgCollector.length).to.eql(0);
    });
    it('After this block is reconsidered', async () => {
        // As when the block was first mined, we get Tx Confirmed msgs and Block Connected msg

        // Wait for expected ws msgs
        await expectWsMsgs(5, msgCollector);

        // The Block Connected msg comes first
        const blockMsg = msgCollector.shift();

        // We get Block Connected on a reconsidered block
        expect(blockMsg).to.deep.equal({
            type: 'Block',
            msgType: 'BLK_CONNECTED',
            blockHash: nextBlockhash,
            blockHeight: finalizedHeight + 1,
            blockTimestamp: blockTimestamp,
        });

        // The order of confirmed and finalized txs from multiple script subscriptions is indeterminate
        // See https://reviews.bitcoinabc.org/D15452
        const txids = [p2pkhTxid, p2shTxid, p2pkTxid, otherTxid];
        const expectedTxMsgs = [];
        for (const txid of txids) {
            // We get msgs for Tx Confirmed when the invalidated block containing the txs is reconsidered
            expectedTxMsgs.push({
                type: 'Tx',
                msgType: 'TX_CONFIRMED',
                txid: txid,
            });
        }

        // Expect a msg for each confirmed tx
        expect(msgCollector).to.have.deep.members(expectedTxMsgs);

        // Only the 4 Tx msgs are left in msgCollector
        expect(msgCollector.length).to.eql(4);
    });
    it('After a tx is broadcast with outputs of each type', async () => {
        // Wait for expected ws msgs
        await expectWsMsgs(1, msgCollector);

        mixedOutputTxid = await get_mixed_output_txid;
        // We get this message only one time, as chronik now has msg de-duplication
        const mixedOutputTxMsg = msgCollector.shift();

        expect(mixedOutputTxMsg).to.deep.equal({
            type: 'Tx',
            msgType: 'TX_ADDED_TO_MEMPOOL',
            txid: mixedOutputTxid,
        });

        // This is the only msg we get
        expect(msgCollector.length).to.eql(0);
    });
    it('After a block is mined', async () => {
        nextBlockhash = await get_next_blockhash;

        // Wait for expected ws msgs
        await expectWsMsgs(1, msgCollector);

        // The block connected msg comes first
        const blockConnectedMsg = msgCollector.shift();

        expect(blockConnectedMsg).to.deep.equal({
            type: 'Block',
            msgType: 'BLK_CONNECTED',
            blockHash: nextBlockhash,
            blockHeight: finalizedHeight + 2,
            blockTimestamp: blockTimestamp,
        });

        const mixedOutputTxMsg = msgCollector.shift();

        expect(mixedOutputTxMsg).to.deep.equal({
            type: 'Tx',
            msgType: 'TX_CONFIRMED',
            txid: mixedOutputTxid,
        });

        // This is the only msg we receive
        expect(msgCollector.length).to.eql(0);
    });
    it('After this block is avalanche parked', async () => {
        coinbaseScriptsig = await get_coinbase_scriptsig;
        coinbaseOutValue = await get_coinbase_out_value;
        coinbaseOutScriptpubkey = await get_coinbase_out_scriptpubkey;

        // Wait for expected ws msgs
        await expectWsMsgs(1, msgCollector);

        // The Block Disconnected msg comes first
        const blockMsg = msgCollector.shift();

        // We get Block Disconnected on parked block
        expect(blockMsg).to.deep.equal({
            type: 'Block',
            msgType: 'BLK_DISCONNECTED',
            blockHash: nextBlockhash,
            blockHeight: finalizedHeight + 2,
            blockTimestamp: blockTimestamp,
            coinbaseData: {
                scriptsig: coinbaseScriptsig,
                outputs: [
                    {
                        value: coinbaseOutValue,
                        outputScript: coinbaseOutScriptpubkey,
                    },
                ],
            },
        });

        const mixedOutputTxMsg = msgCollector.shift();

        expect(mixedOutputTxMsg).to.deep.equal({
            type: 'Tx',
            msgType: 'TX_ADDED_TO_MEMPOOL',
            txid: mixedOutputTxid,
        });

        // This is the only msg we receive
        expect(msgCollector.length).to.eql(0);
    });
    it('After this block is avalanche invalidated', async () => {
        // Wait for expected ws msgs
        await expectWsMsgs(1, msgCollector);

        // The Block Disconnected msg comes first
        const blockMsg = msgCollector.shift();

        // We get Block Disconnected on parked block
        expect(blockMsg).to.deep.equal({
            type: 'Block',
            msgType: 'BLK_INVALIDATED',
            blockHash: nextBlockhash,
            blockHeight: finalizedHeight + 2,
            blockTimestamp: blockTimestamp,
            coinbaseData: {
                scriptsig: coinbaseScriptsig,
                outputs: [
                    {
                        value: coinbaseOutValue,
                        outputScript: coinbaseOutScriptpubkey,
                    },
                ],
            },
        });

        // This is the only msg we receive
        expect(msgCollector.length).to.eql(0);

        // Unsubscribe from everything to show you do not get any more msgs if another block is found
        ws.unsubscribeFromBlocks();
        for (const sub of subscriptions) {
            const { scriptType, payload } = sub;
            ws.unsubscribeFromScript(scriptType, payload);
        }
        // The ws object is updated to reflect no subscriptions
        expect(ws.subs.scripts).to.deep.equal([]);
        // The ws object is updated to reflect no block subscription
        expect(ws.subs.blocks).to.eql(false);
    });
    it('After we have unsubscribed to all and another block is found', async () => {
        // We get no new msgs after unsubscribing from blocks and txs, even after block connected
        // Had we stayed subscribed, we would have expected to receive
        // Tx Confirmed msgs for the mixedTx in last step and block connected for new block
        expect(msgCollector.length).to.eql(0);
    });
});
