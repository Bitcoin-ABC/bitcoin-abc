// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import vectors from 'components/fixtures/vectors';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/fixtures/helpers';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { chronik as chronikConfig } from 'config/chronik';
import { cashtabSettings } from 'config/cashtabSettings';
import cashtabCache from 'config/cashtabCache';

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

        // Expect localforage to be empty
        expect(await localforage.getItem('wallet')).toBe(null);
    });

    const { expectedReturns } = vectors.initializeCashtabStateForTests;

    expectedReturns.forEach(expectedReturn => {
        const { description, wallet } = expectedReturn;
        it(`initializeCashtabStateForTests: ${description}`, async () => {
            // First, initialize with no API error
            const mockChronikClient = await initializeCashtabStateForTests(
                wallet,
                localforage,
            );

            const CASHTAB_TESTS_TIPHEIGHT = 800000;
            const CASHTAB_ADDRESS_TYPE = 'p2pkh';

            // We can get the chaintip
            expect(await mockChronikClient.blockchainInfo()).toEqual({
                tipHeight: CASHTAB_TESTS_TIPHEIGHT,
            });

            // Path1899 utxos as expected
            expect(
                await mockChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path1899.hash160)
                    .utxos(),
            ).toEqual([
                {
                    outputScript: `76a914${wallet.Path1899.hash160}88ac`,
                    utxos: wallet.state.nonSlpUtxos.concat(
                        wallet.state.slpUtxos,
                    ),
                },
            ]);
            // Path145 utxos empty
            expect(
                await mockChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path145.hash160)
                    .utxos(),
            ).toEqual([]);

            // Path245 utxos empty
            expect(
                await mockChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path245.hash160)
                    .utxos(),
            ).toEqual([]);

            // Path1899 history
            expect(
                await mockChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path1899.hash160)
                    .history(0, chronikConfig.txHistoryCount),
            ).toEqual({ numPages: 1, txs: wallet.state.parsedTxHistory });
            // Path145 history empty
            expect(
                await mockChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path145.hash160)
                    .history(0, chronikConfig.txHistoryCount),
            ).toEqual({
                numPages: 0,
                txs: [],
            });

            // Path245 history empty
            expect(
                await mockChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path245.hash160)
                    .history(0, chronikConfig.txHistoryCount),
            ).toEqual({
                numPages: 0,
                txs: [],
            });

            // Next, initialize with API error
            const apiErrorChronikClient = await initializeCashtabStateForTests(
                wallet,
                localforage,
                true,
            );

            // Errors are thrown for all used methods
            await expect(
                apiErrorChronikClient.blockchainInfo(),
            ).rejects.toThrow('Error fetching blockchainInfo');

            await expect(
                apiErrorChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path1899.hash160)
                    .utxos(),
            ).rejects.toThrow('Error fetching utxos');
            await expect(
                apiErrorChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path145.hash160)
                    .utxos(),
            ).rejects.toThrow('Error fetching utxos');

            await expect(
                apiErrorChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path245.hash160)
                    .utxos(),
            ).rejects.toThrow('Error fetching utxos');

            await expect(
                apiErrorChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path1899.hash160)
                    .history(0, chronikConfig.txHistoryCount),
            ).rejects.toThrow('Error fetching history');
            await expect(
                apiErrorChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path145.hash160)
                    .history(0, chronikConfig.txHistoryCount),
            ).rejects.toThrow('Error fetching history');

            await expect(
                apiErrorChronikClient
                    .script(CASHTAB_ADDRESS_TYPE, wallet.Path245.hash160)
                    .history(0, chronikConfig.txHistoryCount),
            ).rejects.toThrow('Error fetching history');

            // Expect localforage wallet and defaults
            expect(await localforage.getItem('wallet')).toEqual(wallet);
            expect(await localforage.getItem('cashtabCache')).toEqual(
                cashtabCache,
            );
            expect(await localforage.getItem('settings')).toEqual(
                cashtabSettings,
            );
            expect(await localforage.getItem('savedWallets')).toEqual([wallet]);
        });
    });
});
