import {
    isValidStoredWallet,
    generateTokenTxInput,
    generateTokenTxOutput,
    signAndBuildTx,
} from 'utils/cashMethods';
import * as utxolib from '@bitgo/utxo-lib';
import { explorer } from 'config/explorer';
import appConfig from 'config/app';

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
        return `${explorer.blockExplorerUrl}/tx/${broadcastResponse.txid}`;
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
            `You need some ${appConfig.ticker} to send ${appConfig.tokenTicker}`,
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
        appConfig.defaultFee,
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
    return `${explorer.blockExplorerUrl}/tx/${broadcastResponse.txid}`;
};

export const burnToken = async (chronik, wallet, { tokenId, amount }) => {
    const { slpUtxos, nonSlpUtxos } = wallet.state;
    const CREATION_ADDR = wallet.Path1899.cashAddress;

    // Handle error of user having no XEC
    if (!nonSlpUtxos || nonSlpUtxos.length === 0) {
        throw new Error(`You need some ${appConfig.ticker} to burn eTokens`);
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
        appConfig.defaultFee,
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
    return `${explorer.blockExplorerUrl}/tx/${broadcastResponse.txid}`;
};
