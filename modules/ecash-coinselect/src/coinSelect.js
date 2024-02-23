// Copyright (c) 2018 Daniel Cousens
// Copyright (c) 2023 Bitcoin ABC
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const { transactionBytes, inputBytes, outputBytes } = require('./byteCount');
const { isToken, sumValues } = require('./utils');

const BLANK_OUTPUT = outputBytes({});
const DUST_SATOSHIS = 546;

function finalize(inputs, outputs, feeRate) {
    let bytesAccum = transactionBytes(inputs, outputs);
    let feeAfterExtraOutput = Math.ceil(feeRate * (bytesAccum + BLANK_OUTPUT));
    let remainderAfterExtraOutput =
        sumValues(inputs) - (sumValues(outputs) + feeAfterExtraOutput);
    if (remainderAfterExtraOutput > DUST_SATOSHIS) {
        outputs = outputs.concat({ value: remainderAfterExtraOutput });
    }

    let fee = sumValues(inputs) - sumValues(outputs);
    return {
        inputs: inputs,
        outputs: outputs,
        fee: fee,
    };
}

/**
 * Select input utxos using accumulative algorithm
 * Convert input utxo 'value' key from string to number, the format required to construct transactions
 * Add a change output if necessary
 * @param {array} utxos [...{value: <valueAsString | valueAsNumber>}]
 * @param {array} targetOutputs [...{address: <address>, value: <valueAsNumber}]
 * @param {number} feeRate Rate in satoshis per byte. Default to the minimum, 1
 * @param {array} tokenInputs array of utxos that must be in inputs for this tx
 * @returns {object} {inputs, outputs, fee}
 */
function coinSelect(utxos, targetOutputs, feeRate = 1, tokenInputs = []) {
    if (isNaN(feeRate) || feeRate < 1) {
        throw new Error('feeRate must be a number >= 1');
    }

    // Initialize tx bytecount with bytecount of the target outputs
    let bytesAccum = transactionBytes(tokenInputs, targetOutputs);

    let outAccum = sumValues(targetOutputs);

    if (outAccum < DUST_SATOSHIS) {
        throw new Error(
            `Transaction output amount must be at least the dust threshold of ${DUST_SATOSHIS} satoshis`,
        );
    }

    let inputs = [];
    // Note for SLP v1, the token inputs can be at any index
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#send---spend-transaction
    inputs = inputs.concat(tokenInputs);
    // Make sure all value keys are number and not string
    inputs.forEach(input => {
        input.value = parseInt(input.value);
    });
    let inAccum = inputs
        .map(tokenUtxo => parseInt(tokenUtxo.value))
        .reduce((prev, curr) => prev + curr, 0);
    for (let utxo of utxos) {
        // Do not use any slp utxos not specified by tokenUtxos input param
        if (isToken(utxo)) {
            continue;
        }

        let utxoBytes = inputBytes(utxo);

        // utxo may be stored as a string
        let utxoValue = parseInt(utxo.value);

        // returned tx input stores value as a number
        utxo.value = utxoValue;

        bytesAccum += utxoBytes;
        inAccum += utxoValue;

        inputs.push(utxo);

        let fee = feeRate * bytesAccum;

        // Add another utxo?
        if (inAccum < outAccum + fee) {
            continue;
        }

        return finalize(inputs, targetOutputs, feeRate);
    }
    throw new Error('Insufficient funds');
}

module.exports = { coinSelect };
