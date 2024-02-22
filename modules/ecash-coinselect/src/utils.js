// Copyright (c) 2018 Daniel Cousens
// Copyright (c) 2023 Bitcoin ABC
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');

/**
 * Is this given utxo for an slp token
 * @param {object} utxo utxo object, must have at least a value key, e.g. {value: <value>}
 * @returns {bool} true if this utxo is a valid SLP utxo
 */
function isToken(utxo) {
    return (
        // NNG chronik-client
        typeof utxo.slpToken !== 'undefined' ||
        // in-node chronik-client
        typeof utxo.token !== 'undefined'
    );
}

/**
 * Sum total values of
 * @param {array} utxos [...{value: <valueAsString | valueAsInteger>}]
 * @returns {number}
 */
function sumValues(utxos) {
    return utxos.reduce((accumulator, currentValue) => {
        const valueAsInteger = parseInt(currentValue.value);
        assert(
            !isNaN(valueAsInteger),
            `Input must be an object with 'value' as a key and an integer representing the amount in satoshis as a value`,
        );
        return accumulator + valueAsInteger;
    }, 0);
}

/**
 * @param {string} hexString
 * @returns {bool} true if string contains only characters 0-9 or a-f, case insensitive
 */
function isHexString(hexString) {
    return /^[\da-f]+$/i.test(hexString);
}

module.exports = { isToken, sumValues, isHexString };
