// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';
import { getHashArrayFromWallet } from 'utils/cashMethods';
import { opReturn as opreturnConfig } from 'config/opreturn';
import { chronik as chronikConfig } from 'config/chronik';
import appConfig from 'config/app';
import { getStackArray } from 'ecash-script';
import cashaddr from 'ecashaddrjs';
import CashtabCache from 'config/CashtabCache';

export const getTxHistoryPage = async (chronik, hash160, page = 0) => {
    let txHistoryPage;
    try {
        txHistoryPage = await chronik
            .script('p2pkh', hash160)
            // Get the 25 most recent transactions
            .history(page, chronikConfig.txHistoryPageSize);
        return txHistoryPage;
    } catch (err) {
        console.log(`Error in getTxHistoryPage(${hash160})`, err);
    }
};

export const returnGetTxHistoryPagePromise = async (
    chronik,
    hash160,
    page = 0,
) => {
    /* 
    Unlike getTxHistoryPage, this function will reject and 
    fail Promise.all() if there is an error in the chronik call
    */
    return new Promise((resolve, reject) => {
        chronik
            .script('p2pkh', hash160)
            .history(page, chronikConfig.txHistoryPageSize)
            .then(
                result => {
                    resolve(result);
                },
                err => {
                    reject(err);
                },
            );
    });
};

export const isAliasRegistered = (registeredAliases, alias) => {
    for (let i = 0; i < registeredAliases.length; i++) {
        if (
            registeredAliases[i].alias.toString().toLowerCase() ===
            alias.toLowerCase()
        ) {
            console.log(`Alias (${alias}) is registered`);
            return true;
        }
    }
    return false;
};

// Return false if do not get a valid response
export const getTokenStats = async (chronik, tokenId) => {
    try {
        // token attributes available via chronik's token() method
        let tokenResponseObj = await chronik.token(tokenId);
        const tokenDecimals = tokenResponseObj.slpTxData.genesisInfo.decimals;

        // additional arithmetic to account for token decimals
        // circulating supply not provided by chronik, calculate via totalMinted - totalBurned
        tokenResponseObj.circulatingSupply = new BN(
            tokenResponseObj.tokenStats.totalMinted,
        )
            .minus(new BN(tokenResponseObj.tokenStats.totalBurned))
            .shiftedBy(-1 * tokenDecimals)
            .toString();

        tokenResponseObj.tokenStats.totalMinted = new BN(
            tokenResponseObj.tokenStats.totalMinted,
        )
            .shiftedBy(-1 * tokenDecimals)
            .toString();

        tokenResponseObj.initialTokenQuantity = new BN(
            tokenResponseObj.initialTokenQuantity,
        )
            .shiftedBy(-1 * tokenDecimals)
            .toString();

        tokenResponseObj.tokenStats.totalBurned = new BN(
            tokenResponseObj.tokenStats.totalBurned,
        )
            .shiftedBy(-1 * tokenDecimals)
            .toString();

        return tokenResponseObj;
    } catch (err) {
        console.log(
            `Error fetching token stats for tokenId ${tokenId}: ` + err,
        );
        return false;
    }
};

/* 
Note: chronik.script('p2pkh', hash160).utxos(); is not readily mockable in jest
Hence it is necessary to keep this out of any functions that require unit testing
*/
export const getUtxosSingleHashChronik = async (chronik, hash160) => {
    // Get utxos at a single address, which chronik takes in as a hash160
    let utxos;
    try {
        utxos = await chronik.script('p2pkh', hash160).utxos();
        if (utxos.length === 0) {
            // Chronik returns an empty array if there are no utxos at this hash160
            return [];
        }
        /* Chronik returns an array of with a single object if there are utxos at this hash 160
        [
            {
                outputScript: <hash160>,
                utxos:[{utxo}, {utxo}, ..., {utxo}]
            }
        ]
        */

        // Return only the array of utxos at this address
        return utxos[0].utxos;
    } catch (err) {
        console.log(`Error in chronik.utxos(${hash160})`, err);
        throw new Error(err);
    }
};

