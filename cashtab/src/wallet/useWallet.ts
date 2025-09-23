// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useRef } from 'react';
import {
    isValidCashtabSettings,
    isValidCashtabCache,
    isValidContactList,
    migrateLegacyCashtabSettings,
} from 'validation';
import { storage, initializeStorage } from 'platform';
import {
    getTransactionHistory,
    organizeUtxosByType,
    parseTx,
    getTokenBalances,
    getTokenGenesisInfo,
    getTxNotificationMsg,
} from 'chronik';
import appConfig from 'config/app';
import { chronik as chronikConfig } from 'config/chronik';
import { CashReceivedNotificationIcon } from 'components/Common/CustomIcons';
import CashtabSettings, {
    supportedFiatCurrencies,
} from 'config/CashtabSettings';
import {
    storedCashtabCacheToMap,
    CashtabCacheJson,
    cashtabCacheToJSON,
} from 'helpers';
import {
    createCashtabWallet,
    getBalanceSats,
    ActiveCashtabWallet,
    StoredCashtabWallet,
    createActiveCashtabWallet,
    LegacyCashtabWallet,
    CashtabTx,
} from 'wallet';
import { toast } from 'react-toastify';
import CashtabState, { CashtabContact } from 'config/CashtabState';
import { TokenIconToast } from 'components/Etokens/TokenIcon';
import { getUserLocale } from 'helpers';
import {
    ChronikClient,
    WsEndpoint,
    WsMsgClient,
    MsgTxClient,
} from 'chronik-client';
import { Agora } from 'ecash-agora';
import { Ecc } from 'ecash-lib';
import CashtabCache from 'config/CashtabCache';

/**
 * We keep the first page of tx history in context
 * This allows us to update it piecemeal without full
 * chronik calls by using websocket handlers, and keep
 * tx history (which is important for user info not
 * wallet actions) separate from the wallet state
 */
export interface TransactionHistory {
    firstPageTxs: CashtabTx[];
    numPages: number;
    numTxs: number;
}

export type UpdateCashtabState = (updates: {
    [key: string]:
        | ActiveCashtabWallet
        | CashtabCache
        | CashtabContact[]
        | CashtabSettings
        | CashtabCacheJson
        | StoredCashtabWallet[]
        | string;
}) => Promise<boolean>;

export interface UseWalletReturnType {
    chronik: ChronikClient;
    agora: Agora;
    ecc: Ecc;
    chaintipBlockheight: number;
    fiatPrice: number | null;
    firmaPrice: number | null;
    cashtabLoaded: boolean;
    loading: boolean;
    initialUtxoSyncComplete: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    apiError: boolean;
    updateCashtabState: UpdateCashtabState;
    handleActivatingCopiedWallet: (walletAddress: string) => Promise<void>;
    processChronikWsMsg: (msg: WsMsgClient) => Promise<boolean>;
    cashtabState: CashtabState;
    transactionHistory: TransactionHistory | null;
    refreshTransactionHistory: () => Promise<void>;
    /**
     * In some cases, we only want to set CashtabState as setting the state
     * will trigger storage writing, and we want to minimize this
     */
    setCashtabState: React.Dispatch<React.SetStateAction<CashtabState>>;
}

