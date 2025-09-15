// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { sendReward, sendXecAirdrop } from '../src/transactions';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import vectors from '../test/vectors';
import { fromHex } from 'ecash-lib';
import { ChronikClient } from 'chronik-client';
import { Wallet } from 'ecash-wallet';

const MOCK_SK = fromHex(
    'd8b9d9868e5e55f98e241a48f905dce1fc6ae5d0d7be69109ccac8c7d09ce57a',
);

describe('transactions.ts', function () {
    describe('We can build and broadcast a token reward tx', function () {
        const { returns, errors } = vectors.sendReward;
        returns.forEach(vector => {
            const {
                description,
                utxos,
                tokenId,
                rewardAmountTokenSats,
                destinationAddress,
                rawTx,
                returned,
            } = vector;
            const mockChronik = new MockChronikClient();

            const wallet = Wallet.fromSk(
                MOCK_SK,
                mockChronik as unknown as ChronikClient,
            );

            // Set mocks in chronik-client
            mockChronik.setUtxosByAddress(wallet.address, utxos);
            mockChronik.setBroadcastTx(rawTx, returned.broadcasted[0]);

            it(description, async function () {
                assert.deepEqual(
                    await sendReward(
                        wallet,
                        tokenId,
                        rewardAmountTokenSats,
                        destinationAddress,
                    ),
                    returned,
                );
            });
        });
        errors.forEach(vector => {
            const {
                description,
                utxos,
                tokenId,
                rewardAmountTokenSats,
                destinationAddress,
                error,
            } = vector;
            const mockChronik = new MockChronikClient();
            const wallet = Wallet.fromSk(
                MOCK_SK,
                mockChronik as unknown as ChronikClient,
            );

            // Set mocks in chronik-client
            mockChronik.setUtxosByAddress(wallet.address, utxos);
            it(description, async function () {
                await assert.rejects(
                    sendReward(
                        wallet,
                        tokenId,
                        rewardAmountTokenSats,
                        destinationAddress,
                    ),
                    error,
                );
            });
        });
    });
    describe('We can build and broadcast an XEC airdrop tx', function () {
        const { returns, errors } = vectors.sendXecAirdrop;
        returns.forEach(vector => {
            const {
                description,
                utxos,
                xecAirdropAmountSats,
                destinationAddress,
                rawTx,
                returned,
            } = vector;
            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            const wallet = Wallet.fromSk(
                MOCK_SK,
                mockedChronik as unknown as ChronikClient,
            );
            mockedChronik.setUtxosByAddress(wallet.address, utxos);
            mockedChronik.setBroadcastTx(rawTx, returned.broadcasted[0]);
            it(description, async function () {
                assert.deepEqual(
                    await sendXecAirdrop(
                        wallet,
                        xecAirdropAmountSats,
                        destinationAddress,
                    ),
                    returned,
                );
            });
        });
        errors.forEach(vector => {
            const {
                description,
                utxos,
                xecAirdropAmountSats,
                destinationAddress,
                error,
            } = vector;
            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            const wallet = Wallet.fromSk(
                MOCK_SK,
                mockedChronik as unknown as ChronikClient,
            );
            mockedChronik.setUtxosByAddress(wallet.address, utxos);
            it(description, async function () {
                await assert.rejects(
                    sendXecAirdrop(
                        wallet,
                        xecAirdropAmountSats,
                        destinationAddress,
                    ),
                    error,
                );
            });
        });
    });
});
