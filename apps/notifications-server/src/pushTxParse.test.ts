// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { notificationFixtures } from 'ecash-parse/fixtures';
import { ParsedTokenTxType, XecTxType } from 'ecash-parse';
import {
    FIRMA_TOKEN_ID,
    FIRMA_YIELD_OUTPUT_SCRIPT,
} from './constants/hotTokenGenesisInfo';
import { summarizePushTxForWalletHash } from './pushTxParse';

/**
 * ecash-parse notification fixtures store walletHashes as a 20-byte P2PKH pubkey
 * hash or a full P2PKH output script. A few fixtures append trailing script bytes;
 * strip those when matching. Cashtab wallets are P2PKH-only — production code uses
 * decodeCashAddress(activeAddress) instead of this helper.
 */
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

const isXecxPayoutFixture = (
    fixture: (typeof notificationFixtures)[number],
): boolean => {
    const action = fixture.parsedTx.appActions[0];
    return (
        fixture.parsedTx.parsedTokenEntries.length === 0 &&
        action?.app === 'XECX' &&
        action.isValid === true
    );
};

const isFirmaYieldFixture = (
    fixture: (typeof notificationFixtures)[number],
): boolean => {
    const entry = fixture.parsedTx.parsedTokenEntries[0];
    return (
        typeof fixture.tx !== 'undefined' &&
        !fixture.tx.isCoinbase &&
        fixture.tx.inputs[0]?.outputScript === FIRMA_YIELD_OUTPUT_SCRIPT &&
        entry?.tokenId === FIRMA_TOKEN_ID
    );
};

const expectedPushTitle = (fixture: (typeof notificationFixtures)[number]) => {
    if (isXecxPayoutFixture(fixture)) {
        return 'Daily XECX Payout';
    }
    if (isFirmaYieldFixture(fixture)) {
        return 'Daily Firma Rewards';
    }
    const entry = fixture.parsedTx.parsedTokenEntries[0];
    if (entry?.renderedTxType === ParsedTokenTxType.AgoraSale) {
        const genesisInfo = fixture.genesisInfo;
        const ticker =
            genesisInfo?.tokenTicker ||
            genesisInfo?.tokenName ||
            `${entry.tokenId.slice(0, 5)}...${entry.tokenId.slice(-5)}`;
        return `${ticker} Sold`;
    }
    return 'Payment received';
};

const expectedPushBody = (fixture: (typeof notificationFixtures)[number]) => {
    if (isXecxPayoutFixture(fixture)) {
        return fixture.expected?.replace(/^XECX \| Received /, 'You received ');
    }
    if (isFirmaYieldFixture(fixture)) {
        const ticker = fixture.genesisInfo?.tokenTicker;
        const name = fixture.genesisInfo?.tokenName;
        if (
            typeof fixture.expected === 'string' &&
            typeof ticker === 'string' &&
            ticker !== '' &&
            typeof name === 'string' &&
            name !== '' &&
            fixture.expected.endsWith(ticker)
        ) {
            return `${fixture.expected.slice(0, -ticker.length)}${name}`;
        }
    }
    return fixture.expected;
};

describe('summarizePushTxForAddress', () => {
    for (const fixture of notificationFixtures) {
        if (
            fixture.parsedTx.xecTxType === XecTxType.Sent ||
            typeof fixture.expected === 'undefined' ||
            !fixture.tx ||
            !fixture.walletHashes?.length
        ) {
            continue;
        }

        it(fixture.description, () => {
            const tokenId = fixture.parsedTx.parsedTokenEntries[0]?.tokenId;
            const genesisInfoByTokenId = fixture.genesisInfo
                ? new Map([[tokenId ?? '', fixture.genesisInfo]])
                : undefined;

            const expectedBody = expectedPushBody(fixture);
            const matchingHash = fixture.walletHashes!.find(hash => {
                const summary = summarizePushTxForWalletHash(
                    fixture.tx!,
                    normalizeWalletHash(hash),
                    {
                        fiatPrice: fixture.fiatPrice,
                        locale: fixture.userLocale,
                        fiatTicker: fixture.selectedFiatTicker,
                        genesisInfoByTokenId,
                    },
                );
                return summary?.body === expectedBody;
            });

            assert.ok(
                matchingHash,
                `expected a wallet hash to produce notification: ${expectedBody}`,
            );

            const summary = summarizePushTxForWalletHash(
                fixture.tx!,
                normalizeWalletHash(matchingHash!),
                {
                    fiatPrice: fixture.fiatPrice,
                    locale: fixture.userLocale,
                    fiatTicker: fixture.selectedFiatTicker,
                    genesisInfoByTokenId,
                },
            );
            assert.strictEqual(summary?.title, expectedPushTitle(fixture));
            assert.strictEqual(summary?.body, expectedBody);
            if (typeof tokenId === 'string' && tokenId.length > 0) {
                assert.strictEqual(summary?.tokenId, tokenId);
            } else {
                assert.strictEqual(summary?.tokenId, undefined);
            }
        });
    }
});

describe('daily reward push copy', () => {
    it('titles a valid XECX payout and says You received', () => {
        const fixture = notificationFixtures.find(
            f => f.description === 'xecx tx',
        );
        assert.ok(fixture?.tx && fixture.walletHashes?.length);
        const summary = summarizePushTxForWalletHash(
            fixture.tx,
            normalizeWalletHash(fixture.walletHashes[0]),
            {
                fiatPrice: fixture.fiatPrice,
                locale: fixture.userLocale,
                fiatTicker: fixture.selectedFiatTicker,
            },
        );
        assert.strictEqual(summary?.title, 'Daily XECX Payout');
        assert.strictEqual(summary?.body, 'You received 312.5k XEC');
    });

    it('leaves invalid XECX as a generic payment received', () => {
        const fixture = notificationFixtures.find(
            f => f.description === 'invalid xecx tx',
        );
        assert.ok(fixture?.tx && fixture.walletHashes?.length);
        const summary = summarizePushTxForWalletHash(
            fixture.tx,
            normalizeWalletHash(fixture.walletHashes[0]),
            {
                fiatPrice: fixture.fiatPrice,
                locale: fixture.userLocale,
                fiatTicker: fixture.selectedFiatTicker,
            },
        );
        assert.strictEqual(summary?.title, 'Payment received');
        assert.strictEqual(summary?.body, 'Received 312.5k XEC | Invalid XECX');
    });

    it('titles Firma yield as Daily Firma Rewards and uses the token name', () => {
        const fixture = notificationFixtures.find(
            f => f.description === 'Firma yield tx (receive)',
        );
        assert.ok(fixture?.tx && fixture.walletHashes?.length);
        const tokenId = fixture.parsedTx.parsedTokenEntries[0]?.tokenId;
        const summary = summarizePushTxForWalletHash(
            fixture.tx,
            normalizeWalletHash(fixture.walletHashes[0]),
            {
                fiatPrice: fixture.fiatPrice,
                locale: fixture.userLocale,
                fiatTicker: fixture.selectedFiatTicker,
                genesisInfoByTokenId: fixture.genesisInfo
                    ? new Map([[tokenId ?? '', fixture.genesisInfo]])
                    : undefined,
            },
        );
        assert.strictEqual(summary?.title, 'Daily Firma Rewards');
        assert.strictEqual(summary?.body, 'Received 0.0195 Firma');
    });
});