export const returnGetUtxosChronikPromise = (chronik, hash160AndAddressObj) => {
    /*
        Chronik thinks in hash160s, but people and wallets think in addresses
        Add the address to each utxo
    */
    return new Promise((resolve, reject) => {
        getUtxosSingleHashChronik(chronik, hash160AndAddressObj.hash).then(
            result => {
                for (let i = 0; i < result.length; i += 1) {
                    const thisUtxo = result[i];
                    thisUtxo.address = hash160AndAddressObj.address;
                }
                resolve(result);
            },
            err => {
                reject(err);
            },
        );
    });
};

export const getUtxosChronik = async (chronik, hash160sMappedToAddresses) => {
    /* 
        Chronik only accepts utxo requests for one address at a time
        Construct an array of promises for each address
        Note: Chronik requires the hash160 of an address for this request
    */
    const chronikUtxoPromises = [];
    for (let i = 0; i < hash160sMappedToAddresses.length; i += 1) {
        const thisPromise = returnGetUtxosChronikPromise(
            chronik,
            hash160sMappedToAddresses[i],
        );
        chronikUtxoPromises.push(thisPromise);
    }
    const allUtxos = await Promise.all(chronikUtxoPromises);
    // Since each individual utxo has address information, no need to keep them in distinct arrays
    // Combine into one array of all utxos
    const flatUtxos = allUtxos.flat();
    return flatUtxos;
};

export const organizeUtxosByType = chronikUtxos => {
    /* 
    
    Convert chronik utxos (returned by getUtxosChronik function, above) to match 
    wallet storage pattern
    
    This means sequestering eToken utxos from non-eToken utxos

    For legacy reasons, the term "SLP" is still sometimes used to describe an eToken

    So, SLP utxos === eToken utxos, it's just a semantics difference here
    
    */

    const nonSlpUtxos = [];
    const preliminarySlpUtxos = [];
    for (let i = 0; i < chronikUtxos.length; i += 1) {
        // Construct nonSlpUtxos and slpUtxos arrays
        const thisUtxo = chronikUtxos[i];
        if (typeof thisUtxo.slpToken !== 'undefined') {
            preliminarySlpUtxos.push(thisUtxo);
        } else {
            nonSlpUtxos.push(thisUtxo);
        }
    }

    return { preliminarySlpUtxos, nonSlpUtxos };
};

export const getPreliminaryTokensArray = preliminarySlpUtxos => {
    // Iterate over the slpUtxos to create the 'tokens' object
    let tokensById = {};

    preliminarySlpUtxos.forEach(preliminarySlpUtxo => {
        /* 
        Note that a wallet could have many eToken utxos all belonging to the same eToken
        For example, a user could have 100 of a certain eToken, but this is composed of
        four utxos, one for 17, one for 50, one for 30, one for 3        
        */

        // Start with the existing object for this particular token, if it exists
        let token = tokensById[preliminarySlpUtxo.slpMeta.tokenId];

        if (token) {
            if (preliminarySlpUtxo.slpToken.amount) {
                token.balance = token.balance.plus(
                    new BN(preliminarySlpUtxo.slpToken.amount),
                );
            }
        } else {
            // If it does not exist, create it
            token = {};
            token.tokenId = preliminarySlpUtxo.slpMeta.tokenId;
            if (preliminarySlpUtxo.slpToken.amount) {
                token.balance = new BN(preliminarySlpUtxo.slpToken.amount);
            } else {
                token.balance = new BN(0);
            }
            tokensById[preliminarySlpUtxo.slpMeta.tokenId] = token;
        }
    });

    const preliminaryTokensArray = Object.values(tokensById);
    return preliminaryTokensArray;
};

/**
 * Get and cache genesisInfo for a token
 * @param {object} chronik chronik-client instance
 * @param {string} tokenId tokenId you want genesisInfo for
 * @param {Map} cachedTokens the map stored at cashtabCache.tokens
 * @returns {promise} promise resolving to chronik's genesisInfo key from chronik.token(tokenId)
 */
