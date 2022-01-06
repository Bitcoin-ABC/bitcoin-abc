import BigNumber from 'bignumber.js';
import { currency } from '@components/Common/Ticker';
import { isValidTokenStats } from '@utils/validation';
import SlpWallet from 'minimal-slp-wallet';
import {
    toSmallestDenomination,
    fromSmallestDenomination,
    batchArray,
    flattenBatchedHydratedUtxos,
    isValidStoredWallet,
    checkNullUtxosForTokenStatus,
    confirmNonEtokenUtxos,
    convertToEncryptStruct,
    getPublicKey,
    parseOpReturn,
} from '@utils/cashMethods';
import cashaddr from 'ecashaddrjs';
import ecies from 'ecies-lite';
import wif from 'wif';

export default function useBCH() {
    const SEND_BCH_ERRORS = {
        INSUFFICIENT_FUNDS: 0,
        NETWORK_ERROR: 1,
        INSUFFICIENT_PRIORITY: 66, // ~insufficient fee
        DOUBLE_SPENDING: 18,
        MAX_UNCONFIRMED_TXS: 64,
    };

    const getRestUrl = (apiIndex = 0) => {
        const apiString =
            process.env.REACT_APP_NETWORK === `mainnet`
                ? process.env.REACT_APP_BCHA_APIS
                : process.env.REACT_APP_BCHA_APIS_TEST;
        const apiArray = apiString.split(',');
        return apiArray[apiIndex];
    };

    const flattenTransactions = (
        txHistory,
        txCount = currency.txHistoryCount,
    ) => {
        /*   
            Convert txHistory, format
            [{address: '', transactions: [{height: '', tx_hash: ''}, ...{}]}, {}, {}]

            to flatTxHistory
            [{txid: '', blockheight: '', address: ''}]
            sorted by blockheight, newest transactions to oldest transactions
        */
        let flatTxHistory = [];
        let includedTxids = [];
        for (let i = 0; i < txHistory.length; i += 1) {
            const { address, transactions } = txHistory[i];
            for (let j = transactions.length - 1; j >= 0; j -= 1) {
                let flatTx = {};
                flatTx.address = address;
                // If tx is unconfirmed, give arbitrarily high blockheight
                flatTx.height =
                    transactions[j].height <= 0
                        ? 10000000
                        : transactions[j].height;
                flatTx.txid = transactions[j].tx_hash;
                // Only add this tx if the same transaction is not already in the array
                // This edge case can happen with older wallets, txs can be on multiple paths
                if (!includedTxids.includes(flatTx.txid)) {
                    includedTxids.push(flatTx.txid);
                    flatTxHistory.push(flatTx);
                }
            }
        }

        // Sort with most recent transaction at index 0
        flatTxHistory.sort((a, b) => b.height - a.height);
        // Only return 10

        return flatTxHistory.splice(0, txCount);
    };

    const parseTxData = async (BCH, txData, publicKeys, wallet) => {
        /*
        Desired output
        [
        {
        txid: '',
        type: send, receive
        receivingAddress: '',
        quantity: amount bcha
        token: true/false
        tokenInfo: {
            tokenId:
            tokenQty:
            txType: mint, send, other
        }
        opReturnMessage: 'message extracted from asm' or ''
        }
        ]
        */

        const parsedTxHistory = [];
        for (let i = 0; i < txData.length; i += 1) {
            const tx = txData[i];

            const parsedTx = {};

            // Move over info that does not need to be calculated
            parsedTx.txid = tx.txid;
            parsedTx.height = tx.height;
            let destinationAddress = tx.address;

            // if there was an error in getting the tx data from api, the tx will only have txid and height
            // So, it will not have 'vin'
            if (!Object.keys(tx).includes('vin')) {
                // Populate as a limited-info tx that can be expanded in a block explorer
                parsedTxHistory.push(parsedTx);
                continue;
            }

            parsedTx.confirmations = tx.confirmations;
            parsedTx.blocktime = tx.blocktime;
            let amountSent = 0;
            let amountReceived = 0;
            let opReturnMessage = '';
            let isCashtabMessage = false;
            let isEncryptedMessage = false;
            let decryptionSuccess = false;
            // Assume an incoming transaction
            let outgoingTx = false;
            let tokenTx = false;
            let substring = '';

            // If vin's scriptSig contains one of the publicKeys of this wallet
            // This is an outgoing tx
            for (let j = 0; j < tx.vin.length; j += 1) {
                // Since Cashtab only concerns with utxos of Path145, Path245 and Path1899 addresses,
                // which are hashes of thier public keys. We can safely assume that Cashtab can only
                // consumes utxos of type 'pubkeyhash'
                // Therefore, only tx with vin's scriptSig of type 'pubkeyhash' can potentially be an outgoing tx.
                // any other scriptSig type indicates that the tx is incoming.
                try {
                    const thisInputScriptSig = tx.vin[j].scriptSig;
                    let inputPubKey = undefined;
                    const inputType = BCH.Script.classifyInput(
                        BCH.Script.decode(
                            Buffer.from(thisInputScriptSig.hex, 'hex'),
                        ),
                    );
                    if (inputType === 'pubkeyhash') {
                        inputPubKey = thisInputScriptSig.hex.substring(
                            thisInputScriptSig.hex.length - 66,
                        );
                    }
                    publicKeys.forEach(pubKey => {
                        if (pubKey === inputPubKey) {
                            // This is an outgoing transaction
                            outgoingTx = true;
                        }
                    });
                    if (outgoingTx === true) break;
                } catch (err) {
                    console.log(
                        "useBCH.parsedTxHistory() error: in trying to classify Input' scriptSig",
                    );
                }
            }

            // Iterate over vout to find how much was sent or received
            for (let j = 0; j < tx.vout.length; j += 1) {
                const thisOutput = tx.vout[j];

                // If there is no addresses object in the output, it's either an OP_RETURN msg or token tx
                if (
                    !Object.keys(thisOutput.scriptPubKey).includes('addresses')
                ) {
                    let hex = thisOutput.scriptPubKey.hex;
                    let parsedOpReturnArray = parseOpReturn(hex);

                    if (!parsedOpReturnArray) {
                        console.log(
                            'useBCH.parsedTxData() error: parsed array is empty',
                        );
                        break;
                    }

                    let message = '';
                    let txType = parsedOpReturnArray[0];
                    if (txType === currency.opReturn.appPrefixesHex.eToken) {
                        // this is an eToken transaction
                        tokenTx = true;
                    } else if (
                        txType === currency.opReturn.appPrefixesHex.cashtab
                    ) {
                        // this is a Cashtab message
                        try {
                            opReturnMessage = Buffer.from(
                                parsedOpReturnArray[1],
                                'hex',
                            );
                            isCashtabMessage = true;
                        } catch (err) {
                            // soft error if an unexpected or invalid cashtab hex is encountered
                            opReturnMessage = '';
                            console.log(
                                'useBCH.parsedTxData() error: invalid cashtab msg hex: ' +
                                    parsedOpReturnArray[1],
                            );
                        }
                    } else if (
                        txType ===
                        currency.opReturn.appPrefixesHex.cashtabEncrypted
                    ) {
                        // this is an encrypted Cashtab message
                        let msgString = parsedOpReturnArray[1];
                        let fundingWif, privateKeyObj, privateKeyBuff;
                        if (
                            wallet &&
                            wallet.state &&
                            wallet.state.slpBalancesAndUtxos &&
                            wallet.state.slpBalancesAndUtxos.nonSlpUtxos[0]
                        ) {
                            fundingWif =
                                wallet.state.slpBalancesAndUtxos.nonSlpUtxos[0]
                                    .wif;
                            privateKeyObj = wif.decode(fundingWif);
                            privateKeyBuff = privateKeyObj.privateKey;
                            if (!privateKeyBuff) {
                                throw new Error('Private key extraction error');
                            }
                        } else {
                            break;
                        }

                        let structData;
                        let decryptedMessage;

                        try {
                            // Convert the hex encoded message to a buffer
                            const msgBuf = Buffer.from(msgString, 'hex');

                            // Convert the bufer into a structured object.
                            structData = convertToEncryptStruct(msgBuf);

                            decryptedMessage = await ecies.decrypt(
                                privateKeyBuff,
                                structData,
                            );
                            decryptionSuccess = true;
                        } catch (err) {
                            console.log(
                                'useBCH.parsedTxData() decryption error: ' +
                                    err,
                            );
                            decryptedMessage =
                                'Only the message recipient can view this';
                        }
                        isCashtabMessage = true;
                        isEncryptedMessage = true;
                        opReturnMessage = decryptedMessage;
                    } else {
                        // this is an externally generated message
                        message = txType; // index 0 is the message content in this instance

                        // if there are more than one part to the external message
                        const arrayLength = parsedOpReturnArray.length;
                        for (let i = 1; i < arrayLength; i++) {
                            message = message + parsedOpReturnArray[i];
                        }

                        try {
                            opReturnMessage = Buffer.from(message, 'hex');
                        } catch (err) {
                            // soft error if an unexpected or invalid cashtab hex is encountered
                            opReturnMessage = '';
                            console.log(
                                'useBCH.parsedTxData() error: invalid external msg hex: ' +
                                    substring,
                            );
                        }
                    }
                    continue; // skipping the remainder of tx data parsing logic in both token and OP_RETURN tx cases
                }
                if (
                    thisOutput.scriptPubKey.addresses &&
                    thisOutput.scriptPubKey.addresses[0] === tx.address
                ) {
                    if (outgoingTx) {
                        // This amount is change
                        continue;
                    }
                    amountReceived += thisOutput.value;
                } else if (outgoingTx) {
                    amountSent += thisOutput.value;
                    // Assume there's only one destination address, i.e. it was sent by a Cashtab wallet
                    destinationAddress = thisOutput.scriptPubKey.addresses[0];
                }
            }

            // If the tx is incoming and have a message attached
            // get the address of the sender for this tx and encode into eCash address
            let senderAddress = null;
            if (!outgoingTx && opReturnMessage !== '') {
                const firstVin = tx.vin[0];
                try {
                    // get the tx that generated the first vin of this tx
                    const firstVinTxData =
                        await BCH.RawTransactions.getRawTransaction(
                            firstVin.txid,
                            true,
                        );
                    // extract the address of the tx output
                    let senderBchAddress =
                        firstVinTxData.vout[firstVin.vout].scriptPubKey
                            .addresses[0];
                    const { type, hash } = cashaddr.decode(senderBchAddress);
                    senderAddress = cashaddr.encode('ecash', type, hash);
                } catch (err) {
                    console.log(
                        `Error in BCH.RawTransactions.getRawTransaction(${firstVin.txid}, true)`,
                    );
                }
            }
            // Construct parsedTx
            parsedTx.amountSent = amountSent;
            parsedTx.amountReceived = amountReceived;
            parsedTx.tokenTx = tokenTx;
            parsedTx.outgoingTx = outgoingTx;
            parsedTx.replyAddress = senderAddress;
            parsedTx.destinationAddress = destinationAddress;
            parsedTx.opReturnMessage = Buffer.from(opReturnMessage).toString();
            parsedTx.isCashtabMessage = isCashtabMessage;
            parsedTx.isEncryptedMessage = isEncryptedMessage;
            parsedTx.decryptionSuccess = decryptionSuccess;
            parsedTxHistory.push(parsedTx);
        }
        return parsedTxHistory;
    };

    const getTxHistory = async (BCH, addresses) => {
        let txHistoryResponse;
        try {
            //console.log(`API Call: BCH.Electrumx.utxo(addresses)`);
            //console.log(addresses);
            txHistoryResponse = await BCH.Electrumx.transactions(addresses);
            //console.log(`BCH.Electrumx.transactions(addresses) succeeded`);
            //console.log(`txHistoryResponse`, txHistoryResponse);

            if (txHistoryResponse.success && txHistoryResponse.transactions) {
                return txHistoryResponse.transactions;
            } else {
                // eslint-disable-next-line no-throw-literal
                throw new Error('Error in getTxHistory');
            }
        } catch (err) {
            console.log(`Error in BCH.Electrumx.transactions(addresses):`);
            console.log(err);
            return err;
        }
    };

    const getTxDataWithPassThrough = async (BCH, flatTx) => {
        // necessary as BCH.RawTransactions.getRawTransaction does not return address or blockheight
        let txDataWithPassThrough = {};
        try {
            txDataWithPassThrough = await BCH.RawTransactions.getRawTransaction(
                flatTx.txid,
                true,
            );
        } catch (err) {
            console.log(
                `Error in BCH.RawTransactions.getRawTransaction(${flatTx.txid}, true)`,
            );
            console.log(err);
            // Include txid if you don't get it from the attempted response
            txDataWithPassThrough.txid = flatTx.txid;
        }
        txDataWithPassThrough.height = flatTx.height;
        txDataWithPassThrough.address = flatTx.address;
        return txDataWithPassThrough;
    };

    const getTxData = async (BCH, txHistory, publicKeys, wallet) => {
        // Flatten tx history
        let flatTxs = flattenTransactions(txHistory);

        // Build array of promises to get tx data for all 10 transactions
        let getTxDataWithPassThroughPromises = [];
        for (let i = 0; i < flatTxs.length; i += 1) {
            const getTxDataWithPassThroughPromise =
                returnGetTxDataWithPassThroughPromise(BCH, flatTxs[i]);
            getTxDataWithPassThroughPromises.push(
                getTxDataWithPassThroughPromise,
            );
        }

        // Get txData for the 10 most recent transactions
        let getTxDataWithPassThroughPromisesResponse;
        try {
            getTxDataWithPassThroughPromisesResponse = await Promise.all(
                getTxDataWithPassThroughPromises,
            );

            const parsed = parseTxData(
                BCH,
                getTxDataWithPassThroughPromisesResponse,
                publicKeys,
                wallet,
            );

            return parsed;
        } catch (err) {
            console.log(
                `Error in Promise.all(getTxDataWithPassThroughPromises):`,
            );
            console.log(err);
            return err;
        }
    };

    const parseTokenInfoForTxHistory = (BCH, parsedTx, tokenInfo) => {
        // Address at which the eToken was received
        const { destinationAddress } = parsedTx;
        // Here in cashtab, destinationAddress is in bitcoincash: format
        // In the API response of tokenInfo, this will be in simpleledger: format
        // So, must convert to simpleledger
        const receivingSlpAddress =
            BCH.SLP.Address.toSLPAddress(destinationAddress);

        const { transactionType, sendInputsFull, sendOutputsFull } = tokenInfo;
        const sendingTokenAddresses = [];
        // Scan over inputs to find out originating addresses
        for (let i = 0; i < sendInputsFull.length; i += 1) {
            const sendingAddress = sendInputsFull[i].address;
            sendingTokenAddresses.push(sendingAddress);
        }
        // Scan over outputs to find out how much was sent
        let qtySent = new BigNumber(0);
        let qtyReceived = new BigNumber(0);
        for (let i = 0; i < sendOutputsFull.length; i += 1) {
            if (sendingTokenAddresses.includes(sendOutputsFull[i].address)) {
                // token change and should be ignored, unless it's a genesis transaction
                // then this is the amount created
                if (transactionType === 'GENESIS') {
                    qtyReceived = qtyReceived.plus(
                        new BigNumber(sendOutputsFull[i].amount),
                    );
                }
                continue;
            }
            if (parsedTx.outgoingTx) {
                qtySent = qtySent.plus(
                    new BigNumber(sendOutputsFull[i].amount),
                );
            } else {
                // Only if this matches the receiving address
                if (sendOutputsFull[i].address === receivingSlpAddress) {
                    qtyReceived = qtyReceived.plus(
                        new BigNumber(sendOutputsFull[i].amount),
                    );
                }
            }
        }
        const cashtabTokenInfo = {};
        cashtabTokenInfo.qtySent = qtySent.toString();
        cashtabTokenInfo.qtyReceived = qtyReceived.toString();
        cashtabTokenInfo.tokenId = tokenInfo.tokenIdHex;
        cashtabTokenInfo.tokenName = tokenInfo.tokenName;
        cashtabTokenInfo.tokenTicker = tokenInfo.tokenTicker;
        cashtabTokenInfo.transactionType = transactionType;

        return cashtabTokenInfo;
    };

    const addTokenTxDataToSingleTx = async (BCH, parsedTx) => {
        // Accept one parsedTx

        // If it's not a token tx, just return it as is and do not parse for token data
        if (!parsedTx.tokenTx) {
            return parsedTx;
        }

        // If it could be a token tx, do an API call to get token info and return it
        let tokenData;
        try {
            tokenData = await BCH.SLP.Utils.txDetails(parsedTx.txid);
        } catch (err) {
            console.log(
                `Error in parsing BCH.SLP.Utils.txDetails(${parsedTx.txid})`,
            );
            console.log(err);
            // This is not a token tx
            parsedTx.tokenTx = false;
            return parsedTx;
        }

        const { tokenInfo } = tokenData;

        parsedTx.tokenInfo = parseTokenInfoForTxHistory(
            BCH,
            parsedTx,
            tokenInfo,
        );

        return parsedTx;
    };

    const addTokenTxData = async (BCH, parsedTxs) => {
        // Collect all txids for token transactions into array of promises
        // Promise.all to get their tx history
        // Add a tokeninfo object to parsedTxs for token txs
        // Get txData for the 10 most recent transactions

        // Build array of promises to get tx data for all 10 transactions
        let addTokenTxDataToSingleTxPromises = [];
        for (let i = 0; i < parsedTxs.length; i += 1) {
            const addTokenTxDataToSingleTxPromise =
                returnAddTokenTxDataToSingleTxPromise(BCH, parsedTxs[i]);
            addTokenTxDataToSingleTxPromises.push(
                addTokenTxDataToSingleTxPromise,
            );
        }
        let addTokenTxDataToSingleTxPromisesResponse;
        try {
            addTokenTxDataToSingleTxPromisesResponse = await Promise.all(
                addTokenTxDataToSingleTxPromises,
            );
            return addTokenTxDataToSingleTxPromisesResponse;
        } catch (err) {
            console.log(
                `Error in Promise.all(addTokenTxDataToSingleTxPromises):`,
            );
            console.log(err);
            return err;
        }
    };

    // Split out the BCH.Electrumx.utxo(addresses) call from the getSlpBalancesandUtxos function
    // If utxo set has not changed, you do not need to hydrate the utxo set
    // This drastically reduces calls to the API
    const getUtxos = async (BCH, addresses) => {
        let utxosResponse;
        try {
            //console.log(`API Call: BCH.Electrumx.utxo(addresses)`);
            //console.log(addresses);
            utxosResponse = await BCH.Electrumx.utxo(addresses);
            //console.log(`BCH.Electrumx.utxo(addresses) succeeded`);
            //console.log(`utxosResponse`, utxosResponse);
            return utxosResponse.utxos;
        } catch (err) {
            console.log(`Error in BCH.Electrumx.utxo(addresses):`);
            return err;
        }
    };

    const getHydratedUtxoDetails = async (BCH, utxos) => {
        const hydrateUtxosPromises = [];
        for (let i = 0; i < utxos.length; i += 1) {
            let thisAddress = utxos[i].address;
            let theseUtxos = utxos[i].utxos;
            const batchedUtxos = batchArray(
                theseUtxos,
                currency.xecApiBatchSize,
            );

            // Iterate over each utxo in this address field
            for (let j = 0; j < batchedUtxos.length; j += 1) {
                const utxoSetForThisPromise = [
                    { utxos: batchedUtxos[j], address: thisAddress },
                ];
                const hydrateUtxosPromise = returnHydrateUtxosPromise(
                    BCH,
                    utxoSetForThisPromise,
                );
                hydrateUtxosPromises.push(hydrateUtxosPromise);
            }
        }
        let hydrateUtxosPromisesResponse;
        try {
            hydrateUtxosPromisesResponse = await Promise.all(
                hydrateUtxosPromises,
            );
            const flattenedBatchedHydratedUtxos = flattenBatchedHydratedUtxos(
                hydrateUtxosPromisesResponse,
            );
            return flattenedBatchedHydratedUtxos;
        } catch (err) {
            console.log(`Error in Promise.all(hydrateUtxosPromises)`);
            console.log(err);
            return err;
        }
    };

    const returnTxDataPromise = (BCH, txidBatch) => {
        return new Promise((resolve, reject) => {
            BCH.Electrumx.txData(txidBatch).then(
                result => {
                    resolve(result);
                },
                err => {
                    reject(err);
                },
            );
        });
    };

    const returnGetTxDataWithPassThroughPromise = (BCH, flatTx) => {
        return new Promise((resolve, reject) => {
            getTxDataWithPassThrough(BCH, flatTx).then(
                result => {
                    resolve(result);
                },
                err => {
                    reject(err);
                },
            );
        });
    };

    const returnAddTokenTxDataToSingleTxPromise = (BCH, parsedTx) => {
        return new Promise((resolve, reject) => {
            addTokenTxDataToSingleTx(BCH, parsedTx).then(
                result => {
                    resolve(result);
                },
                err => {
                    reject(err);
                },
            );
        });
    };

    const returnHydrateUtxosPromise = (BCH, utxoSetForThisPromise) => {
        return new Promise((resolve, reject) => {
            BCH.SLP.Utils.hydrateUtxos(utxoSetForThisPromise).then(
                result => {
                    resolve(result);
                },
                err => {
                    reject(err);
                },
            );
        });
    };

    const fetchTxDataForNullUtxos = async (BCH, nullUtxos) => {
        // Check nullUtxos. If they aren't eToken txs, count them
        console.log(
            `Null utxos found, checking OP_RETURN fields to confirm they are not eToken txs.`,
        );
        const txids = [];
        for (let i = 0; i < nullUtxos.length; i += 1) {
            // Batch API call to get their OP_RETURN asm info
            txids.push(nullUtxos[i].tx_hash);
        }

        // segment the txids array into chunks under the api limit
        const batchedTxids = batchArray(txids, currency.xecApiBatchSize);

        // build an array of promises
        let txDataPromises = [];
        // loop through each batch of 20 txids
        for (let j = 0; j < batchedTxids.length; j += 1) {
            const txidsForThisPromise = batchedTxids[j];
            // build the promise for the api call with the 20 txids in current batch
            const txDataPromise = returnTxDataPromise(BCH, txidsForThisPromise);
            txDataPromises.push(txDataPromise);
        }

        try {
            const txDataPromisesResponse = await Promise.all(txDataPromises);
            // Scan tx data for each utxo to confirm they are not eToken txs
            let thisTxDataResult;
            let nonEtokenUtxos = [];
            for (let k = 0; k < txDataPromisesResponse.length; k += 1) {
                thisTxDataResult = txDataPromisesResponse[k].transactions;
                nonEtokenUtxos = nonEtokenUtxos.concat(
                    checkNullUtxosForTokenStatus(thisTxDataResult),
                );
            }
            return nonEtokenUtxos;
        } catch (err) {
            console.log(
                `Error in checkNullUtxosForTokenStatus(nullUtxos)` + err,
            );
            console.log(`nullUtxos`, nullUtxos);
            // If error, ignore these utxos, will be updated next utxo set refresh
            return [];
        }
    };

    const getSlpBalancesAndUtxos = async (BCH, hydratedUtxoDetails) => {
        let hydratedUtxos = [];
        for (let i = 0; i < hydratedUtxoDetails.slpUtxos.length; i += 1) {
            const hydratedUtxosAtAddress = hydratedUtxoDetails.slpUtxos[i];
            for (let j = 0; j < hydratedUtxosAtAddress.utxos.length; j += 1) {
                const hydratedUtxo = hydratedUtxosAtAddress.utxos[j];
                hydratedUtxo.address = hydratedUtxosAtAddress.address;
                hydratedUtxos.push(hydratedUtxo);
            }
        }

        //console.log(`hydratedUtxos`, hydratedUtxos);

        // WARNING
        // If you hit rate limits, your above utxos object will come back with `isValid` as null, but otherwise ok
        // You need to throw an error before setting nonSlpUtxos and slpUtxos in this case
        const nullUtxos = hydratedUtxos.filter(utxo => utxo.isValid === null);

        if (nullUtxos.length > 0) {
            console.log(`${nullUtxos.length} null utxos found!`);
            console.log('nullUtxos', nullUtxos);
            const nullNonEtokenUtxos = await fetchTxDataForNullUtxos(
                BCH,
                nullUtxos,
            );

            // Set isValid === false for nullUtxos that are confirmed non-eToken
            hydratedUtxos = confirmNonEtokenUtxos(
                hydratedUtxos,
                nullNonEtokenUtxos,
            );
        }

        // Prevent app from treating slpUtxos as nonSlpUtxos
        // Must enforce === false as api will occasionally return utxo.isValid === null
        // Do not classify any utxos that include token information as nonSlpUtxos
        const nonSlpUtxos = hydratedUtxos.filter(
            utxo =>
                utxo.isValid === false &&
                utxo.value !== currency.etokenSats &&
                !utxo.tokenName,
        );
        // To be included in slpUtxos, the utxo must
        // have utxo.isValid = true
        // If utxo has a utxo.tokenQty field, i.e. not a minting baton, then utxo.tokenQty !== '0'
        const slpUtxos = hydratedUtxos.filter(
            utxo => utxo.isValid && !(utxo.tokenQty === '0'),
        );

        let tokensById = {};

        slpUtxos.forEach(slpUtxo => {
            let token = tokensById[slpUtxo.tokenId];

            if (token) {
                // Minting baton does nto have a slpUtxo.tokenQty type

                if (slpUtxo.tokenQty) {
                    token.balance = token.balance.plus(
                        new BigNumber(slpUtxo.tokenQty),
                    );
                }

                //token.hasBaton = slpUtxo.transactionType === "genesis";
                if (slpUtxo.utxoType && !token.hasBaton) {
                    token.hasBaton = slpUtxo.utxoType === 'minting-baton';
                }

                // Examples of slpUtxo
                /*
                Genesis transaction:
                {
                address: "bitcoincash:qrhzv5t79e2afc3rdutcu0d3q20gl7ul3ue58whah6"
                decimals: 9
                height: 617564
                isValid: true
                satoshis: 546
                tokenDocumentHash: ""
                tokenDocumentUrl: "developer.bitcoin.com"
                tokenId: "6c41f244676ecfcbe3b4fabee2c72c2dadf8d74f8849afabc8a549157db69199"
                tokenName: "PiticoLaunch"
                tokenTicker: "PTCL"
                tokenType: 1
                tx_hash: "6c41f244676ecfcbe3b4fabee2c72c2dadf8d74f8849afabc8a549157db69199"
                tx_pos: 2
                txid: "6c41f244676ecfcbe3b4fabee2c72c2dadf8d74f8849afabc8a549157db69199"
                utxoType: "minting-baton"
                value: 546
                vout: 2
                }

                Send transaction:
                {
                address: "bitcoincash:qrhzv5t79e2afc3rdutcu0d3q20gl7ul3ue58whah6"
                decimals: 9
                height: 655115
                isValid: true
                satoshis: 546
                tokenDocumentHash: ""
                tokenDocumentUrl: "developer.bitcoin.com"
                tokenId: "6c41f244676ecfcbe3b4fabee2c72c2dadf8d74f8849afabc8a549157db69199"
                tokenName: "PiticoLaunch"
                tokenQty: 1.123456789
                tokenTicker: "PTCL"
                tokenType: 1
                transactionType: "send"
                tx_hash: "dea400f963bc9f51e010f88533010f8d1f82fc2bcc485ff8500c3a82b25abd9e"
                tx_pos: 1
                txid: "dea400f963bc9f51e010f88533010f8d1f82fc2bcc485ff8500c3a82b25abd9e"
                utxoType: "token"
                value: 546
                vout: 1
                }
                */
            } else {
                token = {};
                token.info = slpUtxo;
                token.tokenId = slpUtxo.tokenId;
                if (slpUtxo.tokenQty) {
                    token.balance = new BigNumber(slpUtxo.tokenQty);
                } else {
                    token.balance = new BigNumber(0);
                }
                if (slpUtxo.utxoType) {
                    token.hasBaton = slpUtxo.utxoType === 'minting-baton';
                } else {
                    token.hasBaton = false;
                }

                tokensById[slpUtxo.tokenId] = token;
            }
        });

        const tokens = Object.values(tokensById);
        // console.log(`tokens`, tokens);
        return {
            tokens,
            nonSlpUtxos,
            slpUtxos,
        };
    };

    const calcFee = (
        BCH,
        utxos,
        p2pkhOutputNumber = 2,
        satoshisPerByte = currency.defaultFee,
    ) => {
        const byteCount = BCH.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: p2pkhOutputNumber },
        );
        const txFee = Math.ceil(satoshisPerByte * byteCount);
        return txFee;
    };

    const createToken = async (BCH, wallet, feeInSatsPerByte, configObj) => {
        try {
            // Throw error if wallet does not have utxo set in state
            if (!isValidStoredWallet(wallet)) {
                const walletError = new Error(`Invalid wallet`);
                throw walletError;
            }
            const utxos = wallet.state.slpBalancesAndUtxos.nonSlpUtxos;

            const CREATION_ADDR = wallet.Path1899.cashAddress;
            const inputUtxos = [];
            let transactionBuilder;

            // instance of transaction builder
            if (process.env.REACT_APP_NETWORK === `mainnet`)
                transactionBuilder = new BCH.TransactionBuilder();
            else transactionBuilder = new BCH.TransactionBuilder('testnet');

            let originalAmount = new BigNumber(0);

            let txFee = 0;
            for (let i = 0; i < utxos.length; i++) {
                const utxo = utxos[i];
                originalAmount = originalAmount.plus(new BigNumber(utxo.value));
                const vout = utxo.vout;
                const txid = utxo.txid;
                // add input with txid and index of vout
                transactionBuilder.addInput(txid, vout);

                inputUtxos.push(utxo);
                txFee = calcFee(BCH, inputUtxos, 3, feeInSatsPerByte);

                if (
                    originalAmount
                        .minus(new BigNumber(currency.etokenSats))
                        .minus(new BigNumber(txFee))
                        .gte(0)
                ) {
                    break;
                }
            }

            // amount to send back to the remainder address.
            const remainder = originalAmount
                .minus(new BigNumber(currency.etokenSats))
                .minus(new BigNumber(txFee));

            if (remainder.lt(0)) {
                const error = new Error(`Insufficient funds`);
                error.code = SEND_BCH_ERRORS.INSUFFICIENT_FUNDS;
                throw error;
            }

            // Generate the OP_RETURN entry for an SLP GENESIS transaction.
            const script =
                BCH.SLP.TokenType1.generateGenesisOpReturn(configObj);
            // OP_RETURN needs to be the first output in the transaction.
            transactionBuilder.addOutput(script, 0);

            // add output w/ address and amount to send
            transactionBuilder.addOutput(CREATION_ADDR, currency.etokenSats);

            // Send change to own address
            if (remainder.gte(new BigNumber(currency.etokenSats))) {
                transactionBuilder.addOutput(
                    CREATION_ADDR,
                    parseInt(remainder),
                );
            }

            // Sign the transactions with the HD node.
            for (let i = 0; i < inputUtxos.length; i++) {
                const utxo = inputUtxos[i];
                transactionBuilder.sign(
                    i,
                    BCH.ECPair.fromWIF(utxo.wif),
                    undefined,
                    transactionBuilder.hashTypes.SIGHASH_ALL,
                    utxo.value,
                );
            }

            // build tx
            const tx = transactionBuilder.build();
            // output rawhex
            const hex = tx.toHex();

            // Broadcast transaction to the network
            const txidStr = await BCH.RawTransactions.sendRawTransaction([hex]);

            if (txidStr && txidStr[0]) {
                console.log(`${currency.ticker} txid`, txidStr[0]);
            }
            let link;

            if (process.env.REACT_APP_NETWORK === `mainnet`) {
                link = `${currency.tokenExplorerUrl}/tx/${txidStr}`;
            } else {
                link = `${currency.blockExplorerUrlTestnet}/tx/${txidStr}`;
            }
            //console.log(`link`, link);

            return link;
        } catch (err) {
            if (err.error === 'insufficient priority (code 66)') {
                err.code = SEND_BCH_ERRORS.INSUFFICIENT_PRIORITY;
            } else if (err.error === 'txn-mempool-conflict (code 18)') {
                err.code = SEND_BCH_ERRORS.DOUBLE_SPENDING;
            } else if (err.error === 'Network Error') {
                err.code = SEND_BCH_ERRORS.NETWORK_ERROR;
            } else if (
                err.error ===
                'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)'
            ) {
                err.code = SEND_BCH_ERRORS.MAX_UNCONFIRMED_TXS;
            }
            console.log(`error: `, err);
            throw err;
        }
    };

    // No unit tests for this function as it is only an API wrapper
    // Return false if do not get a valid response
    const getTokenStats = async (BCH, tokenId) => {
        let tokenStats;
        try {
            tokenStats = await BCH.SLP.Utils.tokenStats(tokenId);
            if (isValidTokenStats(tokenStats)) {
                return tokenStats;
            }
        } catch (err) {
            console.log(`Error fetching token stats for tokenId ${tokenId}`);
            console.log(err);
            return false;
        }
    };

    const sendToken = async (
        BCH,
        wallet,
        slpBalancesAndUtxos,
        { tokenId, amount, tokenReceiverAddress },
    ) => {
        // Handle error of user having no BCH
        if (slpBalancesAndUtxos.nonSlpUtxos.length === 0) {
            throw new Error(
                `You need some ${currency.ticker} to send ${currency.tokenTicker}`,
            );
        }
        const largestBchUtxo = slpBalancesAndUtxos.nonSlpUtxos.reduce(
            (previous, current) =>
                previous.value > current.value ? previous : current,
        );

        const bchECPair = BCH.ECPair.fromWIF(largestBchUtxo.wif);
        const tokenUtxos = slpBalancesAndUtxos.slpUtxos.filter(utxo => {
            if (
                utxo && // UTXO is associated with a token.
                utxo.tokenId === tokenId && // UTXO matches the token ID.
                utxo.utxoType === 'token' // UTXO is not a minting baton.
            ) {
                return true;
            }
            return false;
        });

        if (tokenUtxos.length === 0) {
            throw new Error(
                'No token UTXOs for the specified token could be found.',
            );
        }

        // BEGIN transaction construction.

        // instance of transaction builder
        let transactionBuilder;
        if (process.env.REACT_APP_NETWORK === 'mainnet') {
            transactionBuilder = new BCH.TransactionBuilder();
        } else transactionBuilder = new BCH.TransactionBuilder('testnet');

        const originalAmount = largestBchUtxo.value;
        transactionBuilder.addInput(
            largestBchUtxo.tx_hash,
            largestBchUtxo.tx_pos,
        );

        let finalTokenAmountSent = new BigNumber(0);
        let tokenAmountBeingSentToAddress = new BigNumber(amount);

        let tokenUtxosBeingSpent = [];
        for (let i = 0; i < tokenUtxos.length; i++) {
            finalTokenAmountSent = finalTokenAmountSent.plus(
                new BigNumber(tokenUtxos[i].tokenQty),
            );
            transactionBuilder.addInput(
                tokenUtxos[i].tx_hash,
                tokenUtxos[i].tx_pos,
            );
            tokenUtxosBeingSpent.push(tokenUtxos[i]);
            if (tokenAmountBeingSentToAddress.lte(finalTokenAmountSent)) {
                break;
            }
        }

        const slpSendObj = BCH.SLP.TokenType1.generateSendOpReturn(
            tokenUtxosBeingSpent,
            tokenAmountBeingSentToAddress.toString(),
        );

        const slpData = slpSendObj.script;

        // Add OP_RETURN as first output.
        transactionBuilder.addOutput(slpData, 0);

        // Send dust transaction representing tokens being sent.
        transactionBuilder.addOutput(
            BCH.SLP.Address.toLegacyAddress(tokenReceiverAddress),
            currency.etokenSats,
        );

        // Return any token change back to the sender.
        if (slpSendObj.outputs > 1) {
            // Change goes back to where slp utxo came from
            transactionBuilder.addOutput(
                BCH.SLP.Address.toLegacyAddress(
                    tokenUtxosBeingSpent[0].address,
                ),
                currency.etokenSats,
            );
        }

        // get byte count to calculate fee. paying 1 sat
        // Note: This may not be totally accurate. Just guessing on the byteCount size.
        const txFee = calcFee(
            BCH,
            tokenUtxosBeingSpent,
            5,
            1.1 * currency.defaultFee,
        );

        // amount to send back to the sending address. It's the original amount - 1 sat/byte for tx size
        const remainder = originalAmount - txFee - currency.etokenSats * 2;
        if (remainder < 1) {
            throw new Error('Selected UTXO does not have enough satoshis');
        }

        // Last output: send the BCH change back to the wallet.

        // Send it back from whence it came
        transactionBuilder.addOutput(
            BCH.Address.toLegacyAddress(largestBchUtxo.address),
            remainder,
        );

        // Sign the transaction with the private key for the BCH UTXO paying the fees.
        let redeemScript;
        transactionBuilder.sign(
            0,
            bchECPair,
            redeemScript,
            transactionBuilder.hashTypes.SIGHASH_ALL,
            originalAmount,
        );

        // Sign each token UTXO being consumed.
        for (let i = 0; i < tokenUtxosBeingSpent.length; i++) {
            const thisUtxo = tokenUtxosBeingSpent[i];
            const accounts = [wallet.Path245, wallet.Path145, wallet.Path1899];
            const utxoEcPair = BCH.ECPair.fromWIF(
                accounts
                    .filter(acc => acc.cashAddress === thisUtxo.address)
                    .pop().fundingWif,
            );

            transactionBuilder.sign(
                1 + i,
                utxoEcPair,
                redeemScript,
                transactionBuilder.hashTypes.SIGHASH_ALL,
                thisUtxo.value,
            );
        }

        // build tx
        const tx = transactionBuilder.build();

        // output rawhex
        const hex = tx.toHex();
        // console.log(`Transaction raw hex: `, hex);

        // END transaction construction.

        const txidStr = await BCH.RawTransactions.sendRawTransaction([hex]);
        if (txidStr && txidStr[0]) {
            console.log(`${currency.tokenTicker} txid`, txidStr[0]);
        }

        let link;
        if (process.env.REACT_APP_NETWORK === `mainnet`) {
            link = `${currency.blockExplorerUrl}/tx/${txidStr}`;
        } else {
            link = `${currency.blockExplorerUrlTestnet}/tx/${txidStr}`;
        }

        //console.log(`link`, link);

        return link;
    };

    const signPkMessage = async (BCH, pk, message) => {
        try {
            let signature = await BCH.BitcoinCash.signMessageWithPrivKey(
                pk,
                message,
            );
            return signature;
        } catch (err) {
            console.log(`useBCH.signPkMessage() error: `, err);
            throw err;
        }
    };

    const getRecipientPublicKey = async (BCH, recipientAddress) => {
        let recipientPubKey;
        try {
            recipientPubKey = await getPublicKey(BCH, recipientAddress);
        } catch (err) {
            console.log(`useBCH.getRecipientPublicKey() error: ` + err);
            throw err;
        }
        return recipientPubKey;
    };

    const handleEncryptedOpReturn = async (
        BCH,
        destinationAddress,
        optionalOpReturnMsg,
    ) => {
        let recipientPubKey, encryptedEj;
        try {
            recipientPubKey = await getRecipientPublicKey(
                BCH,
                destinationAddress,
            );
        } catch (err) {
            console.log(`useBCH.handleEncryptedOpReturn() error: ` + err);
            throw err;
        }

        if (recipientPubKey === 'not found') {
            // if the API can't find a pub key, it is due to the wallet having no outbound tx
            throw new Error(
                'Cannot send an encrypted message to a wallet with no outgoing transactions',
            );
        }

        try {
            const pubKeyBuf = Buffer.from(recipientPubKey, 'hex');
            const bufferedFile = Buffer.from(optionalOpReturnMsg);
            const structuredEj = await ecies.encrypt(pubKeyBuf, bufferedFile);

            // Serialize the encrypted data object
            encryptedEj = Buffer.concat([
                structuredEj.epk,
                structuredEj.iv,
                structuredEj.ct,
                structuredEj.mac,
            ]);
        } catch (err) {
            console.log(`useBCH.handleEncryptedOpReturn() error: ` + err);
            throw err;
        }

        return encryptedEj;
    };

    const sendXec = async (
        BCH,
        wallet,
        utxos,
        feeInSatsPerByte,
        optionalOpReturnMsg,
        isOneToMany,
        destinationAddressAndValueArray,
        destinationAddress,
        sendAmount,
        encryptionFlag,
    ) => {
        try {
            let value = new BigNumber(0);

            if (isOneToMany) {
                // this is a one to many XEC transaction
                if (
                    !destinationAddressAndValueArray ||
                    !destinationAddressAndValueArray.length
                ) {
                    throw new Error('Invalid destinationAddressAndValueArray');
                }
                const arrayLength = destinationAddressAndValueArray.length;
                for (let i = 0; i < arrayLength; i++) {
                    // add the total value being sent in this array of recipients
                    value = BigNumber.sum(
                        value,
                        new BigNumber(
                            destinationAddressAndValueArray[i].split(',')[1],
                        ),
                    );
                }

                // If user is attempting to send an aggregate value that is less than minimum accepted by the backend
                if (
                    value.lt(
                        new BigNumber(
                            fromSmallestDenomination(
                                currency.dustSats,
                            ).toString(),
                        ),
                    )
                ) {
                    // Throw the same error given by the backend attempting to broadcast such a tx
                    throw new Error('dust');
                }
            } else {
                // this is a one to one XEC transaction then check sendAmount
                // note: one to many transactions won't be sending a single sendAmount

                if (!sendAmount) {
                    return null;
                }

                value = new BigNumber(sendAmount);

                // If user is attempting to send less than minimum accepted by the backend
                if (
                    value.lt(
                        new BigNumber(
                            fromSmallestDenomination(
                                currency.dustSats,
                            ).toString(),
                        ),
                    )
                ) {
                    // Throw the same error given by the backend attempting to broadcast such a tx
                    throw new Error('dust');
                }
            }

            const inputUtxos = [];
            let transactionBuilder;

            // instance of transaction builder
            if (process.env.REACT_APP_NETWORK === `mainnet`)
                transactionBuilder = new BCH.TransactionBuilder();
            else transactionBuilder = new BCH.TransactionBuilder('testnet');

            const satoshisToSend = toSmallestDenomination(value);

            // Throw validation error if toSmallestDenomination returns false
            if (!satoshisToSend) {
                const error = new Error(
                    `Invalid decimal places for send amount`,
                );
                throw error;
            }

            let script;
            // Start of building the OP_RETURN output.
            // only build the OP_RETURN output if the user supplied it
            if (
                optionalOpReturnMsg &&
                typeof optionalOpReturnMsg !== 'undefined' &&
                optionalOpReturnMsg.trim() !== ''
            ) {
                if (encryptionFlag) {
                    // if the user has opted to encrypt this message
                    let encryptedEj;
                    try {
                        encryptedEj = await handleEncryptedOpReturn(
                            BCH,
                            destinationAddress,
                            optionalOpReturnMsg,
                        );
                    } catch (err) {
                        console.log(`useBCH.sendXec() encryption error.`);
                        throw err;
                    }

                    // build the OP_RETURN script with the encryption prefix
                    script = [
                        BCH.Script.opcodes.OP_RETURN, // 6a
                        Buffer.from(
                            currency.opReturn.appPrefixesHex.cashtabEncrypted,
                            'hex',
                        ), // 65746162
                        Buffer.from(encryptedEj),
                    ];
                } else {
                    // this is an un-encrypted message
                    script = [
                        BCH.Script.opcodes.OP_RETURN, // 6a
                        Buffer.from(
                            currency.opReturn.appPrefixesHex.cashtab,
                            'hex',
                        ), // 00746162
                        Buffer.from(optionalOpReturnMsg),
                    ];
                }
                const data = BCH.Script.encode(script);
                transactionBuilder.addOutput(data, 0);
            }
            // End of building the OP_RETURN output.

            let originalAmount = new BigNumber(0);
            let txFee = 0;
            for (let i = 0; i < utxos.length; i++) {
                const utxo = utxos[i];
                originalAmount = originalAmount.plus(utxo.value);
                const vout = utxo.vout;
                const txid = utxo.txid;
                // add input with txid and index of vout
                transactionBuilder.addInput(txid, vout);

                inputUtxos.push(utxo);
                txFee = calcFee(BCH, inputUtxos, 2, feeInSatsPerByte);

                if (originalAmount.minus(satoshisToSend).minus(txFee).gte(0)) {
                    break;
                }
            }

            // Get change address from sending utxos
            // fall back to what is stored in wallet
            let REMAINDER_ADDR;

            // Validate address
            let isValidChangeAddress;
            try {
                REMAINDER_ADDR = inputUtxos[0].address;
                isValidChangeAddress =
                    BCH.Address.isCashAddress(REMAINDER_ADDR);
            } catch (err) {
                isValidChangeAddress = false;
            }
            if (!isValidChangeAddress) {
                REMAINDER_ADDR = wallet.Path1899.cashAddress;
            }

            // amount to send back to the remainder address.
            const remainder = originalAmount.minus(satoshisToSend).minus(txFee);

            if (remainder.lt(0)) {
                const error = new Error(`Insufficient funds`);
                error.code = SEND_BCH_ERRORS.INSUFFICIENT_FUNDS;
                throw error;
            }

            if (isOneToMany) {
                // for one to many mode, add the multiple outputs from the array
                let arrayLength = destinationAddressAndValueArray.length;
                for (let i = 0; i < arrayLength; i++) {
                    // add each send tx from the array as an output
                    let outputAddress =
                        destinationAddressAndValueArray[i].split(',')[0];
                    let outputValue = new BigNumber(
                        destinationAddressAndValueArray[i].split(',')[1],
                    );
                    transactionBuilder.addOutput(
                        BCH.Address.toCashAddress(outputAddress),
                        parseInt(toSmallestDenomination(outputValue)),
                    );
                }
            } else {
                // for one to one mode, add output w/ single address and amount to send
                transactionBuilder.addOutput(
                    BCH.Address.toCashAddress(destinationAddress),
                    parseInt(toSmallestDenomination(value)),
                );
            }

            if (remainder.gte(new BigNumber(currency.dustSats))) {
                transactionBuilder.addOutput(
                    REMAINDER_ADDR,
                    parseInt(remainder),
                );
            }

            // Sign the transactions with the HD node.
            for (let i = 0; i < inputUtxos.length; i++) {
                const utxo = inputUtxos[i];
                transactionBuilder.sign(
                    i,
                    BCH.ECPair.fromWIF(utxo.wif),
                    undefined,
                    transactionBuilder.hashTypes.SIGHASH_ALL,
                    utxo.value,
                );
            }

            // build tx
            const tx = transactionBuilder.build();
            // output rawhex
            const hex = tx.toHex();

            // Broadcast transaction to the network
            const txidStr = await BCH.RawTransactions.sendRawTransaction([hex]);

            if (txidStr && txidStr[0]) {
                console.log(`${currency.ticker} txid`, txidStr[0]);
            }
            let link;
            if (process.env.REACT_APP_NETWORK === `mainnet`) {
                link = `${currency.blockExplorerUrl}/tx/${txidStr}`;
            } else {
                link = `${currency.blockExplorerUrlTestnet}/tx/${txidStr}`;
            }
            //console.log(`link`, link);

            return link;
        } catch (err) {
            if (err.error === 'insufficient priority (code 66)') {
                err.code = SEND_BCH_ERRORS.INSUFFICIENT_PRIORITY;
            } else if (err.error === 'txn-mempool-conflict (code 18)') {
                err.code = SEND_BCH_ERRORS.DOUBLE_SPENDING;
            } else if (err.error === 'Network Error') {
                err.code = SEND_BCH_ERRORS.NETWORK_ERROR;
            } else if (
                err.error ===
                'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)'
            ) {
                err.code = SEND_BCH_ERRORS.MAX_UNCONFIRMED_TXS;
            }
            console.log(`error: `, err);
            throw err;
        }
    };

    const getBCH = (apiIndex = 0) => {
        let ConstructedSlpWallet;

        ConstructedSlpWallet = new SlpWallet('', {
            restURL: getRestUrl(apiIndex),
        });
        return ConstructedSlpWallet.bchjs;
    };

    return {
        getBCH,
        calcFee,
        getUtxos,
        getHydratedUtxoDetails,
        getSlpBalancesAndUtxos,
        getTxHistory,
        flattenTransactions,
        parseTxData,
        addTokenTxData,
        parseTokenInfoForTxHistory,
        getTxData,
        getRestUrl,
        signPkMessage,
        sendXec,
        sendToken,
        createToken,
        getTokenStats,
        handleEncryptedOpReturn,
        getRecipientPublicKey,
    };
}
