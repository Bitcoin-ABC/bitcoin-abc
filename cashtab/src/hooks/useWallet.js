// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import usePrevious from 'hooks/usePrevious';
import { BN } from 'slp-mdm';
import {
    getHashArrayFromWallet,
    isActiveWebsocket,
    getWalletBalanceFromUtxos,
} from 'utils/cashMethods';
import {
    isValidCashtabSettings,
    isValidCashtabCache,
    isValidContactList,
    migrateLegacyCashtabSettings,
    isValidCashtabWallet,
} from 'validation';
import localforage from 'localforage';
import {
    getUtxosChronik,
    organizeUtxosByType,
    getPreliminaryTokensArray,
    finalizeTokensArray,
    finalizeSlpUtxos,
    getTxHistoryChronik,
    parseChronikTx,
    returnGetTokenInfoChronikPromise,
} from 'chronik';
import { queryAliasServer } from 'alias';
import appConfig from 'config/app';
import aliasSettings from 'config/alias';
import {
    CashReceivedNotificationIcon,
    TokenNotificationIcon,
} from 'components/Common/CustomIcons';
import { supportedFiatCurrencies } from 'config/cashtabSettings';
import { notification } from 'antd';
import { cashtabCacheToJSON, storedCashtabCacheToMap } from 'helpers';
import { createCashtabWallet } from 'wallet';
import CashtabState from 'config/CashtabState';