const useWallet = (chronik: ChronikClient, agora: Agora, ecc: Ecc) => {
    const [cashtabLoaded, setCashtabLoaded] = useState<boolean>(false);
    const [ws, setWs] = useState<null | WsEndpoint>(null);
    const [fiatPrice, setFiatPrice] = useState<null | number>(null);
    const [firmaPrice, setFirmaPrice] = useState<null | number>(null);
    const [apiError, setApiError] = useState<boolean>(false);
    const [checkFiatInterval, setCheckFiatInterval] =
        useState<null | NodeJS.Timeout>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [initialUtxoSyncComplete, setInitialUtxoSyncComplete] =
        useState<boolean>(false);
    const [chaintipBlockheight, setChaintipBlockheight] = useState(0);
    const [cashtabState, setCashtabState] = useState<CashtabState>(
        new CashtabState(),
    );
    const [transactionHistory, setTransactionHistory] =
        useState<TransactionHistory | null>(null);
    const locale = getUserLocale();

    const refreshTransactionHistory = async () => {
        if (!currentCashtabStateRef.current.activeWallet) {
            setTransactionHistory(null);
            return;
        }

        try {
            // NB this gives us page 0 as we call without specifying page number
            const result = await getTransactionHistory(
                chronik,
                currentCashtabStateRef.current.activeWallet.address,
                currentCashtabStateRef.current.cashtabCache.tokens,
            );

            const newTransactionHistory: TransactionHistory = {
                firstPageTxs: result.txs,
                numPages: result.numPages,
                numTxs: result.txs.length,
            };

            setTransactionHistory(newTransactionHistory);
        } catch (err) {
            console.error('Error refreshing transaction history:', err);
            setTransactionHistory(null);
        }
    };

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

    // Refs to always hold current state
    const currentCashtabStateRef = useRef<CashtabState>(cashtabState);
    const currentFiatPriceRef = useRef<number | null>(fiatPrice);
    const currentCashtabLoadedRef = useRef<boolean>(cashtabLoaded);

    // Update refs whenever state changes
    useEffect(() => {
        currentCashtabStateRef.current = cashtabState;
    }, [cashtabState]);

    useEffect(() => {
        currentFiatPriceRef.current = fiatPrice;
    }, [fiatPrice]);

    useEffect(() => {
        currentCashtabLoadedRef.current = cashtabLoaded;
    }, [cashtabLoaded]);

    // Refresh transaction history when active wallet changes
    useEffect(() => {
        if (cashtabLoaded && cashtabState.activeWallet) {
            refreshTransactionHistory();
        } else {
            setTransactionHistory(null);
        }
    }, [cashtabState.activeWallet?.address, cashtabLoaded]);

    // Queue for processing messages in order
    const messageQueue = useRef<Array<WsMsgClient>>([]);
    const isProcessing = useRef<boolean>(false);

    // Process messages sequentially
    const processMessageQueue = async () => {
        if (isProcessing.current) {
            return;
        }

        isProcessing.current = true;

        while (messageQueue.current.length > 0) {
            const msg = messageQueue.current.shift()!;

            try {
                await processMessage(
                    msg,
                    currentCashtabStateRef.current,
                    currentFiatPriceRef.current,
                );
            } catch (error) {
                console.error('Error processing message:', error);
            }
        }

        isProcessing.current = false;
    };

    // Process individual message
    const processMessage = async (
        msg: WsMsgClient,
        cashtabState: CashtabState,
        fiatPrice: number | null,
    ) => {
        if (!('msgType' in msg)) {
            // No processing chronik error msgs
            console.error(`Error from chronik websocket`, msg);
            return;
        }

        const { msgType } = msg;
        const { settings, cashtabCache } = cashtabState;

        switch (msgType) {
            case 'TX_ADDED_TO_MEMPOOL': {
                // Update wallet utxo set when we see a new tx
                await update();

                // We parse txs that are added to the mempool for notifications
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
                    incomingTxDetails.tokenStatus !==
                        'TOKEN_STATUS_NON_TOKEN' &&
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
                const parsedTx = parseTx(incomingTxDetails, [
                    cashtabState.wallets[0].hash,
                ]);

                // Add the new transaction to the beginning of the first page history
                setTransactionHistory(prev => {
                    if (!prev) {
                        return prev;
                    }

                    // Create the new transaction object
                    const newTx: CashtabTx = {
                        ...incomingTxDetails,
                        parsed: parsedTx,
                    };

                    // Add to beginning of first page
                    const updatedFirstPageTxs = [newTx, ...prev.firstPageTxs];

                    // If we're at the page limit, remove the last transaction
                    if (
                        updatedFirstPageTxs.length >
                        chronikConfig.txHistoryPageSize
                    ) {
                        updatedFirstPageTxs.pop();
                    }

                    // Calculate new counts
                    const newNumTxs = prev.numTxs + 1;
                    const newNumPages = Math.ceil(
                        newNumTxs / chronikConfig.txHistoryPageSize,
                    );

                    return {
                        ...prev,
                        firstPageTxs: updatedFirstPageTxs,
                        numTxs: newNumTxs,
                        numPages: newNumPages,
                    };
                });

                // parse tx for notification msg
                const notificationMsg = getTxNotificationMsg(
                    parsedTx,
                    fiatPrice,
                    locale,
                    settings.fiatCurrency.toUpperCase(),
                    thisTokenCachedInfo?.genesisInfo,
                );

                if (typeof notificationMsg === 'undefined') {
                    // We do not send a notification for some msgs
                    return;
                }

                // eToken txs should have token icon
                if (parsedTx.parsedTokenEntries.length > 0) {
                    toast(notificationMsg, {
                        icon: React.createElement(TokenIconToast, {
                            type: 'default',
                            theme: 'default',
                            size: 32,
                            tokenId: tokenId as string,
                        }),
                    });
                } else {
                    // Otherwise normal
                    toast(notificationMsg, {
                        icon: CashReceivedNotificationIcon,
                    });
                }
                return true;
            }
            case 'BLK_FINALIZED': {
                // Handle avalanche finalized block
                // NB we use BLK_FINALIZED msgs to set tipHeight, which is used for determining maturity
                // of Coinbase utxos (necessary to avoid errors trying to spend staking rewards with
                // less than 100 confirmations)
                // Set chaintip height
                setChaintipBlockheight(msg.blockHeight);
                return;
            }
            case 'TX_FINALIZED': {
                // Update tx if it is in the first page of history
                const txid = (msg as MsgTxClient).txid;

                // Use functional update to avoid race conditions
                setTransactionHistory(prev => {
                    if (!prev || prev.firstPageTxs.length === 0) {
                        return prev;
                    }

                    const txIndex = prev.firstPageTxs.findIndex(
                        tx => tx.txid === txid,
                    );
                    if (txIndex !== -1 && !prev.firstPageTxs[txIndex].isFinal) {
                        // Create a new array with the updated transaction
                        const updatedFirstPageTxs = [...prev.firstPageTxs];
                        updatedFirstPageTxs[txIndex] = {
                            ...updatedFirstPageTxs[txIndex],
                            isFinal: true,
                        };

                        return { ...prev, firstPageTxs: updatedFirstPageTxs };
                    }

                    return prev;
                });

                return;
            }
            case 'TX_REMOVED_FROM_MEMPOOL': {
                // Rare
                // But, when this happens, we better be sure we are not showing this in the history
                console.info(`Tx removed from mempool: ${msg.txid}`);

                // Remove the transaction from the first page history if it exists
                setTransactionHistory(prev => {
                    if (!prev || prev.firstPageTxs.length === 0) {
                        return prev;
                    }

                    const txid = msg.txid;
                    const txIndex = prev.firstPageTxs.findIndex(
                        tx => tx.txid === txid,
                    );

                    if (txIndex === -1) {
                        // Transaction not in first page, no update needed
                        return prev;
                    }

                    // Remove the transaction from first page
                    const updatedFirstPageTxs = prev.firstPageTxs.filter(
                        tx => tx.txid !== txid,
                    );

                    // NB we do not attempt to pull in the "next" tx from the next page, we can live
                    // with missing a tx in this exceptionally rare case, we just want to be sure
                    // we are not showing the user a dropped tx

                    // Calculate new counts
                    const newNumTxs = Math.max(0, prev.numTxs - 1);
                    const newNumPages = Math.max(
                        1,
                        Math.ceil(newNumTxs / chronikConfig.txHistoryPageSize),
                    ); // At least 1 page

                    return {
                        ...prev,
                        firstPageTxs: updatedFirstPageTxs,
                        numTxs: newNumTxs,
                        numPages: newNumPages,
                    };
                });

                // Refresh cashtab state
                await update();
                return;
            }
            default: {
                // Do nothing for other msg types
                return;
            }
        }
    };

    // We handle ws msgs by adding them to a queue and processing them sequentially
    const wsMessageHandler = async (msg: WsMsgClient) => {
        // Add to queue
        messageQueue.current.push(msg);

        // Process queue if not already processing
        if (!isProcessing.current) {
            await processMessageQueue();
        }
    };

    /**
     * For users opening the app in the extension or a webapp window,
     * the only thing that must be up-to-date is the utxo set; we do not
     * care about the token balances or tx history
     *
     * Speed and accurate utxo set are critical
     *
     * So, we load the utxo set first and unlock the UI
     *
     * Then we lazy load everything else
     */
    const startupUtxoSync = async () => {
        if (currentCashtabStateRef.current.activeWallet === undefined) {
            // Should never happen, we only call this in a useEffect when activeWallet is defined
            return;
        }
        // Get the active wallet
        const activeWallet = currentCashtabStateRef.current.activeWallet;

        try {
            const chronikUtxos = (
                await chronik.address(activeWallet.address).utxos()
            ).utxos;
            const { slpUtxos, nonSlpUtxos } = organizeUtxosByType(chronikUtxos);

            const newState = {
                ...activeWallet.state,
                balanceSats: getBalanceSats(nonSlpUtxos),
                slpUtxos,
                nonSlpUtxos,
            };

            // Set wallet with new state field
            activeWallet.state = newState;

            // Update only the active wallet, wallets[0], in state
            await updateCashtabState({ activeWallet: activeWallet });
        } catch (error) {
            // We only log errors, leaving API Error handling to update()
            console.error(`Error in utxoSync() `, cashtabState);
            console.error(error);
        }

        // We clear this flag even if we fail to get the latest utxo set
        // as we anticipate update() will catch the same API error
        setInitialUtxoSyncComplete(true);

        // Call the full update
        update();
    };

    const update = async () => {
        if (!currentCashtabLoadedRef.current) {
            // Wait for cashtab to get state from storage before updating
            return;
        }

        // Get the active wallet
        const activeWallet = currentCashtabStateRef.current.activeWallet;
        if (activeWallet === undefined) {
            return;
        }

        try {
            const chronikUtxos = (
                await chronik.address(activeWallet.address).utxos()
            ).utxos;
            const { slpUtxos, nonSlpUtxos } = organizeUtxosByType(chronikUtxos);

            // Get map of all tokenIds held by this wallet and their balances
            // Note: this function will also update cashtabCache.tokens if any tokens in slpUtxos are not in cache
            const tokens = await getTokenBalances(
                chronik,
                slpUtxos,
                currentCashtabStateRef.current.cashtabCache.tokens,
            );

            // Update cashtabCache.tokens in state and storage
            updateCashtabState({
                cashtabCache: {
                    ...currentCashtabStateRef.current.cashtabCache,
                    tokens: currentCashtabStateRef.current.cashtabCache.tokens,
                },
            });

            const newState = {
                balanceSats: getBalanceSats(nonSlpUtxos),
                slpUtxos,
                nonSlpUtxos,
                tokens,
            };

            // Set wallet with new state field
            activeWallet.state = newState;

            // We do not update the wallets in state, only the activeWallet
            await updateCashtabState({ activeWallet: activeWallet });

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
    const updateCashtabState = async (updates: {
        [key: string]:
            | ActiveCashtabWallet
            | CashtabCache
            | CashtabContact[]
            | CashtabSettings
            | CashtabCacheJson
            | StoredCashtabWallet[]
            | string;
    }) => {
        // Update all keys in state atomically
        setCashtabState(prevState => ({ ...prevState, ...updates }));

        // We lock the UI by setting loading to true while we set items in storage
        // This is to prevent rapid user action from corrupting the db
        setLoading(true);

        // Process each key for storage
        for (const [key, value] of Object.entries(updates)) {
            let storageKey = key;
            let storageValue = value;

            // We do not store the full activeWallet, only the address
            // We choose the address because it is not changeable, like a name, and it is also not secret
            if (key === 'activeWallet') {
                /**
                 * Special handling for the activeWallet
                 * - We update the activeWalletAddress key with the address of the active wallet
                 * - In the future, we will update cache with its utxos or other things that would be useful to cache
                 *
                 * Potential confusion that we are calling updateCashtabState with the 'activeWallet' key, which actually does not exist
                 * But on balance, I think it's better to make sure the key we actually use matches what it actually stores, and to optimize
                 * Cashtab storage and caching, we need to move beyond "everything is key value"
                 */
                storageKey = 'activeWalletAddress';
                storageValue = (value as ActiveCashtabWallet).address;
            }

            // Handle any items that must be converted to JSON before storage
            // For now, this is just cashtabCache
            if (storageKey === 'cashtabCache') {
                storageValue = cashtabCacheToJSON(value as CashtabCache);
            }

            await storage.set(storageKey, storageValue);
        }

        setLoading(false);
        return true;
    };

    /**
     * Load all keys from storage into state
     *
     * If any are invalid, migrate them to valid and update in storage
     *
     * We only do this when the user starts Cashtab
     *
     * While the app is running, we use cashtabState as the source of truth
     *
     * We save to storage on state changes in updateCashtabState
     * so that these persist if the user navigates away from Cashtab     *
     */
    const loadCashtabState = async () => {
        // cashtabState is initialized with defaults when this component loads

        // contactList
        let contactList: null | CashtabContact[] = await storage.get<
            CashtabContact[]
        >('contactList');
        if (contactList !== null) {
            // If we find a contactList in storage
            if (!isValidContactList(contactList)) {
                // and this contactList is invalid, migrate

                // contactList is only expected to be invalid as legacy empty, i.e. [{}]
                // We do not call a function to migrate contactList as no other migration is expected
                contactList = [];
                // Update storage on app load only if existing values are in an obsolete format
                updateCashtabState({
                    contactList: contactList as CashtabContact[],
                });
            }
            // Set cashtabState contactList to valid storage or migrated
            cashtabState.contactList = contactList as CashtabContact[];
        }

        // settings
        let settings: null | CashtabSettings =
            await storage.get<CashtabSettings>('settings');
        if (settings !== null) {
            // If we find settings in storage
            if (!isValidCashtabSettings(settings)) {
                // If a settings object is present but invalid, parse to find and add missing keys
                settings = migrateLegacyCashtabSettings(
                    settings as unknown as CashtabSettings,
                );
                // Update storage on app load only if existing values are in an obsolete format
                updateCashtabState({
                    settings: settings as unknown as CashtabSettings,
                });
            }

            // Set cashtabState settings to valid storage or migrated settings
            cashtabState.settings = settings as CashtabSettings;
        }

        // cashtabCache
        let cashtabCache: null | CashtabCacheJson | CashtabCache =
            await storage.get<CashtabCacheJson | CashtabCache>('cashtabCache');

        if (cashtabCache !== null) {
            // If we find cashtabCache in storage

            // cashtabCache must be converted from JSON as it stores a Map
            cashtabCache = storedCashtabCacheToMap(
                cashtabCache as CashtabCacheJson,
            );

            if (!isValidCashtabCache(cashtabCache)) {
                // If a cashtabCache object is present but invalid, nuke it and start again
                cashtabCache = cashtabState.cashtabCache;
                // Update storage on app load only if existing values are in an obsolete format
                updateCashtabState({ cashtabCache: cashtabCache });
            }

            // Set cashtabState cashtabCache to valid storage or migrated settings
            cashtabState.cashtabCache = cashtabCache;
        }

        // Load wallets if present

        /**
         * Five possibilities
         *
         * 1 - SuperLegacy user
         *     - No activeWallet key
         *     - activeWallet at the "wallet" key
         *     - wallets, including activeWallet, at the "savedWallets" key
         *     All wallets legacy format and must be recreated
         * 2 - Legacy user
         *     - No "activeWallet" key
         *     - wallets at the "wallets" key
         *     - No "savedWallets" key
         * 3 - New user
         *     - No "activeWallet" key
         *     - No "wallets" key
         *     - No "savedWallets" key
         * 4 - Returning user
         *     - "activeWallet" key
         *     - "wallets" key
         * 5 - Corrupted wallet data, user must wipe and reboot
         */

        // As of 3.41.0, we should have an activeWalletAddress key, which stores the address of the active wallet
        const activeWalletAddress: null | string = await storage.get<string>(
            'activeWalletAddress',
        );
        const wallets: null | StoredCashtabWallet[] = await storage.get<
            StoredCashtabWallet[]
        >('wallets');

        if (activeWalletAddress !== null && wallets !== null) {
            // Normal startup
            // We do not validate wallets as, if we have these keys in place, we know structure is the latest
            const storedActiveWallet = wallets.find(
                wallet => wallet.address === activeWalletAddress,
            );
            if (!storedActiveWallet) {
                // Would reflect corrupted storage
                throw new Error(
                    'Corrupted storage: Active wallet not found in wallets',
                );
            }
            const activeWallet = await createActiveCashtabWallet(
                chronik,
                storedActiveWallet,
                cashtabState.cashtabCache,
            );
            cashtabState.activeWallet = activeWallet;
            cashtabState.wallets = wallets;
        } else if (wallets !== null) {
            // Legacy user
            console.info('Legacy user found in storage, migrating wallets');

            // Migrate all wallets
            const migratedLegacyWallets: StoredCashtabWallet[] = [];
            for (const wallet of wallets) {
                migratedLegacyWallets.push(
                    createCashtabWallet(wallet.mnemonic, wallet.name),
                );
            }
            cashtabState.wallets = migratedLegacyWallets;
            cashtabState.activeWallet = await createActiveCashtabWallet(
                chronik,
                migratedLegacyWallets[0],
                cashtabState.cashtabCache,
            );

            // For migrating users, we must update the wallets key
            await updateCashtabState({ wallets: migratedLegacyWallets });
        } else {
            // Test for superLegacy user
            const wallet: null | StoredCashtabWallet =
                await storage.get<StoredCashtabWallet>('wallet');
            const savedWallets: null | LegacyCashtabWallet[] =
                await storage.get<LegacyCashtabWallet[]>('savedWallets');

            if (wallet === null && savedWallets === null) {
                // A new user
                console.info(
                    `No wallets found in storage, initializing for new user`,
                );
                // For this case, there is no need to sync utxos
                setInitialUtxoSyncComplete(true);
                cashtabState.wallets = [];
                // We leave activeWallet undefined to denote a new user
                // This will trigger rendering the OnBoarding screen
            } else if (wallet !== null && savedWallets !== null) {
                // SuperLegacy
                console.info(
                    `SuperLegacy user found in storage, migrating wallets`,
                );
                const migratedSuperLegacyWallets: StoredCashtabWallet[] = [];

                // superLegacy stored the active wallet at the 'wallet' key
                const migratedActiveWallet = createCashtabWallet(
                    wallet.mnemonic,
                    wallet.name,
                );

                for (const wallet of savedWallets) {
                    migratedSuperLegacyWallets.push(
                        createCashtabWallet(wallet.mnemonic, wallet.name),
                    );
                }
                cashtabState.wallets = migratedSuperLegacyWallets;

                cashtabState.activeWallet = await createActiveCashtabWallet(
                    chronik,
                    migratedActiveWallet,
                    cashtabState.cashtabCache,
                );

                // For migrating users, we must update the wallets key
                await updateCashtabState({
                    wallets: migratedSuperLegacyWallets,
                });
            } else {
                // Corrupt storage
                toast.error(
                    'Corrupted storage: Cashtab was unable to load wallets from storage',
                );
                // Load as new user
                cashtabState.wallets = [];
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

        if (
            cashtabState.wallets.length > 0 &&
            cashtabState.activeWallet !== undefined
        ) {
            // Subscribe to address of current wallet, if you have one
            ws.subscribeToAddress(cashtabState.activeWallet.address);
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
     */
    const updateWebsocket = () => {
        if (ws === null) {
            // Should never happen, we only call this in a useEffect when ws is not null
            return;
        }
        if (cashtabState.activeWallet === undefined) {
            // Should never happen, we only call this in a useEffect when activeWallet is defined
            return;
        }
        // Set or update the onMessage handler
        // We can only set this when wallet is defined, so we do not set it in loadCashtabState
        ws.onMessage = wsMessageHandler;

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

        if (
            subscribedPayloads.length !== 1 ||
            subscribedPayloads[0] !== cashtabState.activeWallet.hash
        ) {
            // If we are subscribed to no addresses, more than 1 address, or the wrong address, we need to update subscriptions

            // Unsubscribe from all existing subscriptions
            for (const payload of subscribedPayloads) {
                ws.unsubscribeFromScript('p2pkh', payload);
            }

            // Subscribe to active wallet appConfig.derivationPath address
            ws.subscribeToAddress(cashtabState.activeWallet.address);
        }

        // Update ws in state
        return setWs(ws);
    };

    // With different currency selections possible, need unique intervals for price checks
    // Must be able to end them and set new ones with new currencies
    const initializeFiatPriceApi = async (selectedFiatCurrency: string) => {
        if (process.env.REACT_APP_TESTNET === 'true') {
            setFiatPrice(0);
            setFirmaPrice(0);
            return;
        }
        // Update fiat price and confirm it is set to make sure ap keeps loading state until this is updated

        // Call this instance with showNotifications = false,
        // as we do not want to calculate price deltas when the user selects a new foreign currency
        await fetchXecPrice(selectedFiatCurrency);

        if (selectedFiatCurrency === 'usd') {
            setFirmaPrice(1);
        } else {
            await fetchFirmaPrice();
        }
        // Set interval for updating the price with given currency

        // Now we call with showNotifications = true, as we want
        // to show price changes when the currency has not changed
        const thisFiatInterval = setInterval(function () {
            fetchXecPrice(selectedFiatCurrency);
            if (selectedFiatCurrency !== 'usd') {
                fetchFirmaPrice();
            }
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
     * If the user does not have USD as fiat currency,
     * we need to get an exchange rate for Firma
     */
    const fetchFirmaPrice = async (
        fiatCode = cashtabState.settings.fiatCurrency,
    ) => {
        // Keep this in the code, because different URLs will have different outputs require different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=${fiatCode}`;
        try {
            const firmaPrice = await fetch(priceApiUrl);
            const firmaPriceJson = await firmaPrice.json();
            const firmaPriceInFiat = firmaPriceJson.usd[fiatCode];

            if (typeof firmaPriceInFiat === 'number') {
                // If we have a good fetch
                return setFirmaPrice(firmaPriceInFiat);
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
                    `Failed to fetch Firma Price: Bad response or rate limit from CoinGecko`,
                );
            } else {
                console.error(`Failed to fetch Firma Price`, err);
            }
        }
        // If we have an error in the price fetch, or an invalid type without one, do not set the price
        return setFirmaPrice(null);
    };

    const cashtabBootup = async () => {
        // Initialize platform storage
        const storageInit = await initializeStorage();
        if (!storageInit.success) {
            console.error('Failed to initialize storage:', storageInit.error);
            // We continue anyway as storage adapters have fallbacks
        }

        await loadCashtabState();
    };

    useEffect(() => {
        cashtabBootup();
    }, []);

    // Call the update loop every time the user changes the active wallet
    // and immediately after cashtab is loaded
    useEffect(() => {
        if (cashtabLoaded) {
            // Sync utxos to unlock the UI, and then lazy load the rest of Cashtab state
            startupUtxoSync();
        }
    }, [cashtabLoaded]);

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
        updateWebsocket();
    }, [cashtabState, fiatPrice, ws, cashtabLoaded]);

    /**
     * Handle activating a copied wallet by only updating the activeWalletAddress in storage
     * This is used for address sharing scenarios where we don't need to fully initialize the wallet
     * @param walletAddress The address of the wallet to activate
     */
    const handleActivatingCopiedWallet = async (walletAddress: string) => {
        await storage.set('activeWalletAddress', walletAddress);
    };

    return {
        chronik,
        agora,
        ecc,
        chaintipBlockheight,
        fiatPrice,
        firmaPrice,
        cashtabLoaded,
        loading,
        setLoading,
        initialUtxoSyncComplete,
        apiError,
        updateCashtabState,
        handleActivatingCopiedWallet,
        processChronikWsMsg: async (msg: WsMsgClient) => {
            await wsMessageHandler(msg);
            return true;
        },
        cashtabState,
        transactionHistory,
        refreshTransactionHistory,
        setCashtabState,
    } as UseWalletReturnType;
};

export default useWallet;
