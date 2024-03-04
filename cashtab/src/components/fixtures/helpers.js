// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { MockChronikClient } from '../../../../apps/mock-chronik-client';
import { cashtabSettings } from 'config/cashtabSettings';
import cashtabCache from 'config/cashtabCache';
import { cashtabCacheToJSON } from 'helpers';

/**
 * Get expected mock values for chronik client for a given mock wallet
 * Used to support integration testing in Cashtab
 * Default methods may be overwritten in individual unit tests to test special conditions
 * @param {object | boolean} wallet A mock Cashtab wallet
 * @param {object} localforage the localforage instance used in your test
 * @param {boolean} apiError Default false. If true, return a mockedChronik that throws errors.
 * @returns {object} mockChronikClient, a mock chronik client instance prepopulated for expected Cashtab API calls
 */
export const initializeCashtabStateForTests = async (
    wallet,
    localforage,
    apiError = false,
) => {
    // Mock successful utxos calls in chronik
    const chronikClient = new MockChronikClient();

    if (wallet === false) {
        // No info to give to chronik, do not populate mocks
        return chronikClient;
        // We do not expect anything in localforage for this case
    }

    // Set localforage items. All defaults may be overwritten in a test for
    // specific purposes of the test.
    await localforage.setItem('cashtabCache', cashtabCacheToJSON(cashtabCache));
    await localforage.setItem('settings', cashtabSettings);
    // 'contactList' key will be empty if user has never added contacts
    await localforage.setItem('savedWallets', [wallet]);
    await localforage.setItem('wallet', wallet);

    // Mock returns for chronik calls expected in useWallet's update routine
    prepareMockedChronikCallsForWallet(chronikClient, wallet, apiError);

    return chronikClient;
};

/**
 *
 * @param {object} chronikClient a mockedChronikClient object
 * @param {object} wallet a valid cashtab wallet object
 * @param {boolean} apiError true if we want to set api errors in mocked chronik
 * @returns modifies chronikClient in place to have expected API calls for wallet loading available
 */
export const prepareMockedChronikCallsForWallet = (
    chronikClient,
    wallet,
    apiError = false,
) => {
    // mock chronik endpoint returns
    const CASHTAB_TESTS_TIPHEIGHT = 800000;
    chronikClient.setMock('blockchainInfo', {
        output: apiError
            ? new Error('Error fetching blockchainInfo')
            : { tipHeight: CASHTAB_TESTS_TIPHEIGHT },
    });
    // Mock scriptutxos to match context
    // Cashtab only supports p2pkh addresses
    const CASHTAB_ADDRESS_TYPE = 'p2pkh';
    chronikClient.setScript(CASHTAB_ADDRESS_TYPE, wallet.Path1899.hash160);
    chronikClient.setUtxos(
        CASHTAB_ADDRESS_TYPE,
        wallet.Path1899.hash160,
        apiError
            ? new Error('Error fetching utxos')
            : [
                  {
                      outputScript: `76a914${wallet.Path1899.hash160}88ac`,
                      utxos: wallet.state.nonSlpUtxos.concat(
                          wallet.state.slpUtxos,
                      ),
                  },
              ],
    );

    // We set legacy paths to contain no utxos
    chronikClient.setScript(CASHTAB_ADDRESS_TYPE, wallet.Path145.hash160);
    chronikClient.setUtxos(
        CASHTAB_ADDRESS_TYPE,
        wallet.Path145.hash160,
        apiError ? new Error('Error fetching utxos') : [],
    );
    chronikClient.setScript(CASHTAB_ADDRESS_TYPE, wallet.Path245.hash160);
    chronikClient.setUtxos(
        CASHTAB_ADDRESS_TYPE,
        wallet.Path245.hash160,
        apiError ? new Error('Error fetching utxos') : [],
    );

    // TX history mocks
    chronikClient.setTxHistory(
        CASHTAB_ADDRESS_TYPE,
        wallet.Path1899.hash160,
        apiError
            ? new Error('Error fetching history')
            : wallet.state.parsedTxHistory,
    );
    // We set legacy paths to contain no utxos
    chronikClient.setTxHistory(
        CASHTAB_ADDRESS_TYPE,
        wallet.Path145.hash160,
        apiError ? new Error('Error fetching history') : [],
    );
    chronikClient.setTxHistory(
        CASHTAB_ADDRESS_TYPE,
        wallet.Path245.hash160,
        apiError ? new Error('Error fetching history') : [],
    );

    // Mock chronik.tx(tokenId) calls for tokens in tx history
    for (const tx of wallet.state.parsedTxHistory) {
        const mockedTokenResponse = {
            slpTxData: { genesisInfo: tx.parsed.genesisInfo },
        };
        if (tx.parsed.isEtokenTx) {
            chronikClient.setMock('token', {
                input: tx.parsed.slpMeta.tokenId,
                output: mockedTokenResponse,
            });
        }
    }
};

/**
 * Remove all keys individually as localforage.clear() occasionally returns before all storage is clear
 * @param {object} localforage the localforage instance used in your test
 */
export const clearLocalForage = async localforage => {
    const SUPPORTED_CASHTAB_STORAGE_KEYS = [
        'cashtabCache',
        'contactList',
        'savedWallets',
        'settings',
        'wallet',
    ];
    for (const key of SUPPORTED_CASHTAB_STORAGE_KEYS) {
        await localforage.removeItem(key);
    }
};
