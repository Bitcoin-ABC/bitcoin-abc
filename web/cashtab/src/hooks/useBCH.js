import BigNumber from 'bignumber.js';
import { currency } from 'components/Common/Ticker';
import SlpWallet from 'minimal-slp-wallet';
import {
    fromXecToSatoshis,
    isValidStoredWallet,
    parseXecSendValue,
    generateOpReturnScript,
    generateTxInput,
    generateTxOutput,
    signAndBuildTx,
    getChangeAddressFromInputUtxos,
    signUtxosByAddress,
} from 'utils/cashMethods';
import ecies from 'ecies-lite';

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

    const getRecipientPublicKey = async (
        BCH,
        chronik,
        recipientAddress,
        optionalMockPubKeyResponse = false,
    ) => {
        // Necessary because jest can't mock
        // chronikTxHistoryAtAddress = await chronik.script('p2pkh', recipientAddressHash160).history(/*page=*/ 0, /*page_size=*/ 10);
        if (optionalMockPubKeyResponse) {
            return optionalMockPubKeyResponse;
        }

        // get hash160 of address
        let recipientAddressHash160;
        try {
            recipientAddressHash160 = BCH.Address.toHash160(recipientAddress);
        } catch (err) {
            console.log(
                `Error determining BCH.Address.toHash160(${recipientAddress} in getRecipientPublicKey())`,
                err,
            );
            throw new Error(
                `Error determining BCH.Address.toHash160(${recipientAddress} in getRecipientPublicKey())`,
            );
        }

        let chronikTxHistoryAtAddress;
        try {
            // Get 20 txs. If no outgoing txs in those 20 txs, just don't send the tx
            chronikTxHistoryAtAddress = await chronik
                .script('p2pkh', recipientAddressHash160)
                .history(/*page=*/ 0, /*page_size=*/ 20);
        } catch (err) {
            console.log(
                `Error getting await chronik.script('p2pkh', ${recipientAddressHash160}).history();`,
                err,
            );
            throw new Error(
                'Error fetching tx history to parse for public key',
            );
        }
        let recipientPubKeyChronik;

        // Iterate over tx history to find an outgoing tx
        for (let i = 0; i < chronikTxHistoryAtAddress.txs.length; i += 1) {
            const { inputs } = chronikTxHistoryAtAddress.txs[i];
            for (let j = 0; j < inputs.length; j += 1) {
                const thisInput = inputs[j];
                const thisInputSendingHash160 = thisInput.outputScript;
                if (thisInputSendingHash160.includes(recipientAddressHash160)) {
                    // Then this is an outgoing tx, you can get the public key from this tx
                    // Get the public key
                    try {
                        recipientPubKeyChronik =
                            chronikTxHistoryAtAddress.txs[i].inputs[
                                j
                            ].inputScript.slice(-66);
                    } catch (err) {
                        throw new Error(
                            'Cannot send an encrypted message to a wallet with no outgoing transactions',
                        );
                    }
                    return recipientPubKeyChronik;
                }
            }
        }
        // You get here if you find no outgoing txs in the chronik tx history
        throw new Error(
            'Cannot send an encrypted message to a wallet with no outgoing transactions in the last 20 txs',
        );
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
        optionalMockPubKeyResponse = false,
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
                        chronik,
                        destinationAddress,
                        optionalMockPubKeyResponse,
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
        getRestUrl,
        sendXec,
        sendToken,
        createToken,
        getRecipientPublicKey,
        burnToken,
    };
}
