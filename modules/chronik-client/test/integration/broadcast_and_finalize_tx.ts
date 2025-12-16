// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import { ChronikClient } from '../../index';
import initializeTestRunner, {
    cleanupMochaRegtest,
    setMochaTimeout,
    TestInfo,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Test broadcastTx and broadcastTxs methods with avalanche finalization', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;
    const statusEvent = new EventEmitter();
    let get_test_info: Promise<TestInfo>;
    let chronikUrl: string[];
    let setupScriptTermination: ReturnType<typeof setTimeout>;
    let get_tx_no_wait_rawtx: Promise<string>;
    let get_tx_no_wait_txid: Promise<string>;
    let get_txs_no_wait_rawtxs: Promise<string[]>;
    let get_txs_no_wait_txids: Promise<string[]>;
    let get_tx_wait_success_rawtx: Promise<string>;
    let get_tx_wait_success_txid: Promise<string>;
    let get_tx_wait_timeout_rawtx: Promise<string>;
    let get_tx_wait_timeout_txid: Promise<string>;
    let get_txs_wait_success_rawtxs: Promise<string[]>;
    let get_txs_wait_success_txids: Promise<string[]>;
    let get_txs_wait_timeout_rawtxs: Promise<string[]>;
    let get_txs_wait_timeout_txids: Promise<string[]>;

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

            if (message && message.tx_no_wait_rawtx) {
                get_tx_no_wait_rawtx = new Promise(resolve => {
                    resolve(message.tx_no_wait_rawtx);
                });
            }

            if (message && message.tx_no_wait_txid) {
                get_tx_no_wait_txid = new Promise(resolve => {
                    resolve(message.tx_no_wait_txid);
                });
            }

            if (message && message.txs_no_wait_rawtxs) {
                get_txs_no_wait_rawtxs = new Promise(resolve => {
                    resolve(message.txs_no_wait_rawtxs);
                });
            }

            if (message && message.txs_no_wait_txids) {
                get_txs_no_wait_txids = new Promise(resolve => {
                    resolve(message.txs_no_wait_txids);
                });
            }

            if (message && message.tx_wait_success_rawtx) {
                get_tx_wait_success_rawtx = new Promise(resolve => {
                    resolve(message.tx_wait_success_rawtx);
                });
            }

            if (message && message.tx_wait_success_txid) {
                get_tx_wait_success_txid = new Promise(resolve => {
                    resolve(message.tx_wait_success_txid);
                });
            }

            if (message && message.tx_wait_timeout_rawtx) {
                get_tx_wait_timeout_rawtx = new Promise(resolve => {
                    resolve(message.tx_wait_timeout_rawtx);
                });
            }

            if (message && message.tx_wait_timeout_txid) {
                get_tx_wait_timeout_txid = new Promise(resolve => {
                    resolve(message.tx_wait_timeout_txid);
                });
            }

            if (message && message.txs_wait_success_rawtxs) {
                get_txs_wait_success_rawtxs = new Promise(resolve => {
                    resolve(message.txs_wait_success_rawtxs);
                });
            }

            if (message && message.txs_wait_success_txids) {
                get_txs_wait_success_txids = new Promise(resolve => {
                    resolve(message.txs_wait_success_txids);
                });
            }

            if (message && message.txs_wait_timeout_rawtxs) {
                get_txs_wait_timeout_rawtxs = new Promise(resolve => {
                    resolve(message.txs_wait_timeout_rawtxs);
                });
            }

            if (message && message.txs_wait_timeout_txids) {
                get_txs_wait_timeout_txids = new Promise(resolve => {
                    resolve(message.txs_wait_timeout_txids);
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
        testRunner.send('next');
    });

    it('Broadcast tx without waiting for finalization', async () => {
        const chronik = new ChronikClient(chronikUrl);

        const txNoWaitRawTx = await get_tx_no_wait_rawtx;
        const txNoWaitTxid = await get_tx_no_wait_txid;

        // We can't use the broadcastAndFinalizeTx method if we are not waiting for finalization
        await expect(
            chronik.broadcastAndFinalizeTx(txNoWaitRawTx, 0),
        ).to.be.rejectedWith(
            Error,
            'Use broadcastTx if you do not want to wait for finalization.',
        );

        // Use broadcastTx if we are not waiting
        const result = await chronik.broadcastTx(txNoWaitRawTx);
        expect(result.txid).to.eql(txNoWaitTxid);

        // Verify tx is in mempool
        const txInMempool = await chronik.tx(txNoWaitTxid);
        expect(txInMempool.txid).to.eql(txNoWaitTxid);
    });

    it('Broadcast multiple txs without waiting for finalization', async () => {
        const chronik = new ChronikClient(chronikUrl);

        const txsNoWaitRawTxs = await get_txs_no_wait_rawtxs;
        const txsNoWaitTxids = await get_txs_no_wait_txids;

        // We can't use the broadcastAndFinalizeTxs method if we are not waiting for finalization
        await expect(
            chronik.broadcastAndFinalizeTxs(txsNoWaitRawTxs, 0),
        ).to.be.rejectedWith(
            Error,
            'Use broadcastTxs if you do not want to wait for finalization.',
        );

        // Use broadcastTxs if we are not waiting
        const result = await chronik.broadcastTxs(txsNoWaitRawTxs);
        expect(result.txids).to.deep.equal(txsNoWaitTxids);

        // Verify all txs are in mempool
        for (const txid of txsNoWaitTxids) {
            const txInMempool = await chronik.tx(txid);
            expect(txInMempool.txid).to.eql(txid);
        }
    });

    it('Broadcast tx with waiting for finalization (successful)', async () => {
        const chronik = new ChronikClient(chronikUrl);

        const txWaitSuccessRawTx = await get_tx_wait_success_rawtx;
        const txWaitSuccessTxid = await get_tx_wait_success_txid;

        // Broadcast with waiting for finalization (30 seconds timeout)
        // The setup script will finalize the tx after we signal it
        const broadcastPromise = chronik.broadcastAndFinalizeTx(
            txWaitSuccessRawTx,
            30,
        );

        // Assert the tx is in mempool before signaling the setup script
        const txInMempool = await chronik.tx(txWaitSuccessTxid);
        expect(txInMempool.txid).to.eql(txWaitSuccessTxid);

        // Signal the setup script to finalize the tx
        testRunner.send('next');
        await once(statusEvent, 'ready');

        // Wait for finalization to complete
        const result = await broadcastPromise;
        expect(result.txid).to.eql(txWaitSuccessTxid);
    });

    it('Broadcast tx with waiting for finalization (timeout)', async () => {
        const chronik = new ChronikClient(chronikUrl);

        const txWaitTimeoutRawTx = await get_tx_wait_timeout_rawtx;
        const txWaitTimeoutTxid = await get_tx_wait_timeout_txid;

        // Broadcast with waiting for finalization but with short timeout (2 seconds)
        // The setup script will NOT finalize this tx, so it should timeout
        await expect(
            chronik.broadcastAndFinalizeTx(txWaitTimeoutRawTx, 2),
        ).to.be.rejectedWith(
            Error,
            '504: Transaction(s) failed to finalize within 2s',
        );

        // Verify tx is still in mempool
        const txInMempool = await chronik.tx(txWaitTimeoutTxid);
        expect(txInMempool.txid).to.eql(txWaitTimeoutTxid);
    });

    it('Broadcast multiple txs with waiting for finalization (successful)', async () => {
        const chronik = new ChronikClient(chronikUrl);

        const txsWaitSuccessRawTxs = await get_txs_wait_success_rawtxs;
        const txsWaitSuccessTxids = await get_txs_wait_success_txids;

        // Broadcast multiple txs with waiting for finalization (30 seconds timeout)
        // The setup script will finalize the txs after we signal it
        const broadcastPromise = chronik.broadcastAndFinalizeTxs(
            txsWaitSuccessRawTxs,
            30,
        );

        // Signal the setup script to finalize the txs (it will wait for them to be in mempool)
        testRunner.send('next');
        await once(statusEvent, 'ready');

        // Assert all txs are in mempool and not finalized
        for (const txid of txsWaitSuccessTxids) {
            const txInMempool = await chronik.tx(txid);
            expect(txInMempool.txid).to.eql(txid);
            expect(txInMempool.isFinal).to.eql(false);
        }

        // Wait for the setup script to finalize the txs
        testRunner.send('next');
        await once(statusEvent, 'ready');

        // Wait for finalization to complete (broadcast promise will resolve when txs are finalized)
        const result = await broadcastPromise;
        expect(result.txids).to.deep.equal(txsWaitSuccessTxids);
    });

    it('Broadcast multiple txs with waiting for finalization (timeout)', async () => {
        const chronik = new ChronikClient(chronikUrl);

        const txsWaitTimeoutRawTxs = await get_txs_wait_timeout_rawtxs;
        const txsWaitTimeoutTxids = await get_txs_wait_timeout_txids;

        // Broadcast multiple txs with waiting for finalization but with short timeout (2 seconds)
        // The setup script will NOT finalize these txs, so it should timeout
        await expect(
            chronik.broadcastAndFinalizeTxs(txsWaitTimeoutRawTxs, 2),
        ).to.be.rejectedWith(
            Error,
            '504: Transaction(s) failed to finalize within 2s',
        );

        // Verify all txs are still in mempool
        for (const txid of txsWaitTimeoutTxids) {
            const txInMempool = await chronik.tx(txid);
            expect(txInMempool.txid).to.eql(txid);
            expect(txInMempool.isFinal).to.eql(false);
        }
    });
});
