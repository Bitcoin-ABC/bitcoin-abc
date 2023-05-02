import { currency } from 'components/Common/Ticker';
import {
    fromXecToSatoshis,
    isValidStoredWallet,
    parseXecSendValue,
    generateOpReturnScript,
    generateTxInput,
    generateTxOutput,
    generateTokenTxInput,
    generateTokenTxOutput,
    signAndBuildTx,
    getChangeAddressFromInputUtxos,
    toHash160,
    getMessageByteSize,
    generateAliasOpReturnScript,
    fromSatoshisToXec,
} from 'utils/cashMethods';
import ecies from 'ecies-lite';
import * as utxolib from '@bitgo/utxo-lib';

const SEND_XEC_ERRORS = {
    INSUFFICIENT_FUNDS: 0,
    NETWORK_ERROR: 1,
    INSUFFICIENT_PRIORITY: 66, // ~insufficient fee
    DOUBLE_SPENDING: 18,
    MAX_UNCONFIRMED_TXS: 64,
};

export const createToken = async (
    chronik,
    wallet,
    feeInSatsPerByte,
    configObj,
) => {
    try {
        // Throw error if wallet does not have utxo set in state
        if (!isValidStoredWallet(wallet)) {
            const walletError = new Error(`Invalid wallet`);
            throw walletError;
        }
        const utxos = wallet.state.nonSlpUtxos;
        const CREATION_ADDR = wallet.Path1899.cashAddress;
        let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
            utxolib.networks.ecash,
        );

        let tokenTxInputObj = generateTokenTxInput(
            'GENESIS',
            utxos,
            null, // total token UTXOS - not applicable for GENESIS tx
            null, // token ID - not applicable for GENESIS tx
            null, // token amount - not applicable for GENESIS tx
            feeInSatsPerByte,
            txBuilder,
        );
        // update txBuilder object with inputs
        txBuilder = tokenTxInputObj.txBuilder;

        let tokenTxOutputObj = generateTokenTxOutput(
            txBuilder,
            'GENESIS',
            CREATION_ADDR,
            null, // token UTXOS being spent - not applicable for GENESIS tx
            tokenTxInputObj.remainderXecValue,
            configObj,
        );
        // update txBuilder object with outputs
        txBuilder = tokenTxOutputObj;

        // sign the collated inputUtxos and build the raw tx hex
        // returns the raw tx hex string
        const rawTxHex = signAndBuildTx(
            tokenTxInputObj.inputXecUtxos,
            txBuilder,
            wallet,
        );

        // Broadcast transaction to the network via the chronik client
        // sample chronik.broadcastTx() response:
        //    {"txid":"0075130c9ecb342b5162bb1a8a870e69c935ea0c9b2353a967cda404401acf19"}
        let broadcastResponse;
        try {
            broadcastResponse = await chronik.broadcastTx(
                rawTxHex,
                true, // skipSlpCheck to bypass chronik safety mechanism in place to avoid accidental burns
                // if the wallet has existing burns via bch-api then chronik will throw 'invalid-slp-burns' errors without this flag
            );
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
            err.code = SEND_XEC_ERRORS.INSUFFICIENT_PRIORITY;
        } else if (err.error === 'txn-mempool-conflict (code 18)') {
            err.code = SEND_XEC_ERRORS.DOUBLE_SPENDING;
        } else if (err.error === 'Network Error') {
            err.code = SEND_XEC_ERRORS.NETWORK_ERROR;
        } else if (
            err.error ===
            'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)'
        ) {
            err.code = SEND_XEC_ERRORS.MAX_UNCONFIRMED_TXS;
        }
        console.log(`error: `, err);
        throw err;
    }
};

