// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { MockChronikClient } from '../../../../../modules/mock-chronik-client';

/**
 * Get expected mock values for chronik client for a given mock wallet
 * Used to support integration testing in Cashtab
 * Default methods may be overwritten in individual unit tests to test special conditions
 * @param {array | object | boolean} wallets Array of wallets, either legacy or activeWallet
 * If object, convert to array of length 1.
 * False if user has not yet created a wallet.
 * @param {object} localforage the localforage instance used in your test
 * @param {boolean} apiError Default false. If true, return a mockedChronik that throws errors.
 * @returns {object} mockChronikClient, a mock chronik client instance prepopulated for expected Cashtab API calls
 */
export const initializeCashtabStateForTests = async (
    wallets,
    localforage,
    apiError = false,
    // Not all tests require tx history mocks, default to empty
    history = [],
) => {
    // Mock successful utxos calls in chronik
    const chronikClient = new MockChronikClient();

    if (wallets === false) {
        // No info to give to chronik, do not populate mocks
        return chronikClient;
        // We do not expect anything in localforage for this case
    }

    wallets = Array.isArray(wallets) ? wallets : [wallets];

    // Set wallets in localforage

    let localforageWallets = [];
    for (const wallet of wallets) {
        localforageWallets.push({
            name: wallet.name,
            mnemonic: wallet.mnemonic,
            address: wallet.address,
            sk: wallet.sk,
            pk: wallet.pk,
            hash: wallet.hash,
        });
    }

    await localforage.setItem('wallets', localforageWallets);

    // The first one is active
    await localforage.setItem('activeWalletAddress', wallets[0].address);

    // Set tokens map in storage if the wallet has state.tokens (for test fixtures)
    // This ensures cashtabState.tokens is populated on load, matching the old behavior
    // where activeWallet.state.tokens was copied to cashtabState.tokens
    if (wallets[0].state && wallets[0].state.tokens) {
        // Convert Map to array of [key, value] pairs for JSON storage
        const tokensArray = Array.from(wallets[0].state.tokens);
        await localforage.setItem('tokens', tokensArray);
    }

    // Mock returns for chronik calls expected in useWallet's update routine for all wallets
    for (const wallet of wallets) {
        prepareMockedChronikCallsForWallet(
            chronikClient,
            wallet,
            apiError,
            history,
        );
    }

    return chronikClient;
};

/**
 * Prepare chronik calls for a modern wallet
 * @param {object} chronikClient a mockedChronikClient object
 * @param {object} wallet
 * @param {boolean} apiError true if we want to set api errors in mocked chronik
 * @returns modifies chronikClient in place to have expected API calls for wallet loading available
 */
export const prepareMockedChronikCallsForWallet = (
    chronikClient,
    wallet,
    apiError = false,
    // Not all tests require tx history mocks, default to empty
    history = [],
) => {
    // mock chronik endpoint returns
    const CASHTAB_TESTS_TIPHEIGHT = 800000;
    if (apiError) {
        chronikClient.setBlockchainInfo(
            new Error('Error fetching blockchainInfo'),
        );
        chronikClient.setBlock(
            CASHTAB_TESTS_TIPHEIGHT,
            new Error('Error fetching block'),
        );
    } else {
        chronikClient.setBlockchainInfo({ tipHeight: CASHTAB_TESTS_TIPHEIGHT });
        chronikClient.setBlock(CASHTAB_TESTS_TIPHEIGHT, {
            blockInfo: { isFinal: true },
        });
    }

    // Mock token calls
    // Get tokenIds you need chronik.tx(tokenId) and chronik.token(tokenId) calls for
    // These can come from tx history and slpUtxos
    const tokenIdsToMock = new Set();
    for (const utxo of wallet.state.slpUtxos) {
        tokenIdsToMock.add(utxo.token.tokenId);
    }
    for (const tx of history) {
        if (tx.parsed?.isEtokenTx || tx?.tokenEntries.length > 0) {
            const tokenId =
                'tokenEntries' in tx
                    ? tx.tokenEntries[0].tokenId
                    : tx.slpMeta.tokenId;
            tokenIdsToMock.add(tokenId);
        }
    }

    for (const tokenId of [...tokenIdsToMock]) {
        const mockedTokenResponse = {
            tokenId: tokenId,
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'BEAR',
                tokenName: 'BearNip',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
        };
        chronikClient.setToken(tokenId, mockedTokenResponse);

        const mockedTxResponse = {
            txid: tokenId,
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '0e737a2f6373649341b406334341202a5ddbbdb389c55da40570b641dc23d036',
                        outIdx: 1,
                    },
                    inputScript:
                        '473044022055444db90f98b462ca29a6f51981da4015623ddc34dc1f575852426ccb785f0402206e786d4056be781ca1720a0a915b040e0a9e8716b8e4d30b0779852c191fdeb3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 6231556n,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001010747454e45534953044245415207426561724e69701468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000115c',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        atoms: 4444n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                        outIdx: 1,
                    },
                },
                {
                    sats: 6230555n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 299,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                    burnsMintBatons: false,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
        };
        chronikClient.setTx(tokenId, mockedTxResponse);
    }

    // Modern wallet
    if (apiError) {
        chronikClient.setUtxosByAddress(
            wallet.address,
            new Error('Error fetching utxos'),
        );
        chronikClient.setTxHistoryByAddress(
            wallet.address,
            new Error('Error fetching history'),
        );
    } else {
        chronikClient.setUtxosByAddress(
            wallet.address,
            wallet.state.nonSlpUtxos.concat(wallet.state.slpUtxos),
        );
        chronikClient.setTxHistoryByAddress(wallet.address, history);
    }
};

/**
 * Remove all keys individually as localforage.clear() occasionally returns before all storage is clear
 * @param {object} localforage the localforage instance used in your test
 */
import { SUPPORTED_CASHTAB_STORAGE_KEYS } from 'config/storage';

export const clearLocalForage = async localforage => {
    for (const key of SUPPORTED_CASHTAB_STORAGE_KEYS) {
        await localforage.removeItem(key);
    }
};