const useWallet = chronik => {
    const [cashtabLoaded, setCashtabLoaded] = useState(false);
    const [ws, setWs] = useState(null);
    const [fiatPrice, setFiatPrice] = useState(null);
    const [apiError, setApiError] = useState(false);
    const [checkFiatInterval, setCheckFiatInterval] = useState(null);
    const [loading, setLoading] = useState(true);
    const [aliases, setAliases] = useState({
        registered: [],
        pending: [],
    });
    const [aliasPrices, setAliasPrices] = useState(null);
    const [aliasServerError, setAliasServerError] = useState(false);
    const [aliasIntervalId, setAliasIntervalId] = useState(null);
    const [chaintipBlockheight, setChaintipBlockheight] = useState(0);
    const [cashtabState, setCashtabState] = useState(new CashtabState());
    const { settings, cashtabCache, wallets } = cashtabState;

    const { balances, tokens } =
        wallets.length > 0
            ? wallets[0].state
            : {
                  balances: {},
                  tokens: [],
              };
    const previousBalances = usePrevious(balances);
    const previousTokens = usePrevious(tokens);

    const update = async wallet => {
        if (!cashtabLoaded) {
            // Wait for cashtab to get state from localforage before updating
            return;
        }

        try {
            /*
               This strange data structure is necessary because chronik requires the hash160
               of an address to tell you what utxos are at that address
            */
            const hash160AndAddressObjArray = [
                {
                    address: wallet.Path145.cashAddress,
                    hash160: wallet.Path145.hash160,
                },
                {
                    address: wallet.Path245.cashAddress,
                    hash160: wallet.Path245.hash160,
                },
                {
                    address: wallet.Path1899.cashAddress,
                    hash160: wallet.Path1899.hash160,
                },
            ];

            const chronikUtxos = await getUtxosChronik(
                chronik,
                hash160AndAddressObjArray,
            );

            const { preliminarySlpUtxos, nonSlpUtxos } =
                organizeUtxosByType(chronikUtxos);

            const preliminaryTokensArray =
                getPreliminaryTokensArray(preliminarySlpUtxos);

            const { tokens, cachedTokens, newTokensToCache } =
                await finalizeTokensArray(
                    chronik,
                    preliminaryTokensArray,
                    cashtabCache.tokens,
                );

            const slpUtxos = finalizeSlpUtxos(
                preliminarySlpUtxos,
                cachedTokens,
            );

            const {
                parsedTxHistory,
                cachedTokensAfterHistory,
                txHistoryNewTokensToCache,
            } = await getTxHistoryChronik(chronik, wallet, cachedTokens);

            // If you have updated cachedTokens from finalizeTokensArray or getTxHistoryChronik
            // Update in state and localforage
            if (newTokensToCache || txHistoryNewTokensToCache) {
                updateCashtabState('cashtabCache', {
                    ...cashtabCache,
                    tokens: cachedTokensAfterHistory,
                });
            }

            const newState = {
                balances: getWalletBalanceFromUtxos(nonSlpUtxos),
                slpUtxos,
                nonSlpUtxos,
                tokens,
                parsedTxHistory,
            };

            // Set wallet with new state field
            wallet.state = newState;
            setCashtabState({ ...cashtabState, wallet });

            // Update only the active wallet, wallets[0], in state
            updateCashtabState('wallets', [wallet, ...wallets.slice(1)]);

            // If everything executed correctly, remove apiError
            setApiError(false);
        } catch (error) {
            console.log(`Error in update(wallet) from wallet`, wallet);
            console.log(error);
            // Set this in state so that transactions are disabled until the issue is resolved
            setApiError(true);
        }

        // Get chaintip height in separate try...catch
        // If we don't get this value, we don't need to throw an API error
        // Impact is we ignore all coinbase utxos in tx building
        try {
            let info = await chronik.blockchainInfo();
            const { tipHeight } = info;
            setChaintipBlockheight(tipHeight);
        } catch (err) {
            console.log(`Error fetching chaintipBlockheight`, err);
        }
    };

    /**
     * Lock UI while you update cashtabState in state and indexedDb
     * @param {key} string
     * @param {object} value what is being stored at this key
     * @returns {boolean}
     */
    const updateCashtabState = async (key, value) => {
        // If we are dealing with savedWallets, sort alphabetically by wallet name
        if (key === 'savedWallets') {
            value.sort((a, b) => a.name.localeCompare(b.name));
        }

        // Update the changed key in state
        setCashtabState({ ...cashtabState, [`${key}`]: value });

        // Update the changed key in localforage

        // Handle any items that must be converted to JSON before storage
        // For now, this is just cashtabCache
        if (key === 'cashtabCache') {
            value = cashtabCacheToJSON(value);
        }

        // We lock the UI by setting loading to true while we set items in localforage
        // This is to prevent rapid user action from corrupting the db
        setLoading(true);
        await localforage.setItem(key, value);
        setLoading(false);

        return true;
    };

    /**
     * Load all keys from localforage into state
     *
     * If any are invalid, migrate them to valid and update in storage
     *
     * We only do this when the user starts Cashtab
     *
     * While the app is running, we use cashtabState as the source of truth
     *
     * We save to localforage on state changes in updateCashtabState
     * so that these persist if the user navigates away from Cashtab     *
     */
    const loadCashtabState = async () => {
        // Initialize flag var
        // We will need to set loading to false if we do not do any write operations to state at bootup
        let stateUpdatedAtBootup = false;
        // cashtabState is initialized with defaults when this component loads

        // contactList
        let contactList = await localforage.getItem('contactList');
        if (contactList !== null) {
            // If we find a contactList in localforage
            if (!isValidContactList(contactList)) {
                // and this contactList is invalid, migrate

                // contactList is only expected to be invalid as legacy empty, i.e. [{}]
                // We do not call a function to migrate contactList as no other migration is expected
                contactList = [];
                // Update localforage on app load only if existing values are in an obsolete format
                updateCashtabState('contactList', contactList);
                stateUpdatedAtBootup = true;
            }
            // Set cashtabState contactList to valid localforage or migrated
            cashtabState.contactList = contactList;
        }

        // settings
        let settings = await localforage.getItem('settings');
        if (settings !== null) {
            // If we find settings in localforage
            if (!isValidCashtabSettings(settings)) {
                // If a settings object is present but invalid, parse to find and add missing keys
                settings = migrateLegacyCashtabSettings(settings);
                // Update localforage on app load only if existing values are in an obsolete format
                stateUpdatedAtBootup = await updateCashtabState(
                    'settings',
                    settings,
                );
            }

            // Set cashtabState settings to valid localforage or migrated settings
            cashtabState.settings = settings;
        }

        // cashtabCache
        let cashtabCache = await localforage.getItem('cashtabCache');

        if (cashtabCache !== null) {
            // If we find cashtabCache in localforage

            // cashtabCache must be converted from JSON as it stores a Map
            cashtabCache = storedCashtabCacheToMap(cashtabCache);

            if (!isValidCashtabCache(cashtabCache)) {
                // If a cashtabCache object is present but invalid, nuke it and start again
                cashtabCache = cashtabState.cashtabCache;
                // Update localforage on app load only if existing values are in an obsolete format
                stateUpdatedAtBootup = await updateCashtabState(
                    'cashtabCache',
                    cashtabCache,
                );
            }

            // Set cashtabState cashtabCache to valid localforage or migrated settings
            cashtabState.cashtabCache = cashtabCache;
        }

        // Load wallets if present
        // Make sure case of nothing at wallet or wallets is handled properly

        // A legacy Cashtab user may have the active wallet stored at the wallet key
        let wallet = await localforage.getItem('wallet');

        // After version 1.7.x, Cashtab users have all wallets stored at the wallets key
        let wallets = await localforage.getItem('wallets');

        /**
         * Possible cases
         *
         * 1 - NEW CASHTAB USER
         * wallet === null && wallets === null
         * nothing in localforage for wallet or wallets
         *
         * 2 - PARTIALLY MIGRATED CASHTAB USER
         * wallet !== null && wallets !== null
         * User first used Cashtab.com on legacy wallet/savedWallet keys
         * but has now been migrated to use the wallets key
         * No action required, load as normal. We could delete the legacy keys
         * but we do not need the space so there is no expected benefit
         *
         * 3 - FULLY MIGRATED CASHTAB USER
         * wallet === null && wallets !== null
         * User created first wallet at Cashtab 1.7.0 or higher
         *
         * 4 - MIGRATION REQUIRED
         * wallet !== null && wallets === null
         * User has stored wallet information at old keys
         * wallet for active wallet
         * savedWallets for savedWallets
         * Migrate to wallets key
         */

        const legacyMigrationRequired = wallet !== null && wallets === null;

        if (legacyMigrationRequired) {
            // Initialize wallets array
            wallets = [];

            // Migrate this Cashtab user from keys "wallet" and "savedWallets" to key "wallets"
            if (!isValidCashtabWallet(wallet)) {
                // If wallet is invalid, rebuild to latest Cashtab schema
                wallet = await createCashtabWallet(wallet.mnemonic);
            }

            // wallets[0] is the active wallet in upgraded Cashtab localforage model
            wallets.push(wallet);

            // Also migrate savedWallets
            let savedWallets = await localforage.getItem('savedWallets');

            if (savedWallets !== null) {
                // If we find savedWallets in localforage

                // Iterate over all savedWallets.
                // If valid, do not change.
                // If invalid, migrate and update savedWallets
                savedWallets = await Promise.all(
                    savedWallets.map(async savedWallet => {
                        if (!isValidCashtabWallet(savedWallet)) {
                            // Recreate this wallet at latest format from mnemonic
                            const newSavedWallet = await createCashtabWallet(
                                savedWallet.mnemonic,
                            );

                            return {
                                ...newSavedWallet,
                                name: savedWallet.name,
                            };
                        }
                        // No modification if it is valid
                        return savedWallet;
                    }),
                );

                // Because Promise.all() will not preserve order, sort savedWallets alphabetically by name
                savedWallets.sort((a, b) => a.name.localeCompare(b.name));

                // In legacy Cashtab storage, the key savedWallets also stored the active wallet
                // Delete wallet from savedWallets
                const indexOfSavedWalletMatchingWallet = savedWallets.findIndex(
                    savedWallet => savedWallet.mnemonic === wallet.mnemonic,
                );
                savedWallets.splice(indexOfSavedWalletMatchingWallet, 1);

                // Update wallets array to include legacy wallet and legacy savedWallets
                // migrated to current Cashtab format
                wallets = wallets.concat(savedWallets);

                // Set cashtabState wallets to migrated wallet + savedWallets
                cashtabState.wallets = wallets;

                // We do not updateCashtabState('wallets', wallets) here
                // because it will happen in the update routine as soon as
                // the active wallet is populated
            }
        } else {
            // Load from wallets key, or initialize new user

            // If the user has already migrated, we load wallets from localforage key directly

            if (wallets !== null) {
                // If we find wallets in localforage

                // Iterate over all wallets. If valid, do not change. If invalid, migrate and update array.
                wallets = await Promise.all(
                    wallets.map(async wallet => {
                        if (!isValidCashtabWallet(wallet)) {
                            // Recreate this wallet at latest format from mnemonic
                            const migratedWallet = await createCashtabWallet(
                                wallet.mnemonic,
                            );

                            // Keep the same name as existing wallet
                            return {
                                ...migratedWallet,
                                name: wallet.name,
                            };
                        }

                        // No modification if it is valid
                        return wallet;
                    }),
                );

                // Because Promise.all() will not preserve order, sort wallets alphabetically by name
                // First remove wallets[0] as this is the active wallet and we do not want to sort it
                const activeWallet = wallets.shift();
                // Sort other wallets alphabetically
                wallets.sort((a, b) => a.name.localeCompare(b.name));
                // Replace the active wallet at the 0-index
                wallets.unshift(activeWallet);

                // Set cashtabState wallets to wallets from localforage
                // (or migrated wallets if localforage included any invalid wallet)
                cashtabState.wallets = wallets;

                // We do not updateCashtabState('wallets', wallets) here
                // because it will happen in the update routine as soon as
                // the active wallet is populated
            }

            // So, if we do not find wallets from localforage, cashtabState will be initialized with default
            // wallets []
        }

        setCashtabState(cashtabState);
        setCashtabLoaded(true);

        // Initialize the websocket connection

        // Initialize onMessage with loaded wallet. fiatPrice may be null.
        // The onMessage routine will update when active wallet or fiatPrice updates
        const ws = chronik.ws({
            onReconnect: e => {
                // Fired before a reconnect attempt is made.
                // Should never happen with chronik ping keepalive websocket
                console.log('Reconnecting websocket, disconnection cause: ', e);
            },
            onConnect: e => {
                console.log(`Chronik websocket connected`, e);
            },
        });

        // Wait for websocket to be connected:
        await ws.waitForOpen();

        if (cashtabState.wallets.length > 0) {
            // Subscribe to addresses of current wallet, if you have one
            const hash160Array = getHashArrayFromWallet(
                cashtabState.wallets[0],
            );
            for (const hash of hash160Array) {
                ws.subscribe('p2pkh', hash);
            }
        }
        // When the user creates or imports a wallet, ws subscriptions will be handled by updateWebsocket

        // Put connected websocket in state
        setWs(ws);

        // TODO I think we can lose this flag and check
        // It's probably ok to leave loading as true until update syncs the active wallet
        // Need to test what kind of observed delay this causes
        if (!stateUpdatedAtBootup) {
            // If we have not modified state in loadCashtabState, we are no longer loading
            setLoading(false);
        }
    };

    /**
     * Update websocket subscriptions when active wallet changes
     * Update websocket onMessage handler when fiatPrice changes
     * @param {object} wallet
     * @param {number} fiatPrice
     */
    const updateWebsocket = (wallet, fiatPrice) => {
        // Set or update the onMessage handler
        // We can only set this when wallet is defined, so we do not set it in loadCashtabState
        ws.onMessage = msg => {
            processChronikWsMsg(msg, wallet, fiatPrice);
        };

        // Check if current subscriptions match current wallet
        const { subs } = ws;
        // Get the subscribed payloads so we can iterate over these to unsub
        // If we iterate over ws.subs to unsubscribe, we are modifying ws.subs as we iterate
        // Can lead to off-by-one and other errors
        const subscribedPayloads = [];
        for (const sub of subs) {
            subscribedPayloads.push(sub.scriptPayload);
        }

        let subscriptionUpdateRequired = false;
        const hash160Array = getHashArrayFromWallet(wallet);
        if (subs.length !== hash160Array.length) {
            // If the websocket is not subscribed to the same amount of addresses as the wallet,
            // we need to update subscriptions
            subscriptionUpdateRequired = true;
        }

        for (const sub of subs) {
            // If any wallet hash is not subscribed to, we need to update subscriptions
            if (!hash160Array.includes(sub.scriptPayload)) {
                subscriptionUpdateRequired = true;
            }
        }

        if (subscriptionUpdateRequired) {
            // If we need to update subscriptions

            // Unsubscribe from all existing subscriptions
            for (const payload of subscribedPayloads) {
                ws.unsubscribe('p2pkh', payload);
            }

            // Subscribe to all hashes in the active wallet
            for (const hash of hash160Array) {
                ws.subscribe('p2pkh', hash);
            }
        }

        // Update ws in state
        return setWs(ws);
    };

    // Parse chronik ws message for incoming tx notifications
    const processChronikWsMsg = async (msg, wallet, fiatPrice) => {
        // get the message type
        const { type } = msg;
        // Cashtab only processes "first seen" transactions and new blocks, i.e. where
        // type === 'AddedToMempool' or 'BlockConnected'
        // Dev note: Other chronik msg types
        // "Confirmed", arrives as subscribed + seen txid is confirmed in a block
        if (type !== 'AddedToMempool' && type !== 'BlockConnected') {
            return;
        }

        // when new blocks are found, refresh alias prices
        if (type === 'BlockConnected') {
            try {
                const aliasPricesResp = await queryAliasServer('prices');
                if (!aliasPricesResp || !aliasPricesResp.prices) {
                    throw new Error(
                        'Invalid response from alias prices endpoint',
                    );
                }

                // Only refresh alias prices if new tiers have been published.
                // The 'prices' API tracks historical pricing via an array of 'prices[].fees'.
                // Therefore a pricing update can be identified as a length change to the 'prices' object.
                if (
                    aliasPrices &&
                    aliasPrices.prices.length === aliasPricesResp.prices.length
                ) {
                    return;
                }
                setAliasPrices(aliasPricesResp);
            } catch (err) {
                setAliasServerError(err);
            }
            return;
        }

        // For all other messages, update the active wallet
        update(wallet);

        // get txid info
        const txid = msg.txid;

        let incomingTxDetails;
        try {
            incomingTxDetails = await chronik.tx(txid);
        } catch (err) {
            // In this case, no notification
            return console.log(
                `Error in chronik.tx(${txid} while processing an incoming websocket tx`,
                err,
            );
        }

        // parse tx for notification
        const parsedChronikTx = parseChronikTx(
            incomingTxDetails,
            wallet,
            cashtabCache.tokens,
        );
        /* If this is an incoming eToken tx and parseChronikTx was not able to get genesis info
           from cache, then get genesis info from API and add to cache */
        if (parsedChronikTx.incoming) {
            if (parsedChronikTx.isEtokenTx) {
                let eTokenAmountReceived = parsedChronikTx.etokenAmount;
                if (parsedChronikTx.genesisInfo.success) {
                    notification.success({
                        message: `${appConfig.tokenTicker} transaction received: ${parsedChronikTx.genesisInfo.tokenTicker}`,
                        description: `You received ${eTokenAmountReceived.toString()} ${
                            parsedChronikTx.genesisInfo.tokenName
                        }`,
                        icon: <TokenNotificationIcon />,
                    });
                } else {
                    // Get genesis info from API and add to cache
                    try {
                        // Get the genesis info and add it to cache
                        const incomingTokenId = parsedChronikTx.slpMeta.tokenId;

                        const genesisInfoPromise =
                            returnGetTokenInfoChronikPromise(
                                chronik,
                                incomingTokenId,
                                cashtabCache.tokens,
                            );

                        const genesisInfo = await genesisInfoPromise;

                        // Do not update in state and localforage, as update loop will do this

                        // Calculate eToken amount with decimals
                        eTokenAmountReceived = new BN(
                            parsedChronikTx.etokenAmount,
                        ).shiftedBy(-1 * genesisInfo.decimals);

                        notification.success({
                            message: `${appConfig.tokenTicker} ${genesisInfo.tokenTicker} received for the first time.`,
                            description: `You received ${eTokenAmountReceived.toString()} ${
                                genesisInfo.tokenName
                            }`,
                            icon: <TokenNotificationIcon />,
                        });
                    } catch (err) {
                        console.log(
                            `Error fetching genesisInfo for incoming token tx ${parsedChronikTx}`,
                            err,
                        );
                    }
                }
            } else {
                const xecAmount = parsedChronikTx.xecAmount;
                notification.success({
                    message: 'eCash received',
                    description: `
                            ${xecAmount.toLocaleString()} ${appConfig.ticker}
                            ${
                                settings &&
                                settings.fiatCurrency &&
                                `(${
                                    supportedFiatCurrencies[
                                        settings.fiatCurrency
                                    ].symbol
                                }${(xecAmount * fiatPrice).toFixed(
                                    appConfig.cashDecimals,
                                )} ${settings.fiatCurrency.toUpperCase()})`
                            }
                        `,
                    icon: <CashReceivedNotificationIcon />,
                });
            }
        }

        // Return true if we get here
        return true;
    };

    // With different currency selections possible, need unique intervals for price checks
    // Must be able to end them and set new ones with new currencies
    const initializeFiatPriceApi = async selectedFiatCurrency => {
        // Update fiat price and confirm it is set to make sure ap keeps loading state until this is updated
        await fetchXecPrice(selectedFiatCurrency);
        // Set interval for updating the price with given currency

        const thisFiatInterval = setInterval(function () {
            fetchXecPrice(selectedFiatCurrency);
        }, 60000);

        // set interval in state
        setCheckFiatInterval(thisFiatInterval);
    };

    const clearFiatPriceApi = fiatPriceApi => {
        // Clear fiat price check interval of previously selected currency
        clearInterval(fiatPriceApi);
    };

    // Parse for incoming XEC transactions
    // Do not show this notification if websocket connection is live; in this case the websocket will handle it
    if (
        !isActiveWebsocket(ws) &&
        previousBalances &&
        balances &&
        'totalBalance' in previousBalances &&
        'totalBalance' in balances &&
        new BN(balances.totalBalance).minus(previousBalances.totalBalance).gt(0)
    ) {
        notification.success({
            message: 'Transaction received',
            description: `
                    ${parseFloat(
                        Number(
                            balances.totalBalance -
                                previousBalances.totalBalance,
                        ).toFixed(appConfig.cashDecimals),
                    ).toLocaleString()}
                    ${appConfig.ticker}
                    ${
                        settings &&
                        settings.fiatCurrency &&
                        `(${
                            supportedFiatCurrencies[settings.fiatCurrency]
                                .symbol
                        }${(
                            Number(
                                balances.totalBalance -
                                    previousBalances.totalBalance,
                            ) * fiatPrice
                        ).toFixed(
                            appConfig.cashDecimals,
                        )} ${settings.fiatCurrency.toUpperCase()})`
                    }
                `,
            icon: <CashReceivedNotificationIcon />,
        });
    }

    // Parse for incoming eToken transactions
    // Do not show this notification if websocket connection is live; in this case the websocket will handle it
    if (
        !isActiveWebsocket(ws) &&
        tokens &&
        tokens[0] &&
        tokens[0].balance &&
        previousTokens &&
        previousTokens[0] &&
        previousTokens[0].balance
    ) {
        // If tokens length is greater than previousTokens length, a new token has been received
        // Note, a user could receive a new token, AND more of existing tokens in between app updates
        // In this case, the app will only notify about the new token
        // TODO better handling for all possible cases to cover this
        // TODO handle with websockets for better response time, less complicated calc
        if (tokens.length > previousTokens.length) {
            // Find the new token
            const tokenIds = tokens.map(({ tokenId }) => tokenId);
            const previousTokenIds = previousTokens.map(
                ({ tokenId }) => tokenId,
            );

            // An array with the new token Id
            const newTokenIdArr = tokenIds.filter(
                tokenId => !previousTokenIds.includes(tokenId),
            );
            // It's possible that 2 new tokens were received
            // To do, handle this case
            const newTokenId = newTokenIdArr[0];

            // Find where the newTokenId is
            const receivedTokenObjectIndex = tokens.findIndex(
                x => x.tokenId === newTokenId,
            );

            // Calculate amount received
            const receivedSlpQty =
                tokens[receivedTokenObjectIndex].balance.toString();
            const receivedSlpTicker =
                tokens[receivedTokenObjectIndex].info.tokenTicker;
            const receivedSlpName =
                tokens[receivedTokenObjectIndex].info.tokenName;

            // Notification if you received SLP
            if (receivedSlpQty > 0) {
                notification.success({
                    message: `${appConfig.tokenTicker} transaction received: ${receivedSlpTicker}`,
                    description: `You received ${receivedSlpQty.toString()} ${receivedSlpName}`,
                    icon: <TokenNotificationIcon />,
                });
            }
            //
        } else {
            // If tokens[i].balance > previousTokens[i].balance, a new SLP tx of an existing token has been received
            // Note that tokens[i].balance is of type BigNumber
            for (let i = 0; i < tokens.length; i += 1) {
                if (
                    new BN(tokens[i].balance).gt(
                        new BN(previousTokens[i].balance),
                    )
                ) {
                    if (previousTokens[i].tokenId !== tokens[i].tokenId) {
                        console.log(
                            `TokenIds do not match, breaking from SLP notifications`,
                        );
                        // Then don't send the notification
                        // Also don't 'continue' ; this means you have sent a token, just stop iterating through
                        break;
                    }
                    const receivedSlpQty = new BN(tokens[i].balance).minus(
                        new BN(previousTokens[i].balance),
                    );

                    const receivedSlpTicker = tokens[i].info.tokenTicker;
                    const receivedSlpName = tokens[i].info.tokenName;

                    notification.success({
                        message: `${appConfig.tokenTicker} transaction received: ${receivedSlpTicker}`,
                        description: `You received ${receivedSlpQty.toString()} ${receivedSlpName}`,
                        icon: <TokenNotificationIcon />,
                    });
                }
            }
        }
    }

    const fetchXecPrice = async (
        fiatCode = typeof cashtabState?.settings?.fiatCurrency !== 'undefined'
            ? cashtabState.settings.fiatCurrency
            : 'usd',
    ) => {
        // Split this variable out in case coingecko changes
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs require different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
        let xecPrice;
        let xecPriceJson;
        try {
            xecPrice = await fetch(priceApiUrl);
        } catch (err) {
            console.log(`Error fetching XEC Price`);
            console.log(err);
        }
        try {
            xecPriceJson = await xecPrice.json();
            let xecPriceInFiat = xecPriceJson[cryptoId][fiatCode];

            const validEcashPrice = typeof xecPriceInFiat === 'number';

            if (validEcashPrice) {
                setFiatPrice(xecPriceInFiat);
            } else {
                // If API price looks fishy, do not allow app to send using fiat settings
                setFiatPrice(null);
            }
        } catch (err) {
            console.log(`Error parsing price API response to JSON`);
            console.log(err);
        }
    };

    /**
     * Retrieve registered and pending aliases for this active wallet from alias-server
     * and stores them in the aliases state var for other components to access
     * @param {string} thisAddress the address to be queried for attached aliases
     */
    const refreshAliases = async thisAddress => {
        try {
            const aliasesForThisAddress = await queryAliasServer(
                'address',
                thisAddress,
            );
            if (aliasesForThisAddress.error) {
                // If an error is returned from the address endpoint
                throw new Error(aliasesForThisAddress.error);
            }
            setAliases({
                registered: aliasesForThisAddress.registered.sort((a, b) =>
                    a.alias.localeCompare(b.alias),
                ),
                pending: aliasesForThisAddress.pending.sort((a, b) =>
                    a.alias.localeCompare(b.alias),
                ),
            });
            setAliasServerError(false);
            // Clear interval if there are no pending aliases
            if (aliasesForThisAddress.pending.length === 0 && aliasIntervalId) {
                console.log(
                    `refreshAliases(): No pending aliases, clearing interval ${aliasIntervalId}`,
                );
                clearInterval(aliasIntervalId);
            }
        } catch (err) {
            const errorMsg = 'Error: Unable to retrieve aliases';
            console.log(`refreshAliases(): ${errorMsg}`, err);
            setAliasServerError(errorMsg);
        }
    };

    const cashtabBootup = async () => {
        await loadCashtabState();
    };

    useEffect(() => {
        cashtabBootup();
    }, []);

    // Call the update loop every time the user changes the active wallet
    // and immediately after cashtab is loaded
    useEffect(() => {
        if (cashtabLoaded !== true || cashtabState.wallets.length === 0) {
            // Do not update the active wallet unless
            // 1. Cashtab is loaded
            // 2. You have a valid active wallet in cashtabState
            return;
        }
        update(cashtabState.wallets[0]);
    }, [cashtabLoaded, cashtabState.wallets[0]?.name]);

    // Clear price API and update to new price API when fiat currency changes
    useEffect(() => {
        // Clear existing fiat price API check
        clearFiatPriceApi(checkFiatInterval);
        // Reset fiat price API when fiatCurrency setting changes
        initializeFiatPriceApi(cashtabState.settings.fiatCurrency);
    }, [cashtabState.settings.fiatCurrency]);

    // Update websocket subscriptions and websocket onMessage handler whenever
    // the active wallet changes (denoted by mnemonic changing, not when name changes)
    // or the fiat price updates (the onMessage handler needs to have the most up-to-date
    // fiat price)
    useEffect(() => {
        if (
            cashtabLoaded !== true ||
            ws === null ||
            typeof cashtabState.wallets[0] === 'undefined'
        ) {
            // Only update the websocket if
            // 1. ws is not null
            // 2. Cashtab has loaded
            // 3. We have an active wallet
            // 4. fiatPrice has changed
            // We can call with fiatPrice of null, we will not always have fiatPrice
            return;
        }
        updateWebsocket(cashtabState.wallets[0], fiatPrice);
    }, [cashtabState.wallets[0]?.mnemonic, fiatPrice, ws, cashtabLoaded]);

    const refreshAliasesOnStartup = async () => {
        // Initialize a new periodic refresh of aliases which ONLY calls the API if
        // there are pending aliases since confirmed aliases would not change over time
        // The interval is also only initialized if there are no other intervals present.
        if (aliasSettings.aliasEnabled) {
            if (wallets.length > 0 && aliasIntervalId === null) {
                // Initial refresh to ensure `aliases` state var is up to date
                await refreshAliases(wallets[0].Path1899.cashAddress);
                const aliasRefreshInterval = 30000;
                const intervalId = setInterval(async function () {
                    if (aliases?.pending?.length > 0) {
                        console.log(
                            'useEffect(): Refreshing registered and pending aliases',
                        );
                        await refreshAliases(wallets[0].Path1899.cashAddress);
                    }
                }, aliasRefreshInterval);
                setAliasIntervalId(intervalId);
                // Clear the interval when useWallet unmounts
                return () => clearInterval(intervalId);
            }
        }
    };

    useEffect(() => {
        refreshAliasesOnStartup();
    }, [aliases?.pending?.length]);

    return {
        chronik,
        chaintipBlockheight,
        fiatPrice,
        loading,
        apiError,
        refreshAliases,
        aliases,
        setAliases,
        aliasServerError,
        setAliasServerError,
        aliasPrices,
        setAliasPrices,
        updateCashtabState,
        processChronikWsMsg,
        cashtabState,
    };
};

export default useWallet;
