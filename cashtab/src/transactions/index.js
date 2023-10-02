// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as utxolib from '@bitgo/utxo-lib';
import { coinSelect } from 'ecash-coinselect';
import cashaddr from 'ecashaddrjs';

/**
 * Sign tx inputs
 * @param {object} txBuilder an initialized TransactionBuilder with inputs and outputs added
 * @param {array} accounts [...{cashAddress: <cashaddr>, wif: <wif>}]
 * @param {array} inputs [...{address: <cashaddr>, value: <number>}]
 * @throws {error} if private key is corrupted or wif is undefined
 */
export const signInputs = (txBuilder, accounts, inputs) => {
    inputs.forEach((input, index) => {
        // Select the correct signing key based on the address of the input
        const wif = accounts
            .filter(acc => acc.cashAddress === input.address)
            .pop().fundingWif;

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
 * @throws {error} dust error, balance exceeded error, coinselect errors, and node broadcast errors
 * @returns {object} {hex: <rawTxInHex>, response: {txid: <broadcastTxid>}}
 */
export const sendXec = async (chronik, wallet, targetOutputs, feeRate) => {
    // Use only eCash utxos
    const utxos = wallet.state.nonSlpUtxos;

    let { inputs, outputs } = coinSelect(utxos, targetOutputs, feeRate);

    // Initialize TransactionBuilder
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );

    for (const input of inputs) {
        txBuilder.addInput(input.outpoint.txid, input.outpoint.outIdx);
    }

    for (const output of outputs) {
        if (!output.address) {
            // Note that you may now have a change output with no specified address
            // This is expected behavior of coinSelect
            // User provides target output, coinSelect adds change output if necessary (with no address key)

            // Change address is wallet address
            output.address = wallet.Path1899.cashAddress;
        }

        // TODO add cashaddr support for eCash to txBuilder in utxo-lib
        txBuilder.addOutput(cashaddr.toLegacy(output.address), output.value);
    }

    signInputs(
        txBuilder,
        [wallet.Path245, wallet.Path145, wallet.Path1899],
        inputs,
    );

    const hex = txBuilder.build().toHex();

    // Will throw error on node failing to broadcast tx
    // e.g. 'txn-mempool-conflict (code 18)'
    const response = await chronik.broadcastTx(hex);

    return { hex, response };
};
