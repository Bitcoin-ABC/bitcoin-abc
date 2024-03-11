// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';
import * as bip39 from 'bip39';
import * as randomBytes from 'randombytes';
import * as utxolib from '@bitgo/utxo-lib';
import cashaddr from 'ecashaddrjs';

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

/**
 * Create a Cashtab wallet object from a valid bip39 mnemonic
 * @param {string} mnemonic a valid bip39 mnemonic
 */
export const createCashtabWallet = async mnemonic => {
    // Initialize wallet with empty state
    const wallet = {
        state: {
            balances: {},
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: [],
            parsedTxHistory: [],
        },
    };
    wallet.mnemonic = mnemonic;

    const rootSeedBuffer = await bip39.mnemonicToSeed(mnemonic, '');

    const masterHDNode = utxolib.bip32.fromSeed(
        rootSeedBuffer,
        utxolib.networks.ecash,
    );

    // TODO if we have multiple paths, should be in an array at key paths, or a map
    wallet.Path145 = deriveAccount(masterHDNode, "m/44'/145'/0'/0/0");
    wallet.Path245 = deriveAccount(masterHDNode, "m/44'/245'/0'/0/0");
    wallet.Path1899 = deriveAccount(masterHDNode, "m/44'/1899'/0'/0/0");

    // Initialize name with first 5 chars of Path1899 address
    wallet.name = wallet.Path1899.cashAddress.slice(6, 11);
    return wallet;
};

/**
 * Get PathXXX key for a Cashtab Wallet
 *
 * TODO cashtab wallets should use one path or store paths at an array, not separate keys
 *
 * @param {utxolib.bip32Interface} masterHDNode calculated from utxolib
 * @param {string} path
 * @returns {object} {publicKey, hash160, cashAddress, fundingWif}
 */
const deriveAccount = (masterHDNode, path) => {
    const node = masterHDNode.derivePath(path);
    const publicKey = node.publicKey.toString('hex');
    const cashAddress = cashaddr.encode('ecash', 'P2PKH', node.identifier);
    const { hash } = cashaddr.decode(cashAddress, true);

    return {
        publicKey,
        hash160: hash,
        cashAddress,
        fundingWif: node.toWIF(),
    };
};

/**
 * Generate a mnemonic using the bip39 library
 * This function is a conenvience wrapper for a long lib method
 */
export const generateMnemonic = () => {
    const mnemonic = bip39.generateMnemonic(
        128,
        randomBytes,
        bip39.wordlists['english'],
    );
    return mnemonic;
};

/**
 * Convert user input send amount to satoshis
 * @param {string | number} sendAmountFiat User input amount of fiat currency to send.
 * Input from an amount field is of type number. If we extend fiat send support to bip21 or
 * webapp txs, we should also handle string inputs
 * @param {number} fiatPrice Price of XEC in units of selectedCurrency / XEC
 * @return {Integer} satoshis value equivalent to this sendAmountFiat at exchange rate fiatPrice
 */
export const fiatToSatoshis = (sendAmountFiat, fiatPrice) => {
    return Math.floor((Number(sendAmountFiat) / fiatPrice) * SATOSHIS_PER_XEC);
};
