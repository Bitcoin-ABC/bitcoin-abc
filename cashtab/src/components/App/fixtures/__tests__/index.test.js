// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import vectors from 'components/App/fixtures/vectors';
import {
    initializeCashtabStateForTests,
    initializeCashtabStateAtLegacyWalletKeysForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { chronik as chronikConfig } from 'config/chronik';
import CashtabSettings from 'config/CashtabSettings';
import CashtabCache from 'config/CashtabCache';
import { cashtabCacheToJSON } from 'helpers';

describe('Correctly prepares Cashtab mocked chronik client and localforage environment for Cashtab pre 1.7.* for unit tests', () => {
    afterEach(async () => {
        await clearLocalForage(localforage);
    });
    it(`initializeCashtabStateAtLegacyWalletKeysForTests mocks a new Cashtab user or incognito visitor`, async () => {
        const mockedChronikClient =
            await initializeCashtabStateAtLegacyWalletKeysForTests(
                false,
                localforage,
            );

        // Nothing has been mocked
        await expect(await mockedChronikClient.blockchainInfo()).toEqual({});
        await expect(typeof (await mockedChronikClient.tx())).toEqual(
            'undefined',
        );
        // We have not set script so it has nothing to access

        // Expect localforage to be empty
        expect(await localforage.getItem('wallet')).toBe(null);
    });

    const { expectedReturns } =
        vectors.initializeCashtabStateAtLegacyWalletKeysForTests;

    expectedReturns.forEach(expectedReturn => {
        const { description, wallet } = expectedReturn;
        it(`initializeCashtabStateAtLegacyWalletKeysForTests: ${description}`, async () => {
            // First, initialize with no API error
            const mockChronikClient =
                await initializeCashtabStateAtLegacyWalletKeysForTests(
                    wallet,
                    localforage,
                );

            const CASHTAB_TESTS_TIPHEIGHT = 800000;

            // We can get the chaintip
            expect(await mockChronikClient.blockchainInfo()).toEqual({
                tipHeight: CASHTAB_TESTS_TIPHEIGHT,
            });

            // Path1899 utxos as expected
            expect(
                await mockChronikClient
                    .address(wallet.Path1899.cashAddress)
                    .utxos(),
            ).toEqual({
                outputScript: `76a914${wallet.Path1899.hash160}88ac`,
                utxos: wallet.state.nonSlpUtxos.concat(wallet.state.slpUtxos),
            });

            // Path1899 history
            expect(
                await mockChronikClient
                    .address(wallet.Path1899.cashAddress)
                    .history(0, chronikConfig.txHistoryCount),
            ).toEqual({
                txs: wallet.state.parsedTxHistory,
                numPages: 1,
                numTxs: 10,
            });

            // Next, initialize with API error
            const apiErrorChronikClient = await initializeCashtabStateForTests(
                wallet,
                localforage,
                true,
            );
            console.log(`we got apiErrorChronikClient`);

            // Errors are thrown for all used methods
            await expect(
                apiErrorChronikClient.blockchainInfo(),
            ).rejects.toThrow('Error fetching blockchainInfo');

            await expect(
                apiErrorChronikClient
                    .address(wallet.Path1899.cashAddress)
                    .utxos(),
            ).rejects.toThrow('Error fetching utxos');

            await expect(
                apiErrorChronikClient
                    .address(wallet.Path1899.cashAddress)
                    .history(0, chronikConfig.txHistoryCount),
            ).rejects.toThrow('Error fetching history');

            // Expect localforage wallet and defaults
            // Will be JSON so not expected to deepEqual
            expect((await localforage.getItem('wallet')).name).toEqual(
                wallet.name,
            );

            // We expect the JSON conversion to be in storage
            expect(await localforage.getItem('cashtabCache')).toEqual(
                cashtabCacheToJSON(new CashtabCache()),
            );
            expect(await localforage.getItem('settings')).toEqual(
                new CashtabSettings(),
            );
            // It will be JSON, not like what we saved
            expect(await localforage.getItem('savedWallets')).toHaveLength(1);
        });
    });
});

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
                            .history(0, chronikConfig.txHistoryCount)
                    ).txs,
                ).toEqual(wallet.state.parsedTxHistory);

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
                        .history(0, chronikConfig.txHistoryCount),
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
