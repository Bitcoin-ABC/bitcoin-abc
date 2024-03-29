// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';
import { getHashArrayFromWallet } from 'utils/cashMethods';
import { opReturn as opreturnConfig } from 'config/opreturn';
import { chronik as chronikConfig } from 'config/chronik';
import { getStackArray } from 'ecash-script';
import cashaddr from 'ecashaddrjs';
import { toXec, decimalizeTokenAmount, undecimalizeTokenAmount } from 'wallet';

export const getTxHistoryPage = async (chronik, hash160, page = 0) => {
    let txHistoryPage;
    try {
        txHistoryPage = await chronik
            .script('p2pkh', hash160)
            // Get the 25 most recent transactions
            .history(page, chronikConfig.txHistoryPageSize);
        return txHistoryPage;
    } catch (err) {
        console.error(`Error in getTxHistoryPage(${hash160})`, err);
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
            console.error(`Alias (${alias}) is registered`);
            return true;
        }
    }
    return false;
};

/**
 * Return a promise to fetch all utxos at an address (and add a 'path' key to them)
 * We need the path key so that we know which wif to sign this utxo with
 * If we add HD wallet support, we will need to add an address key, and change the structure of wallet.paths
 * @param {ChronikClientNode} chronik
 * @param {string} address
 * @param {number} path
 * @returns {Promise}
 */
export const returnGetPathedUtxosPromise = (chronik, address, path) => {
    return new Promise((resolve, reject) => {
        chronik
            .address(address)
            .utxos()
            .then(
                result => {
                    for (const utxo of result.utxos) {
                        utxo.path = path;
                    }
                    resolve(result.utxos);
                },
                err => {
                    reject(err);
                },
            );
    });
};

/**
 * Get all utxos for a given wallet
 * @param {ChronikClientNode} chronik
 * @param {object} wallet a cashtab wallet
 * @returns
 */
export const getUtxos = async (chronik, wallet) => {
    const chronikUtxoPromises = [];
    wallet.paths.forEach((pathInfo, path) => {
        const thisPromise = returnGetPathedUtxosPromise(
            chronik,
            pathInfo.address,
            path,
        );
        chronikUtxoPromises.push(thisPromise);
    });
    const utxoResponsesByPath = await Promise.all(chronikUtxoPromises);
    const flatUtxos = utxoResponsesByPath.flat();
    return flatUtxos;
};

/**
 * Organize utxos by token and non-token
 * TODO deprecate this and use better coinselect methods
 * @param {Tx_InNode[]} chronikUtxos
 * @returns {object} {slpUtxos: [], nonSlpUtxos: []}
 */
export const organizeUtxosByType = chronikUtxos => {
    const nonSlpUtxos = [];
    const slpUtxos = [];
    for (const utxo of chronikUtxos) {
        // Construct nonSlpUtxos and slpUtxos arrays
        if (typeof utxo.token !== 'undefined') {
            slpUtxos.push(utxo);
        } else {
            nonSlpUtxos.push(utxo);
        }
    }

    return { slpUtxos, nonSlpUtxos };
};

/**
 * Get just the tx objects from chronik history() responses
 * @param {TxHistoryPage_InNode[]} txHistoryOfAllAddresses
 * @returns {Tx_InNode[]}
 */
export const flattenChronikTxHistory = txHistoryOfAllAddresses => {
    let flatTxHistoryArray = [];
    for (const txHistoryThisAddress of txHistoryOfAllAddresses) {
        flatTxHistoryArray = flatTxHistoryArray.concat(
            txHistoryThisAddress.txs,
        );
    }
    return flatTxHistoryArray;
};

/**
 * Sort an array of chronik txs chronologically and return the first renderedCount of them
 * @param {Tx_InNode[]} txs
 * @param {number} renderedCount how many txs to return
 * @returns
 */
