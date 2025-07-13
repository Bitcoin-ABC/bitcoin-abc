// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import {
    getSlpInputsAndOutputs,
    sendReward,
    sendXecAirdrop,
} from '../src/transactions';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import vectors from '../test/vectors';
import { Ecc } from 'ecash-lib';
import { ChronikClient } from 'chronik-client';

describe('transactions.ts', function () {
    const ecc = new Ecc();
    describe('We can get slpInputs and slpOutputs for a token rewards tx to one destinationAddress', function () {
        const { returns, errors } = vectors.getSlpInputsAndOutputs;
        returns.forEach(vector => {
            const {
                description,
                rewardAmountTokenSats,
                destinationAddress,
                tokenId,
                utxos,
                changeAddress,
                returned,
            } = vector;
            it(description, function () {
                assert.deepEqual(
                    getSlpInputsAndOutputs(
                        rewardAmountTokenSats,
                        destinationAddress,
                        tokenId,
                        utxos,
                        changeAddress,
                    ),
                    returned,
                );
            });
        });
        errors.forEach(vector => {
            const {
                description,
                rewardAmountTokenSats,
                destinationAddress,
                tokenId,
                utxos,
                changeAddress,
                error,
            } = vector;
            it(description, function () {
                assert.throws(
                    () =>
                        getSlpInputsAndOutputs(
                            rewardAmountTokenSats,
                            destinationAddress,
                            tokenId,
                            utxos,
                            changeAddress,
                        ),
                    error,
                );
            });
        });
    });
    describe('We can build and broadcast a token reward tx', function () {
        const { returns, errors } = vectors.sendReward;
        returns.forEach(vector => {
            const {
                description,
                wallet,
                utxos,
                tokenId,
                rewardAmountTokenSats,
                destinationAddress,
                returned,
            } = vector;
            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            mockedChronik.setUtxosByAddress(wallet.address, utxos);
            mockedChronik.setBroadcastTx(returned.hex, returned.response.txid);
            it(description, async function () {
                assert.deepEqual(
                    await sendReward(
                        mockedChronik as unknown as ChronikClient,
                        ecc,
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
                wallet,
                utxos,
                tokenId,
                rewardAmountTokenSats,
                destinationAddress,
                error,
            } = vector;
            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            mockedChronik.setUtxosByAddress(wallet.address, utxos);
            it(description, async function () {
                await assert.rejects(
                    sendReward(
                        mockedChronik as unknown as ChronikClient,
                        ecc,
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
                wallet,
                utxos,
                xecAirdropAmountSats,
                destinationAddress,
                returned,
            } = vector;
            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            mockedChronik.setUtxosByAddress(wallet.address, utxos);
            mockedChronik.setBroadcastTx(returned.hex, returned.response.txid);
            it(description, async function () {
                assert.deepEqual(
                    await sendXecAirdrop(
                        mockedChronik as unknown as ChronikClient,
                        ecc,
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
                wallet,
                utxos,
                xecAirdropAmountSats,
                destinationAddress,
                error,
            } = vector;
            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            mockedChronik.setUtxosByAddress(wallet.address, utxos);
            it(description, async function () {
                await assert.rejects(
                    sendXecAirdrop(
                        mockedChronik as unknown as ChronikClient,
                        ecc,
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
