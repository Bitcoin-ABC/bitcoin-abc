// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { getSlpInputsAndOutputs, sendReward } from '../src/transactions';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import vectors from './vectors';

describe('transactions.ts', function () {
    describe('We can get slpInputs and slpOutputs for a token rewards tx to one destinationAddress', function () {
        const { returns, errors } = vectors.getSlpInputsAndOutputs;
        returns.forEach(vector => {
            const {
                description,
                rewardAmountTokenSats,
                destinationAddress,
                tokenId,
                utxos,
                returned,
            } = vector;
            it(description, function () {
                assert.deepEqual(
                    getSlpInputsAndOutputs(
                        rewardAmountTokenSats,
                        destinationAddress,
                        tokenId,
                        utxos,
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
                feeRate,
                tokenId,
                rewardAmountTokenSats,
                destinationAddress,
                returned,
            } = vector;
            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            mockedChronik.setAddress(wallet.address);
            mockedChronik.setUtxosByAddress(wallet.address, {
                outputScript: 'outputScript',
                utxos,
            });
            mockedChronik.setMock('broadcastTx', {
                input: returned.hex,
                output: { txid: returned.response.txid },
            });
            it(description, async function () {
                assert.deepEqual(
                    await sendReward(
                        mockedChronik,
                        wallet,
                        feeRate,
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
                feeRate,
                tokenId,
                rewardAmountTokenSats,
                destinationAddress,
                error,
            } = vector;
            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            mockedChronik.setAddress(wallet.address);
            mockedChronik.setUtxosByAddress(
                wallet.address,
                utxos instanceof Error
                    ? utxos
                    : { outputScript: 'outputScript', utxos },
            );
            it(description, async function () {
                await assert.rejects(
                    sendReward(
                        mockedChronik,
                        wallet,
                        feeRate,
                        tokenId,
                        rewardAmountTokenSats,
                        destinationAddress,
                    ),
                    error,
                );
            });
        });
    });
});