export const sortAndTrimChronikTxHistory = (txs, renderedCount) => {
    const unconfirmedTxs = [];
    const confirmedTxs = [];
    for (const tx of txs) {
        if (typeof tx.block === 'undefined') {
            unconfirmedTxs.push(tx);
        } else {
            confirmedTxs.push(tx);
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
        sortedChronikTxHistoryArray.splice(0, renderedCount);

    return trimmedAndSortedChronikTxHistoryArray;
};

/**
 * Parse a Tx_InNode object for rendering in Cashtab
 * TODO Potentially more efficient to do this calculation in the Tx.js component
 * @param {Tx_InNode} tx
 * @param {object} wallet cashtab wallet
 * @param {Map} cachedTokens
 * @returns
 */
export const parseTx = (tx, wallet, cachedTokens) => {
    const walletHash160s = getHashArrayFromWallet(wallet);
    const { inputs, outputs, tokenEntries } = tx;

    // Assign defaults
    let incoming = true;
    let satoshis = 0;
    let etokenAmount = new BN(0);
    let isTokenBurn = false;

    let isSlpV1 = false;
    let isUnsupportedTokenTx = false;
    let isGenesisTx = false;

    // For now, we only support one token per tx
    // Get the tokenId if this is an slpv1 tx
    // TODO support multiple token actions in a tx
    let tokenId = '';

    // Iterate over tokenEntries to parse for token status
    for (const entry of tokenEntries) {
        if (
            entry.tokenType?.protocol === 'SLP' &&
            entry.tokenType?.number === 1 &&
            typeof entry.tokenId !== 'undefined'
        ) {
            isSlpV1 = true;
            tokenId = entry.tokenId;
            // Check for token burn
            if (entry.burnSummary !== '' && entry.actualBurnAmount !== '') {
                isTokenBurn = true;
                etokenAmount = new BN(entry.actualBurnAmount);
            }
        }
        if (entry.txType === 'GENESIS') {
            isGenesisTx = true;
        }
    }

    // We might lose this variable. Cashtab only supports SLP type 1 txs for now.
    // Will be easy to tell if it's "any token" by modifying this definition, e.g. isSlpV1 | isAlp
    let isEtokenTx = isSlpV1;
    isUnsupportedTokenTx = tokenEntries.length > 0 && !isEtokenTx;

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
                    console.error(
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
            ) &&
            !isUnsupportedTokenTx
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
                const thisOutputAmount = thisOutput.value;
                satoshis = incoming
                    ? satoshis + thisOutputAmount
                    : satoshis - thisOutputAmount;

                // Parse token qty if token tx
                // Note: edge case this is a token tx that sends XEC to Cashtab recipient but token somewhere else
                if (isEtokenTx && !isTokenBurn) {
                    try {
                        const thisEtokenAmount = new BN(
                            thisOutput.token.amount,
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
            const thisOutputAmount = thisOutput.value;
            satoshis = satoshis + thisOutputAmount;
            if (isEtokenTx && !isGenesisTx && !isTokenBurn) {
                try {
                    const thisEtokenAmount = new BN(thisOutput.token.amount);
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
    const xecAmount = toXec(satoshis);

    // Get decimal info for correct etokenAmount
    let assumedTokenDecimals = false;
    if (isEtokenTx) {
        // Parse with decimals = 0 if you do not have this token cached for some reason
        // Acceptable error rendering in tx history
        let decimals = 0;
        const cachedTokenInfo = cachedTokens.get(tokenId);
        if (typeof cachedTokenInfo !== 'undefined') {
            decimals = cachedTokenInfo.genesisInfo.decimals;
        } else {
            assumedTokenDecimals = true;
        }
        etokenAmount = etokenAmount.shiftedBy(-1 * decimals);
    }
    etokenAmount = etokenAmount.toString();

    // Return eToken specific fields if eToken tx
    if (isEtokenTx) {
        return {
            incoming,
            xecAmount,
            isEtokenTx,
            etokenAmount,
            isTokenBurn,
            tokenEntries: tx.tokenEntries,
            airdropFlag,
            airdropTokenId,
            opReturnMessage: '',
            isCashtabMessage,
            isEncryptedMessage,
            replyAddress,
            assumedTokenDecimals,
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
 * - Get tx history of each path in wallet
 * - sort by timeFirstSeen + block
 * - Trim to number of txs Cashtab renders
 * - Parse txs for rendering in Cashtab
 * - Update cachedTokens with any new tokenIds
 * @param {ChronikClientNode} chronik chronik-client instance
 * @param {object} wallet cashtab wallet
 * @param {Map} cachedTokens the map stored at cashtabCache.tokens
 * @returns {array} Tx_InNode[], each tx also has a 'parsed' key with other rendering info
 */
export const getHistory = async (chronik, wallet, cachedTokens) => {
    const txHistoryPromises = [];
    wallet.paths.forEach(pathInfo => {
        txHistoryPromises.push(chronik.address(pathInfo.address).history());
    });

    // Just throw an error if you get a chronik error
    // This will be handled in the update loop
    const txHistoryOfAllAddresses = await Promise.all(txHistoryPromises);

    const flatTxHistoryArray = flattenChronikTxHistory(txHistoryOfAllAddresses);
    const renderedTxs = sortAndTrimChronikTxHistory(
        flatTxHistoryArray,
        chronikConfig.txHistoryCount,
    );

    // Parse txs
    const history = [];
    for (const tx of renderedTxs) {
        const { tokenEntries } = tx;

        // Get all tokenIds associated with this tx
        const tokenIds = new Set();
        for (const tokenEntry of tokenEntries) {
            tokenIds.add(tokenEntry.tokenId);
        }

        // Cache any tokenIds you do not have cached
        for (const tokenId of [...tokenIds]) {
            if (typeof cachedTokens.get(tokenId) === 'undefined') {
                // Add it to cache right here
                try {
                    const newTokenCacheInfo = await getTokenGenesisInfo(
                        chronik,
                        tokenId,
                    );
                    cachedTokens.set(tokenId, newTokenCacheInfo);
                } catch (err) {
                    // If you have an error getting the calculated token cache info, do not throw
                    // Could be some token out there that we do not parse properly with getTokenGenesisInfo
                    // Log it
                    // parseTx is tolerant to not having the info in cache
                    console.error(
                        `Error in getTokenGenesisInfo for tokenId ${tokenId}`,
                        err,
                    );
                }
            }
        }

        tx.parsed = parseTx(tx, wallet, cachedTokens);

        history.push(tx);
    }

    return history;
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
                thisOutput.token &&
                typeof thisOutput.token !== 'undefined' &&
                thisOutput.token.amount &&
                Number(thisOutput.token.amount) > 0
            ) {
                // then this is the minting address
                return cashaddr.encodeOutputScript(thisOutput.outputScript);
            }
        }
    } catch (err) {
        console.error(`Error in getMintAddress`, err);
        return err;
    }
};

/**
 * Get all info about a token used in Cashtab's token cache
 * @param {ChronikClientNode} chronik
 * @param {string} tokenId
 * @returns {object}
 */
export const getTokenGenesisInfo = async (chronik, tokenId) => {
    // We can get timeFirstSeen, block, tokenType, and genesisInfo from the token() endpoint
    // If we call this endpoint before the genesis tx is confirmed, we will not get block
    // So, block does not need to be included

    const tokenInfo = await chronik.token(tokenId);
    const genesisTxInfo = await chronik.tx(tokenId);

    const { timeFirstSeen, genesisInfo, tokenType } = tokenInfo;
    const decimals = genesisInfo.decimals;

    // Initialize variables for determined quantities we want to cache

    /**
     * genesisSupply {string}
     * Quantity of token created at mint
     * Note: we may have genesisSupply at different genesisAddresses
     * We do not track this information, only total genesisSupply
     * Cached as a decimalized string, e.g. 0.000 if 0 with 3 decimal places
     * 1000.000000000 if one thousand with 9 decimal places
     */
    let genesisSupply = decimalizeTokenAmount('0', decimals);

    /**
     * genesisMintBatons {number}
     * Number of mint batons created in the genesis tx for this token
     */
    let genesisMintBatons = 0;

    /**
     * genesisOutputScripts {Set(<outputScript>)}
     * Address(es) where initial token supply was minted
     */
    let genesisOutputScripts = new Set();

    // Iterate over outputs
    for (const output of genesisTxInfo.outputs) {
        if ('token' in output && output.token.tokenId === tokenId) {
            // If this output of this genesis tx is associated with this tokenId

            const { token, outputScript } = output;

            // Add its outputScript to genesisOutputScripts
            genesisOutputScripts.add(outputScript);

            const { isMintBaton, amount } = token;
            if (isMintBaton) {
                // If it is a mintBaton, increment genesisMintBatons
                genesisMintBatons += 1;
            }

            // Increment genesisSupply
            // decimalizeTokenAmount, undecimalizeTokenAmount
            //genesisSupply = genesisSupply.plus(new BN(amount));

            genesisSupply = decimalizeTokenAmount(
                (
                    BigInt(undecimalizeTokenAmount(genesisSupply, decimals)) +
                    BigInt(amount)
                ).toString(),
                decimals,
            );
        }
    }

    const tokenCache = {
        tokenType,
        genesisInfo,
        timeFirstSeen,
        genesisSupply,
        // Return genesisOutputScripts as an array as we no longer require Set features
        genesisOutputScripts: [...genesisOutputScripts],
        genesisMintBatons,
    };
    if ('block' in tokenInfo) {
        // If the genesis tx is confirmed at the time we check
        tokenCache.block = tokenInfo.block;
    }

    // Note: if it is not confirmed, we can update the cache later when we try to use this value

    return tokenCache;
};

/**
 * Get decimalized balance of every token held by a wallet
 * Update Cashtab's tokenCache if any tokens are uncached
 * @param {ChronikClientNode} chronik
 * @param {array} slpUtxos array of token utxos from chronik
 * @param {Map} tokenCache Cashtab's token cache
 * @returns {Map} Map of tokenId => token balance as decimalized string
 * Also updates tokenCache
 */
export const getTokenBalances = async (chronik, slpUtxos, tokenCache) => {
    const walletStateTokens = new Map();
    for (const utxo of slpUtxos) {
        // Every utxo in slpUtxos will have a tokenId
        const { token } = utxo;
        const { tokenId, amount } = token;
        // Is this token cached?
        let cachedTokenInfo = tokenCache.get(tokenId);
        if (typeof cachedTokenInfo === 'undefined') {
            // If we have not cached this token before, cache it
            cachedTokenInfo = await getTokenGenesisInfo(chronik, tokenId);
            tokenCache.set(tokenId, cachedTokenInfo);
        }
        // Now decimals is available
        const decimals = cachedTokenInfo.genesisInfo.decimals;

        const tokenBalanceInMap = walletStateTokens.get(tokenId);

        // Update or initialize token balance as a decimalized string in walletStateTokens Map
        walletStateTokens.set(
            tokenId,
            typeof tokenBalanceInMap === 'undefined'
                ? decimalizeTokenAmount(amount, decimals)
                : decimalizeTokenAmount(
                      (
                          BigInt(
                              undecimalizeTokenAmount(
                                  tokenBalanceInMap,
                                  decimals,
                              ),
                          ) + BigInt(amount)
                      ).toString(),
                      decimals,
                  ),
        );
    }

    return walletStateTokens;
};
