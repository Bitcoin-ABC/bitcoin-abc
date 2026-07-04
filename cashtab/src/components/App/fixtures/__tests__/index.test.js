// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import vectors from 'components/App/fixtures/vectors';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { chronik as chronikConfig } from 'config/chronik';

describe('Correctly prepares Cashtab mocked chronik client and localforage environment for unit tests', () => {
    afterEach(async () => {
        await clearLocalForage(localforage);
    });

    it(`initializeCashtabStateForTests mocks a new Cashtab user or incognito visitor`, async () => {
        const mockedChronikClient = await initializeCashtabStateForTests(
            false,
            localforage,
        );

        // Nothing has been mocked
        await expect(await mockedChronikClient.blockchainInfo()).toEqual({});
        await expect(typeof (await mockedChronikClient.tx())).toEqual(
            'undefined',
        );
        // We have not set script so it has nothing to access

        // Expect localforage wallets key to be empty
        expect(await localforage.getItem('wallets')).toBe(null);
    });

    const { expectedReturns } = vectors.initializeCashtabStateForTests;

    expectedReturns.forEach(expectedReturn => {
        const { description, wallets } = expectedReturn;
        it(`initializeCashtabStateForTests: ${description}`, async () => {
            // First, initialize with no API error
            const mockChronikClient = await initializeCashtabStateForTests(
                wallets,
                localforage,
            );

            const CASHTAB_TESTS_TIPHEIGHT = 800000;

            // We can get the chaintip
            expect(await mockChronikClient.blockchainInfo()).toEqual({
                tipHeight: CASHTAB_TESTS_TIPHEIGHT,
            });

            // All wallets have mocks ready
            for (const wallet of wallets) {
                expect(
                    await mockChronikClient.address(wallet.address).utxos(),
                ).toEqual({
                    outputScript: `76a914${wallet.hash}88ac`,
                    utxos: wallet.state.nonSlpUtxos.concat(
                        wallet.state.slpUtxos,
                    ),
                });
                // Path1899 history
                expect(
                    (
                        await mockChronikClient
                            .address(wallet.address)
                            .history(0, chronikConfig.txHistoryPageSize)
                    ).txs,
                ).toEqual(wallet.state.parsedTxHistory ?? []);

                // Next, initialize with API error
                const apiErrorChronikClient =
                    await initializeCashtabStateForTests(
                        wallets,
                        localforage,
                        true,
                    );

                // Errors are thrown for all used methods
                await expect(
                    apiErrorChronikClient.blockchainInfo(),
                ).rejects.toThrow('Error fetching blockchainInfo');
                await expect(
                    apiErrorChronikClient.address(wallet.address).utxos(),
                ).rejects.toThrow('Error fetching utxos');
                await expect(
                    apiErrorChronikClient
                        .address(wallet.address)
                        .history(0, chronikConfig.txHistoryPageSize),
                ).rejects.toThrow('Error fetching history');
            }

            // Expect localforage wallet and defauls
            const storedWallets = await localforage.getItem('wallets');

            // We do not expect our mock input to match what is stored, but mnemonics should match
            expect(storedWallets.map(wallet => wallet.mnemonic)).toEqual(
                wallets.map(wallet => wallet.mnemonic),
            );

            // Note: we do not necessarily expect cashtabCache to be set, depends on wallet content
            // Note: settings would only be set if changed from defaults
            // Note: contactList would only be set if changed from defaults
        });
    });
});
