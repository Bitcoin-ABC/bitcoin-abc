import { useState, useEffect } from 'react';
import usePrevious from 'hooks/usePrevious';
import useInterval from './useInterval';
import { BN } from 'slp-mdm';
import {
    isValidStoredWallet,
    isLegacyMigrationRequired,
    getHashArrayFromWallet,
    isActiveWebsocket,
    getWalletBalanceFromUtxos,
} from 'utils/cashMethods';
import {
    isValidCashtabSettings,
    isValidCashtabCache,
    isValidContactList,
    parseInvalidSettingsForMigration,
    parseInvalidCashtabCacheForMigration,
} from 'validation';
import localforage from 'localforage';
import {
    xecReceivedNotification,
    xecReceivedNotificationWebsocket,
    eTokenReceivedNotification,
} from 'components/Common/Notifications';
import {
    getUtxosChronik,
    organizeUtxosByType,
    getPreliminaryTokensArray,
    finalizeTokensArray,
    finalizeSlpUtxos,
    getTxHistoryChronik,
    parseChronikTx,
} from 'chronik';
import { queryAliasServer } from 'utils/aliasUtils';
import cashaddr from 'ecashaddrjs';
import * as bip39 from 'bip39';
import * as randomBytes from 'randombytes';
import * as utxolib from '@bitgo/utxo-lib';
import { websocket as websocketConfig } from 'config/websocket';
import {
    cashtabSettings as cashtabDefaultConfig,
    cashtabSettingsValidation,
} from 'config/cashtabSettings';
import defaultCashtabCache from 'config/cashtabCache';
import appConfig from 'config/app';
import aliasSettings from 'config/alias';
// Cashtab is always running the `update` function at an interval
// When the websocket detects an incoming tx (or when the wallet is first loaded)
// Set this interval to near-instant (10ms)
// If the `update` function runs and this is the refresh interval, it will throttle back to
// the standard interval set in websocketConfig
// Note: react setState is async. If you set this to 0, the update function will run 2 or 3 times before
// the interval is updated in state
// 10ms and update will only run once before backing off the interval, which is all you need
const TRIGGER_UTXO_REFRESH_INTERVAL_MS = 10;

