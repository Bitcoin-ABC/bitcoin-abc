// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useRef } from 'react';
import {
    isValidCashtabSettings,
    isValidCashtabCache,
    isValidContactList,
    migrateLegacyCashtabSettings,
    isValidCashtabWallet,
} from 'validation';
import localforage from 'localforage';
import {
    getUtxos,
    getHistory,
    organizeUtxosByType,
    parseTx,
    getTokenBalances,
    getTokenGenesisInfo,
} from 'chronik';
import { queryAliasServer, AliasPrices, AddressAliasStatus } from 'alias';
import appConfig from 'config/app';
import aliasSettings from 'config/alias';
import { CashReceivedNotificationIcon } from 'components/Common/CustomIcons';
import CashtabSettings, {
    supportedFiatCurrencies,
} from 'config/CashtabSettings';
import {
    cashtabCacheToJSON,
    storedCashtabCacheToMap,
    cashtabWalletsFromJSON,
    cashtabWalletsToJSON,
    CashtabCacheJson,
    StoredCashtabWallet,
} from 'helpers';
import {
    createCashtabWallet,
    getLegacyPaths,
    getBalanceSats,
    getHashes,
    toXec,
    hasUnfinalizedTxsInHistory,
    CashtabWallet,
    LegacyCashtabWallet,
    CashtabPathInfo,
} from 'wallet';
import { toast } from 'react-toastify';
import CashtabState, { CashtabContact } from 'config/CashtabState';
import TokenIcon from 'components/Etokens/TokenIcon';
import { getUserLocale } from 'helpers';
import { toFormattedXec } from 'utils/formatting';
import {
    ChronikClient,
    WsEndpoint,
    WsMsgClient,
    MsgTxClient,
} from 'chronik-client';
import { Agora } from 'ecash-agora';
import { Ecc } from 'ecash-lib';
import CashtabCache from 'config/CashtabCache';
import { ToastIcon } from 'react-toastify/dist/types';

