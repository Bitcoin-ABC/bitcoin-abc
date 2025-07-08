// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { when } from 'jest-when';
import { Tx, TokenInfo, Block, BlockchainInfo } from 'chronik-client';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import appConfig from 'config/app';
import { CashtabWallet } from 'wallet';
import { cashtabWalletToJSON, StoredCashtabWallet } from 'helpers';

/**
 * test.tsx
 *
 * Components and functions used in Cashtab's test suites
 * NB this is the upgraded ts version for ts tests
 * Legacy version is in src/helpers
 *
 * TODO migrate all tests to use these support functions
 */

/**
 * Supported keys in localforage
 * Used to set mocks we want to appear in context
 */
export enum SupportedCashtabStorageKeys {
    CashtabCache = 'cashtabCache',
    ContactList = 'contactList',
    Settings = 'settings',
    Wallets = 'wallets',
}

/**
 * This is the best way to store the info we need to
 * cache a token for a unit test
 * Cashtab has gone through several iterations of this, thus
 * many old mocks are stored in different ways
 *
 * Going forward this is the standard
 */
export interface TokenMock {
    tokenId?: string; // If not provided, we will use the tokenId from the tx
    tx: Tx;
    tokenInfo: TokenInfo;
}

const CASHTAB_TESTS_BLOCKCHAININFO: BlockchainInfo = {
    tipHeight: 800000,
    tipHash: '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe',
};
const CASHTAB_TESTS_BLOCK: Block = {
    blockInfo: {
        hash: '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe',
        prevHash:
            '0000000000000000023ab587190a05e44cdb76fe1dd7949f6187f1e632d2e123',
        height: 800000,
        nBits: 403943060,
        timestamp: 1688808780,
        isFinal: true,
        blockSize: 3094,
        numTxs: 9,
        numInputs: 13,
        numOutputs: 26,
        sumInputSats: 859760862n,
        sumCoinbaseOutputSats: 625005728n,
        sumNormalOutputSats: 859755134n,
        sumBurnedSats: 0n,
    },
};

/**
 * Mock a fiat price for a unit test or suite of test
 * Clear with jest.clearAllMocks()
 */
export const mockPrice = (price: number) => {
    // This test was made with a different fiat price before the component used context
    const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
    const cryptoId = appConfig.coingeckoId;
    // Keep this in the code, because different URLs will have different outputs requiring different parsing
    const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
    const priceResponse = {
        ecash: {
            usd: price,
            last_updated_at: 1706644626,
        },
    };
    when(fetch)
        .calledWith(priceApiUrl)
        .mockResolvedValue({
            json: () => Promise.resolve(priceResponse),
        } as Response);
};

/**
 * Prepare chronik calls for a wallet of Cashtab version >= 2.9.0
 *
 * We need to mock responses for API calls that are made as part of
 * Cashtab's startup
 */
export const prepareMockedChronikCallsForWallet = (
    mockChronik: MockChronikClient,
    wallet: CashtabWallet,
    /**
     * We need to add tokenMocks to cover all utxos in the wallet
     * We can also optionally pass tokenMocks that we need in a test
     */
    tokenMocks: Map<string, TokenMock>,
) => {
    // If we have token utxo or token tx in this wallet, we need a mock for its cached info
    const requiredTokenMocks: Set<string> = new Set([...tokenMocks.keys()]);

    for (const utxo of wallet.state.slpUtxos) {
        requiredTokenMocks.add(utxo.token.tokenId);
    }
    for (const tx of wallet.state.parsedTxHistory) {
        if (tx?.tokenEntries.length > 0) {
            requiredTokenMocks.add(tx.tokenEntries[0].tokenId);
        }
    }
    for (const tokenId of [...requiredTokenMocks]) {
        const tokenMock = tokenMocks.get(tokenId);
        if (typeof tokenMock === 'undefined') {
            throw new Error(
                `No token mock for ${tokenId}, but we have it in the wallet. Please add this TokenMock.`,
            );
        }
        const { tx, tokenInfo } = tokenMock;
        mockChronik.setTx(tokenId, tx);
        mockChronik.setToken(tokenId, tokenInfo);
    }

    mockChronik.setBlockchainInfo(CASHTAB_TESTS_BLOCKCHAININFO);
    mockChronik.setBlock(
        CASHTAB_TESTS_BLOCKCHAININFO.tipHeight,
        CASHTAB_TESTS_BLOCK,
    );

    // Mock all required chronik responses for updating this wallet
    wallet.paths.forEach((pathInfo, path) => {
        if (path === 1899) {
            mockChronik.setUtxosByAddress(
                pathInfo.address,
                wallet.state.nonSlpUtxos.concat(wallet.state.slpUtxos),
            );
            mockChronik.setTxHistoryByAddress(
                pathInfo.address,
                wallet.state.parsedTxHistory,
            );
        } else {
            mockChronik.setUtxosByAddress(pathInfo.address, []);
            mockChronik.setTxHistoryByAddress(pathInfo.address, []);
        }
    });
};

// Function to update cashtab storage and settings so that we get the expected context
// Run before every test
export const prepareContext = async (
    localForage: LocalForage,
    wallets: CashtabWallet[],
    /**
     * We need to add tokenMocks to cover all utxos in the wallet
     * We can also optionally pass tokenMocks that we need in a test
     */
    tokenMocks: Map<string, TokenMock>,
) => {
    // Mock successful utxos calls in chronik
    const mockChronik = new MockChronikClient();

    // Set wallets in localforage
    const storedCashtabWallets: StoredCashtabWallet[] = [];
    for (const wallet of wallets) {
        storedCashtabWallets.push(
            cashtabWalletToJSON(wallet) as StoredCashtabWallet,
        );
    }

    await localForage.setItem('wallets', storedCashtabWallets);

    // All other localforage items will be unset unless the user has customized them
    // Cashtab will use defaults
    // localforage may be modified in individual test cases to test cases of user with
    // non-default settings, cashtabCache, or contactList

    // Mock returns for chronik calls expected in useWallet's update routine for all wallets
    for (const wallet of wallets) {
        prepareMockedChronikCallsForWallet(mockChronik, wallet, tokenMocks);
    }

    return mockChronik;
};
