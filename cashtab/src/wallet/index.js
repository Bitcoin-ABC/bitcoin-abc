// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';

const SATOSHIS_PER_XEC = 100;

/**
 * Get total value of satoshis associated with an array of chronik utxos
 * @param {array} nonSlpUtxos array of chronik utxos
 * (each is an object with an integer as a string
 * stored at 'value' key representing associated satoshis)
 * e.g. {value: '12345'}
 * @throws {error} if nonSlpUtxos does not have a .reduce method
 * @returns {number | NaN} integer, total balance of input utxos in satoshis
 * or NaN if any utxo is invalid
 */
export const getBalanceSats = nonSlpUtxos => {
    return nonSlpUtxos.reduce(
        (previousBalance, utxo) => previousBalance + parseInt(utxo.value),
        0,
    );
};

/**
 * Convert an amount in XEC to satoshis
 * @param {Number} xecAmount a number with no more than 2 decimal places
 * @returns {Integer}
 */
export const toSatoshis = xecAmount => {
    const satoshis = new BN(xecAmount).times(SATOSHIS_PER_XEC).toNumber();
    if (!Number.isInteger(satoshis)) {
        throw new Error(
            'Result not an integer. Check input for valid XEC amount.',
        );
    }
    return satoshis;
};

/**
 * Convert an amount in satoshis to XEC
 * @param {Integer} satoshis
 * @returns {Number}
 */
export const toXec = satoshis => {
    if (!Number.isInteger(satoshis)) {
        throw new Error('Input param satoshis must be an integer');
    }
    return new BN(satoshis).div(SATOSHIS_PER_XEC).toNumber();
};

/**
 * Determine if a given wallet has enough of a certain token to unlock a feature
 * @param {object} tokens decimalized balance summary tokens reference from wallet.state
 * @param {string} tokenId tokenId of the token we are checking
 * @param {string} tokenQty quantity of the token required for unlock, decimalized string
 */
export const hasEnoughToken = (tokens, tokenId, tokenQty) => {
    // Filter for tokenId
    const thisToken = tokens.filter(token => token.tokenId === tokenId);
    // Confirm we have this token at all
    if (thisToken.length === 0) {
        return false;
    }
    return new BN(thisToken[0].balance).gte(tokenQty);
};