const useWallet = (chronik: ChronikClient, agora: Agora, ecc: Ecc) => {
    const [cashtabLoaded, setCashtabLoaded] = useState<boolean>(false);
    const [ws, setWs] = useState<null | WsEndpoint>(null);
    const [fiatPrice, setFiatPrice] = useState<null | number>(null);
    const [apiError, setApiError] = useState<boolean>(false);
    const [checkFiatInterval, setCheckFiatInterval] =
        useState<null | NodeJS.Timeout>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [aliases, setAliases] = useState<AddressAliasStatus>({
        registered: [],
        pending: [],
    });
    const [aliasPrices, setAliasPrices] = useState<null | AliasPrices>(null);
    const [aliasServerError, setAliasServerError] = useState<false | string>(
        false,
    );
    const [aliasIntervalId, setAliasIntervalId] =
        useState<null | NodeJS.Timeout>(null);
    const [chaintipBlockheight, setChaintipBlockheight] = useState(0);
    const [cashtabState, setCashtabState] = useState<CashtabState>(
        new CashtabState(),
    );
    const locale = getUserLocale();

    // Ref https://stackoverflow.com/questions/53446020/how-to-compare-oldvalues-and-newvalues-on-react-hooks-useeffect
    // Get the previous value of a state variable
    const usePrevious = <T>(value: T | undefined): T | undefined => {
        const ref = useRef<T | undefined>(undefined);
        useEffect(() => {
            ref.current = value;
        }, [value]);
        return ref.current;
    };

    const prevFiatPrice = usePrevious(fiatPrice);
    const prevFiatCurrency = usePrevious(cashtabState.settings.fiatCurrency);

    const update = async (cashtabState: CashtabState) => {
        if (!cashtabLoaded) {
            // Wait for cashtab to get state from localforage before updating
            return;
        }

        // Get the active wallet
        const activeWallet = cashtabState.wallets[0];

        try {
            const chronikUtxos = await getUtxos(chronik, activeWallet);
            const { slpUtxos, nonSlpUtxos } = organizeUtxosByType(chronikUtxos);

            // Get map of all tokenIds held by this wallet and their balances
            // Note: this function will also update cashtabCache.tokens if any tokens in slpUtxos are not in cache
            const tokens = await getTokenBalances(
                chronik,
                slpUtxos,
                cashtabState.cashtabCache.tokens,
            );

            // Fetch and parse tx history
            // Note: this function will also update cashtabCache.tokens if any tokens in tx history are not in cache
            const parsedTxHistory = await getHistory(
                chronik,
                activeWallet,
                cashtabState.cashtabCache.tokens,
            );

            // Update cashtabCache.tokens in state and localforage
            updateCashtabState('cashtabCache', {
                ...cashtabState.cashtabCache,
                tokens: cashtabState.cashtabCache.tokens,
            });

            const newState = {
                balanceSats: getBalanceSats(nonSlpUtxos),
                slpUtxos,
                nonSlpUtxos,
                tokens,
                parsedTxHistory,
            };

            // Set wallet with new state field
            activeWallet.state = newState;

            // Update only the active wallet, wallets[0], in state
            updateCashtabState('wallets', [
                activeWallet,
                ...cashtabState.wallets.slice(1),
            ]);

            // If everything executed correctly, remove apiError
            setApiError(false);
        } catch (error) {
            console.error(
                `Error in update(cashtabState) from cashtabState`,
                cashtabState,
            );
            console.error(error);
            // Set this in state so that transactions are disabled until the issue is resolved
            setApiError(true);
            // Set loading false, as we may not have set it to false by updating the wallet
            setLoading(false);
        }
    };

    /**
     * Lock UI while you update cashtabState in state and indexedDb
     * @param string
     * @param value what is being stored at this key
     */
    const updateCashtabState = async (
        key: string,
        value:
            | CashtabWallet[]
            | CashtabCache
            | CashtabContact[]
            | CashtabSettings
            | CashtabCacheJson
            | StoredCashtabWallet[]
            | (LegacyCashtabWallet | StoredCashtabWallet)[],
    ) => {
        // If we are dealing with savedWallets, sort alphabetically by wallet name
        if (key === 'savedWallets') {
            (value as CashtabWallet[]).sort((a, b) =>
                a.name.localeCompare(b.name),
            );
        }

        // Update the changed key in state
        setCashtabState({ ...cashtabState, [`${key}`]: value });

        // Update the changed key in localforage

        // Handle any items that must be converted to JSON before storage
        // For now, this is just cashtabCache
        if (key === 'cashtabCache') {
            value = cashtabCacheToJSON(value as CashtabCache);
        }
        if (key === 'wallets') {
            value = cashtabWalletsToJSON(value as CashtabWallet[]);
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
        // cashtabState is initialized with defaults when this component loads

        // contactList
        let contactList: null | CashtabContact[] = await localforage.getItem(
            'contactList',
        );
        if (contactList !== null) {
            // If we find a contactList in localforage
            if (!isValidContactList(contactList)) {
                // and this contactList is invalid, migrate

                // contactList is only expected to be invalid as legacy empty, i.e. [{}]
                // We do not call a function to migrate contactList as no other migration is expected
                contactList = [];
                // Update localforage on app load only if existing values are in an obsolete format
                updateCashtabState(
                    'contactList',
                    contactList as CashtabContact[],
                );
            }
            // Set cashtabState contactList to valid localforage or migrated
            cashtabState.contactList = contactList as CashtabContact[];
        }

        // settings
        let settings: null | CashtabSettings = await localforage.getItem(
            'settings',
        );
        if (settings !== null) {
            // If we find settings in localforage
            if (!isValidCashtabSettings(settings)) {
                // If a settings object is present but invalid, parse to find and add missing keys
                settings = migrateLegacyCashtabSettings(
                    settings as unknown as CashtabSettings,
                );
                // Update localforage on app load only if existing values are in an obsolete format
                updateCashtabState(
                    'settings',
                    settings as unknown as CashtabSettings,
                );
            }

            // Set cashtabState settings to valid localforage or migrated settings
            cashtabState.settings = settings as CashtabSettings;
        }

        // cashtabCache
        let cashtabCache: null | CashtabCacheJson | CashtabCache =
            await localforage.getItem('cashtabCache');

        if (cashtabCache !== null) {
            // If we find cashtabCache in localforage

            // cashtabCache must be converted from JSON as it stores a Map
            cashtabCache = storedCashtabCacheToMap(
                cashtabCache as CashtabCacheJson,
            );

            if (!isValidCashtabCache(cashtabCache)) {
                // If a cashtabCache object is present but invalid, nuke it and start again
                cashtabCache = cashtabState.cashtabCache;
                // Update localforage on app load only if existing values are in an obsolete format
                updateCashtabState('cashtabCache', cashtabCache);
            }

            // Set cashtabState cashtabCache to valid localforage or migrated settings
            cashtabState.cashtabCache = cashtabCache;
        }

        // Load wallets if present
        // Make sure case of nothing at wallet or wallets is handled properly

        // A legacy Cashtab user may have the active wallet stored at the wallet key
        const storedWallet: null | LegacyCashtabWallet =
            await localforage.getItem('wallet');

        // After version 1.7.x, Cashtab users have all wallets stored at the wallets key
        const storedWallets:
            | null
            | LegacyCashtabWallet[]
            | StoredCashtabWallet[] = await localforage.getItem('wallets');

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

        const legacyKeyMigrationRequired =
            storedWallet !== null && storedWallets === null;

        let wallets: CashtabWallet[] = [];
        if (legacyKeyMigrationRequired) {
            // No need to check if a wallet stored at legacy 'wallet' key is valid
            // We know it won't be, rebuild it
            // Migrate this Cashtab user from keys "wallet" and "savedWallets" to key "wallets"

            // Determine if this wallet has legacy paths
            // Cashtab wallets used to be created with Path145, Path245, and Path1899 keys
            const extraPathsToMigrate = getLegacyPaths(storedWallet);

            // If wallet is invalid, rebuild to latest Cashtab schema
            let newWallet = await createCashtabWallet(
                storedWallet.mnemonic,
                extraPathsToMigrate,
            );

            // Keep original name
            newWallet = { ...newWallet, name: storedWallet.name };

            // wallets[0] is the active wallet in upgraded Cashtab localforage model
            wallets.push(newWallet);

            // Also migrate savedWallets
            // Note that savedWallets is also a legacy key
            const savedWallets: null | LegacyCashtabWallet[] =
                await localforage.getItem('savedWallets');

            if (savedWallets !== null) {
                // If we find savedWallets in localforage, they will all be invalid
                // as this key is deprecated

                // Iterate over all savedWallets.
                // If valid, do not change.
                // If invalid, migrate and update savedWallets
                const migratedSavedWallets = await Promise.all(
                    savedWallets.map(
                        async (savedWallet): Promise<CashtabWallet> => {
                            // We may also have to migrate legacy paths for a saved wallet
                            const extraPathsToMigrate =
                                getLegacyPaths(savedWallet);
                            // Recreate this wallet at latest format from mnemonic

                            const newSavedWallet = await createCashtabWallet(
                                savedWallet.mnemonic,
                                extraPathsToMigrate,
                            );

                            return {
                                ...newSavedWallet,
                                name: savedWallet.name,
                            };
                        },
                    ),
                );

                // Because Promise.all() will not preserve order, sort alphabetically by name
                migratedSavedWallets.sort((a, b) =>
                    a.name.localeCompare(b.name),
                );

                // In legacy Cashtab storage, the key savedWallets also stored the active wallet
                // Delete wallet from savedWallets
                const indexOfSavedWalletMatchingWallet =
                    migratedSavedWallets.findIndex(
                        savedWallet =>
                            savedWallet.mnemonic === newWallet.mnemonic,
                    );
                migratedSavedWallets.splice(
                    indexOfSavedWalletMatchingWallet,
                    1,
                );

                // Update wallets array to include legacy wallet and legacy savedWallets
                // migrated to current Cashtab format
                wallets = wallets.concat(migratedSavedWallets);

                // Set cashtabState wallets to migrated wallet + savedWallets
                cashtabState.wallets = wallets;

                // We do not updateCashtabState('wallets', wallets) here
                // because it will happen in the update routine as soon as
                // the active wallet is populated
            }
        } else {
            // Load from wallets key, or initialize new user

            // If the user has already migrated to latest keys, we load wallets from localforage key directly

            if (storedWallets !== null && storedWallets.length > 0) {
                // If we find wallets in localforage
                // In this case, we do not need to migrate from the wallet and savedWallets keys
                // We may or may not need to migrate wallets found at the wallets key to a new format

                // Revive from storage
                const loadedPossiblyLegacyWallets =
                    cashtabWalletsFromJSON(storedWallets);

                // Validate
                let walletsValid = true;
                for (const loadedPossiblyLegacyWallet of loadedPossiblyLegacyWallets) {
                    if (!isValidCashtabWallet(loadedPossiblyLegacyWallet)) {
                        walletsValid = false;
                        // Any invalid wallet means we need to migrate
                        break;
                    }
                }
                console.log(`walletsValid`, walletsValid);

                if (walletsValid) {
                    // Set cashtabState wallets to wallets from localforage
                    // (or migrated wallets if localforage included any invalid wallet)
                    cashtabState.wallets =
                        loadedPossiblyLegacyWallets as CashtabWallet[];

                    // We do not updateCashtabState('wallets', wallets) here
                    // because it will happen in the update routine as soon as
                    // the active wallet is populated
                } else {
                    // Handle the 0-index wallet separately, as this is the active wallet
                    const activeWallet = loadedPossiblyLegacyWallets.shift() as
                        | LegacyCashtabWallet
                        | CashtabWallet;
                    let migratedWallets: CashtabWallet[] = [];
                    if (!isValidCashtabWallet(activeWallet)) {
                        // Migrate the active wallet
                        // We may also have to migrate legacy paths for a saved wallet
                        const extraPathsToMigrate =
                            getLegacyPaths(activeWallet);

                        // Recreate this wallet at latest format from mnemonic

                        const migratedUnnamedActiveWallet =
                            await createCashtabWallet(
                                activeWallet.mnemonic,
                                extraPathsToMigrate,
                            );

                        // Keep the same name as existing wallet
                        const migratedNamedActiveWallet = {
                            ...migratedUnnamedActiveWallet,
                            name: activeWallet.name,
                        };
                        migratedWallets.push(migratedNamedActiveWallet);
                    } else {
                        migratedWallets.push(activeWallet as CashtabWallet);
                    }
                    // Iterate over all wallets. If valid, do not change. If invalid, migrate and update array.
                    const otherMigratedWallets = await Promise.all(
                        loadedPossiblyLegacyWallets.map(
                            async loadedPossiblyLegacyWallet => {
                                if (
                                    !isValidCashtabWallet(
                                        loadedPossiblyLegacyWallet,
                                    )
                                ) {
                                    // We may also have to migrate legacy paths for a saved wallet
                                    const extraPathsToMigrate = getLegacyPaths(
                                        loadedPossiblyLegacyWallet as LegacyCashtabWallet,
                                    );

                                    // Recreate this wallet at latest format from mnemonic

                                    const migratedWallet =
                                        await createCashtabWallet(
                                            loadedPossiblyLegacyWallet.mnemonic,
                                            extraPathsToMigrate,
                                        );

                                    // Keep the same name as existing wallet
                                    return {
                                        ...migratedWallet,
                                        name: loadedPossiblyLegacyWallet.name,
                                    };
                                }

                                // No modification if it is valid
                                return loadedPossiblyLegacyWallet as CashtabWallet;
                            },
                        ),
                    );
                    // Because Promise.all() will not preserve order, sort wallets alphabetically by name
                    otherMigratedWallets.sort((a, b) =>
                        a.name.localeCompare(b.name),
                    );

                    migratedWallets =
                        migratedWallets.concat(otherMigratedWallets);

                    console.log(`migratedWallets`, migratedWallets);

                    // Set cashtabState wallets to wallets from localforage
                    // (or migrated wallets if localforage included any invalid wallet)
                    cashtabState.wallets = migratedWallets;
                }
            } else {
                // So, if we do not find wallets from localforage, cashtabState will be initialized with default
                // wallets []
                cashtabState.wallets = wallets;
            }
        }
        setCashtabState(cashtabState);
        setCashtabLoaded(true);

        // Get chaintip height
        // We do not have to lock UI while this is unavailable
        // Impact of not having this:
        // 1) txs may not be marked as avalanche finalized until we get it
        // 2) we ignore all coinbase utxos in tx building
        try {
            const info = await chronik.blockchainInfo();
            const { tipHeight } = info;
            // See if it is finalized
            const blockDetails = await chronik.block(tipHeight);

            if (blockDetails.blockInfo.isFinal) {
                // We only set a chaintip if it is avalanche finalized
                setChaintipBlockheight(tipHeight);
            }
        } catch (err) {
            console.error(`Error fetching chaintipBlockheight`, err);
        }

        // Initialize the websocket connection

        // Initialize onMessage with loaded wallet. fiatPrice may be null.
        // The onMessage routine will update when active wallet or fiatPrice updates
        const ws = chronik.ws({
            onReconnect: e => {
                // Fired before a reconnect attempt is made.
                // Should never happen with chronik ping keepalive websocket
                console.info(
                    'Reconnecting websocket, disconnection cause: ',
                    e,
                );
            },
            onConnect: e => {
                console.info(`Chronik websocket connected`, e);
            },
        });

        // Wait for websocket to be connected:
        await ws.waitForOpen();

        // We always subscribe to blocks
        ws.subscribeToBlocks();

        if (cashtabState.wallets.length > 0) {
            // Subscribe to addresses of current wallet, if you have one
            const hash160Array = getHashes(cashtabState.wallets[0]);
            for (const hash of hash160Array) {
                ws.subscribeToScript('p2pkh', hash);
            }
        } else {
            // Set loading to false if we have no wallet
            // as we will not get to the update() until the user creates a wallet
            setLoading(false);
        }
        // When the user creates or imports a wallet, ws subscriptions will be handled by updateWebsocket

        // Put connected websocket in state
        setWs(ws);
    };

    /**
     * Update websocket subscriptions when active wallet changes
     * Update websocket onMessage handler when fiatPrice changes
     * @param cashtabState
     * @param fiatPrice
     */
    const updateWebsocket = (
        cashtabState: CashtabState,
        fiatPrice: number | null,
    ) => {
        if (ws === null) {
            // Should never happen, we only call this in a useEffect when ws is not null
            return;
        }
        // Set or update the onMessage handler
        // We can only set this when wallet is defined, so we do not set it in loadCashtabState
        ws.onMessage = msg => {
            processChronikWsMsg(
                msg,
                cashtabState,
                fiatPrice,
                aliasSettings.aliasEnabled,
            );
        };

        // Check if current subscriptions match current wallet
        const { subs } = ws;
        // scripts may be undefined in mocked-chronik-client, as it continues to support nng chronik-client
        const scripts = 'scripts' in subs ? ws.subs.scripts : [];

        // Get the subscribed payloads so we can iterate over these to unsub
        // If we iterate over ws.subs to unsubscribe, we are modifying ws.subs as we iterate
        // Can lead to off-by-one and other errors
        const subscribedPayloads = [];
        for (const script of scripts) {
            subscribedPayloads.push(script.payload);
        }

        let subscriptionUpdateRequired = false;
        const hash160Array = getHashes(cashtabState.wallets[0]);
        if (scripts.length !== hash160Array.length) {
            // If the websocket is not subscribed to the same amount of addresses as the wallet,
            // we need to update subscriptions
            subscriptionUpdateRequired = true;
        }

        for (const script of scripts) {
            // If any wallet hash is not subscribed to, we need to update subscriptions
            if (!hash160Array.includes(script.payload)) {
                subscriptionUpdateRequired = true;
            }
        }

        if (subscriptionUpdateRequired) {
            // If we need to update subscriptions

            // Unsubscribe from all existing subscriptions
            for (const payload of subscribedPayloads) {
                ws.unsubscribeFromScript('p2pkh', payload);
            }

            // Subscribe to all hashes in the active wallet
            for (const hash of hash160Array) {
                ws.subscribeToScript('p2pkh', hash);
            }
        }

        // Update ws in state
        return setWs(ws);
    };

    // Parse chronik ws message for incoming tx notifications
    const processChronikWsMsg = async (
        msg: WsMsgClient,
        cashtabState: CashtabState,
        fiatPrice: null | number,
        aliasesEnabled: boolean,
    ) => {
        if (!('msgType' in msg)) {
            // No processing chronik error msgs
            console.error(`Error from chronik websocket`, msg);
            return;
        }
        // get the message type
        const { msgType } = msg;
        // get cashtabState params from param, so you know they are the most recent
        const { settings, cashtabCache } = cashtabState;
        // Cashtab only processes "first seen" transactions and new blocks, i.e. where
        // type === 'AddedToMempool' or 'BlockConnected'
        // Dev note: Other chronik msg types
        // "Confirmed", arrives as subscribed + seen txid is confirmed in a block
        if (msgType !== 'TX_ADDED_TO_MEMPOOL' && msgType !== 'BLK_FINALIZED') {
            return;
        }

        // when new blocks are found, refresh alias prices
        if (msgType === 'BLK_FINALIZED') {
            // Handle avalanche finalized block
            const { blockHeight } = msg;
            // Set chaintip height
            setChaintipBlockheight(blockHeight);

            if (aliasesEnabled) {
                try {
                    const aliasPricesResp = await queryAliasServer('prices');
                    if (!aliasPricesResp || !('prices' in aliasPricesResp)) {
                        throw new Error(
                            'Invalid response from alias prices endpoint',
                        );
                    }

                    // Only refresh alias prices if new tiers have been published.
                    // The 'prices' API tracks historical pricing via an array of 'prices[].fees'.
                    // Therefore a pricing update can be identified as a length change to the 'prices' object.
                    if (
                        aliasPrices &&
                        aliasPrices.prices.length ===
                            aliasPricesResp.prices.length
                    ) {
                        return;
                    }
                    setAliasPrices(aliasPricesResp);
                } catch (err) {
                    setAliasServerError(`${err}`);
                }
            }

            // If you have unfinalized txs in tx history,
            // Update cashtab state on avalanche finalized block
            // This will update tx history and finalize any txs that are now finalized
            // Do it here instead of from a tx_finalized msg bc you may have several finalized txs
            // and, at the moment, all txs would only be finalized on a block
            const { wallets } = cashtabState;
            if (hasUnfinalizedTxsInHistory(wallets[0])) {
                // If we have unfinalized txs, update cashtab state to see if they are finalized
                // by this block
                update(cashtabState);
            }

            return;
        }

        // For all other messages, update cashtabState
        update(cashtabState);

        // get txid info
        const txid = (msg as MsgTxClient).txid;

        let incomingTxDetails;
        try {
            incomingTxDetails = await chronik.tx(txid);
        } catch (err) {
            // In this case, no notification
            return console.error(
                `Error in chronik.tx(${txid} while processing an incoming websocket tx`,
                err,
            );
        }

        const tokenCacheForParsingThisTx = cashtabCache.tokens;
        let thisTokenCachedInfo;
        let tokenId;
        if (
            incomingTxDetails.tokenStatus !== 'TOKEN_STATUS_NON_TOKEN' &&
            incomingTxDetails.tokenEntries.length > 0
        ) {
            // If this is a token tx with at least one tokenId that is NOT cached, get token info
            // TODO we must get token info for multiple token IDs when we start supporting
            // token types other than slpv1
            tokenId = incomingTxDetails.tokenEntries[0].tokenId;
            thisTokenCachedInfo = cashtabCache.tokens.get(tokenId);
            if (typeof thisTokenCachedInfo === 'undefined') {
                // If we do not have this token cached
                // Note we do not update the cache here because this is handled in update
                try {
                    thisTokenCachedInfo = await getTokenGenesisInfo(
                        chronik,
                        tokenId,
                    );
                    tokenCacheForParsingThisTx.set(
                        tokenId,
                        thisTokenCachedInfo,
                    );
                } catch (err) {
                    console.error(
                        `Error fetching chronik.token(${tokenId})`,
                        err,
                    );

                    // Do not throw, in this case tokenCacheForParsingThisTx will still not
                    // include this token info, and the tx will be parsed as if it has 0 decimals

                    // We do not show the (wrong) amount in the notification if this is the case
                }
            }
        }

        // parse tx for notification
        const parsedTx = parseTx(
            incomingTxDetails,
            getHashes(cashtabState.wallets[0]),
        );

        if (parsedTx.xecTxType === 'Received') {
            if (
                incomingTxDetails.tokenEntries.length > 0 &&
                typeof tokenId === 'string' &&
                incomingTxDetails.tokenEntries[0].txType === 'SEND' &&
                incomingTxDetails.tokenEntries[0].burnSummary === '' &&
                incomingTxDetails.tokenEntries[0].actualBurnAmount === '0'
            ) {
                // For now, we only parse the first tokenEntry for an incoming tx notification
                // Only parse incoming SEND txs
                let eTokenReceivedString = '';
                if (typeof thisTokenCachedInfo === 'undefined') {
                    // If we do not have token name, ticker, or decimals, show a generic notification
                    eTokenReceivedString = `Received ${tokenId.slice(
                        0,
                        3,
                    )}...${tokenId.slice(-3)}`;
                } else {
                    const { tokenTicker, tokenName } =
                        thisTokenCachedInfo.genesisInfo;
                    eTokenReceivedString = `Received ${tokenName} (${tokenTicker})`;
                    // TODO calculate and format decimalized quantity
                    // TODO test this feature of parseChronikWsMsg, e.g. add a helper function
                    // getNotification(Tx) that can be easily tested and called here
                }
                toast(eTokenReceivedString, {
                    icon: React.createElement(TokenIcon, {
                        size: 32,
                        tokenId: tokenId,
                    }) as unknown as ToastIcon,
                });
            } else {
                const xecReceivedString = `Received ${toFormattedXec(
                    parsedTx.satoshisSent,
                    locale,
                )} ${appConfig.ticker}${
                    settings &&
                    typeof settings.fiatCurrency !== 'undefined' &&
                    fiatPrice !== null
                        ? ` (${
                              supportedFiatCurrencies[settings.fiatCurrency]
                                  .symbol
                          }${(toXec(parsedTx.satoshisSent) * fiatPrice).toFixed(
                              appConfig.cashDecimals,
                          )} ${settings.fiatCurrency.toUpperCase()})`
                        : ''
                }`;
                toast(xecReceivedString, {
                    icon: CashReceivedNotificationIcon,
                });
            }
        }

        // Return true if we get here
        return true;
    };

    // With different currency selections possible, need unique intervals for price checks
    // Must be able to end them and set new ones with new currencies
    const initializeFiatPriceApi = async (selectedFiatCurrency: string) => {
        if (process.env.REACT_APP_TESTNET === 'true') {
            return setFiatPrice(0);
        }
        // Update fiat price and confirm it is set to make sure ap keeps loading state until this is updated

        // Call this instance with showNotifications = false,
        // as we do not want to calculate price deltas when the user selects a new foreign currency
        await fetchXecPrice(selectedFiatCurrency);
        // Set interval for updating the price with given currency

        // Now we call with showNotifications = true, as we want
        // to show price changes when the currency has not changed
        const thisFiatInterval = setInterval(function () {
            fetchXecPrice(selectedFiatCurrency);
        }, appConfig.fiatUpdateIntervalMs);

        // set interval in state
        setCheckFiatInterval(thisFiatInterval);
    };

    const clearFiatPriceApi = (fiatPriceApi: NodeJS.Timeout) => {
        // Clear fiat price check interval of previously selected currency
        clearInterval(fiatPriceApi);
    };

    const fetchXecPrice = async (
        fiatCode = typeof cashtabState?.settings?.fiatCurrency !== 'undefined'
            ? cashtabState.settings.fiatCurrency
            : 'usd',
    ) => {
        // Split this variable out in case coingecko changes
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs require different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
        try {
            const xecPrice = await fetch(priceApiUrl);
            const xecPriceJson = await xecPrice.json();
            const xecPriceInFiat = xecPriceJson[cryptoId][fiatCode];

            if (typeof xecPriceInFiat === 'number') {
                // If we have a good fetch
                return setFiatPrice(xecPriceInFiat);
            }
        } catch (err) {
            if (
                typeof err === 'object' &&
                err !== null &&
                'message' in err &&
                err.message === 'Failed to fetch'
            ) {
                // The most common error is coingecko 429
                console.error(
                    `Failed to fetch XEC Price: Bad response or rate limit from CoinGecko`,
                );
            } else {
                console.error(`Failed to fetch XEC Price`, err);
            }
        }
        // If we have an error in the price fetch, or an invalid type without one, do not set the price
        return setFiatPrice(null);
    };

    /**
     * Retrieve registered and pending aliases for this active wallet from alias-server
     * and stores them in the aliases state var for other components to access
     * @param {string} thisAddress the address to be queried for attached aliases
     */
    const refreshAliases = async (thisAddress: string) => {
        try {
            const aliasesForThisAddress = await queryAliasServer(
                'address',
                thisAddress,
            );
            setAliases({
                registered: (
                    aliasesForThisAddress as AddressAliasStatus
                ).registered.sort((a, b) => a.alias.localeCompare(b.alias)),
                pending: (
                    aliasesForThisAddress as AddressAliasStatus
                ).pending.sort((a, b) => a.alias.localeCompare(b.alias)),
            });
            setAliasServerError(false);
            // Clear interval if there are no pending aliases
            if (
                (aliasesForThisAddress as AddressAliasStatus).pending.length ===
                    0 &&
                aliasIntervalId
            ) {
                console.info(
                    `refreshAliases(): No pending aliases, clearing interval ${aliasIntervalId}`,
                );
                clearInterval(aliasIntervalId);
            }
        } catch (err) {
            const errorMsg = 'Error: Unable to retrieve aliases';
            console.error(`refreshAliases(): ${errorMsg}`, err);
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
        update(cashtabState);
    }, [cashtabLoaded, cashtabState.wallets[0]?.name]);

    // Clear price API and update to new price API when fiat currency changes
    useEffect(() => {
        if (cashtabLoaded !== true) {
            // Wait for Cashtab to load the user's fiat currency from saved settings before starting the price API
            return;
        }
        // Clear existing fiat price API check
        if (checkFiatInterval !== null) {
            clearFiatPriceApi(checkFiatInterval);
        }

        // Reset fiat price API when fiatCurrency setting changes
        initializeFiatPriceApi(cashtabState.settings.fiatCurrency);
    }, [cashtabLoaded, cashtabState.settings.fiatCurrency]);

    /**
     * useEffect
     * Depends on fiatPrice and user-set fiatCurrency
     * Used to trigger price notifications at new fiatPrice milestones
     * Optimized for USD
     * Also supports EUR and GBP as these are "close enough", for now anyway
     */
    useEffect(() => {
        // Do nothing if the user has just changed the fiat currency
        if (cashtabState.settings.fiatCurrency !== prevFiatCurrency) {
            return;
        }

        // We only support currencies that are similar order of magnitude to USD
        // USD is the real referencce for "killed zero"
        const FIAT_CHANGE_SUPPORTED_CURRENCIES = [
            'usd',
            'eur',
            'gbp',
            'cad',
            'aud',
        ];
        if (
            !FIAT_CHANGE_SUPPORTED_CURRENCIES.includes(
                cashtabState.settings.fiatCurrency,
            )
        ) {
            return;
        }
        // Otherwise we do support them
        if (
            fiatPrice === null ||
            prevFiatPrice === null ||
            typeof prevFiatPrice === 'undefined'
        ) {
            return;
        }
        const priceIncreased = fiatPrice - prevFiatPrice > 0;
        if (priceIncreased) {
            // We only show price notifications if price has increased
            // "tens" for USD price per 1,000,000 XEC
            const prevTens = Math.floor(prevFiatPrice * 1e5);
            const tens = Math.floor(fiatPrice * 1e5);
            if (tens > prevTens) {
                // We have passed a $10 milestone
                toast(
                    `XEC is now ${
                        supportedFiatCurrencies[
                            cashtabState.settings.fiatCurrency
                        ].symbol
                    }${fiatPrice} ${cashtabState.settings.fiatCurrency.toUpperCase()}`,
                    { icon: CashReceivedNotificationIcon },
                );
            }
            if (tens >= 10 && prevTens < 10) {
                // We have killed a zero
                toast(`ZERO KILLED 🔫🔫🔫🔪🔪🔪`, {
                    autoClose: false,
                    icon: CashReceivedNotificationIcon,
                });
            }
        }
    }, [fiatPrice, cashtabState.settings.fiatCurrency]);

    // Update websocket subscriptions and websocket onMessage handler whenever
    // 1. cashtabState changes
    // 2. or the fiat price updates (the onMessage handler needs to have the most up-to-date
    // fiat price)
    // This is because the onMessage routine only has access to the state variables when onMessage was set
    // and the update() function needs the most recent cashtabState to update cashtabState
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
        updateWebsocket(cashtabState, fiatPrice);
    }, [cashtabState, fiatPrice, ws, cashtabLoaded]);

    /**
     * Set an interval to monitor pending alias txs
     * @param {string} address
     * @returns callback function to cleanup interval
     */
    const refreshAliasesOnStartup = async (address: string) => {
        // Initial refresh to ensure `aliases` state var is up to date
        await refreshAliases(address);
        const aliasRefreshInterval = 30000;
        const intervalId = setInterval(async function () {
            if (aliases?.pending?.length > 0) {
                await refreshAliases(address);
            }
        }, aliasRefreshInterval);
        setAliasIntervalId(intervalId);
        // Clear the interval when useWallet unmounts
        return () => clearInterval(intervalId);
    };

    useEffect(() => {
        if (
            aliasSettings.aliasEnabled &&
            aliases?.pending?.length > 0 &&
            aliasIntervalId === null &&
            typeof cashtabState.wallets !== 'undefined' &&
            cashtabState.wallets.length > 0
        ) {
            // If
            // 1) aliases are enabled in Cashtab
            // 2) we have pending aliases
            // 3) No interval is set to watch these pending aliases
            // 4) We have an active wallet
            // Set an interval to watch these pending aliases
            refreshAliasesOnStartup(
                (cashtabState.wallets[0].paths.get(1899) as CashtabPathInfo)
                    .address,
            );
        } else if (aliases?.pending?.length === 0 && aliasIntervalId !== null) {
            // If we have no pending aliases but we still have an interval to check them, clearInterval
            clearInterval(aliasIntervalId);
        }
    }, [cashtabState.wallets[0]?.name, aliases]);

    return {
        chronik,
        agora,
        ecc,
        chaintipBlockheight,
        fiatPrice,
        cashtabLoaded,
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
