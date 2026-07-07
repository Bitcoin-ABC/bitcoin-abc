// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { getTxNotificationMsg } from './getTxNotificationMsg';
import { notificationFixtures } from './fixtures/vectors';
import { powNotificationFixtures } from './fixtures/powFixtures';

describe('getTxNotificationMsg', () => {
    for (const fixture of [
        ...notificationFixtures,
        ...powNotificationFixtures,
    ]) {
        it(fixture.description, () => {
            assert.strictEqual(
                getTxNotificationMsg(
                    fixture.parsedTx,
                    fixture.fiatPrice,
                    fixture.userLocale,
                    fixture.selectedFiatTicker,
                    fixture.genesisInfo,
                ),
                fixture.expected,
            );
        });
    }
});
