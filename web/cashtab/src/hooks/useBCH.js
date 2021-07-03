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
} from '@utils/cashMethods';

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

    const parseTxData = txData => {
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
        }
        ]
        */

        const parsedTxHistory = [];
        for (let i = 0; i < txData.length; i += 1) {
            const tx = txData[i];
            const parsedTx = {};
            // Move over info that does not need to be calculated
            parsedTx.txid = tx.txid;
            parsedTx.confirmations = tx.confirmations;
            parsedTx.height = tx.height;
            parsedTx.blocktime = tx.blocktime;
            let amountSent = 0;
            let amountReceived = 0;
            // Assume an incoming transaction
            let outgoingTx = false;
            let tokenTx = false;
            let destinationAddress = tx.address;

            // If vin includes tx address, this is an outgoing tx
            // Note that with bch-input data, we do not have input amounts
            for (let j = 0; j < tx.vin.length; j += 1) {
                const thisInput = tx.vin[j];
                if (thisInput.address === tx.address) {
                    // This is an outgoing transaction
                    outgoingTx = true;
                }
            }
            // Iterate over vout to find how much was sent or received
            for (let j = 0; j < tx.vout.length; j += 1) {
                const thisOutput = tx.vout[j];

                // If there is no addresses object in the output, OP_RETURN or token tx
                if (
                    !Object.keys(thisOutput.scriptPubKey).includes('addresses')
                ) {
                    // For now, assume this is a token tx
                    tokenTx = true;
                    continue;
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
            // Construct parsedTx
            parsedTx.txid = tx.txid;
            parsedTx.amountSent = amountSent;
            parsedTx.amountReceived = amountReceived;
            parsedTx.tokenTx = tokenTx;
            parsedTx.outgoingTx = outgoingTx;
            parsedTx.destinationAddress = destinationAddress;

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
        // necessary as BCH.RawTransactions.getTxData does not return address or blockheight
        const txDataWithPassThrough = await BCH.RawTransactions.getTxData(
            flatTx.txid,
        );
        txDataWithPassThrough.height = flatTx.height;
        txDataWithPassThrough.address = flatTx.address;
        return txDataWithPassThrough;
    };

    const getTxData = async (BCH, txHistory) => {
        // Flatten tx history
        let flatTxs = flattenTransactions(txHistory);

        // Build array of promises to get tx data for all 10 transactions
        let txDataPromises = [];
        for (let i = 0; i < flatTxs.length; i += 1) {
            const txDataPromise = await getTxDataWithPassThrough(
                BCH,
                flatTxs[i],
            );
            txDataPromises.push(txDataPromise);
        }

        // Get txData for the 10 most recent transactions
        let txDataPromiseResponse;
        try {
            txDataPromiseResponse = await Promise.all(txDataPromises);

            const parsed = parseTxData(txDataPromiseResponse);

            return parsed;
        } catch (err) {
            console.log(`Error in Promise.all(txDataPromises):`);
            console.log(err);
            return err;
        }
    };

    const parseTokenInfoForTxHistory = (parsedTx, tokenInfo) => {
        // Scan over inputs to find out originating addresses
        const { transactionType, sendInputsFull, sendOutputsFull } = tokenInfo;
        const sendingTokenAddresses = [];
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
                qtyReceived = qtyReceived.plus(
                    new BigNumber(sendOutputsFull[i].amount),
                );
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
        // If it's a token tx, do an API call to get token info and return it
        // If it's not a token tx, just return it
        if (!parsedTx.tokenTx) {
            return parsedTx;
        }
        const tokenData = await BCH.SLP.Utils.txDetails(parsedTx.txid);
        const { tokenInfo } = tokenData;

        parsedTx.tokenInfo = parseTokenInfoForTxHistory(parsedTx, tokenInfo);

        return parsedTx;
    };

    const addTokenTxData = async (BCH, parsedTxs) => {
        // Collect all txids for token transactions into array of promises
        // Promise.all to get their tx history
        // Add a tokeninfo object to parsedTxs for token txs
        // Get txData for the 10 most recent transactions

        // Build array of promises to get tx data for all 10 transactions
        let tokenTxDataPromises = [];
        for (let i = 0; i < parsedTxs.length; i += 1) {
            const txDataPromise = await addTokenTxDataToSingleTx(
                BCH,
                parsedTxs[i],
            );
            tokenTxDataPromises.push(txDataPromise);
        }
        let tokenTxDataPromiseResponse;
        try {
            tokenTxDataPromiseResponse = await Promise.all(tokenTxDataPromises);

            return tokenTxDataPromiseResponse;
        } catch (err) {
            console.log(`Error in Promise.all(tokenTxDataPromises):`);
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
                currency.hydrateUtxoBatchSize,
            );

            // Iterate over each utxo in this address field
            for (let j = 0; j < batchedUtxos.length; j += 1) {
                const utxoSetForThisPromise = [
                    { utxos: batchedUtxos[j], address: thisAddress },
                ];
                const thisPromise = BCH.SLP.Utils.hydrateUtxos(
                    utxoSetForThisPromise,
                );
                hydrateUtxosPromises.push(thisPromise);
            }
        }
        let hydratedUtxoDetails;

        try {
            hydratedUtxoDetails = await Promise.all(hydrateUtxosPromises);
            const flattenedBatchedHydratedUtxos = flattenBatchedHydratedUtxos(
                hydratedUtxoDetails,
            );
            return flattenedBatchedHydratedUtxos;
        } catch (err) {
            console.log(`Error in Promise.all(hydrateUtxosPromises)`);
            console.log(err);
            return err;
        }
    };

    const getSlpBalancesAndUtxos = hydratedUtxoDetails => {
        const hydratedUtxos = [];
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
        //console.log(`nullUtxos`, nullUtxos);
        if (nullUtxos.length > 0) {
            console.log(
                `${nullUtxos.length} null utxos found, ignoring results`,
            );
            throw new Error('Null utxos found, ignoring results');
        }

        // Prevent app from treating slpUtxos as nonSlpUtxos
        // Must enforce === false as api will occasionally return utxo.isValid === null
        // Do not classify utxos with 546 satoshis as nonSlpUtxos as a precaution
        // Do not classify any utxos that include token information as nonSlpUtxos
        const nonSlpUtxos = hydratedUtxos.filter(
            utxo =>
                utxo.isValid === false && utxo.value !== 546 && !utxo.tokenName,
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
                        .minus(new BigNumber(currency.dustSats))
                        .minus(new BigNumber(txFee))
                        .gte(0)
                ) {
                    break;
                }
            }

            // amount to send back to the remainder address.
            const remainder = originalAmount
                .minus(new BigNumber(currency.dustSats))
                .minus(new BigNumber(txFee));

            if (remainder.lt(0)) {
                const error = new Error(`Insufficient funds`);
                error.code = SEND_BCH_ERRORS.INSUFFICIENT_FUNDS;
                throw error;
            }

            // Generate the OP_RETURN entry for an SLP GENESIS transaction.
            const script = BCH.SLP.TokenType1.generateGenesisOpReturn(
                configObj,
            );
            // OP_RETURN needs to be the first output in the transaction.
            transactionBuilder.addOutput(script, 0);

            // add output w/ address and amount to send
            transactionBuilder.addOutput(CREATION_ADDR, currency.dustSats);

            // Send change to own address
            if (remainder.gte(new BigNumber(currency.dustSats))) {
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
        const tokenUtxos = slpBalancesAndUtxos.slpUtxos.filter(
            (utxo, index) => {
                if (
                    utxo && // UTXO is associated with a token.
                    utxo.tokenId === tokenId && // UTXO matches the token ID.
                    utxo.utxoType === 'token' // UTXO is not a minting baton.
                ) {
                    return true;
                }
                return false;
            },
        );

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
            546,
        );

        // Return any token change back to the sender.
        if (slpSendObj.outputs > 1) {
            // Change goes back to where slp utxo came from
            transactionBuilder.addOutput(
                BCH.SLP.Address.toLegacyAddress(
                    tokenUtxosBeingSpent[0].address,
                ),
                546,
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
        const remainder = originalAmount - txFee - 546 * 2;
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

    const sendBch = async (
        BCH,
        wallet,
        utxos,
        destinationAddress,
        sendAmount,
        feeInSatsPerByte,
        callbackTxId,
        encodedOpReturn,
    ) => {
        // Note: callbackTxId is a callback function that accepts a txid as its only parameter

        try {
            if (!sendAmount) {
                return null;
            }

            const value = new BigNumber(sendAmount);

            // If user is attempting to send less than minimum accepted by the backend
            if (
                value.lt(
                    new BigNumber(
                        fromSmallestDenomination(currency.dustSats).toString(),
                    ),
                )
            ) {
                // Throw the same error given by the backend attempting to broadcast such a tx
                throw new Error('dust');
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
                txFee = encodedOpReturn
                    ? calcFee(BCH, inputUtxos, 3, feeInSatsPerByte)
                    : calcFee(BCH, inputUtxos, 2, feeInSatsPerByte);

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
                isValidChangeAddress = BCH.Address.isCashAddress(
                    REMAINDER_ADDR,
                );
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

            if (encodedOpReturn) {
                transactionBuilder.addOutput(encodedOpReturn, 0);
            }

            // add output w/ address and amount to send
            transactionBuilder.addOutput(
                BCH.Address.toCashAddress(destinationAddress),
                parseInt(toSmallestDenomination(value)),
            );

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

            if (callbackTxId) {
                callbackTxId(txidStr);
            }
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
        sendBch,
        sendToken,
        createToken,
        getTokenStats,
    };
}