const useWallet = chronik => {
    const [walletRefreshInterval, setWalletRefreshInterval] = useState(
        TRIGGER_UTXO_REFRESH_INTERVAL_MS,
    );
    const [wallet, setWallet] = useState(false);
    const [chronikWebsocket, setChronikWebsocket] = useState(null);
    const [contactList, setContactList] = useState([]);
    const [cashtabSettings, setCashtabSettings] = useState(false);
    const [cashtabCache, setCashtabCache] = useState(defaultCashtabCache);
    const [fiatPrice, setFiatPrice] = useState(null);
    const [apiError, setApiError] = useState(false);
    const [checkFiatInterval, setCheckFiatInterval] = useState(null);
    const [hasUpdated, setHasUpdated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [aliases, setAliases] = useState({
        registered: [],
        pending: [],
    });
    const [aliasPrices, setAliasPrices] = useState(null);
    const [aliasServerError, setAliasServerError] = useState(false);
    const [aliasIntervalId, setAliasIntervalId] = useState(null);
    const [chaintipBlockheight, setChaintipBlockheight] = useState(0);
    const { balances, tokens } = isValidStoredWallet(wallet)
        ? wallet.state
        : {
              balances: {},
              tokens: [],
          };
    const previousBalances = usePrevious(balances);
    const previousTokens = usePrevious(tokens);

    const deriveAccount = async ({ masterHDNode, path }) => {
        const node = masterHDNode.derivePath(path);
        const publicKey = node.publicKey.toString('hex');
        const cashAddress = cashaddr.encode('ecash', 'P2PKH', node.identifier);
        const { hash } = cashaddr.decode(cashAddress, true);

        return {
            publicKey,
            hash160: hash,
            cashAddress,
            fundingWif: node.toWIF(),
        };
    };

    const update = async ({ wallet }) => {
        // Check if walletRefreshInterval is set to TRIGGER_UTXO_REFRESH_INTERVAL_MS, i.e. this was called by websocket tx detection
        if (walletRefreshInterval === TRIGGER_UTXO_REFRESH_INTERVAL_MS) {
            // If so, set it back to the usual refresh rate
            setWalletRefreshInterval(websocketConfig.websocketRefreshInterval);
        }
        try {
            if (!wallet) {
                return;
            }

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

            const { tokens, updatedTokenInfoById, newTokensToCache } =
                await finalizeTokensArray(
                    chronik,
                    preliminaryTokensArray,
                    cashtabCache.tokenInfoById,
                );

            // If you have more token info now, write this to local storage
            if (newTokensToCache) {
                writeTokenInfoByIdToCache(updatedTokenInfoById);
                // Update the tokenInfoById key in cashtabCache
                setCashtabCache({
                    ...cashtabCache,
                    tokenInfoById: updatedTokenInfoById,
                });
            }

            const slpUtxos = finalizeSlpUtxos(
                preliminarySlpUtxos,
                updatedTokenInfoById,
            );

            const {
                parsedTxHistory,
                txHistoryUpdatedTokenInfoById,
                txHistoryNewTokensToCache,
            } = await getTxHistoryChronik(
                chronik,
                wallet,
                updatedTokenInfoById,
            );
            if (txHistoryNewTokensToCache) {
                console.log(
                    `Uncached token info found in tx history, adding to cache`,
                );
                writeTokenInfoByIdToCache(txHistoryUpdatedTokenInfoById);
                // Update the tokenInfoById key in cashtabCache
                setCashtabCache({
                    ...cashtabCache,
                    tokenInfoById: txHistoryUpdatedTokenInfoById,
                });
            }

            // If you were missing any token info for tokens in this tx history, get it

            const newState = {
                balances: getWalletBalanceFromUtxos(nonSlpUtxos),
                slpUtxos,
                nonSlpUtxos,
                tokens,
                parsedTxHistory,
            };

            // Set wallet with new state field
            wallet.state = newState;
            setWallet(wallet);

            // Write this state to indexedDb using localForage
            writeWalletState(wallet, newState);

            // If everything executed correctly, remove apiError
            setApiError(false);
        } catch (error) {
            console.log(`Error in update({wallet})`);
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

    const getActiveWalletFromLocalForage = async () => {
        let wallet;
        try {
            wallet = await localforage.getItem('wallet');
        } catch (err) {
            console.log(`Error in getActiveWalletFromLocalForage`, err);
            wallet = null;
        }
        return wallet;
    };

    const getContactListFromLocalForage = async () => {
        let contactListArray = [];
        try {
            contactListArray = await localforage.getItem('contactList');
        } catch (err) {
            console.log('Error in getContactListFromLocalForage', err);
            contactListArray = null;
        }
        return contactListArray;
    };

    const updateContactList = async contactListArray => {
        setLoading(true);
        let updateSuccess = true;
        try {
            await localforage.setItem('contactList', contactListArray);
            setContactList(contactListArray);
        } catch (err) {
            console.log('Error in updateContactList', err);
            updateSuccess = false;
        }
        setLoading(false);
        return updateSuccess;
    };

    const getWallet = async () => {
        let wallet;
        let existingWallet;
        try {
            existingWallet = await getActiveWalletFromLocalForage();
            // existing wallet will be
            // 1 - the 'wallet' value from localForage, if it exists
            // 2 - false if it does not exist in localForage
            // 3 - null if error

            // If the wallet does not have Path1899, add it
            // or each Path1899, Path145, Path245 does not have a public key, add them
            if (existingWallet) {
                if (isLegacyMigrationRequired(existingWallet)) {
                    console.log(
                        `Wallet does not have Path1899 or does not have public key`,
                    );
                    existingWallet = await migrateLegacyWallet(existingWallet);
                }
            }

            // If not in localforage then existingWallet = false, check localstorage
            if (!existingWallet) {
                console.log(`no existing wallet, checking local storage`);
                existingWallet = JSON.parse(
                    window.localStorage.getItem('wallet'),
                );
                console.log(`existingWallet from localStorage`, existingWallet);
                // If you find it here, move it to indexedDb
                if (existingWallet !== null) {
                    wallet = await getWalletDetails(existingWallet);
                    await localforage.setItem('wallet', wallet);
                    return wallet;
                }
            }
        } catch (err) {
            console.log(`Error in getWallet()`, err);
            /* 
            Error here implies problem interacting with localForage or localStorage API
            
            Have not seen this error in testing

            In this case, you still want to return 'wallet' using the logic below based on 
            the determination of 'existingWallet' from the logic above
            */
        }

        if (existingWallet === null || !existingWallet) {
            wallet = await getWalletDetails(existingWallet);
            await localforage.setItem('wallet', wallet);
        } else {
            wallet = existingWallet;
        }
        return wallet;
    };

    const migrateLegacyWallet = async wallet => {
        console.log(`migrateLegacyWallet`);
        console.log(`legacyWallet`, wallet);
        const mnemonic = wallet.mnemonic;
        const rootSeedBuffer = await bip39.mnemonicToSeed(mnemonic, '');

        const masterHDNode = utxolib.bip32.fromSeed(
            rootSeedBuffer,
            utxolib.networks.ecash,
        );

        const Path245 = await deriveAccount({
            masterHDNode,
            path: "m/44'/245'/0'/0/0",
        });
        const Path145 = await deriveAccount({
            masterHDNode,
            path: "m/44'/145'/0'/0/0",
        });
        const Path1899 = await deriveAccount({
            masterHDNode,
            path: "m/44'/1899'/0'/0/0",
        });

        wallet.Path245 = Path245;
        wallet.Path145 = Path145;
        wallet.Path1899 = Path1899;

        try {
            await localforage.setItem('wallet', wallet);
        } catch (err) {
            console.log(
                `Error setting wallet to wallet indexedDb in migrateLegacyWallet()`,
            );
            console.log(err);
        }

        return wallet;
    };

    const writeTokenInfoByIdToCache = async tokenInfoById => {
        console.log(`writeTokenInfoByIdToCache`);
        const cashtabCache = defaultCashtabCache;
        cashtabCache.tokenInfoById = tokenInfoById;
        try {
            await localforage.setItem('cashtabCache', cashtabCache);
            console.log(`cashtabCache successfully updated`);
        } catch (err) {
            console.log(`Error in writeCashtabCache()`, err);
        }
    };

    const writeWalletState = async (wallet, newState) => {
        // Add new state as an object on the active wallet
        wallet.state = newState;
        try {
            await localforage.setItem('wallet', wallet);
        } catch (err) {
            console.log(`Error in writeWalletState()`);
            console.log(err);
        }
    };

    const getWalletDetails = async wallet => {
        if (!wallet) {
            return false;
        }
        // Since this info is in localforage now, only get the var
        const mnemonic = wallet.mnemonic;
        const rootSeedBuffer = await bip39.mnemonicToSeed(mnemonic, '');
        const masterHDNode = utxolib.bip32.fromSeed(
            rootSeedBuffer,
            utxolib.networks.ecash,
        );

        const Path245 = await deriveAccount({
            masterHDNode,
            path: "m/44'/245'/0'/0/0",
        });
        const Path145 = await deriveAccount({
            masterHDNode,
            path: "m/44'/145'/0'/0/0",
        });
        const Path1899 = await deriveAccount({
            masterHDNode,
            path: "m/44'/1899'/0'/0/0",
        });

        let name = Path1899.cashAddress.slice(6, 11);
        // Only set the name if it does not currently exist
        if (wallet && wallet.name) {
            name = wallet.name;
        }

        return {
            mnemonic: wallet.mnemonic,
            name,
            Path245,
            Path145,
            Path1899,
        };
    };

    const getSavedWallets = async activeWallet => {
        setLoading(true);

        let savedWallets;
        try {
            savedWallets = await localforage.getItem('savedWallets');
            if (savedWallets === null) {
                savedWallets = [];
            }
        } catch (err) {
            console.log(`Error in getSavedWallets`, err);
            savedWallets = [];
        }
        // Even though the active wallet is still stored in savedWallets, don't return it in this function
        for (let i = 0; i < savedWallets.length; i += 1) {
            if (
                typeof activeWallet !== 'undefined' &&
                activeWallet.name &&
                savedWallets[i].name === activeWallet.name
            ) {
                savedWallets.splice(i, 1);
            }
        }

        // Sort alphabetically
        savedWallets.sort((a, b) => a.name.localeCompare(b.name));

        setLoading(false);
        return savedWallets;
    };

    const activateWallet = async (currentlyActiveWallet, walletToActivate) => {
        /*
    If the user is migrating from old version to this version, make sure to save the activeWallet

    1 - check savedWallets for the previously active wallet
    2 - If not there, add it
    */
        console.log(`Activating wallet ${walletToActivate.name}`);
        setHasUpdated(false);

        // Get savedwallets
        let savedWallets;
        try {
            savedWallets = await localforage.getItem('savedWallets');
        } catch (err) {
            console.log(
                `Error in localforage.getItem("savedWallets") in activateWallet()`,
            );
            return false;
        }
        /*
        When a legacy user runs cashtab.com/, their active wallet will be migrated to Path1899 by 
        the getWallet function. getWallet function also makes sure that each Path has a public key

        Wallets in savedWallets are migrated when they are activated, in this function

        Two cases to handle

        1 - currentlyActiveWallet is valid but its stored keyvalue pair in savedWallets is not
            > Update savedWallets so this saved wallet is valid
        
        2 - walletToActivate is not valid (because it's a legacy saved wallet)
            > Update walletToActivate before activation
        
        */

        // Check savedWallets for currentlyActiveWallet
        let walletInSavedWallets = false;
        for (let i = 0; i < savedWallets.length; i += 1) {
            if (savedWallets[i].name === currentlyActiveWallet.name) {
                walletInSavedWallets = true;
                // Make sure the savedWallet entry matches the currentlyActiveWallet entry
                savedWallets[i] = currentlyActiveWallet;
                console.log(
                    `Updating savedWallet ${savedWallets[i].name} to match state as currentlyActiveWallet ${currentlyActiveWallet.name}`,
                );
            }
        }

        // resave savedWallets
        try {
            // Set walletName as the active wallet
            console.log(`Saving updated savedWallets`);
            await localforage.setItem('savedWallets', savedWallets);
        } catch (err) {
            console.log(
                `Error in localforage.setItem("savedWallets") in activateWallet() for unmigrated wallet`,
            );
        }

        if (!walletInSavedWallets) {
            console.log(`Wallet is not in saved Wallets, adding`);
            savedWallets.push(currentlyActiveWallet);
            // resave savedWallets
            try {
                // Set walletName as the active wallet
                await localforage.setItem('savedWallets', savedWallets);
            } catch (err) {
                console.log(
                    `Error in localforage.setItem("savedWallets") in activateWallet()`,
                );
            }
        }
        // If wallet does not have Path1899, add it
        // or each of the Path1899, Path145, Path245 does not have a public key, add them
        // by calling migrateLagacyWallet()
        if (isLegacyMigrationRequired(walletToActivate)) {
            // Case 2, described above
            console.log(
                `Case 2: Wallet to activate is not in the most up to date Cashtab format`,
            );
            console.log(`walletToActivate`, walletToActivate);
            walletToActivate = await migrateLegacyWallet(walletToActivate);
        } else {
            // Otherwise activate it as normal
            // Now that we have verified the last wallet was saved, we can activate the new wallet
            try {
                await localforage.setItem('wallet', walletToActivate);
            } catch (err) {
                console.log(
                    `Error in localforage.setItem("wallet", walletToActivate) in activateWallet()`,
                );
                return false;
            }
        }
        console.log(`Returning walletToActivate ${walletToActivate.name}`);
        return walletToActivate;
    };

    const renameSavedWallet = async (oldName, newName) => {
        setLoading(true);
        // Load savedWallets
        let savedWallets;
        try {
            savedWallets = await localforage.getItem('savedWallets');
        } catch (err) {
            console.log(
                `Error in await localforage.getItem("savedWallets") in renameSavedWallet`,
                err,
            );
            setLoading(false);
            return false;
        }
        // Verify that no existing wallet has this name
        for (let i = 0; i < savedWallets.length; i += 1) {
            if (savedWallets[i].name === newName) {
                // return an error
                setLoading(false);
                return false;
            }
        }

        // change name of desired wallet
        for (let i = 0; i < savedWallets.length; i += 1) {
            if (savedWallets[i].name === oldName) {
                // Replace the name of this entry with the new name
                savedWallets[i].name = newName;
            }
        }
        // resave savedWallets
        try {
            // Set walletName as the active wallet
            await localforage.setItem('savedWallets', savedWallets);
        } catch (err) {
            console.log(
                `Error in localforage.setItem("savedWallets", savedWallets) in renameSavedWallet()`,
                err,
            );
            setLoading(false);
            return false;
        }
        setLoading(false);
        return true;
    };

    const renameActiveWallet = async (activeWallet, oldName, newName) => {
        setLoading(true);
        // Load savedWallets
        let savedWallets;
        try {
            savedWallets = await localforage.getItem('savedWallets');
        } catch (err) {
            console.log(
                `Error in await localforage.getItem("savedWallets") in renameSavedWallet`,
                err,
            );
            setLoading(false);
            return false;
        }
        // Verify that no existing wallet has this name
        for (let i = 0; i < savedWallets.length; i += 1) {
            if (savedWallets[i].name === newName) {
                // return an error
                setLoading(false);
                return false;
            }
        }

        // Change name of active wallet at its entry in savedWallets
        for (let i = 0; i < savedWallets.length; i += 1) {
            if (savedWallets[i].name === oldName) {
                // Replace the name of this entry with the new name
                savedWallets[i].name = newName;
            }
        }

        // resave savedWallets
        try {
            // Set walletName as the active wallet
            await localforage.setItem('savedWallets', savedWallets);
        } catch (err) {
            console.log(
                `Error in localforage.setItem("wallet", wallet) in renameActiveWallet()`,
                err,
            );
            setLoading(false);
            return false;
        }

        // Change name of active wallet param in this function
        activeWallet.name = newName;

        // Update the active wallet entry in indexedDb
        try {
            await localforage.setItem('wallet', activeWallet);
        } catch (err) {
            console.log(
                `Error in localforage.setItem("wallet", ${activeWallet.name}) in renameActiveWallet()`,
                err,
            );
            setLoading(false);
            return false;
        }

        // Only set the renamed activeWallet in state if no errors earlier in this function
        setWallet(activeWallet);

        setLoading(false);
        return true;
    };

    const deleteWallet = async walletToBeDeleted => {
        setLoading(true);
        // delete a wallet
        // returns true if wallet is successfully deleted
        // otherwise returns false
        // Load savedWallets
        let savedWallets;
        try {
            savedWallets = await localforage.getItem('savedWallets');
        } catch (err) {
            console.log(
                `Error in await localforage.getItem("savedWallets") in deleteWallet`,
                err,
            );
            setLoading(false);
            return false;
        }
        // Iterate over to find the wallet to be deleted
        // Verify that no existing wallet has this name
        let walletFoundAndRemoved = false;
        for (let i = 0; i < savedWallets.length; i += 1) {
            if (savedWallets[i].name === walletToBeDeleted.name) {
                // Verify it has the same mnemonic too, that's a better UUID
                if (savedWallets[i].mnemonic === walletToBeDeleted.mnemonic) {
                    // Delete it
                    savedWallets.splice(i, 1);
                    walletFoundAndRemoved = true;
                }
            }
        }
        // If you don't find the wallet, return false
        if (!walletFoundAndRemoved) {
            setLoading(false);
            return false;
        }

        // Resave savedWallets less the deleted wallet
        try {
            // Set walletName as the active wallet
            await localforage.setItem('savedWallets', savedWallets);
        } catch (err) {
            console.log(
                `Error in localforage.setItem("savedWallets", savedWallets) in deleteWallet()`,
                err,
            );
            setLoading(false);
            return false;
        }
        setLoading(false);
        return true;
    };

    const addNewSavedWallet = async importMnemonic => {
        setLoading(true);
        // Add a new wallet to savedWallets from importMnemonic or just new wallet
        const lang = 'english';

        // create 128 bit BIP39 mnemonic
        const Bip39128BitMnemonic = importMnemonic
            ? importMnemonic
            : bip39.generateMnemonic(128, randomBytes, bip39.wordlists[lang]);

        const newSavedWallet = await getWalletDetails({
            mnemonic: Bip39128BitMnemonic.toString(),
        });
        // Get saved wallets
        let savedWallets;
        try {
            savedWallets = await localforage.getItem('savedWallets');
            // If this doesn't exist yet, savedWallets === null
            if (savedWallets === null) {
                savedWallets = [];
            }
        } catch (err) {
            console.log(
                `Error in savedWallets = await localforage.getItem("savedWallets") in addNewSavedWallet()`,
                err,
            );
            console.log(`savedWallets in error state`, savedWallets);
        }
        // If this wallet is from an imported mnemonic, make sure it does not already exist in savedWallets
        if (importMnemonic) {
            for (let i = 0; i < savedWallets.length; i += 1) {
                // Check for condition "importing new wallet that is already in savedWallets"
                if (savedWallets[i].mnemonic === importMnemonic) {
                    // set this as the active wallet to keep name history
                    console.log(
                        `Error: this wallet already exists in savedWallets`,
                    );
                    console.log(`Wallet not being added.`);
                    setLoading(false);
                    return false;
                }
            }
        }
        // add newSavedWallet
        savedWallets.push(newSavedWallet);
        // update savedWallets
        try {
            await localforage.setItem('savedWallets', savedWallets);
        } catch (err) {
            console.log(
                `Error in localforage.setItem("savedWallets", activeWallet) called in createWallet with ${importMnemonic}`,
                err,
            );
            console.log(`savedWallets`, savedWallets);
        }
        setLoading(false);
        return true;
    };

    const createWallet = async importMnemonic => {
        const lang = 'english';

        // create 128 bit BIP39 mnemonic
        const Bip39128BitMnemonic = importMnemonic
            ? importMnemonic
            : bip39.generateMnemonic(128, randomBytes, bip39.wordlists[lang]);

        const wallet = await getWalletDetails({
            mnemonic: Bip39128BitMnemonic.toString(),
        });

        try {
            await localforage.setItem('wallet', wallet);
        } catch (err) {
            console.log(
                `Error setting wallet to wallet indexedDb in createWallet()`,
            );
            console.log(err);
        }
        // Since this function is only called from OnBoarding.js, also add this to the saved wallet
        try {
            await localforage.setItem('savedWallets', [wallet]);
        } catch (err) {
            console.log(
                `Error setting wallet to savedWallets indexedDb in createWallet()`,
            );
            console.log(err);
        }
        return wallet;
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

        // If you see a tx from your subscribed addresses added to the mempool, then the wallet utxo set has changed
        // Update it
        setWalletRefreshInterval(TRIGGER_UTXO_REFRESH_INTERVAL_MS);

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

        // Get tokenInfoById from cashtabCache to parse this tx
        let tokenInfoById = {};
        try {
            tokenInfoById = cashtabCache.tokenInfoById;
        } catch (err) {
            console.log(
                `Error getting tokenInfoById from cache on incoming tx`,
                err,
            );
        }

        // parse tx for notification
        const parsedChronikTx = parseChronikTx(
            incomingTxDetails,
            wallet,
            tokenInfoById,
        );
        /* If this is an incoming eToken tx and parseChronikTx was not able to get genesis info
           from cache, then get genesis info from API and add to cache */
        if (parsedChronikTx.incoming) {
            if (parsedChronikTx.isEtokenTx) {
                let eTokenAmountReceived = parsedChronikTx.etokenAmount;
                if (parsedChronikTx.genesisInfo.success) {
                    // Send this info to the notification function
                    eTokenReceivedNotification(
                        parsedChronikTx.genesisInfo.tokenTicker,
                        eTokenAmountReceived,
                        parsedChronikTx.genesisInfo.tokenName,
                    );
                } else {
                    // Get genesis info from API and add to cache
                    try {
                        // Get the tokenID
                        const incomingTokenId = parsedChronikTx.slpMeta.tokenId;

                        // chronik call to genesis tx to get this info
                        const tokenGenesisInfo = await chronik.tx(
                            incomingTokenId,
                        );
                        const { genesisInfo } = tokenGenesisInfo.slpTxData;
                        // Add this to cashtabCache
                        let tokenInfoByIdUpdatedForThisToken = tokenInfoById;
                        tokenInfoByIdUpdatedForThisToken[incomingTokenId] =
                            genesisInfo;
                        writeTokenInfoByIdToCache(
                            tokenInfoByIdUpdatedForThisToken,
                        );
                        // Update the tokenInfoById key in cashtabCache
                        setCashtabCache({
                            ...cashtabCache,
                            tokenInfoById: tokenInfoByIdUpdatedForThisToken,
                        });

                        // Calculate eToken amount with decimals
                        eTokenAmountReceived = new BN(
                            parsedChronikTx.etokenAmount,
                        ).shiftedBy(-1 * genesisInfo.decimals);

                        // Send this info to the notification function
                        eTokenReceivedNotification(
                            genesisInfo.tokenTicker,
                            eTokenAmountReceived,
                            genesisInfo.tokenName,
                        );
                    } catch (err) {
                        console.log(
                            `Error in getting and setting new token info for incoming eToken tx`,
                            err,
                        );
                    }
                }
            } else {
                xecReceivedNotificationWebsocket(
                    parsedChronikTx.xecAmount,
                    cashtabSettings,
                    fiatPrice,
                );
            }
        }
    };

    // Chronik websockets
    const initializeWebsocket = async (chronik, wallet, fiatPrice) => {
        // Because wallet is set to `false` before it is loaded, do nothing if you find this case
        // Also return and wait for legacy migration if wallet is not migrated
        const hash160Array = getHashArrayFromWallet(wallet);
        if (!wallet || !hash160Array) {
            return setChronikWebsocket(null);
        }

        let ws = chronikWebsocket;

        // Initialize websocket if not in state
        if (ws === null) {
            if (
                chronik &&
                chronik._proxyInterface &&
                chronik._proxyInterface._endpointArray &
                    chronik._proxyInterface._workingIndex
            )
                console.log(
                    `Opening websocket connection at ${
                        chronik._proxyInterface._endpointArray[
                            chronik._proxyInterface._workingIndex
                        ].wsUrl
                    }`,
                );
            try {
                ws = chronik.ws({
                    onMessage: msg => {
                        processChronikWsMsg(msg, wallet, fiatPrice);
                    },
                    autoReconnect: true,
                    onReconnect: e => {
                        // Fired before a reconnect attempt is made:
                        console.log(
                            'Reconnecting websocket, disconnection cause: ',
                            e,
                        );
                    },
                    onConnect: e => {
                        console.log(`Chronik websocket connected`, e);
                        console.log(
                            `Websocket connected, adjusting wallet refresh interval to ${
                                websocketConfig.websocketRefreshInterval / 1000
                            }s`,
                        );
                        setWalletRefreshInterval(
                            websocketConfig.websocketRefreshInterval,
                        );
                    },
                });

                // Need to keep in state so subscriptions can be modified when wallet changes
                setChronikWebsocket(ws);

                // Wait for websocket to be connected:
                await ws.waitForOpen();
            } catch (err) {
                console.log(`Error creating websocket`, err);
                return setChronikWebsocket(null);
            }
        } else {
            /*        
            If the websocket connection is not null, initializeWebsocket was called
            because one of the websocket's dependencies changed

            Update the onMessage method to get the latest dependencies (wallet, fiatPrice)
            */

            ws.onMessage = msg => {
                processChronikWsMsg(msg, wallet, fiatPrice);
            };
        }

        // Check if current subscriptions match current wallet
        let activeSubscriptionsMatchActiveWallet = true;

        const previousWebsocketSubscriptions = ws.subs;
        // If there are no previous subscriptions, then activeSubscriptionsMatchActiveWallet is certainly false
        if (previousWebsocketSubscriptions.length === 0) {
            activeSubscriptionsMatchActiveWallet = false;
        } else {
            const subscribedHash160Array = previousWebsocketSubscriptions.map(
                function (subscription) {
                    return subscription.scriptPayload;
                },
            );
            // Confirm that websocket is subscribed to every address in wallet hash160Array
            for (let i = 0; i < hash160Array.length; i += 1) {
                if (!subscribedHash160Array.includes(hash160Array[i])) {
                    activeSubscriptionsMatchActiveWallet = false;
                }
            }
        }

        // If you are already subscribed to the right addresses, exit here
        // You get to this situation if fiatPrice changed but wallet.mnemonic did not
        if (activeSubscriptionsMatchActiveWallet) {
            // Put connected websocket in state
            return setChronikWebsocket(ws);
        }

        // Unsubscribe to any active subscriptions
        console.log(
            `previousWebsocketSubscriptions`,
            previousWebsocketSubscriptions,
        );
        if (previousWebsocketSubscriptions.length > 0) {
            for (let i = 0; i < previousWebsocketSubscriptions.length; i += 1) {
                const unsubHash160 =
                    previousWebsocketSubscriptions[i].scriptPayload;
                ws.unsubscribe('p2pkh', unsubHash160);
                console.log(`ws.unsubscribe('p2pkh', ${unsubHash160})`);
            }
        }

        // Subscribe to addresses of current wallet
        for (let i = 0; i < hash160Array.length; i += 1) {
            ws.subscribe('p2pkh', hash160Array[i]);
            console.log(`ws.subscribe('p2pkh', ${hash160Array[i]})`);
        }

        // Put connected websocket in state
        return setChronikWebsocket(ws);
    };

    const loadCashtabSettings = async () => {
        // get settings object from localforage
        let localSettings;
        try {
            localSettings = await localforage.getItem('settings');
            // If there is no keyvalue pair in localforage with key 'settings'
            if (localSettings === null) {
                // Create one with the default settings from Ticker.js
                localforage.setItem('settings', cashtabDefaultConfig);
                // Set state to default settings
                setCashtabSettings(cashtabDefaultConfig);
                return cashtabDefaultConfig;
            }
        } catch (err) {
            console.log(`Error getting cashtabSettings`, err);
            // TODO If they do not exist, write them
            // TODO add function to change them
            setCashtabSettings(cashtabDefaultConfig);
            return cashtabDefaultConfig;
        }
        // If you found an object in localforage at the settings key, make sure it's valid
        if (isValidCashtabSettings(localSettings)) {
            setCashtabSettings(localSettings);
            return localSettings;
        }
        // If a settings object is present but invalid, parse to find and add missing keys
        let modifiedLocalSettings =
            parseInvalidSettingsForMigration(localSettings);
        if (isValidCashtabSettings(modifiedLocalSettings)) {
            // modifiedLocalSettings placed in local storage
            localforage.setItem('settings', modifiedLocalSettings);
            setCashtabSettings(modifiedLocalSettings);
            // update missing key in local storage without overwriting existing valid settings
            return modifiedLocalSettings;
        } else {
            // if not valid, also set cashtabSettings to default
            setCashtabSettings(cashtabDefaultConfig);
            // Since this is returning default settings based on an error from reading storage, do not overwrite whatever is in storage
            return cashtabDefaultConfig;
        }
    };

    const loadContactList = async () => {
        // get contactList object from localforage
        let localContactList;
        try {
            localContactList = await localforage.getItem('contactList');
            // If there is no keyvalue pair in localforage with key 'contactList'
            if (localContactList === null) {
                // Use an array
                localforage.setItem('contactList', []);
                setContactList([]);
                return [];
            }
        } catch (err) {
            console.log(`Error getting contactList`, err);
            setContactList([]);
            return [];
        }
        // If you found an object in localforage at the contactList key, make sure it's valid
        if (isValidContactList(localContactList)) {
            setContactList(localContactList);
            return localContactList;
        }
        // if not valid, set to empty
        await localforage.setItem('contactList', []);
        setContactList([]);
        return [];
    };

    const loadCashtabCache = async () => {
        // get cache object from localforage
        let localCashtabCache;
        try {
            localCashtabCache = await localforage.getItem('cashtabCache');
            // If there is no keyvalue pair in localforage with key 'cashtabCache'
            if (localCashtabCache === null) {
                // Use the default
                localforage.setItem('cashtabCache', defaultCashtabCache);
                setCashtabCache(defaultCashtabCache);
                return defaultCashtabCache;
            }
        } catch (err) {
            console.log(`Error getting cashtabCache`, err);
            setCashtabCache(defaultCashtabCache);
            return defaultCashtabCache;
        }
        // If you found an object in localforage at the cashtabCache key, make sure it's valid
        if (isValidCashtabCache(localCashtabCache)) {
            setCashtabCache(localCashtabCache);
            return localCashtabCache;
        }
        // if not valid, parse the cache object, finds what param is missing, and sticks it in
        const migratedCashtabCache =
            parseInvalidCashtabCacheForMigration(localCashtabCache);
        localforage.setItem('cashtabCache', migratedCashtabCache);
        setCashtabCache(migratedCashtabCache);
        return defaultCashtabCache;
    };

    // With different currency selections possible, need unique intervals for price checks
    // Must be able to end them and set new ones with new currencies
    const initializeFiatPriceApi = async selectedFiatCurrency => {
        // Update fiat price and confirm it is set to make sure ap keeps loading state until this is updated
        await fetchBchPrice(selectedFiatCurrency);
        // Set interval for updating the price with given currency

        const thisFiatInterval = setInterval(function () {
            fetchBchPrice(selectedFiatCurrency);
        }, 60000);

        // set interval in state
        setCheckFiatInterval(thisFiatInterval);
    };

    const clearFiatPriceApi = fiatPriceApi => {
        // Clear fiat price check interval of previously selected currency
        clearInterval(fiatPriceApi);
    };

    const changeCashtabSettings = async (key, newValue) => {
        // Set loading to true as you do not want to display the fiat price of the last currency
        // loading = true will lock the UI until the fiat price has updated
        if (key !== 'balanceVisible') {
            setLoading(true);
        }
        // Get settings from localforage
        let currentSettings;
        let newSettings;
        try {
            currentSettings = await localforage.getItem('settings');
        } catch (err) {
            console.log(`Error in changeCashtabSettings`, err);
            // Set fiat price to null, which disables fiat sends throughout the app
            setFiatPrice(null);
            // Unlock the UI
            setLoading(false);
            return;
        }

        // Make sure function was called with valid params
        if (cashtabSettingsValidation[key].includes(newValue)) {
            // Update settings
            newSettings = currentSettings;
            newSettings[key] = newValue;
        } else {
            // Set fiat price to null, which disables fiat sends throughout the app
            setFiatPrice(null);
            // Unlock the UI
            setLoading(false);
            return;
        }
        // Set new settings in state so they are available in context throughout the app
        setCashtabSettings(newSettings);
        // If this settings change adjusted the fiat currency, update fiat price
        if (key === 'fiatCurrency') {
            clearFiatPriceApi(checkFiatInterval);
            initializeFiatPriceApi(newValue);
        }
        // Write new settings in localforage
        try {
            await localforage.setItem('settings', newSettings);
        } catch (err) {
            console.log(
                `Error writing newSettings object to localforage in changeCashtabSettings`,
                err,
            );
            console.log(`newSettings`, newSettings);
            // do nothing. If this happens, the user will see default currency next time they load the app.
        }
        setLoading(false);
    };

    // Parse for incoming XEC transactions
    // hasUpdated is set to true in the useInterval function, and re-sets to false during activateWallet
    // Do not show this notification if websocket connection is live; in this case the websocket will handle it
    if (
        !isActiveWebsocket(chronikWebsocket) &&
        previousBalances &&
        balances &&
        'totalBalance' in previousBalances &&
        'totalBalance' in balances &&
        new BN(balances.totalBalance)
            .minus(previousBalances.totalBalance)
            .gt(0) &&
        hasUpdated
    ) {
        xecReceivedNotification(
            balances,
            previousBalances,
            cashtabSettings,
            fiatPrice,
        );
    }

    // Parse for incoming eToken transactions
    // Do not show this notification if websocket connection is live; in this case the websocket will handle it
    if (
        !isActiveWebsocket(chronikWebsocket) &&
        tokens &&
        tokens[0] &&
        tokens[0].balance &&
        previousTokens &&
        previousTokens[0] &&
        previousTokens[0].balance &&
        hasUpdated === true
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
                eTokenReceivedNotification(
                    receivedSlpTicker,
                    receivedSlpQty,
                    receivedSlpName,
                );
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

                    eTokenReceivedNotification(
                        receivedSlpTicker,
                        receivedSlpQty,
                        receivedSlpName,
                    );
                }
            }
        }
    }

    // Update wallet according to defined interval
    useInterval(async () => {
        const wallet = await getWallet();
        update({
            wallet,
        }).finally(() => {
            setLoading(false);
            if (!hasUpdated) {
                setHasUpdated(true);
            }
        });
    }, walletRefreshInterval);

    const fetchBchPrice = async (
        fiatCode = cashtabSettings ? cashtabSettings.fiatCurrency : 'usd',
    ) => {
        // Split this variable out in case coingecko changes
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs require different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
        let bchPrice;
        let bchPriceJson;
        try {
            bchPrice = await fetch(priceApiUrl);
        } catch (err) {
            console.log(`Error fetching BCH Price`);
            console.log(err);
        }
        try {
            bchPriceJson = await bchPrice.json();
            let bchPriceInFiat = bchPriceJson[cryptoId][fiatCode];

            const validEcashPrice = typeof bchPriceInFiat === 'number';

            if (validEcashPrice) {
                setFiatPrice(bchPriceInFiat);
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
        setWallet(await getWallet());
        await loadContactList();
        await loadCashtabCache();
        const initialSettings = await loadCashtabSettings();
        initializeFiatPriceApi(initialSettings.fiatCurrency);
    };

    useEffect(() => {
        cashtabBootup();
    }, []);

    /*
    Run initializeWebsocket(chronik, wallet, fiatPrice) each time chronik, wallet, or fiatPrice changes
    
    Use wallet.mnemonic as the useEffect parameter here because we 
    want to run initializeWebsocket(chronik, wallet, fiatPrice) when a new unique wallet
    is selected, not when the active wallet changes state
    */
    useEffect(() => {
        initializeWebsocket(chronik, wallet, fiatPrice);
    }, [chronik, wallet.mnemonic, fiatPrice]);

    const refreshAliasesOnStartup = async () => {
        // Initialize a new periodic refresh of aliases which ONLY calls the API if
        // there are pending aliases since confirmed aliases would not change over time
        // The interval is also only initialized if there are no other intervals present.
        if (aliasSettings.aliasEnabled) {
            if (
                wallet &&
                wallet.Path1899 &&
                wallet.Path1899.cashAddress &&
                aliasIntervalId === null
            ) {
                // Initial refresh to ensure `aliases` state var is up to date
                await refreshAliases(wallet.Path1899.cashAddress);
                const aliasRefreshInterval = 30000;
                const intervalId = setInterval(async function () {
                    if (aliases?.pending?.length > 0) {
                        console.log(
                            'useEffect(): Refreshing registered and pending aliases',
                        );
                        await refreshAliases(wallet.Path1899.cashAddress);
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
        wallet,
        walletRefreshInterval,
        chaintipBlockheight,
        fiatPrice,
        loading,
        apiError,
        contactList,
        cashtabSettings,
        loadCashtabSettings,
        cashtabCache,
        changeCashtabSettings,
        refreshAliases,
        aliases,
        setAliases,
        aliasServerError,
        setAliasServerError,
        aliasPrices,
        setAliasPrices,
        getActiveWalletFromLocalForage,
        getWallet,
        getWalletDetails,
        getSavedWallets,
        migrateLegacyWallet,
        getContactListFromLocalForage,
        updateContactList,
        createWallet: async importMnemonic => {
            setLoading(true);
            const newWallet = await createWallet(importMnemonic);
            setWallet(newWallet);
            update({
                wallet: newWallet,
            }).finally(() => setLoading(false));
        },
        activateWallet: async (currentlyActiveWallet, walletToActivate) => {
            setLoading(true);
            const newWallet = await activateWallet(
                currentlyActiveWallet,
                walletToActivate,
            );
            console.log(`activateWallet gives newWallet ${newWallet.name}`);
            // Changing the wallet here will cause `initializeWebsocket` to fire which will update the websocket interval on a successful connection
            setWallet(newWallet);
            // Immediately call update on this wallet to populate it in the latest format
            // Use the instant interval of TRIGGER_UTXO_REFRESH_INTERVAL_MS that the update function will cancel
            setWalletRefreshInterval(TRIGGER_UTXO_REFRESH_INTERVAL_MS);
            setLoading(false);
        },
        addNewSavedWallet,
        renameSavedWallet,
        renameActiveWallet,
        deleteWallet,
        processChronikWsMsg,
    };
};

export default useWallet;
