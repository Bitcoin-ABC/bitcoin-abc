// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { MockChronikClient } from '../../../../modules/mock-chronik-client';
import { getHistoryAfterTimestamp } from '../../src/chronik/clientHandler';
import vectors from '../../test/vectors';

describe('chronik/clientHandler.js', function () {
    describe('We can get all tx history from after a given timestamp', function () {
        const { returns, errors } = vectors.getHistoryAfterTimestamp;

        returns.forEach(vector => {
            const {
                description,
                mocks,
                address,
                timestamp,
                pageSize,
                returned,
            } = vector;

            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            mockedChronik.setAddress(address);
            mockedChronik.setTxHistoryByAddress(address, mocks.history);
            it(description, async function () {
                assert.deepEqual(
                    await getHistoryAfterTimestamp(
                        mockedChronik,
                        address,
                        timestamp,
                        pageSize,
                    ),
                    returned,
                );
            });
        });

        errors.forEach(vector => {
            const { description, mocks, address, timestamp, pageSize, error } =
                vector;

            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            mockedChronik.setAddress(address);
            mockedChronik.setTxHistoryByAddress(address, mocks.history);

            it(description, async function () {
                await assert.rejects(
                    getHistoryAfterTimestamp(
                        mockedChronik,
                        address,
                        timestamp,
                        pageSize,
                    ),
                    error,
                );
            });
        });
    });
});
