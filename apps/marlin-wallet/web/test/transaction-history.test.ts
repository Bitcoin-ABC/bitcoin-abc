// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import type { Tx } from 'chronik-client';
import {
    advanceHistoryCursors,
    compareHistoryTransactions,
    createHistoryCursors,
    hasMoreHistoryPages,
    kWayMergeWithEarlyStop,
    popNextKWayMergedTx,
} from '../src/transaction-history';

const expect = chai.expect;

function mockTx(txid: string, timeFirstSeen: number): Tx {
    return {
        txid,
        version: 2,
        inputs: [],
        outputs: [],
        lockTime: 0,
        timeFirstSeen,
        size: 100,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        isFinal: true,
    };
}

describe('transaction-history', function () {
    describe('kWayMergeWithEarlyStop', function () {
        it('Should sort merged txs newest first', function () {
            const merged = kWayMergeWithEarlyStop(
                [
                    [mockTx('aa'.repeat(32), 100)],
                    [mockTx('bb'.repeat(32), 200)],
                ],
                2,
            );
            expect(merged.map(tx => tx.txid)).to.deep.equal([
                'bb'.repeat(32),
                'aa'.repeat(32),
            ]);
        });

        it('Should sort by lower txid when sort times tie', function () {
            const merged = kWayMergeWithEarlyStop(
                [
                    [mockTx('bb'.repeat(32), 100)],
                    [mockTx('aa'.repeat(32), 100)],
                ],
                2,
            );
            expect(merged.map(tx => tx.txid)).to.deep.equal([
                'aa'.repeat(32),
                'bb'.repeat(32),
            ]);
        });

        it('Should dedupe txs by txid across streams', function () {
            const txid = 'cc'.repeat(32);
            const merged = kWayMergeWithEarlyStop(
                [[mockTx(txid, 100)], [mockTx(txid, 100)]],
                2,
            );
            expect(merged).to.have.length(1);
            expect(merged[0].txid).to.equal(txid);
        });

        it('Should stop after target counted txs', function () {
            const merged = kWayMergeWithEarlyStop(
                [
                    [
                        mockTx('11'.repeat(32), 300),
                        mockTx('22'.repeat(32), 200),
                    ],
                    [mockTx('33'.repeat(32), 100)],
                ],
                2,
            );
            expect(merged).to.have.length(2);
            expect(merged.map(tx => tx.txid)).to.deep.equal([
                '11'.repeat(32),
                '22'.repeat(32),
            ]);
        });

        it('Should skip non-counted txs toward the target', function () {
            const countedTxid = '44'.repeat(32);
            const merged = kWayMergeWithEarlyStop(
                [
                    [mockTx('55'.repeat(32), 300), mockTx(countedTxid, 200)],
                    [mockTx('66'.repeat(32), 100)],
                ],
                1,
                tx => tx.txid === countedTxid,
            );
            expect(merged.map(tx => tx.txid)).to.deep.equal([
                '55'.repeat(32),
                countedTxid,
            ]);
        });

        it('Should merge five address streams of ten txs each in global order', function () {
            const streamCount = 5;
            const txsPerStream = 10;
            const streams: Tx[][] = [];

            for (
                let streamIndex = 0;
                streamIndex < streamCount;
                streamIndex++
            ) {
                const streamTxs: Tx[] = [];
                for (let txIndex = 0; txIndex < txsPerStream; txIndex++) {
                    const txid = (streamIndex * txsPerStream + txIndex)
                        .toString(16)
                        .padStart(64, '0');
                    const timeFirstSeen =
                        10_000 - streamIndex * 11 - txIndex * 3;
                    streamTxs.push(mockTx(txid, timeFirstSeen));
                }
                streams.push(streamTxs);
            }

            const merged = kWayMergeWithEarlyStop(
                streams,
                streamCount * txsPerStream,
            );
            const expected = streams.flat().sort(compareHistoryTransactions);

            expect(merged).to.have.length(streamCount * txsPerStream);
            expect(merged.map(tx => tx.txid)).to.deep.equal(
                expected.map(tx => tx.txid),
            );

            for (let i = 0; i < merged.length - 1; i++) {
                expect(
                    compareHistoryTransactions(merged[i], merged[i + 1]),
                ).to.be.lessThan(0);
            }
        });
    });

    describe('popNextKWayMergedTx', function () {
        it('Should return null when all streams are empty', function () {
            const tx = popNextKWayMergedTx(
                [
                    { txs: [], index: 0 },
                    { txs: [], index: 0 },
                ],
                new Set(),
            );
            expect(tx).to.equal(null);
        });
    });

    describe('advanceHistoryCursors', function () {
        it('Should mark cursor exhausted on last page', function () {
            const cursors = createHistoryCursors(['ecash:qtest']);
            advanceHistoryCursors(cursors, [
                { txs: [mockTx('dd'.repeat(32), 1)], numPages: 1 },
            ]);
            expect(cursors[0].exhausted).to.be.equal(true);
            expect(cursors[0].page).to.be.equal(0);
        });

        it('Should increment page when more pages exist', function () {
            const cursors = createHistoryCursors(['ecash:qtest']);
            advanceHistoryCursors(cursors, [
                {
                    txs: [mockTx('ee'.repeat(32), 1)],
                    numPages: 3,
                },
            ]);
            expect(cursors[0].exhausted).to.be.equal(false);
            expect(cursors[0].page).to.be.equal(1);
        });

        it('Should advance each cursor independently', function () {
            const cursors = createHistoryCursors(['ecash:qone', 'ecash:qtwo']);
            advanceHistoryCursors(cursors, [
                { txs: [mockTx('ff'.repeat(32), 1)], numPages: 2 },
                { txs: [], numPages: 0 },
            ]);
            expect(cursors[0].page).to.be.equal(1);
            expect(cursors[0].exhausted).to.be.equal(false);
            expect(cursors[1].exhausted).to.be.equal(true);
        });
    });

    describe('hasMoreHistoryPages', function () {
        it('Should return false when all cursors are exhausted', function () {
            const cursors = createHistoryCursors(['ecash:qtest']);
            cursors[0].exhausted = true;
            expect(hasMoreHistoryPages(cursors)).to.be.equal(false);
        });

        it('Should return true when any cursor is not exhausted', function () {
            const cursors = createHistoryCursors(['ecash:qone', 'ecash:qtwo']);
            cursors[0].exhausted = true;
            expect(hasMoreHistoryPages(cursors)).to.be.equal(true);
        });
    });

    describe('compareHistoryTransactions', function () {
        it('Should break ties with lower txid first', function () {
            const lower = mockTx('aa'.repeat(32), 100);
            const higher = mockTx('bb'.repeat(32), 100);
            expect(compareHistoryTransactions(lower, higher)).to.be.lessThan(0);
            expect(compareHistoryTransactions(higher, lower)).to.be.greaterThan(
                0,
            );
        });

        it('Should prefer timeFirstSeen over block timestamp', function () {
            const withTimeFirstSeen = mockTx('11'.repeat(32), 500);
            withTimeFirstSeen.block = {
                height: 1,
                hash: '00'.repeat(32),
                timestamp: 100,
            };
            const withBlockOnly = mockTx('22'.repeat(32), 0);
            withBlockOnly.block = {
                height: 1,
                hash: '00'.repeat(32),
                timestamp: 400,
            };
            expect(
                compareHistoryTransactions(withTimeFirstSeen, withBlockOnly),
            ).to.be.lessThan(0);
        });

        it('Should prefer newer block timestamp when timeFirstSeen ties', function () {
            const olderBlock = mockTx('33'.repeat(32), 100);
            olderBlock.block = {
                height: 1,
                hash: '00'.repeat(32),
                timestamp: 200,
            };
            const newerBlock = mockTx('44'.repeat(32), 100);
            newerBlock.block = {
                height: 2,
                hash: '11'.repeat(32),
                timestamp: 300,
            };
            expect(
                compareHistoryTransactions(newerBlock, olderBlock),
            ).to.be.lessThan(0);
        });

        it('Should break ties with lower txid only when both times match', function () {
            const lower = mockTx('aa'.repeat(32), 100);
            lower.block = {
                height: 1,
                hash: '00'.repeat(32),
                timestamp: 200,
            };
            const higher = mockTx('bb'.repeat(32), 100);
            higher.block = {
                height: 1,
                hash: '00'.repeat(32),
                timestamp: 200,
            };
            expect(compareHistoryTransactions(lower, higher)).to.be.lessThan(0);
        });
    });
});
