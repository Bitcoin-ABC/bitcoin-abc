// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { getWalletFromSeed, syncWallet } from '../src/wallet';
import vectors from './vectors';
import { MockChronikClient } from '../../../modules/mock-chronik-client';

describe('wallet.ts', function () {
    describe('We can generate an ecash address and its wif from a valid bip39 mnemonic', function () {
        const { returns, errors } = vectors.getWalletFromSeed;
        returns.forEach(vector => {
            const { description, mnemonic, returned } = vector;
            it(description, function () {
                assert.deepEqual(getWalletFromSeed(mnemonic), returned);
            });
        });
        errors.forEach(vector => {
            const { description, mnemonic, error } = vector;
            it(description, function () {
                assert.throws(() => getWalletFromSeed(mnemonic), error);
            });
        });
    });
    describe('We can update the utxo set of a wallet', function () {
        const { returns, errors } = vectors.syncWallet;
        returns.forEach(vector => {
            const { description, wallet, mockUtxos, returned } = vector;

            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            mockedChronik.setAddress(wallet.address);
            mockedChronik.setUtxosByAddress(wallet.address, {
                outputScript: 'outputScript',
                utxos: mockUtxos,
            });

            it(description, async function () {
                // We call syncWallet on wallet
                await syncWallet(mockedChronik, wallet);
                // The wallet object is now synced, we do not need to rely on it being returned from the function
                assert.deepEqual(wallet, returned);
            });
        });
        errors.forEach(vector => {
            const { description, wallet, error } = vector;
            // Set mocks in chronik-client
            const mockedChronik = new MockChronikClient();
            mockedChronik.setAddress(wallet.address);
            mockedChronik.setUtxosByAddress(wallet.address, error);
            it(description, async function () {
                await assert.rejects(syncWallet(mockedChronik, wallet), error);
            });
        });
    });
});
