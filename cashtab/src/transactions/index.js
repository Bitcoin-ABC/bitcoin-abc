// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as utxolib from '@bitgo/utxo-lib';
import { coinSelect } from 'ecash-coinselect';
import cashaddr from 'ecashaddrjs';
import { isValidMultiSendUserInput } from 'validation';
import { toSatoshis } from 'wallet';

/**
 * Sign tx inputs
 * @param {object} txBuilder an initialized TransactionBuilder with inputs and outputs added
 * @param {array} paths paths key of a cashtab wallet
 * @param {array} inputs [...{address: <cashaddr>, value: <number>}]
 * @throws {error} if private key is corrupted or wif is undefined
 */
export const signInputs = (txBuilder, paths, inputs) => {
    inputs.forEach((input, index) => {
        // Select the correct signing key based on the address of the input
        const wif = paths.get(input.path).wif;

        // TODO store this in wallet instead of generating it every time you sign a tx
        const utxoECPair = utxolib.ECPair.fromWIF(wif, utxolib.networks.ecash);

        // Specify hash type
        // TODO fix this in utxo-lib
        const hashTypes = {
            SIGHASH_ALL: 0x01,
            SIGHASH_FORKID: 0x40,
        };

        // Sign this input
        txBuilder.sign(
            index, // vin
            utxoECPair, // keyPair
            undefined, // redeemScript
            hashTypes.SIGHASH_ALL | hashTypes.SIGHASH_FORKID, // hashType
            input.value, // value
        );
    });
};

/**
 * Create and broadcast a standard eCash tx, i.e. from Cashtab to a p2pkh or p2sh destination address
 * No OP_RETURN, no etokens, one destination address
 * @param {object} chronik initialized instance of chronik-client
 * @param {object} wallet Cashtab object that stores wallet information, see hooks/useWallet.js
 * @param {array} targetOutputs Array of objects containing keys for value and address, e.g. [{value: <satsToSend>, address: <destinationAddress>}]
 * @param {number} feeRate satoshis per byte
 * @param {number} chaintipBlockheight the current chaintip blockheight
 * @param {array} tokenInputs required token utxo inputs for a token tx
 * @param {boolean} isBurn default to false. if true, chronik will skip slp burn checks before broadcast.
 * @throws {error} dust error, balance exceeded error, coinselect errors, and node broadcast errors
 * @returns {object} {hex: <rawTxInHex>, response: {txid: <broadcastTxid>}}
 */
export const sendXec = async (
    chronik,
    wallet,
    targetOutputs,
    feeRate,
    chaintipBlockheight,
    tokenInputs = [],
    isBurn = false,
) => {
    // Use only eCash utxos
    const utxos = wallet.state.nonSlpUtxos;

    // Ignore immature coinbase utxos
    const spendableUtxos = ignoreUnspendableUtxos(utxos, chaintipBlockheight);

    let { inputs, outputs } = coinSelect(
        spendableUtxos,
        targetOutputs,
        feeRate,
        tokenInputs,
    );

    // Initialize TransactionBuilder
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );

    for (const input of inputs) {
        txBuilder.addInput(input.outpoint.txid, input.outpoint.outIdx);
    }

    for (const output of outputs) {
        let isOpReturn = 'script' in output;
        let isChange = !isOpReturn && !('address' in output);
        if (isChange) {
            // Note that you may now have a change output with no specified address
            // This is expected behavior of coinSelect
            // User provides target output, coinSelect adds change output if necessary (with no address key)

            // Change address is wallet address
            // Use Path1899 address as change address
            output.address = wallet.paths.get(1899).address;
        }

        // TODO add cashaddr support for eCash to txBuilder in utxo-lib
        txBuilder.addOutput(
            isOpReturn ? output.script : cashaddr.toLegacy(output.address),
            output.value,
        );
    }

    signInputs(txBuilder, wallet.paths, inputs);

    const hex = txBuilder.build().toHex();

    // Will throw error on node failing to broadcast tx
    // e.g. 'txn-mempool-conflict (code 18)'
    const response = await chronik.broadcastTx(hex, isBurn);

    return { hex, response };
};

/**
 * Get desired target outputs from validated user input for eCash multi-send tx in Cashtab
 * @param {string} userMultisendInput formData.address from Send.js screen, validated for multi-send
 * @throws {error} on invalid input
 * @returns {array} targetOutputs for the sendXec function
 */
export const getMultisendTargetOutputs = userMultisendInput => {
    if (isValidMultiSendUserInput(userMultisendInput) !== true) {
        throw new Error('Invalid input for Cashtab multisend tx');
    }

    // User input is validated as a string of
    // address, value\naddress, value\naddress, value\n
    const addressValueArray = userMultisendInput.split('\n');

    const targetOutputs = [];
    for (let addressValueCsvPair of addressValueArray) {
        const addressValueLineArray = addressValueCsvPair.split(',');
        const valueXec = parseFloat(addressValueLineArray[1].trim());
        // targetOutputs expects satoshis at value key
        const valueSats = toSatoshis(valueXec);
        targetOutputs.push({
            address: addressValueLineArray[0].trim(),
            value: valueSats,
        });
    }
    return targetOutputs;
};

/**
 * Ignore coinbase utxos that do not have enough confirmations to be spendable
 * TODO cache blockheight so you can ignore only unspendable coinbase utxos
 * @param {array} unfilteredUtxos an array of chronik utxo objects
 * @returns {array} an array of utxos without coinbase utxos
 */
export const ignoreUnspendableUtxos = (
    unfilteredUtxos,
    chaintipBlockheight,
) => {
    const COINBASE_REQUIRED_CONFS_TO_SPEND = 100;
    return unfilteredUtxos.filter(unfilteredUtxo => {
        return (
            unfilteredUtxo.isCoinbase === false ||
            (unfilteredUtxo.isCoinbase === true &&
                chaintipBlockheight >=
                    unfilteredUtxo.blockHeight +
                        COINBASE_REQUIRED_CONFS_TO_SPEND)
        );
    });
};
