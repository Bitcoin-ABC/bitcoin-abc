// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { ChronikClient, Tx } from 'chronik-client';
import { notificationFixtures } from 'ecash-parse/fixtures';
import {
    fetchCoinbaseTxForBlock,
    getSubscribedAddressesWithTxOutputs,
} from './pushAddressWs';

const STAKING_FIXTURE = notificationFixtures.find(
    fixture => fixture.description === 'Staking rewards coinbase tx',
);

describe('pushAddressWs', () => {
    describe('getSubscribedAddressesWithTxOutputs', () => {
        it('returns subscribed P2PKH addresses present in tx outputs', () => {
            const tx = STAKING_FIXTURE?.tx as Tx;
            const addresses = new Set([
                'ecash:qr689ree3wukyetgqv6xld9vghthvpq69cg04xjp57',
                'ecash:qp3wjpa3tjkj0465wkr0s494uk4znyxlyev79fpx0l',
            ]);

            const matches = getSubscribedAddressesWithTxOutputs(tx, addresses);

            assert.deepStrictEqual(matches, [
                'ecash:qr689ree3wukyetgqv6xld9vghthvpq69cg04xjp57',
            ]);
        });
    });

    describe('fetchCoinbaseTxForBlock', () => {
        it('returns the first coinbase tx from block-txs page 0', async () => {
            const coinbaseTx = STAKING_FIXTURE?.tx as Tx;
            const chronik = {
                blockTxs: async () => ({
                    txs: [coinbaseTx],
                    numPages: 1,
                    numTxs: 1,
                }),
            } as unknown as ChronikClient;

            const result = await fetchCoinbaseTxForBlock(
                chronik,
                coinbaseTx.block!.hash,
            );

            assert.strictEqual(result?.txid, coinbaseTx.txid);
            assert.strictEqual(result?.isCoinbase, true);
        });

        it('returns null when the first tx is not coinbase', async () => {
            const nonCoinbaseTx = {
                ...(STAKING_FIXTURE?.tx as Tx),
                isCoinbase: false,
            };
            const chronik = {
                blockTxs: async () => ({
                    txs: [nonCoinbaseTx],
                    numPages: 1,
                    numTxs: 1,
                }),
            } as unknown as ChronikClient;

            const result = await fetchCoinbaseTxForBlock(
                chronik,
                '000000000000000009520291eb09aacd13b7bb802f329b584dafbc036a15b4cb',
            );

            assert.strictEqual(result, null);
        });
    });
});
