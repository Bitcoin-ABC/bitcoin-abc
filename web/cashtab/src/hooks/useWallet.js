/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect } from 'react';
import Paragraph from 'antd/lib/typography/Paragraph';
import { notification } from 'antd';
import useAsyncTimeout from '@hooks/useAsyncTimeout';
import usePrevious from '@hooks/usePrevious';
import useBCH from '@hooks/useBCH';
import BigNumber from 'bignumber.js';
import { fromSmallestDenomination } from '@utils/cashMethods';
import localforage from 'localforage';
import { currency } from '@components/Common/Ticker';
import _ from 'lodash';

const useWallet = () => {
    const [wallet, setWallet] = useState(false);
    const [fiatPrice, setFiatPrice] = useState(null);
    const [ws, setWs] = useState(null);
    const [apiError, setApiError] = useState(false);
    const [walletState, setWalletState] = useState({
        balances: {},
        tokens: [],
        slpBalancesAndUtxos: [],
        parsedTxHistory: [],
    });
    const {
        getBCH,
        getUtxos,
        getHydratedUtxoDetails,
        getSlpBalancesAndUtxos,
        getTxHistory,
        getTxData,
        addTokenTxData,
    } = useBCH();
    const [loading, setLoading] = useState(true);
    const [apiIndex, setApiIndex] = useState(0);
    const [BCH, setBCH] = useState(getBCH(apiIndex));
    const [utxos, setUtxos] = useState(null);
    const {
        balances,
        tokens,
        slpBalancesAndUtxos,
        parsedTxHistory,
    } = walletState;
    const previousBalances = usePrevious(balances);
    const previousTokens = usePrevious(tokens);
    const previousWallet = usePrevious(wallet);
    const previousUtxos = usePrevious(utxos);

    // If you catch API errors, call this function
    const tryNextAPI = () => {
        let currentApiIndex = apiIndex;
        // How many APIs do you have?
        const apiString = process.env.REACT_APP_BCHA_APIS;

        const apiArray = apiString.split(',');

        console.log(`You have ${apiArray.length} APIs to choose from`);
        console.log(`Current selection: ${apiIndex}`);
        // If only one, exit
        if (apiArray.length === 0) {
            console.log(
                `There are no backup APIs, you are stuck with this error`,
            );
            return;
        } else if (currentApiIndex < apiArray.length - 1) {
            currentApiIndex += 1;
            console.log(
                `Incrementing API index from ${apiIndex} to ${currentApiIndex}`,
            );
        } else {
            // Otherwise use the first option again
            console.log(`Retrying first API index`);
            currentApiIndex = 0;
        }
        //return setApiIndex(currentApiIndex);
        console.log(`Setting Api Index to ${currentApiIndex}`);
        setApiIndex(currentApiIndex);
        return setBCH(getBCH(currentApiIndex));
        // If you have more than one, use the next one
        // If you are at the "end" of the array, use the first one
    };

    const normalizeSlpBalancesAndUtxos = (slpBalancesAndUtxos, wallet) => {
        const Accounts = [wallet.Path245, wallet.Path145, wallet.Path1899];
        slpBalancesAndUtxos.nonSlpUtxos.forEach(utxo => {
            const derivatedAccount = Accounts.find(
                account => account.cashAddress === utxo.address,
            );
            utxo.wif = derivatedAccount.fundingWif;
        });

        return slpBalancesAndUtxos;
    };

    const normalizeBalance = slpBalancesAndUtxos => {
        const totalBalanceInSatoshis = slpBalancesAndUtxos.nonSlpUtxos.reduce(
            (previousBalance, utxo) => previousBalance + utxo.value,
            0,
        );
        return {
            totalBalanceInSatoshis,
            totalBalance: fromSmallestDenomination(totalBalanceInSatoshis),
        };
    };

    const deriveAccount = async (BCH, { masterHDNode, path }) => {
        const node = BCH.HDNode.derivePath(masterHDNode, path);
        const cashAddress = BCH.HDNode.toCashAddress(node);
        const slpAddress = BCH.SLP.Address.toSLPAddress(cashAddress);

        return {
            cashAddress,
            slpAddress,
            fundingWif: BCH.HDNode.toWIF(node),
            fundingAddress: BCH.SLP.Address.toSLPAddress(cashAddress),
            legacyAddress: BCH.SLP.Address.toLegacyAddress(cashAddress),
        };
    };

    const haveUtxosChanged = (utxos, previousUtxos) => {
        // Relevant points for this array comparing exercise
        // https://stackoverflow.com/questions/13757109/triple-equal-signs-return-false-for-arrays-in-javascript-why
        // https://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript

        // If this is initial state
        if (utxos === null) {
            // Then make sure to get slpBalancesAndUtxos
            return true;
        }
        // If this is the first time the wallet received utxos
        if (
            typeof previousUtxos === 'undefined' ||
            typeof utxos === 'undefined'
        ) {
            // Then they have certainly changed
            return true;
        }
        // return true for empty array, since this means you definitely do not want to skip the next API call
        if (utxos && utxos.length === 0) {
            return true;
        }

        // Compare utxo sets
        const utxoArraysUnchanged = _.isEqual(utxos, previousUtxos);

        // If utxos are not the same as previousUtxos
        if (utxoArraysUnchanged) {
            // then utxos have not changed
            return false;
            // otherwise,
        } else {
            // utxos have changed
            return true;
        }
    };

    const update = async ({ wallet, setWalletState }) => {
        //console.log(`tick()`);
        //console.time("update");
        try {
            if (!wallet) {
                return;
            }
            const cashAddresses = [
                wallet.Path245.cashAddress,
                wallet.Path145.cashAddress,
                wallet.Path1899.cashAddress,
            ];

            const utxos = await getUtxos(BCH, cashAddresses);

            // If an error is returned or utxos from only 1 address are returned
            if (!utxos || _.isEmpty(utxos) || utxos.error || utxos.length < 2) {
                // Throw error here to prevent more attempted api calls
                // as you are likely already at rate limits
                throw new Error('Error fetching utxos');
            }
            setUtxos(utxos);

            const utxosHaveChanged = haveUtxosChanged(utxos, previousUtxos);

            // If the utxo set has not changed,
            if (!utxosHaveChanged) {
                // remove api error here; otherwise it will remain if recovering from a rate
                // limit error with an unchanged utxo set
                setApiError(false);
                // then walletState has not changed and does not need to be updated
                //console.timeEnd("update");
                return;
            }

            const hydratedUtxoDetails = await getHydratedUtxoDetails(
                BCH,
                utxos,
            );

            const slpBalancesAndUtxos = await getSlpBalancesAndUtxos(
                hydratedUtxoDetails,
            );
            const txHistory = await getTxHistory(BCH, cashAddresses);
            const parsedTxHistory = await getTxData(BCH, txHistory);

            const parsedWithTokens = await addTokenTxData(BCH, parsedTxHistory);

            console.log(`slpBalancesAndUtxos`, slpBalancesAndUtxos);
            if (typeof slpBalancesAndUtxos === 'undefined') {
                console.log(`slpBalancesAndUtxos is undefined`);
                throw new Error('slpBalancesAndUtxos is undefined');
            }
            const { tokens } = slpBalancesAndUtxos;

            const newState = {
                balances: {},
                tokens: [],
                slpBalancesAndUtxos: [],
            };

            newState.slpBalancesAndUtxos = normalizeSlpBalancesAndUtxos(
                slpBalancesAndUtxos,
                wallet,
            );

            newState.balances = normalizeBalance(slpBalancesAndUtxos);

            newState.tokens = tokens;

            newState.parsedTxHistory = parsedWithTokens;

            setWalletState(newState);

            // If everything executed correctly, remove apiError
            setApiError(false);
        } catch (error) {
            console.log(`Error in update({wallet, setWalletState})`);
            console.log(error);
            // Set this in state so that transactions are disabled until the issue is resolved
            setApiError(true);
            //console.timeEnd("update");
            // Try another endpoint
            console.log(`Trying next API...`);
            tryNextAPI();
        }
        //console.timeEnd("update");
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

    /*
    const getSavedWalletsFromLocalForage = async () => {
        let savedWallets;
        try {
            savedWallets = await localforage.getItem('savedWallets');
        } catch (err) {
            console.log(`Error in getSavedWalletsFromLocalForage`, err);
            savedWallets = null;
        }
        return savedWallets;
    };
    */

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
            if (existingWallet && !existingWallet.Path1899) {
                console.log(`Wallet does not have Path1899`);
                existingWallet = await migrateLegacyWallet(BCH, existingWallet);
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

    const migrateLegacyWallet = async (BCH, wallet) => {
        console.log(`migrateLegacyWallet`);
        console.log(`legacyWallet`, wallet);
        const NETWORK = process.env.REACT_APP_NETWORK;
        const mnemonic = wallet.mnemonic;
        const rootSeedBuffer = await BCH.Mnemonic.toSeed(mnemonic);

        let masterHDNode;

        if (NETWORK === `mainnet`) {
            masterHDNode = BCH.HDNode.fromSeed(rootSeedBuffer);
        } else {
            masterHDNode = BCH.HDNode.fromSeed(rootSeedBuffer, 'testnet');
        }
        const Path1899 = await deriveAccount(BCH, {
            masterHDNode,
            path: "m/44'/1899'/0'/0/0",
        });

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

    const getWalletDetails = async wallet => {
        if (!wallet) {
            return false;
        }
        // Since this info is in localforage now, only get the var
        const NETWORK = process.env.REACT_APP_NETWORK;
        const mnemonic = wallet.mnemonic;
        const rootSeedBuffer = await BCH.Mnemonic.toSeed(mnemonic);
        let masterHDNode;

        if (NETWORK === `mainnet`) {
            masterHDNode = BCH.HDNode.fromSeed(rootSeedBuffer);
        } else {
            masterHDNode = BCH.HDNode.fromSeed(rootSeedBuffer, 'testnet');
        }

        const Path245 = await deriveAccount(BCH, {
            masterHDNode,
            path: "m/44'/245'/0'/0/0",
        });
        const Path145 = await deriveAccount(BCH, {
            masterHDNode,
            path: "m/44'/145'/0'/0/0",
        });
        const Path1899 = await deriveAccount(BCH, {
            masterHDNode,
            path: "m/44'/1899'/0'/0/0",
        });

        let name = Path1899.cashAddress.slice(12, 17);
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
        let savedWallets;
        try {
            savedWallets = await localforage.getItem('savedWallets');
            if (savedWallets === null) {
                savedWallets = [];
            }
        } catch (err) {
            console.log(`Error in getSavedWallets`);
            console.log(err);
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
        return savedWallets;
    };

    const activateWallet = async walletToActivate => {
        /*
    If the user is migrating from old version to this version, make sure to save the activeWallet

    1 - check savedWallets for the previously active wallet
    2 - If not there, add it
    */
        let currentlyActiveWallet;
        try {
            currentlyActiveWallet = await localforage.getItem('wallet');
        } catch (err) {
            console.log(
                `Error in localforage.getItem("wallet") in activateWallet()`,
            );
            return false;
        }
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
        When a legacy user runs cashtabapp.com/, their active wallet will be migrated to Path1899 by 
        the getWallet function

        Wallets in savedWallets are migrated when they are activated, in this function

        Two cases to handle

        1 - currentlyActiveWallet has Path1899, but its stored keyvalue pair in savedWallets does not
            > Update savedWallets so that Path1899 is added to currentlyActiveWallet
        
        2 - walletToActivate does not have Path1899
            > Update walletToActivate with Path1899 before activation
        */

        // Check savedWallets for currentlyActiveWallet
        let walletInSavedWallets = false;
        let walletUnmigrated = false;
        for (let i = 0; i < savedWallets.length; i += 1) {
            if (savedWallets[i].name === currentlyActiveWallet.name) {
                walletInSavedWallets = true;
                // Check savedWallets for unmigrated currentlyActiveWallet
                if (!savedWallets[i].Path1899) {
                    // Case 1, described above
                    console.log(
                        `Case 1: Wallet migration in saved wallets still pending, adding Path1899`,
                    );
                    savedWallets[i].Path1899 = currentlyActiveWallet.Path1899;
                    walletUnmigrated = true;
                }
            }
        }

        // Case 1
        if (walletUnmigrated) {
            // resave savedWallets
            try {
                // Set walletName as the active wallet
                await localforage.setItem('savedWallets', savedWallets);
            } catch (err) {
                console.log(
                    `Error in localforage.setItem("savedWallets") in activateWallet() for unmigrated wallet`,
                );
            }
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

        if (!walletToActivate.Path1899) {
            // Case 2, described above
            console.log(`Case 2: Wallet to activate does not have Path1899`);
            console.log(
                `Wallet to activate from SavedWallets does not have Path1899`,
            );
            console.log(`walletToActivate`, walletToActivate);
            walletToActivate = await migrateLegacyWallet(BCH, walletToActivate);
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

        return walletToActivate;
    };

    const renameWallet = async (oldName, newName) => {
        // Load savedWallets
        let savedWallets;
        try {
            savedWallets = await localforage.getItem('savedWallets');
        } catch (err) {
            console.log(
                `Error in await localforage.getItem("savedWallets") in renameWallet`,
            );
            console.log(err);
            return false;
        }
        // Verify that no existing wallet has this name
        for (let i = 0; i < savedWallets.length; i += 1) {
            if (savedWallets[i].name === newName) {
                // return an error
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
                `Error in localforage.setItem("savedWallets", savedWallets) in renameWallet()`,
            );
            return false;
        }
        return true;
    };

    const deleteWallet = async walletToBeDeleted => {
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
            );
            console.log(err);
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
            return false;
        }

        // Resave savedWallets less the deleted wallet
        try {
            // Set walletName as the active wallet
            await localforage.setItem('savedWallets', savedWallets);
        } catch (err) {
            console.log(
                `Error in localforage.setItem("savedWallets", savedWallets) in deleteWallet()`,
            );
            return false;
        }
        return true;
    };

    const addNewSavedWallet = async importMnemonic => {
        // Add a new wallet to savedWallets from importMnemonic or just new wallet
        const lang = 'english';
        // create 128 bit BIP39 mnemonic
        const Bip39128BitMnemonic = importMnemonic
            ? importMnemonic
            : BCH.Mnemonic.generate(128, BCH.Mnemonic.wordLists()[lang]);
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
            );
            console.log(err);
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
            );
            console.log(`savedWallets`, savedWallets);
            console.log(err);
        }
        return true;
    };

    const createWallet = async importMnemonic => {
        const lang = 'english';
        // create 128 bit BIP39 mnemonic
        const Bip39128BitMnemonic = importMnemonic
            ? importMnemonic
            : BCH.Mnemonic.generate(128, BCH.Mnemonic.wordLists()[lang]);
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

    const validateMnemonic = (
        mnemonic,
        wordlist = BCH.Mnemonic.wordLists().english,
    ) => {
        let mnemonicTestOutput;

        try {
            mnemonicTestOutput = BCH.Mnemonic.validate(mnemonic, wordlist);

            if (mnemonicTestOutput === 'Valid mnemonic') {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.log(err);
            return false;
        }
    };

    const handleUpdateWallet = async setWallet => {
        const wallet = await getWallet();
        setWallet(wallet);
    };

    // Parse for incoming BCH transactions
    // Only notify if websocket is not connected
    if (
        (ws === null || ws.readyState !== 1) &&
        previousBalances &&
        balances &&
        'totalBalance' in previousBalances &&
        'totalBalance' in balances &&
        new BigNumber(balances.totalBalance)
            .minus(previousBalances.totalBalance)
            .gt(0)
    ) {
        notification.success({
            message: 'Transaction received',
            description: (
                <Paragraph>
                    You received{' '}
                    {Number(
                        balances.totalBalance - previousBalances.totalBalance,
                    ).toFixed(currency.cashDecimals)}{' '}
                    {currency.ticker}!
                </Paragraph>
            ),
            duration: 3,
        });
    }

    // Parse for incoming SLP transactions
    if (
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
            //console.log(`tokenIds`, tokenIds);
            //console.log(`previousTokenIds`, previousTokenIds);

            // An array with the new token Id
            const newTokenIdArr = tokenIds.filter(
                tokenId => !previousTokenIds.includes(tokenId),
            );
            // It's possible that 2 new tokens were received
            // To do, handle this case
            const newTokenId = newTokenIdArr[0];
            //console.log(newTokenId);

            // How much of this tokenId did you get?
            // would be at

            // Find where the newTokenId is
            const receivedTokenObjectIndex = tokens.findIndex(
                x => x.tokenId === newTokenId,
            );
            //console.log(`receivedTokenObjectIndex`, receivedTokenObjectIndex);
            // Calculate amount received
            //console.log(`receivedTokenObject:`, tokens[receivedTokenObjectIndex]);

            const receivedSlpQty = tokens[
                receivedTokenObjectIndex
            ].balance.toString();
            const receivedSlpTicker =
                tokens[receivedTokenObjectIndex].info.tokenTicker;
            const receivedSlpName =
                tokens[receivedTokenObjectIndex].info.tokenName;
            //console.log(`receivedSlpQty`, receivedSlpQty);

            // Notification if you received SLP
            if (receivedSlpQty > 0) {
                notification.success({
                    message: `${currency.tokenTicker} Transaction received: ${receivedSlpTicker}`,
                    description: (
                        <Paragraph>
                            You received {receivedSlpQty} {receivedSlpName}
                        </Paragraph>
                    ),
                    duration: 5,
                });
            }

            //
        } else {
            // If tokens[i].balance > previousTokens[i].balance, a new SLP tx of an existing token has been received
            // Note that tokens[i].balance is of type BigNumber
            for (let i = 0; i < tokens.length; i += 1) {
                if (tokens[i].balance.gt(previousTokens[i].balance)) {
                    // Received this token
                    // console.log(`previousTokenId`, previousTokens[i].tokenId);
                    // console.log(`currentTokenId`, tokens[i].tokenId);

                    if (previousTokens[i].tokenId !== tokens[i].tokenId) {
                        console.log(
                            `TokenIds do not match, breaking from SLP notifications`,
                        );
                        // Then don't send the notification
                        // Also don't 'continue' ; this means you have sent a token, just stop iterating through
                        break;
                    }
                    const receivedSlpQty = tokens[i].balance.minus(
                        previousTokens[i].balance,
                    );

                    const receivedSlpTicker = tokens[i].info.tokenTicker;
                    const receivedSlpName = tokens[i].info.tokenName;

                    notification.success({
                        message: `SLP Transaction received: ${receivedSlpTicker}`,
                        description: (
                            <Paragraph>
                                You received {receivedSlpQty.toString()}{' '}
                                {receivedSlpName}
                            </Paragraph>
                        ),
                        duration: 5,
                    });
                }
            }
        }
    }

    //  Update price every 1 min
    useAsyncTimeout(async () => {
        fetchBchPrice();
    }, 60000);

    // Update wallet every 10s
    useAsyncTimeout(async () => {
        const wallet = await getWallet();
        update({
            wallet,
            setWalletState,
        }).finally(() => {
            setLoading(false);
        });
    }, 10000);

    const initializeWebsocket = (cashAddress, slpAddress) => {
        // console.log(`initializeWebsocket(${cashAddress}, ${slpAddress})`);
        // This function parses 3 cases
        // 1: edge case, websocket is in state but not properly connected
        //    > Remove it from state and forget about it, fall back to normal notifications
        // 2: edge-ish case, websocket is in state and connected but user has changed wallet
        //    > Unsubscribe from old addresses and subscribe to new ones
        // 3: most common: app is opening, creating websocket with existing addresses

        // If the websocket is already in state but is not properly connected
        if (ws !== null && ws.readyState !== 1) {
            // Forget about it and use conventional notifications

            // Close
            ws.close();
            // Remove from state
            setWs(null);
        }
        // If the websocket is in state and connected
        else if (ws !== null) {
            // console.log(`Websocket already in state`);
            // console.log(`ws,`, ws);
            // instead of initializing websocket, unsubscribe from old addresses and subscribe to new ones
            const previousWsCashAddress = previousWallet.Path145.legacyAddress;
            const previousWsSlpAddress = previousWallet.Path245.legacyAddress;
            try {
                // Unsubscribe from previous addresses
                ws.send(
                    JSON.stringify({
                        op: 'addr_unsub',
                        addr: previousWsCashAddress,
                    }),
                );
                console.log(
                    `Unsubscribed from BCH address at ${previousWsCashAddress}`,
                );
                ws.send(
                    JSON.stringify({
                        op: 'addr_unsub',
                        addr: previousWsSlpAddress,
                    }),
                );
                console.log(
                    `Unsubscribed from SLP address at ${previousWsSlpAddress}`,
                );

                // Subscribe to new addresses
                ws.send(
                    JSON.stringify({
                        op: 'addr_sub',
                        addr: cashAddress,
                    }),
                );
                console.log(`Subscribed to BCH address at ${cashAddress}`);
                // Subscribe to SLP address
                ws.send(
                    JSON.stringify({
                        op: 'addr_sub',
                        addr: slpAddress,
                    }),
                );
                console.log(`Subscribed to SLP address at ${slpAddress}`);
                // Reset onmessage; it was previously set with the old addresses
                // Note this code is exactly identical to lines 431-490
                // TODO put in function
                ws.onmessage = e => {
                    // TODO handle case where receive multiple messages on one incoming transaction
                    //console.log(`ws msg received`);
                    const incomingTx = JSON.parse(e.data);
                    console.log(incomingTx);

                    let bchSatsReceived = 0;
                    // First, check the inputs
                    // If cashAddress or slpAddress are in the inputs, then this is a sent tx and should be ignored for notifications
                    if (
                        incomingTx &&
                        incomingTx.x &&
                        incomingTx.x.inputs &&
                        incomingTx.x.out
                    ) {
                        const inputs = incomingTx.x.inputs;
                        // Iterate over inputs and see if this transaction was sent by the active wallet
                        for (let i = 0; i < inputs.length; i += 1) {
                            if (
                                inputs[i].prev_out.addr === cashAddress ||
                                inputs[i].prev_out.addr === slpAddress
                            ) {
                                // console.log(`Found a sending tx, not notifying`);
                                // This is a sent transaction and should be ignored by notification handlers
                                return;
                            }
                        }
                        // Iterate over outputs to determine receiving address
                        const outputs = incomingTx.x.out;

                        for (let i = 0; i < outputs.length; i += 1) {
                            if (outputs[i].addr === cashAddress) {
                                // console.log(`BCH transaction received`);
                                bchSatsReceived += outputs[i].value;
                                // handle
                            }
                            if (outputs[i].addr === slpAddress) {
                                console.log(`SLP transaction received`);
                                //handle
                                // you would want to get the slp info using this endpoint:
                                // https://rest.kingbch.com/v3/slp/txDetails/cb39dd04e07e172a37addfcb1d6e167dc52c01867ba21c9bf8b5acf4dd969a3f
                                // But it does not work for unconfirmed txs
                                // Hold off on slp tx notifications for now
                            }
                        }
                    }
                    // parse for receiving address
                    // if received at cashAddress, parse for BCH amount, notify BCH received
                    // if received at slpAddress, parse for token, notify SLP received
                    // if those checks fail, could be from a 'sent' tx, ignore

                    // Note, when you send an SLP tx, you get SLP change to SLP address and BCH change to BCH address

                    // Also note, when you send an SLP tx, you often have inputs from both BCH and SLP addresses

                    // This causes a sent SLP tx to register 4 times from the websocket

                    // Best way to ignore this is to ignore any incoming utx.x with BCH or SLP address in the inputs

                    // Notification for received BCHA
                    if (bchSatsReceived > 0) {
                        notification.success({
                            message: 'Transaction received',
                            description: (
                                <Paragraph>
                                    You received {bchSatsReceived / 1e8}{' '}
                                    {currency.ticker}!
                                </Paragraph>
                            ),
                            duration: 3,
                        });
                    }
                };
            } catch (err) {
                console.log(
                    `Error attempting to configure websocket for new wallet`,
                );
                console.log(err);
                console.log(`Closing connection`);
                ws.close();
                setWs(null);
            }
        } else {
            // If there is no websocket, create one, subscribe to addresses, and add notifications for incoming BCH transactions

            let newWs = new WebSocket('wss://ws.blockchain.info/bch/inv');

            newWs.onopen = () => {
                console.log(`Connected to bchWs`);

                // Subscribe to BCH address
                newWs.send(
                    JSON.stringify({
                        op: 'addr_sub',
                        addr: cashAddress,
                    }),
                );

                console.log(`Subscribed to BCH address at ${cashAddress}`);
                // Subscribe to SLP address
                newWs.send(
                    JSON.stringify({
                        op: 'addr_sub',
                        addr: slpAddress,
                    }),
                );
                console.log(`Subscribed to SLP address at ${slpAddress}`);
            };
            newWs.onerror = e => {
                // close and set to null
                console.log(`Error in websocket connection for ${newWs}`);
                console.log(e);
                setWs(null);
            };
            newWs.onclose = () => {
                console.log(`Websocket connection closed`);
                // Unsubscribe on close to prevent double subscribing
                //{"op":"addr_unsub", "addr":"$bitcoin_address"}
                newWs.send(
                    JSON.stringify({
                        op: 'addr_unsub',
                        addr: cashAddress,
                    }),
                );
                console.log(`Unsubscribed from BCH address at ${cashAddress}`);
                newWs.send(
                    JSON.stringify({
                        op: 'addr_sub',
                        addr: slpAddress,
                    }),
                );
                console.log(`Unsubscribed from SLP address at ${slpAddress}`);
            };
            newWs.onmessage = e => {
                // TODO handle case where receive multiple messages on one incoming transaction
                //console.log(`ws msg received`);
                const incomingTx = JSON.parse(e.data);
                console.log(incomingTx);

                let bchSatsReceived = 0;
                // First, check the inputs
                // If cashAddress or slpAddress are in the inputs, then this is a sent tx and should be ignored for notifications
                if (
                    incomingTx &&
                    incomingTx.x &&
                    incomingTx.x.inputs &&
                    incomingTx.x.out
                ) {
                    const inputs = incomingTx.x.inputs;
                    // Iterate over inputs and see if this transaction was sent by the active wallet
                    for (let i = 0; i < inputs.length; i += 1) {
                        if (
                            inputs[i].prev_out.addr === cashAddress ||
                            inputs[i].prev_out.addr === slpAddress
                        ) {
                            // console.log(`Found a sending tx, not notifying`);
                            // This is a sent transaction and should be ignored by notification handlers
                            return;
                        }
                    }
                    // Iterate over outputs to determine receiving address
                    const outputs = incomingTx.x.out;

                    for (let i = 0; i < outputs.length; i += 1) {
                        if (outputs[i].addr === cashAddress) {
                            // console.log(`BCH transaction received`);
                            bchSatsReceived += outputs[i].value;
                            // handle
                        }
                        if (outputs[i].addr === slpAddress) {
                            console.log(`SLP transaction received`);
                            //handle
                            // you would want to get the slp info using this endpoint:
                            // https://rest.kingbch.com/v3/slp/txDetails/cb39dd04e07e172a37addfcb1d6e167dc52c01867ba21c9bf8b5acf4dd969a3f
                            // But it does not work for unconfirmed txs
                            // Hold off on slp tx notifications for now
                        }
                    }
                }
                // parse for receiving address
                // if received at cashAddress, parse for BCH amount, notify BCH received
                // if received at slpAddress, parse for token, notify SLP received
                // if those checks fail, could be from a 'sent' tx, ignore

                // Note, when you send an SLP tx, you get SLP change to SLP address and BCH change to BCH address

                // Also note, when you send an SLP tx, you often have inputs from both BCH and SLP addresses

                // This causes a sent SLP tx to register 4 times from the websocket

                // Best way to ignore this is to ignore any incoming utx.x with BCH or SLP address in the inputs

                // Notification for received BCHA
                if (bchSatsReceived > 0) {
                    notification.success({
                        message: 'Transaction received',
                        description: (
                            <Paragraph>
                                You received {bchSatsReceived / 1e8}{' '}
                                {currency.ticker}!
                            </Paragraph>
                        ),
                        duration: 3,
                    });
                }
            };

            setWs(newWs);
        }
    };

    const fetchBchPrice = async () => {
        // Split this variable out in case coingecko changes
        const cryptoId = currency.coingeckoId;
        // Keep currency as a variable as eventually it will be a user setting
        const fiatCode = 'usd';
        // Keep this in the code, because different URLs will have different outputs require different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
        let bchPrice;
        let bchPriceJson;
        try {
            bchPrice = await fetch(priceApiUrl);
            //console.log(`bchPrice`, bchPrice);
        } catch (err) {
            console.log(`Error fetching BCH Price`);
            console.log(err);
        }
        try {
            bchPriceJson = await bchPrice.json();
            //console.log(`bchPriceJson`, bchPriceJson);
            const bchPriceInFiat = bchPriceJson[cryptoId][fiatCode];
            //console.log(`bchPriceInFiat`, bchPriceInFiat);
            setFiatPrice(bchPriceInFiat);
        } catch (err) {
            console.log(`Error parsing price API response to JSON`);
            console.log(err);
        }
    };

    useEffect(() => {
        handleUpdateWallet(setWallet);
        fetchBchPrice();
    }, []);

    useEffect(() => {
        if (
            wallet &&
            wallet.Path145 &&
            wallet.Path145.cashAddress &&
            wallet.Path245 &&
            wallet.Path245.cashAddress
        ) {
            if (currency.useBlockchainWs) {
                initializeWebsocket(
                    wallet.Path145.legacyAddress,
                    wallet.Path245.legacyAddress,
                );
            }
        }
    }, [wallet]);

    return {
        BCH,
        wallet,
        fiatPrice,
        slpBalancesAndUtxos,
        balances,
        tokens,
        parsedTxHistory,
        loading,
        apiError,
        getActiveWalletFromLocalForage,
        getWallet,
        validateMnemonic,
        getWalletDetails,
        getSavedWallets,
        migrateLegacyWallet,
        update: async () =>
            update({
                wallet: await getWallet(),
                setLoading,
                setWalletState,
            }),
        createWallet: async importMnemonic => {
            setLoading(true);
            const newWallet = await createWallet(importMnemonic);
            setWallet(newWallet);
            update({
                wallet: newWallet,
                setWalletState,
            }).finally(() => setLoading(false));
        },
        activateWallet: async walletToActivate => {
            setLoading(true);
            const newWallet = await activateWallet(walletToActivate);
            setWallet(newWallet);
            update({
                wallet: newWallet,
                setWalletState,
            }).finally(() => setLoading(false));
        },
        addNewSavedWallet,
        renameWallet,
        deleteWallet,
    };
};

export default useWallet;