export const returnGetTokenInfoChronikPromise = (
    chronik,
    tokenId,
    cachedTokens,
) => {
    /*
    The chronik.tx(txid) API call returns extensive transaction information
    For the purposes of finalizing token information, we only need the token metadata

    This function returns a promise that extracts only this needed information from
    the chronik.tx(txid) API call

    In this way, calling Promise.all() on an array of tokenIds that lack metadata
    will return an array with all required metadata
    */
    return new Promise((resolve, reject) => {
        chronik.token(tokenId).then(
            result => {
                if (typeof result !== 'undefined') {
                    if ('slpTxData' in result) {
                        // NNG chronik
                        cachedTokens.set(tokenId, result.slpTxData.genesisInfo);
                        resolve(result.slpTxData.genesisInfo);
                    }
                    if ('genesisInfo' in result) {
                        // in-node chronik
                        cachedTokens.set(tokenId, result.genesisInfo);
                        resolve(result.genesisInfo);
                    }
                }

                reject(
                    new Error(
                        `Invalid token info format from chronik.token(${tokenId})`,
                    ),
                );
            },
            err => {
                reject(err);
            },
        );
    });
};

/**
 * Add genesisInfo and calculate balance using now-known token decimals
 * @param {array} preliminaryTokensArray array of token objects formatted to be read by Cashtab
 * returned by getPreliminaryTokensArray
 * @param {Map} cachedTokens the map stored at cashtabCache.tokens
 * @returns {array} finalTokensArray = preliminaryTokensArray updated for decimals for
 * tokens where we did not yet have this info from cache or chronik
 */
export const processPreliminaryTokensArray = (
    preliminaryTokensArray,
    cachedTokens,
) => {
    /* Iterate over preliminaryTokensArray to

    1 - Add slp metadata (token ticker, name, other metadata)
    2 - Calculate the token balance. Token balance in 
        preliminaryTokensArray does not take into account the
        decimal places of the token...so it is incorrect.

    */
    const finalTokenArray = [];
    for (let i = 0; i < preliminaryTokensArray.length; i += 1) {
        const thisToken = preliminaryTokensArray[i];
        const thisTokenId = thisToken.tokenId;

        // Because tokenInfoByTokenId is indexed by tokenId, it's easy to reference
        const thisTokenInfo = cachedTokens.get(thisTokenId);

        // The decimals are specifically needed to calculate the correct balance
        const thisTokenDecimals = thisTokenInfo.decimals;

        // Add info object to token
        thisToken.info = thisTokenInfo;

        // Update balance according to decimals and store it as a string
        thisToken.balance = thisToken.balance
            .shiftedBy(-1 * thisTokenDecimals)
            .toString();

        // Now that you have the metadata and the correct balance,
        // preliminaryTokenInfo is finalTokenInfo
        finalTokenArray.push(thisToken);
    }
    return finalTokenArray;
};

/**
 * Add tokenDecimals info to walletState.tokens and update cachedTokens if you have uncached tokens
 * @param {object} chronik chronik-client instance
 * @param {array} preliminaryTokensArray return value from getPreliminaryTokensArray
 * @param {Map} cachedTokens the map stored at cashtabCache.tokens
 * @returns {object}
 * {
 *   tokens {array} output of processPreliminaryTokensArray
 *   cachedTokens {Map} the map stored at cashtabCache.tokens, either same as input or updated with new tokens
 *   newTokensToCache {boolean} true if we have added more tokens to cache
 * }
 */
export const finalizeTokensArray = async (
    chronik,
    preliminaryTokensArray,
    cachedTokens = new CashtabCache().tokens,
) => {
    // Iterate over preliminaryTokensArray to determine what tokens you need to make API calls for

    // Create an array of promises
    // Each promise is a chronik API call to obtain token metadata for this token ID
    const getTokenInfoPromises = [];

    for (let i = 0; i < preliminaryTokensArray.length; i += 1) {
        const thisTokenId = preliminaryTokensArray[i].tokenId;
        // See if you already have this info in cachedTokenInfo
        if (cachedTokens.has(thisTokenId)) {
            // If you already have this info in cache, do not create an API request for it
            continue;
        }
        const thisTokenInfoPromise = returnGetTokenInfoChronikPromise(
            chronik,
            thisTokenId,
            cachedTokens,
        );
        getTokenInfoPromises.push(thisTokenInfoPromise);
    }

    const newTokensToCache = getTokenInfoPromises.length > 0;

    // Fetch uncached token genesisInfo and add to cache
    try {
        await Promise.all(getTokenInfoPromises);
    } catch (err) {
        console.log(`Error in Promise.all(getTokenInfoPromises)`, err);
    }

    // Now use cachedTokenInfoByTokenId object to finalize token info
    // Split this out into a separate function so you can unit test
    const finalTokenArray = processPreliminaryTokensArray(
        preliminaryTokensArray,
        cachedTokens,
    );

    // Sort tokens alphabetically by ticker
    finalTokenArray.sort((a, b) =>
        a.info.tokenTicker.localeCompare(b.info.tokenTicker),
    );

    return { tokens: finalTokenArray, cachedTokens, newTokensToCache };
};

