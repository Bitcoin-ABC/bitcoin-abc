// Copyright (c) 2018 Daniel Cousens
// Copyright (c) 2023 Bitcoin ABC
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const { isHexString } = require('./utils');

// NB -- "baseline" here is from bitcoinjs coinselect, https://github.com/bitcoinjs/coinselect/blob/master/utils.js
// baseline estimates, used to improve performance
const TX_EMPTY_SIZE = 4 + 1 + 1 + 4;
const TX_INPUT_BASE = 32 + 4 + 1 + 4;
const TX_INPUT_PUBKEYHASH = 107;
const TX_OUTPUT_BASE = 8 + 1;
const TX_OUTPUT_PUBKEYHASH = 25;

/**
 * Estimate byteCount of input
 * @param {object} input utxo object, at minimum must have {value: <string | number>} key
 * input may have script key. script may be a Buffer or a hex string.
 * @returns {number} estimated size in bytes of a transaction input of this utxo
 * @throws {error} if script is specified but is not a Buffer or a hexadecimal string
 */
function inputBytes(input) {
    const { script } = input;
    switch (typeof script) {
        case 'undefined':
            // No script key in this utxo, i.e. it will be p2pkh or p2sh
            return TX_INPUT_BASE + TX_INPUT_PUBKEYHASH;
        case 'string':
            // Parse string script as hex bytes
            if (isHexString(script)) {
                return TX_INPUT_BASE + script.length / 2;
            }
        // falls through
        case 'object':
            if (ArrayBuffer.isView(script)) {
                // Note: ArrayBuffer.isView(script) returns true for a Buffer
                // Some transaction building libraries require buffer type
                return TX_INPUT_BASE + script.length;
            }
        // falls through
        default:
            throw new Error('Unrecognized script type');
    }
}

/**
 * Estimate byteCount of output
 * @param {object} output output object, at minimum must have {value: <number>} key
 * output may have script key. script may be a Buffer or a hex string.
 * @returns {number} estimated size in bytes of this transaction output
 * @throws {error} if script is specified but is not a Buffer or a hexadecimal string
 */
function outputBytes(output) {
    const { script } = output;
    switch (typeof script) {
        case 'undefined':
            // No script key in this utxo, i.e. it will be p2pkh or p2sh
            return TX_OUTPUT_BASE + TX_OUTPUT_PUBKEYHASH;
        case 'string':
            // Parse string script as hex bytes
            if (isHexString(script)) {
                return TX_OUTPUT_BASE + script.length / 2;
            }
        // falls through
        case 'object':
            if (ArrayBuffer.isView(script)) {
                // Note: ArrayBuffer.isView(script) returns true for a Buffer
                // Some transaction building libraries require buffer type
                return TX_OUTPUT_BASE + script.length;
            }
        // falls through
        default:
            throw new Error('Unrecognized script type');
    }
}

/**
 * Estimate byteCount of a transaction given its inputs and outputs
 * @param {array} inputs
 * @param {array} outputs
 * @returns {number}
 * @throws {error} if inputs or outputs contain unrecognized script key
 */
function transactionBytes(inputs, outputs) {
    return (
        TX_EMPTY_SIZE +
        inputs.reduce(function (a, x) {
            return a + inputBytes(x);
        }, 0) +
        outputs.reduce(function (a, x) {
            return a + outputBytes(x);
        }, 0)
    );
}

module.exports = {
    inputBytes,
    outputBytes,
    transactionBytes,
};
