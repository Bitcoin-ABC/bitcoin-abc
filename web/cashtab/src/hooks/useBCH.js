import BigNumber from 'bignumber.js';
import { currency } from 'components/Common/Ticker';
import SlpWallet from 'minimal-slp-wallet';
import {
    fromXecToSatoshis,
    isValidStoredWallet,
    convertToEncryptStruct,
    getPublicKey,
    parseOpReturn,
    parseXecSendValue,
    generateOpReturnScript,
    generateTxInput,
    generateTxOutput,
    signAndBuildTx,
    getChangeAddressFromInputUtxos,
    signUtxosByAddress,
    getUtxoWif,
} from 'utils/cashMethods';
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
            let airdropFlag = false;
            let airdropTokenId = '';

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

                    if (txType === currency.opReturn.appPrefixesHex.airdrop) {
                        // this is to facilitate special Cashtab-specific cases of airdrop txs, both with and without msgs
                        // The UI via Tx.js can check this airdropFlag attribute in the parsedTx object to conditionally render airdrop-specific formatting if it's true
                        airdropFlag = true;
                        // index 0 is drop prefix, 1 is the token Id, 2 is msg prefix, 3 is msg
                        airdropTokenId = parsedOpReturnArray[1];
                        txType = parsedOpReturnArray[2];

                        // remove the first two elements of airdrop prefix and token id from array so the array parsing logic below can remain unchanged
                        parsedOpReturnArray.splice(0, 2);
                        // index 0 now becomes msg prefix, 1 becomes the msg
                    }

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
                            fundingWif = getUtxoWif(
                                wallet.state.slpBalancesAndUtxos.nonSlpUtxos[0],
                                wallet,
                            );
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

            // If the tx is incoming get the address of the sender for this tx and encode into eCash address.
            // This is used for both Reply To Message and Contact List functions.
            let senderAddress = null;
            if (!outgoingTx) {
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
            parsedTx.airdropFlag = airdropFlag;
            parsedTx.airdropTokenId = airdropTokenId;
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
                const vout = utxo.outpoint.outIdx;
                const txid = utxo.outpoint.txid;
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

            // Sign each XEC UTXO being consumed and refresh transactionBuilder
            transactionBuilder = signUtxosByAddress(
                BCH,
                inputUtxos,
                wallet,
                transactionBuilder,
            );

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

    const sendToken = async (
        BCH,
        wallet,
        { tokenId, amount, tokenReceiverAddress },
    ) => {
        const slpBalancesAndUtxos = wallet.state.slpBalancesAndUtxos;

        // Handle error of user having no XEC
        if (
            !slpBalancesAndUtxos ||
            !slpBalancesAndUtxos.nonSlpUtxos ||
            slpBalancesAndUtxos.nonSlpUtxos.length === 0
        ) {
            throw new Error(
                `You need some ${currency.ticker} to send ${currency.tokenTicker}`,
            );
        }
        const utxos = wallet.state.slpBalancesAndUtxos.nonSlpUtxos;

        // instance of transaction builder
        let transactionBuilder = new BCH.TransactionBuilder();

        // collate XEC utxos to cover token tx
        let totalXecInputUtxoValue = new BigNumber(0);
        let xecInputUtxos = [];
        let txFee = 0;
        let remainder;
        for (let i = 0; i < utxos.length; i++) {
            const utxo = utxos[i];
            totalXecInputUtxoValue = totalXecInputUtxoValue.plus(
                new BigNumber(utxo.value),
            );
            const vout = utxo.outpoint.outIdx;
            const txid = utxo.outpoint.txid;
            // add input with txid and index of vout
            transactionBuilder.addInput(txid, vout);

            xecInputUtxos.push(utxo);
            txFee = calcFee(BCH, xecInputUtxos, 5, 1.1 * currency.defaultFee);

            remainder = totalXecInputUtxoValue
                .minus(new BigNumber(currency.etokenSats * 2)) // one for token send output, one for token change
                .minus(new BigNumber(txFee));

            if (remainder.gte(0)) {
                break;
            }
        }

        if (remainder.lt(0)) {
            const error = new Error(`Insufficient funds`);
            error.code = SEND_BCH_ERRORS.INSUFFICIENT_FUNDS;
            throw error;
        }

        // filter for token UTXOs matching the token being sent
        const tokenUtxos = slpBalancesAndUtxos.slpUtxos.filter(utxo => {
            if (
                utxo && // UTXO is associated with a token.
                utxo.slpMeta.tokenId === tokenId && // UTXO matches the token ID.
                !utxo.slpToken.isMintBaton // UTXO is not a minting baton.
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

        // collate token UTXOs to cover the token amount being sent
        let finalTokenAmountSent = new BigNumber(0);
        let tokenAmountBeingSentToAddress = new BigNumber(amount);
        let tokenUtxosBeingSpent = [];
        for (let i = 0; i < tokenUtxos.length; i++) {
            finalTokenAmountSent = finalTokenAmountSent.plus(
                new BigNumber(tokenUtxos[i].tokenQty),
            );
            transactionBuilder.addInput(
                tokenUtxos[i].outpoint.txid,
                tokenUtxos[i].outpoint.outIdx,
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

        // Last output: send the XEC change back to the wallet.
        // Note: Only send XEC change if your XEC change is greater than dust
        if (remainder.gte(new BigNumber(currency.dustSats))) {
            transactionBuilder.addOutput(
                BCH.Address.toLegacyAddress(xecInputUtxos[0].address),
                remainder.toNumber(),
            );
        }

        // append the token input UTXOs to the array of XEC input UTXOs for signing
        const inputUtxos = xecInputUtxos.concat(tokenUtxosBeingSpent);

        // Sign each UTXO being consumed and refresh transactionBuilder
        transactionBuilder = signUtxosByAddress(
            BCH,
            inputUtxos,
            wallet,
            transactionBuilder,
        );

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

    const burnToken = async (BCH, wallet, { tokenId, amount }) => {
        const slpBalancesAndUtxos = wallet.state.slpBalancesAndUtxos;

        // Handle error of user having no XEC
        if (
            !slpBalancesAndUtxos ||
            !slpBalancesAndUtxos.nonSlpUtxos ||
            slpBalancesAndUtxos.nonSlpUtxos.length === 0
        ) {
            throw new Error(`You need some ${currency.ticker} to burn eTokens`);
        }

        const utxos = slpBalancesAndUtxos.nonSlpUtxos;

        // instance of transaction builder
        let transactionBuilder = new BCH.TransactionBuilder();

        // collate XEC utxos to cover token tx
        let totalXecInputUtxoValue = new BigNumber(0);
        let inputUtxos = [];
        let txFee = 0;
        let remainder;
        for (let i = 0; i < utxos.length; i++) {
            const utxo = utxos[i];
            totalXecInputUtxoValue = totalXecInputUtxoValue.plus(
                new BigNumber(utxo.value),
            );
            const vout = utxo.outpoint.outIdx;
            const txid = utxo.outpoint.txid;
            // add input with txid and index of vout
            transactionBuilder.addInput(txid, vout);

            inputUtxos.push(utxo);
            txFee = calcFee(BCH, inputUtxos, 5, 1.1 * currency.defaultFee);

            remainder = totalXecInputUtxoValue
                .minus(new BigNumber(currency.etokenSats * 2)) // one for token burn output, one for token change
                .minus(new BigNumber(txFee));

            if (remainder.gte(0)) {
                break;
            }
        }

        if (remainder.lt(0)) {
            const error = new Error(`Insufficient funds`);
            error.code = SEND_BCH_ERRORS.INSUFFICIENT_FUNDS;
            throw error;
        }

        // filter for token UTXOs matching the token being burnt
        const tokenUtxos = slpBalancesAndUtxos.slpUtxos.filter(utxo => {
            if (
                utxo && // UTXO is associated with a token.
                utxo.slpMeta.tokenId === tokenId && // UTXO matches the token ID.
                !utxo.slpToken.isMintBaton // UTXO is not a minting baton.
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

        // collate token UTXOs to cover the token amount being burnt
        let finalTokenAmountBurnt = new BigNumber(0);
        let tokenAmountBeingBurnt = new BigNumber(amount);

        let tokenUtxosBeingBurnt = [];
        for (let i = 0; i < tokenUtxos.length; i++) {
            finalTokenAmountBurnt = finalTokenAmountBurnt.plus(
                new BigNumber(tokenUtxos[i].tokenQty),
            );
            transactionBuilder.addInput(
                tokenUtxos[i].outpoint.txid,
                tokenUtxos[i].outpoint.outIdx,
            );
            tokenUtxosBeingBurnt.push(tokenUtxos[i]);
            if (tokenAmountBeingBurnt.lte(finalTokenAmountBurnt)) {
                break;
            }
        }

        const slpBurnObj = BCH.SLP.TokenType1.generateBurnOpReturn(
            tokenUtxosBeingBurnt,
            tokenAmountBeingBurnt,
        );

        if (!slpBurnObj) {
            throw new Error(`Invalid eToken burn transaction.`);
        }

        // Add OP_RETURN as first output.
        transactionBuilder.addOutput(slpBurnObj, 0);

        // Send dust transaction representing tokens being burnt.
        transactionBuilder.addOutput(
            BCH.SLP.Address.toLegacyAddress(inputUtxos[0].address),
            currency.etokenSats,
        );

        // Send XEC change back from whence it came, if amount is > dust
        if (remainder.gt(new BigNumber(currency.dustSats))) {
            transactionBuilder.addOutput(
                BCH.Address.toLegacyAddress(inputUtxos[0].address),
                remainder.toNumber(),
            );
        }

        // append the token input UTXOs to the array of XEC input UTXOs for signing
        inputUtxos = inputUtxos.concat(tokenUtxosBeingBurnt);

        // Sign each UTXO being consumed and refresh transactionBuilder
        transactionBuilder = signUtxosByAddress(
            BCH,
            inputUtxos,
            wallet,
            transactionBuilder,
        );

        // build tx
        const tx = transactionBuilder.build();

        // output rawhex
        const hex = tx.toHex();

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
        chronik,
        wallet,
        utxos,
        feeInSatsPerByte,
        optionalOpReturnMsg,
        isOneToMany,
        destinationAddressAndValueArray,
        destinationAddress,
        sendAmount,
        encryptionFlag,
        airdropFlag,
        airdropTokenId,
    ) => {
        try {
            let txBuilder = new BCH.TransactionBuilder();

            // parse the input value of XECs to send
            const value = parseXecSendValue(
                isOneToMany,
                sendAmount,
                destinationAddressAndValueArray,
            );

            const satoshisToSend = fromXecToSatoshis(value);

            // Throw validation error if fromXecToSatoshis returns false
            if (!satoshisToSend) {
                const error = new Error(
                    `Invalid decimal places for send amount`,
                );
                throw error;
            }

            let encryptedEj; // serialized encryption data object

            // if the user has opted to encrypt this message
            if (encryptionFlag) {
                try {
                    // get the pub key for the recipient address
                    let recipientPubKey = await getRecipientPublicKey(
                        BCH,
                        destinationAddress,
                    );

                    // if the API can't find a pub key, it is due to the wallet having no outbound tx
                    if (recipientPubKey === 'not found') {
                        throw new Error(
                            'Cannot send an encrypted message to a wallet with no outgoing transactions',
                        );
                    }

                    // encrypt the message
                    const pubKeyBuf = Buffer.from(recipientPubKey, 'hex');
                    const bufferedFile = Buffer.from(optionalOpReturnMsg);
                    const structuredEj = await ecies.encrypt(
                        pubKeyBuf,
                        bufferedFile,
                    );

                    // Serialize the encrypted data object
                    encryptedEj = Buffer.concat([
                        structuredEj.epk,
                        structuredEj.iv,
                        structuredEj.ct,
                        structuredEj.mac,
                    ]);
                } catch (err) {
                    console.log(`sendXec() encryption error.`);
                    throw err;
                }
            }

            // Start of building the OP_RETURN output.
            // only build the OP_RETURN output if the user supplied it
            if (
                (optionalOpReturnMsg &&
                    typeof optionalOpReturnMsg !== 'undefined' &&
                    optionalOpReturnMsg.trim() !== '') ||
                airdropFlag
            ) {
                const opReturnData = generateOpReturnScript(
                    BCH,
                    optionalOpReturnMsg,
                    encryptionFlag,
                    airdropFlag,
                    airdropTokenId,
                    encryptedEj,
                );
                txBuilder.addOutput(opReturnData, 0);
            }

            // generate the tx inputs and add to txBuilder instance
            // returns the updated txBuilder, txFee, totalInputUtxoValue and inputUtxos
            let txInputObj = generateTxInput(
                BCH,
                isOneToMany,
                utxos,
                txBuilder,
                destinationAddressAndValueArray,
                satoshisToSend,
                feeInSatsPerByte,
            );

            const changeAddress = getChangeAddressFromInputUtxos(
                BCH,
                txInputObj.inputUtxos,
                wallet,
            );
            txBuilder = txInputObj.txBuilder; // update the local txBuilder with the generated tx inputs

            // generate the tx outputs and add to txBuilder instance
            // returns the updated txBuilder
            const txOutputObj = generateTxOutput(
                BCH,
                isOneToMany,
                value,
                satoshisToSend,
                txInputObj.totalInputUtxoValue,
                destinationAddress,
                destinationAddressAndValueArray,
                changeAddress,
                txInputObj.txFee,
                txBuilder,
            );
            txBuilder = txOutputObj; // update the local txBuilder with the generated tx outputs

            // sign the collated inputUtxos and build the raw tx hex
            // returns the raw tx hex string
            const rawTxHex = signAndBuildTx(
                BCH,
                txInputObj.inputUtxos,
                txBuilder,
                wallet,
            );

            // Broadcast transaction to the network via the chronik client
            // sample chronik.broadcastTx() response:
            //    {"txid":"0075130c9ecb342b5162bb1a8a870e69c935ea0c9b2353a967cda404401acf19"}
            let broadcastResponse;
            try {
                broadcastResponse = await chronik.broadcastTx(rawTxHex);
                if (!broadcastResponse) {
                    throw new Error('Empty chronik broadcast response');
                }
            } catch (err) {
                console.log('Error broadcasting tx to chronik client');
                throw err;
            }

            // return the explorer link for the broadcasted tx
            return `${currency.blockExplorerUrl}/tx/${broadcastResponse.txid}`;
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
        handleEncryptedOpReturn,
        getRecipientPublicKey,
        burnToken,
    };
}
