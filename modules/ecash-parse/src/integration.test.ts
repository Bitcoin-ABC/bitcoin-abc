// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { getTxNotificationMsg } from './getTxNotificationMsg';
import { parseTx } from './parseTx';
import { notificationFixtures } from './fixtures/vectors';

const normalizeWalletHash = (hashOrScript: string): string => {
    if (/^[0-9a-f]{40}$/i.test(hashOrScript)) {
        return hashOrScript;
    }
    if (/^[0-9a-f]{42}$/i.test(hashOrScript)) {
        return hashOrScript.slice(0, 40);
    }
    const p2pkhMatch = hashOrScript.match(/^76a914([0-9a-f]{40})88ac$/i);
    if (p2pkhMatch) {
        return p2pkhMatch[1];
    }
    throw new Error(`Cannot normalize wallet hash: ${hashOrScript}`);
};

describe('parseTx + getTxNotificationMsg integration', () => {
    for (const fixture of notificationFixtures) {
        const { tx, walletHashes } = fixture;
        if (!tx || !walletHashes?.length) {
            continue;
        }

        it(fixture.description, () => {
            for (const hashOrScript of walletHashes) {
                if (typeof hashOrScript !== 'string') {
                    continue;
                }
                const walletHash = normalizeWalletHash(hashOrScript);
                const parsed = parseTx(tx, [walletHash]);
                const msg = getTxNotificationMsg(
                    parsed,
                    fixture.fiatPrice,
                    fixture.userLocale,
                    fixture.selectedFiatTicker,
                    fixture.genesisInfo,
                );
                if (parsed.xecTxType === fixture.parsedTx.xecTxType) {
                    assert.strictEqual(msg, fixture.expected);
                    return;
                }
            }
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