/**
 * Use now-known tokenDecimals to add decimal-adjusted tokenQty to token utxos
 * @param {array} preliminarySlpUtxos slpUtxos without tokenQty calculated by tokenDecimals
 * @param {Map} cachedTokens the map stored at cashtabCache.tokens
 * @returns {array} finalizedSlpUtxos slpUtxos with tokenQty calculated by tokenDecimals
 */
export const finalizeSlpUtxos = (preliminarySlpUtxos, cachedTokens) => {
    // We need tokenQty in each slpUtxo to support transaction creation
    // Add this info here
    const finalizedSlpUtxos = [];
    for (let i = 0; i < preliminarySlpUtxos.length; i += 1) {
        const thisUtxo = preliminarySlpUtxos[i];
        const thisTokenId = thisUtxo.slpMeta.tokenId;
        const { decimals } = cachedTokens.get(thisTokenId);
        // Update balance according to decimals
        thisUtxo.tokenQty = new BN(thisUtxo.slpToken.amount)
            .shiftedBy(-1 * decimals)
            .toString();
        // SLP utxos also require tokenId and decimals directly in the utxo object
        // TODO refactor after migrating to in-node chronik-client
        thisUtxo.tokenId = thisTokenId;
        thisUtxo.decimals = decimals;
        finalizedSlpUtxos.push(thisUtxo);
    }
    return finalizedSlpUtxos;
};

export const flattenChronikTxHistory = txHistoryOfAllAddresses => {
    // Create an array of all txs

    let flatTxHistoryArray = [];
    for (let i = 0; i < txHistoryOfAllAddresses.length; i += 1) {
        const txHistoryResponseOfThisAddress = txHistoryOfAllAddresses[i];
        const txHistoryOfThisAddress = txHistoryResponseOfThisAddress.txs;
        flatTxHistoryArray = flatTxHistoryArray.concat(txHistoryOfThisAddress);
    }
    return flatTxHistoryArray;
};

export const sortAndTrimChronikTxHistory = (
    flatTxHistoryArray,
    txHistoryCount,
) => {
    // Isolate unconfirmed txs
    // In chronik, unconfirmed txs have an `undefined` block key
    const unconfirmedTxs = [];
    const confirmedTxs = [];
    for (let i = 0; i < flatTxHistoryArray.length; i += 1) {
        const thisTx = flatTxHistoryArray[i];
        if (typeof thisTx.block === 'undefined') {
            unconfirmedTxs.push(thisTx);
        } else {
            confirmedTxs.push(thisTx);
        }
    }
    // Sort confirmed txs by blockheight, and then timeFirstSeen
    const sortedConfirmedTxHistoryArray = confirmedTxs.sort(
        (a, b) =>
            // We want more recent blocks i.e. higher blockheights to have earlier array indices
            b.block.height - a.block.height ||
            // For blocks with the same height, we want more recent timeFirstSeen i.e. higher timeFirstSeen to have earlier array indices
            b.timeFirstSeen - a.timeFirstSeen,
    );
    // Sort unconfirmed txs by timeFirstSeen
    const sortedUnconfirmedTxHistoryArray = unconfirmedTxs.sort(
        (a, b) => b.timeFirstSeen - a.timeFirstSeen,
    );
    // The unconfirmed txs are more recent, so they should be inserted into an array before the confirmed txs
    const sortedChronikTxHistoryArray = sortedUnconfirmedTxHistoryArray.concat(
        sortedConfirmedTxHistoryArray,
    );

    const trimmedAndSortedChronikTxHistoryArray =
        sortedChronikTxHistoryArray.splice(0, txHistoryCount);

    return trimmedAndSortedChronikTxHistoryArray;
};