export const sendToken = async (
    chronik,
    wallet,
    { tokenId, amount, tokenReceiverAddress },
) => {
    const { slpUtxos, nonSlpUtxos } = wallet.state;
    const CREATION_ADDR = wallet.Path1899.cashAddress;

    // Handle error of user having no XEC
    if (!nonSlpUtxos || nonSlpUtxos.length === 0) {
        throw new Error(
            `You need some ${currency.ticker} to send ${currency.tokenTicker}`,
        );
    }

    // instance of transaction builder
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );

    let tokenTxInputObj = generateTokenTxInput(
        'SEND',
        nonSlpUtxos,
        slpUtxos,
        tokenId,
        amount,
        currency.defaultFee,
        txBuilder,
    );
    // update txBuilder object with inputs
    txBuilder = tokenTxInputObj.txBuilder;

    let tokenTxOutputObj = generateTokenTxOutput(
        txBuilder,
        'SEND',
        CREATION_ADDR,
        tokenTxInputObj.inputTokenUtxos,
        tokenTxInputObj.remainderXecValue,
        null, // token config object - for GENESIS tx only
        tokenReceiverAddress,
        amount,
    );
    // update txBuilder object with outputs
    txBuilder = tokenTxOutputObj;

    // append the token input UTXOs to the array of XEC input UTXOs for signing
    const combinedInputUtxos = tokenTxInputObj.inputXecUtxos.concat(
        tokenTxInputObj.inputTokenUtxos,
    );

    // sign the collated inputUtxos and build the raw tx hex
    // returns the raw tx hex string
    const rawTxHex = signAndBuildTx(combinedInputUtxos, txBuilder, wallet);

    // Broadcast transaction to the network via the chronik client
    // sample chronik.broadcastTx() response:
    //    {"txid":"0075130c9ecb342b5162bb1a8a870e69c935ea0c9b2353a967cda404401acf19"}
    let broadcastResponse;
    try {
        broadcastResponse = await chronik.broadcastTx(
            rawTxHex,
            true, // skipSlpCheck to bypass chronik safety mechanism in place to avoid accidental burns
            // if the wallet has existing burns via bch-api then chronik will throw 'invalid-slp-burns' errors without this flag
        );
        if (!broadcastResponse) {
            throw new Error('Empty chronik broadcast response');
        }
    } catch (err) {
        console.log('Error broadcasting tx to chronik client');
        throw err;
    }

    // return the explorer link for the broadcasted tx
    return `${currency.blockExplorerUrl}/tx/${broadcastResponse.txid}`;
};

export const burnToken = async (chronik, wallet, { tokenId, amount }) => {
    const { slpUtxos, nonSlpUtxos } = wallet.state;
    const CREATION_ADDR = wallet.Path1899.cashAddress;

    // Handle error of user having no XEC
    if (!nonSlpUtxos || nonSlpUtxos.length === 0) {
        throw new Error(`You need some ${currency.ticker} to burn eTokens`);
    }

    // instance of transaction builder
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );

    let tokenTxInputObj = generateTokenTxInput(
        'BURN',
        nonSlpUtxos,
        slpUtxos,
        tokenId,
        amount,
        currency.defaultFee,
        txBuilder,
    );
    // update txBuilder object with inputs
    txBuilder = tokenTxInputObj.txBuilder;

    let tokenTxOutputObj = generateTokenTxOutput(
        txBuilder,
        'BURN',
        CREATION_ADDR,
        tokenTxInputObj.inputTokenUtxos,
        tokenTxInputObj.remainderXecValue,
        null, // token config object - for GENESIS tx only
        null, // token receiver address - for SEND tx only
        amount,
    );
    // update txBuilder object with outputs
    txBuilder = tokenTxOutputObj;

    // append the token input UTXOs to the array of XEC input UTXOs for signing
    const combinedInputUtxos = tokenTxInputObj.inputXecUtxos.concat(
        tokenTxInputObj.inputTokenUtxos,
    );

    // sign the collated inputUtxos and build the raw tx hex
    // returns the raw tx hex string
    const rawTxHex = signAndBuildTx(combinedInputUtxos, txBuilder, wallet);

    // Broadcast transaction to the network via the chronik client
    // sample chronik.broadcastTx() response:
    //    {"txid":"0075130c9ecb342b5162bb1a8a870e69c935ea0c9b2353a967cda404401acf19"}
    let broadcastResponse;
    try {
        broadcastResponse = await chronik.broadcastTx(
            rawTxHex,
            true, // skipSlpCheck to bypass chronik safety mechanism in place to avoid accidental burns
        );
        if (!broadcastResponse) {
            throw new Error('Empty chronik broadcast response');
        }
    } catch (err) {
        console.log('Error broadcasting tx to chronik client');
        throw err;
    }

    // return the explorer link for the broadcasted tx
    return `${currency.blockExplorerUrl}/tx/${broadcastResponse.txid}`;
};

