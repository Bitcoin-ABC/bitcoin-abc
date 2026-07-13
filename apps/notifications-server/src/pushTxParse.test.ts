// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { notificationFixtures } from 'ecash-parse/fixtures';
import { ParsedTokenTxType, XecTxType } from 'ecash-parse';
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

const expectedPushTitle = (fixture: (typeof notificationFixtures)[number]) => {
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
                return summary?.body === fixture.expected;
            });

            assert.ok(
                matchingHash,
                `expected a wallet hash to produce notification: ${fixture.expected}`,
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
            if (typeof tokenId === 'string' && tokenId.length > 0) {
                assert.strictEqual(summary?.tokenId, tokenId);
            } else {
                assert.strictEqual(summary?.tokenId, undefined);
            }
        });
    }
});
