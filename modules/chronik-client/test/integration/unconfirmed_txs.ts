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

describe('/unconfirmed-txs', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;
    const statusEvent = new EventEmitter();
    let get_test_info: Promise<TestInfo>;
    let chronikUrl: string[];
    let setupScriptTermination: ReturnType<typeof setTimeout>;
    let get_mempool_txids: Promise<string[]>;
    let get_mempool_time_first_seen: Promise<number[]>;
    let get_remaining_txids: Promise<string[]>;
    let get_remaining_time_first_seen: Promise<number[]>;

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

            if (message && message.mempool_txids) {
                get_mempool_txids = new Promise(resolve => {
                    resolve(message.mempool_txids);
                });
            }

            if (message && message.mempool_time_first_seen) {
                get_mempool_time_first_seen = new Promise(resolve => {
                    resolve(message.mempool_time_first_seen);
                });
            }

            if (message && message.remaining_txids) {
                get_remaining_txids = new Promise(resolve => {
                    resolve(message.remaining_txids);
                });
            }

            if (message && message.remaining_time_first_seen) {
                get_remaining_time_first_seen = new Promise(resolve => {
                    resolve(message.remaining_time_first_seen);
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

    it('No txs in mempool when no txs have been broadcast', async () => {
        const chronik = new ChronikClient(chronikUrl);
        const unconfirmedTxs = await chronik.unconfirmedTxs();
        expect(unconfirmedTxs).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });
    });

    it('Get unconfirmed txs from mempool, sorted by timeFirstSeen and then txid', async () => {
        const mempoolTxids = await get_mempool_txids;
        const mempoolTimeFirstSeen = await get_mempool_time_first_seen;

        const chronik = new ChronikClient(chronikUrl);
        const unconfirmedTxs = await chronik.unconfirmedTxs();

        // Should have 10 txs
        expect(unconfirmedTxs.numTxs).to.eql(10);
        expect(unconfirmedTxs.numPages).to.eql(1);
        expect(unconfirmedTxs.txs.length).to.eql(10);

        // Verify all txids are present
        const fetchedTxids = unconfirmedTxs.txs.map(tx => tx.txid);
        expect(fetchedTxids).to.have.members(mempoolTxids);

        // Verify txs are sorted by timeFirstSeen and then by txid
        for (let i = 0; i < unconfirmedTxs.txs.length; i += 1) {
            const tx = unconfirmedTxs.txs[i];
            expect(tx.timeFirstSeen).to.be.a('number');
            expect(tx.txid).to.be.a('string');

            // Verify timeFirstSeen matches expected value
            const txIndex = mempoolTxids.indexOf(tx.txid);
            expect(txIndex).to.be.greaterThan(-1);
            expect(tx.timeFirstSeen).to.eql(mempoolTimeFirstSeen[txIndex]);
        }

        // Verify sorting: by timeFirstSeen, then by txid (alphabetical)
        for (let i = 0; i < unconfirmedTxs.txs.length - 1; i += 1) {
            const current = unconfirmedTxs.txs[i];
            const next = unconfirmedTxs.txs[i + 1];

            const isSorted =
                current.timeFirstSeen < next.timeFirstSeen ||
                (current.timeFirstSeen === next.timeFirstSeen &&
                    current.txid <= next.txid);
            expect(
                isSorted,
                `Tx at index ${i} should come before index ${
                    i + 1
                }. Current: timeFirstSeen=${current.timeFirstSeen}, txid=${
                    current.txid
                }. Next: timeFirstSeen=${next.timeFirstSeen}, txid=${
                    next.txid
                }`,
            ).to.equal(true);
        }
    });

    it('Only unconfirmed txs remain after mining some txs', async () => {
        const remainingTxids = await get_remaining_txids;
        const remainingTimeFirstSeen = await get_remaining_time_first_seen;

        const chronik = new ChronikClient(chronikUrl);
        const unconfirmedTxs = await chronik.unconfirmedTxs();

        // Should have 5 remaining txs
        expect(unconfirmedTxs.numTxs).to.eql(5);
        expect(unconfirmedTxs.numPages).to.eql(1);
        expect(unconfirmedTxs.txs.length).to.eql(5);

        // Verify only the remaining txids are present
        const fetchedTxids = unconfirmedTxs.txs.map(tx => tx.txid);
        expect(fetchedTxids).to.have.members(remainingTxids);
        expect(fetchedTxids.length).to.eql(remainingTxids.length);

        // Verify timeFirstSeen matches expected values
        for (let i = 0; i < unconfirmedTxs.txs.length; i += 1) {
            const tx = unconfirmedTxs.txs[i];
            const txIndex = remainingTxids.indexOf(tx.txid);
            expect(txIndex).to.be.greaterThan(-1);
            expect(tx.timeFirstSeen).to.eql(remainingTimeFirstSeen[txIndex]);
        }

        // Verify txs are sorted correctly
        for (let i = 0; i < unconfirmedTxs.txs.length - 1; i += 1) {
            const current = unconfirmedTxs.txs[i];
            const next = unconfirmedTxs.txs[i + 1];

            const isSorted =
                current.timeFirstSeen < next.timeFirstSeen ||
                (current.timeFirstSeen === next.timeFirstSeen &&
                    current.txid <= next.txid);
            expect(
                isSorted,
                `Tx at index ${i} should come before index ${
                    i + 1
                }. Current: timeFirstSeen=${current.timeFirstSeen}, txid=${
                    current.txid
                }. Next: timeFirstSeen=${next.timeFirstSeen}, txid=${
                    next.txid
                }`,
            ).to.equal(true);
        }
    });
});