export const getRecipientPublicKey = async (
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
        recipientAddressHash160 = toHash160(recipientAddress);
    } catch (err) {
        console.log(
            `Error determining toHash160(${recipientAddress} in getRecipientPublicKey())`,
            err,
        );
        throw new Error(
            `Error determining toHash160(${recipientAddress} in getRecipientPublicKey())`,
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
        throw new Error('Error fetching tx history to parse for public key');
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

export const registerNewAlias = async (
    chronik,
    wallet,
    feeInSatsPerByte,
    aliasName,
    aliasAddress,
    registrationFeeSats,
) => {
    try {
        // Instantiate new txBuilder
        let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
            utxolib.networks.ecash,
        );

        // Create this transaction with nonSlpUtxos
        const utxos = wallet.state.nonSlpUtxos;

        // Build opReturnData for alias tx per spec
        const opReturnData = generateAliasOpReturnScript(
            aliasName,
            aliasAddress,
        );

        // Add opReturn as output with 0 satoshis of XEC spent
        txBuilder.addOutput(opReturnData, 0);

        // generate the tx inputs and add to txBuilder instance
        // returns the updated txBuilder, txFee, totalInputUtxoValue and inputUtxos
        // Note that txBuilder is intentionally modified by this call
        let txInputObj = generateTxInput(
            false, // not a one to many tx
            utxos,
            txBuilder,
            null, // no one-to-many array
            registrationFeeSats,
            feeInSatsPerByte,
        );

        // Get the change address
        const changeAddress = getChangeAddressFromInputUtxos(
            txInputObj.inputUtxos,
            wallet,
        );

        // generate the tx outputs and add to txBuilder instance
        // returns the updated txBuilder
        txBuilder = generateTxOutput(
            false, // not a one-to-many tx
            fromSatoshisToXec(registrationFeeSats), // TODO fix this oversight param req in generateTxOutput
            registrationFeeSats,
            txInputObj.totalInputUtxoValue,
            currency.aliasSettings.aliasPaymentAddress,
            null, // no one-to-many address array
            changeAddress,
            txInputObj.txFee,
            txBuilder,
        );

        // sign the collated inputUtxos and build the raw tx hex
        // returns the raw tx hex string
        const rawTxHex = signAndBuildTx(
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

        const explorerLink = `${currency.blockExplorerUrl}/tx/${broadcastResponse.txid}`;
        // return the explorer link for the broadcasted tx
        return { explorerLink, txid: broadcastResponse.txid, rawTxHex };
    } catch (err) {
        if (err.error === 'insufficient priority (code 66)') {
            err.code = SEND_XEC_ERRORS.INSUFFICIENT_PRIORITY;
        } else if (err.error === 'txn-mempool-conflict (code 18)') {
            err.code = SEND_XEC_ERRORS.DOUBLE_SPENDING;
        } else if (err.error === 'Network Error') {
            err.code = SEND_XEC_ERRORS.NETWORK_ERROR;
        } else if (
            err.error ===
            'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)'
        ) {
            err.code = SEND_XEC_ERRORS.MAX_UNCONFIRMED_TXS;
        }
        console.log(`error: `, err);
        throw err;
    }
};

export const sendXec = async (
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
        let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
            utxolib.networks.ecash,
        );

        // parse the input value of XECs to send
        const value = parseXecSendValue(
            isOneToMany,
            sendAmount,
            destinationAddressAndValueArray,
        );

        const satoshisToSend = fromXecToSatoshis(value);

        // Throw validation error if fromXecToSatoshis returns false
        if (!satoshisToSend) {
            const error = new Error(`Invalid decimal places for send amount`);
            throw error;
        }

        let encryptedEj; // serialized encryption data object

        // if the user has opted to encrypt this message
        if (encryptionFlag) {
            try {
                // get the pub key for the recipient address
                let recipientPubKey = await getRecipientPublicKey(
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
                    { compressEpk: true },
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
                optionalOpReturnMsg,
                encryptionFlag,
                airdropFlag,
                airdropTokenId,
                encryptedEj,
            );
            txBuilder.addOutput(opReturnData, 0);
        }

        let opReturnByteCount;
        if (optionalOpReturnMsg) {
            opReturnByteCount = getMessageByteSize(
                optionalOpReturnMsg,
                encryptionFlag,
                encryptedEj,
            );
        }

        // generate the tx inputs and add to txBuilder instance
        // returns the updated txBuilder, txFee, totalInputUtxoValue and inputUtxos
        let txInputObj = generateTxInput(
            isOneToMany,
            utxos,
            txBuilder,
            destinationAddressAndValueArray,
            satoshisToSend,
            feeInSatsPerByte,
            opReturnByteCount,
        );

        const changeAddress = getChangeAddressFromInputUtxos(
            txInputObj.inputUtxos,
            wallet,
        );
        txBuilder = txInputObj.txBuilder; // update the local txBuilder with the generated tx inputs

        // generate the tx outputs and add to txBuilder instance
        // returns the updated txBuilder
        const txOutputObj = generateTxOutput(
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
            err.code = SEND_XEC_ERRORS.INSUFFICIENT_PRIORITY;
        } else if (err.error === 'txn-mempool-conflict (code 18)') {
            err.code = SEND_XEC_ERRORS.DOUBLE_SPENDING;
        } else if (err.error === 'Network Error') {
            err.code = SEND_XEC_ERRORS.NETWORK_ERROR;
        } else if (
            err.error ===
            'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)'
        ) {
            err.code = SEND_XEC_ERRORS.MAX_UNCONFIRMED_TXS;
        }
        console.log(`error: `, err);
        throw err;
    }
};