export const returnGetTxHistoryChronikPromise = (
    chronik,
    hash160AndAddressObj,
) => {
    /*
        Chronik thinks in hash160s, but people and wallets think in addresses
        Add the address to each utxo
    */
    return new Promise((resolve, reject) => {
        chronik
            .script('p2pkh', hash160AndAddressObj.hash)
            .history(/*page=*/ 0, /*page_size=*/ chronikConfig.txHistoryCount)
            .then(
                result => {
                    resolve(result);
                },
                err => {
                    reject(err);
                },
            );
    });
};

export const parseChronikTx = (tx, wallet, cachedTokens) => {
    const walletHash160s = getHashArrayFromWallet(wallet);
    const { inputs, outputs } = tx;
    // Assign defaults
    let incoming = true;
    let xecAmount = new BN(0);
    let etokenAmount = new BN(0);
    let isTokenBurn = false;
    let isEtokenTx = 'slpTxData' in tx && typeof tx.slpTxData !== 'undefined';
    const isGenesisTx =
        isEtokenTx &&
        tx.slpTxData.slpMeta &&
        tx.slpTxData.slpMeta.txType &&
        tx.slpTxData.slpMeta.txType === 'GENESIS';

    // Initialize required variables
    let airdropFlag = false;
    let airdropTokenId = '';
    let opReturnMessage = '';
    let isCashtabMessage = false;
    let isEncryptedMessage = false;
    let replyAddress = '';
    let aliasFlag = false;

    if (tx.isCoinbase) {
        // Note that coinbase inputs have `undefined` for `thisInput.outputScript`
        incoming = true;
        replyAddress = 'N/A';
    } else {
        // Iterate over inputs to see if this is an incoming tx (incoming === true)
        for (let i = 0; i < inputs.length; i += 1) {
            const thisInput = inputs[i];

            // If this is an etoken tx, check for token burn
            if (
                isEtokenTx &&
                typeof thisInput.slpBurn !== 'undefined' &&
                thisInput.slpBurn.token &&
                thisInput.slpBurn.token.amount &&
                thisInput.slpBurn.token.amount !== '0'
            ) {
                // Assume that any eToken tx with a burn is a burn tx
                isTokenBurn = true;
                try {
                    const thisEtokenBurnAmount = new BN(
                        thisInput.slpBurn.token.amount,
                    );
                    // Need to know the total output amount to compare to total input amount and tell if this is a burn transaction
                    etokenAmount = etokenAmount.plus(thisEtokenBurnAmount);
                } catch (err) {
                    // do nothing
                    // If this happens, the burn amount will render wrong in tx history because we don't have the info in chronik
                    // This is acceptable
                }
            }
            /* 
        
        Assume the first input is the originating address
        
        https://en.bitcoin.it/wiki/Script for reference
        
        Assume standard pay-to-pubkey-hash tx        
        scriptPubKey: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
        76 + a9 + 14 = OP_DUP + OP_HASH160 + 14 Bytes to push
        88 + ac = OP_EQUALVERIFY + OP_CHECKSIG

        So, the hash160 we want will be in between '76a914' and '88ac'
        ...most of the time ;)
        */

            // Since you may have more than one address in inputs, assume the first one is the replyAddress
            if (i === 0) {
                try {
                    replyAddress = cashaddr.encodeOutputScript(
                        thisInput.outputScript,
                    );
                } catch (err) {
                    console.log(
                        `Error from cashaddr.encodeOutputScript(${thisInput.outputScript})`,
                        err,
                    );
                    // If the transaction is nonstandard, don't worry about a reply address for now
                    replyAddress = 'N/A';
                }
            }

            for (let j = 0; j < walletHash160s.length; j += 1) {
                const thisWalletHash160 = walletHash160s[j];
                if (
                    typeof thisInput.outputScript !== 'undefined' &&
                    thisInput.outputScript.includes(thisWalletHash160)
                ) {
                    // Then this is an outgoing tx
                    incoming = false;
                    // Break out of this for loop once you know this is an outgoing tx
                    break;
                }
            }
        }
    }

    // Iterate over outputs to get the amount sent
    for (let i = 0; i < outputs.length; i += 1) {
        const thisOutput = outputs[i];
        const thisOutputReceivedAtHash160 = thisOutput.outputScript;

        if (
            thisOutputReceivedAtHash160.startsWith(
                opreturnConfig.opReturnPrefixHex,
            )
        ) {
            // If this is an OP_RETURN output, parse it
            const stackArray = getStackArray(thisOutputReceivedAtHash160);

            const lokad = stackArray[0];
            switch (lokad) {
                case opreturnConfig.appPrefixesHex.eToken: {
                    // Do not set opReturnMsg for etoken txs
                    break;
                }
                case opreturnConfig.appPrefixesHex.airdrop: {
                    // this is to facilitate special Cashtab-specific cases of airdrop txs, both with and without msgs
                    // The UI via Tx.js can check this airdropFlag attribute in the parsedTx object to conditionally render airdrop-specific formatting if it's true
                    airdropFlag = true;
                    // index 0 is drop prefix, 1 is the token Id, 2 is msg prefix, 3 is msg
                    airdropTokenId =
                        stackArray.length >= 2 ? stackArray[1] : 'N/A';

                    // Legacy airdrops used to add the Cashtab Msg lokad before a msg
                    if (stackArray.length >= 3) {
                        // If there are pushes beyond the token id, we have a msg
                        isCashtabMessage = true;
                        if (
                            stackArray[2] ===
                                opreturnConfig.appPrefixesHex.cashtab &&
                            stackArray.length >= 4
                        ) {
                            // Legacy airdrops also pushed hte cashtab msg lokad before the msg
                            opReturnMessage = Buffer.from(
                                stackArray[3],
                                'hex',
                            ).toString();
                        } else {
                            opReturnMessage = Buffer.from(
                                stackArray[2],
                                'hex',
                            ).toString();
                        }
                    }
                    break;
                }
                case opreturnConfig.appPrefixesHex.cashtab: {
                    isCashtabMessage = true;
                    if (stackArray.length >= 2) {
                        opReturnMessage = Buffer.from(
                            stackArray[1],
                            'hex',
                        ).toString();
                    } else {
                        opReturnMessage = 'off-spec Cashtab Msg';
                    }
                    break;
                }
                case opreturnConfig.appPrefixesHex.cashtabEncrypted: {
                    // Encrypted Cashtab msgs are deprecated, set a standard msg
                    isCashtabMessage = true;
                    isEncryptedMessage = true;
                    opReturnMessage = 'Encrypted Cashtab Msg';
                    break;
                }
                case opreturnConfig.appPrefixesHex.aliasRegistration: {
                    aliasFlag = true;
                    if (stackArray.length >= 3) {
                        opReturnMessage = Buffer.from(
                            stackArray[2],
                            'hex',
                        ).toString();
                    } else {
                        opReturnMessage = 'off-spec alias registration';
                    }
                    break;
                }
                case opreturnConfig.appPrefixesHex.paybutton: {
                    // Paybutton tx
                    // For now, Cashtab only supports version 0 PayButton txs
                    // ref doc/standards/paybutton.md
                    // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/paybutton.md

                    // <lokad> <version> <data> <paymentId>

                    if (stackArray.length !== 4) {
                        opReturnMessage = 'off-spec PayButton tx';
                        break;
                    }
                    if (stackArray[1] !== '00') {
                        opReturnMessage = `Unsupported version PayButton tx: ${stackArray[1]}`;
                        break;
                    }
                    const dataHex = stackArray[2];
                    const nonceHex = stackArray[3];

                    opReturnMessage = `PayButton${
                        nonceHex !== '00' ? ` (${nonceHex})` : ''
                    }${
                        dataHex !== '00'
                            ? `: ${Buffer.from(dataHex, 'hex').toString()}`
                            : ''
                    }`;
                    break;
                }
                default: {
                    // Unrecognized lokad
                    // In this case, utf8 decode the stack array

                    const decodedStackArray = [];
                    for (const hexStr of stackArray) {
                        decodedStackArray.push(
                            Buffer.from(hexStr, 'hex').toString(),
                        );
                    }

                    // join with space
                    opReturnMessage = decodedStackArray.join(' ');

                    break;
                }
            }
            // Continue to the next output, we do not need to parse values for OP_RETURN outputs
            continue;
        }
        // Find amounts at your wallet's addresses
        for (let j = 0; j < walletHash160s.length; j += 1) {
            const thisWalletHash160 = walletHash160s[j];
            if (thisOutputReceivedAtHash160.includes(thisWalletHash160)) {
                // If incoming tx, this is amount received by the user's wallet
                // if outgoing tx (incoming === false), then this is a change amount
                const thisOutputAmount = new BN(thisOutput.value);
                xecAmount = incoming
                    ? xecAmount.plus(thisOutputAmount)
                    : xecAmount.minus(thisOutputAmount);

                // Parse token qty if token tx
                // Note: edge case this is a token tx that sends XEC to Cashtab recipient but token somewhere else
                if (isEtokenTx && !isTokenBurn) {
                    try {
                        const thisEtokenAmount = new BN(
                            thisOutput.slpToken.amount,
                        );

                        etokenAmount =
                            incoming || isGenesisTx
                                ? etokenAmount.plus(thisEtokenAmount)
                                : etokenAmount.minus(thisEtokenAmount);
                    } catch (err) {
                        // edge case described above; in this case there is zero eToken value for this Cashtab recipient in this output, so add 0
                        etokenAmount.plus(new BN(0));
                    }
                }
            }
        }
        // Output amounts not at your wallet are sent amounts if !incoming
        // Exception for eToken genesis transactions
        if (!incoming) {
            const thisOutputAmount = new BN(thisOutput.value);
            xecAmount = xecAmount.plus(thisOutputAmount);
            if (isEtokenTx && !isGenesisTx && !isTokenBurn) {
                try {
                    const thisEtokenAmount = new BN(thisOutput.slpToken.amount);
                    etokenAmount = etokenAmount.plus(thisEtokenAmount);
                } catch (err) {
                    // NB the edge case described above cannot exist in an outgoing tx
                    // because the eTokens sent originated from this wallet
                }
            }
        }
    }

    /* If it's an eToken tx that 
        - did not send any eTokens to the receiving Cashtab wallet
        - did send XEC to the receiving Cashtab wallet
       Parse it as an XEC received tx
       This type of tx is created by this swap wallet. More detailed parsing to be added later as use case is better understood
       https://www.youtube.com/watch?v=5EFWXHPwzRk
    */
    if (isEtokenTx && etokenAmount.isEqualTo(0)) {
        isEtokenTx = false;
        opReturnMessage = '';
    }
    // Convert from sats to XEC
    xecAmount = xecAmount.shiftedBy(-1 * appConfig.cashDecimals);

    // Convert from BigNumber to string
    xecAmount = xecAmount.toString();

    // Get decimal info for correct etokenAmount
    let genesisInfo = {};

    if (isEtokenTx) {
        // Get token genesis info from cache
        let decimals = 0;
        try {
            genesisInfo = cachedTokens.get(tx.slpTxData.slpMeta.tokenId);
            if (typeof genesisInfo !== 'undefined') {
                genesisInfo.success = true;
                decimals = genesisInfo.decimals;
                etokenAmount = etokenAmount.shiftedBy(-1 * decimals);
            } else {
                genesisInfo = { success: false };
            }
        } catch (err) {
            console.log(
                `Error getting token info from cache in parseChronikTx for ${tx.txid}`,
                err,
            );
            // To keep this function synchronous, do not get this info from the API if it is not in cache
            // Instead, return a flag so that useWallet.js knows and can fetch this info + add it to cache
            genesisInfo = { success: false };
        }
    }
    etokenAmount = etokenAmount.toString();

    // Return eToken specific fields if eToken tx
    if (isEtokenTx) {
        const { slpMeta } = tx.slpTxData;
        return {
            incoming,
            xecAmount,
            isEtokenTx,
            etokenAmount,
            isTokenBurn,
            slpMeta,
            genesisInfo,
            airdropFlag,
            airdropTokenId,
            opReturnMessage: '',
            isCashtabMessage,
            isEncryptedMessage,
            replyAddress,
        };
    }
    // Otherwise do not include these fields
    return {
        incoming,
        xecAmount,
        isEtokenTx,
        airdropFlag,
        airdropTokenId,
        opReturnMessage,
        isCashtabMessage,
        isEncryptedMessage,
        replyAddress,
        aliasFlag,
    };
};

/**
 * Get tx history of cashtab wallet
 * @param {object} chronik chronik-client instance
 * @param {object} wallet cashtab wallet
 * @param {Map} cachedTokens the map stored at cashtabCache.tokens
 * @returns {object}
 * {
 *   parsedTxHistory {array} tx history output parsed for rendering txs in Cashtab
 *   cachedTokensAfterHistory {Map} cachedTokens the map stored at cashtabCache.tokens updated for any tokens found in tx history
 *   txHistoryNewTokensToCache {boolean} true if we have added tokens
 * }
 */
export const getTxHistoryChronik = async (chronik, wallet, cachedTokens) => {
    // Create array of promises to get chronik history for each address
    // Combine them all and sort by blockheight and firstSeen
    // Add all the info cashtab needs to make them useful

    let txHistoryPromises = [];
    for (let i = 0; i < wallet.paths.length; i += 1) {
        const txHistoryPromise = returnGetTxHistoryChronikPromise(
            chronik,
            wallet.paths[i],
        );
        txHistoryPromises.push(txHistoryPromise);
    }
    let txHistoryOfAllAddresses;
    try {
        txHistoryOfAllAddresses = await Promise.all(txHistoryPromises);
    } catch (err) {
        console.log(`Error in Promise.all(txHistoryPromises)`, err);
    }
    const flatTxHistoryArray = flattenChronikTxHistory(txHistoryOfAllAddresses);
    const sortedTxHistoryArray = sortAndTrimChronikTxHistory(
        flatTxHistoryArray,
        chronikConfig.txHistoryCount,
    );

    // Parse txs
    const chronikTxHistory = [];
    const uncachedTokenIds = new Set();
    for (let i = 0; i < sortedTxHistoryArray.length; i += 1) {
        const sortedTx = sortedTxHistoryArray[i];
        // Add token genesis info so parsing function can calculate amount by decimals
        sortedTx.parsed = parseChronikTx(sortedTx, wallet, cachedTokens);
        // Check to see if this tx was from a token without genesisInfo in cachedTokens
        if (
            sortedTx.parsed.isEtokenTx &&
            sortedTx.parsed.genesisInfo &&
            !sortedTx.parsed.genesisInfo.success
        ) {
            // Only add if the token id is not already in uncachedTokenIds
            const uncachedTokenId = sortedTx.parsed.slpMeta.tokenId;
            uncachedTokenIds.add(uncachedTokenId);
        }
        chronikTxHistory.push(sortedTx);
    }

    const txHistoryNewTokensToCache = uncachedTokenIds.size > 0;

    // Iterate over uncachedTokenIds to get genesis info and add to cache
    const getTokenInfoPromises = [];
    for (const uncachedTokenId of uncachedTokenIds) {
        const thisTokenInfoPromise = returnGetTokenInfoChronikPromise(
            chronik,
            uncachedTokenId,
            cachedTokens,
        );
        getTokenInfoPromises.push(thisTokenInfoPromise);
    }

    // Get all the token info you need
    try {
        await Promise.all(getTokenInfoPromises);
    } catch (err) {
        console.log(
            `Error in Promise.all(getTokenInfoPromises) in getTxHistoryChronik`,
            err,
        );
    }

    return {
        parsedTxHistory: chronikTxHistory,
        cachedTokensAfterHistory: cachedTokens,
        txHistoryNewTokensToCache,
    };
};

export const getMintAddress = async (chronik, tokenId) => {
    let genesisTx;
    try {
        genesisTx = await chronik.tx(tokenId);
        // get the minting address chronik
        // iterate over the tx outputs
        const { outputs } = genesisTx;
        for (let i = 0; i < outputs.length; i += 1) {
            const thisOutput = outputs[i];
            // Check to see if this output has eTokens
            if (
                thisOutput &&
                thisOutput.slpToken &&
                typeof thisOutput.slpToken !== 'undefined' &&
                thisOutput.slpToken.amount &&
                Number(thisOutput.slpToken.amount) > 0
            ) {
                // then this is the minting address
                return cashaddr.encodeOutputScript(
                    thisOutput.outputScript,
                    'etoken',
                );
            }
        }
    } catch (err) {
        console.log(`Error in getMintAddress`, err);
        return err;
    }
};
