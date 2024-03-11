// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';
import * as bip39 from 'bip39';
import * as randomBytes from 'randombytes';
import * as utxolib from '@bitgo/utxo-lib';
import cashaddr from 'ecashaddrjs';
import appConfig from 'config/app';

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
 * @param {number[]} additionalPaths array of paths in addition to 1899 to add to this wallet
 * Default to 1899-only for all new wallets
 * Accept an array, in case we are migrating a wallet with legacy paths 145, 245, or both 145 and 245
 */
export const createCashtabWallet = async (mnemonic, additionalPaths = []) => {
    // Initialize wallet with empty state
    const wallet = {
        state: {
            balanceSats: 0,
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: [],
            parsedTxHistory: [],
        },
    };

    // Set wallet mnemonic
    wallet.mnemonic = mnemonic;

    const rootSeedBuffer = await bip39.mnemonicToSeed(mnemonic, '');

    const masterHDNode = utxolib.bip32.fromSeed(
        rootSeedBuffer,
        utxolib.networks.ecash,
    );

    // wallet.paths is an array
    // For all newly-created wallets, we only support Path 1899
    // We would support only Path 1899, but Cashtab must continue to support legacy paths 145 and 245
    // Maybe someday we will support multi-path, so the array could help

    // We always derive path 1899
    const pathsToDerive = [appConfig.derivationPath, ...additionalPaths];

    wallet.paths = [];
    for (const path of pathsToDerive) {
        const pathInfo = getPathInfo(masterHDNode, path);
        if (path === appConfig.derivationPath) {
            // Initialize wallet name with first 5 chars of Path1899 address
            wallet.name = pathInfo.address.slice(6, 11);
        }
        wallet.paths.push(pathInfo);
    }

    return wallet;
};

/**
 * Get address, hash, and wif for a given derivation path
 *
 * @param {utxolib.bip32Interface} masterHDNode calculated from utxolib
 * @param {number} abbreviatedDerivationPath in practice: 145, 245, or 1899
 * @returns {object} {path, hash, address, wif}
 */
const getPathInfo = (masterHDNode, abbreviatedDerivationPath) => {
    const fullDerivationPath = `m/44'/${abbreviatedDerivationPath}'/0'/0/0`;
    const node = masterHDNode.derivePath(fullDerivationPath);
    const address = cashaddr.encode('ecash', 'P2PKH', node.identifier);
    const { hash } = cashaddr.decode(address, true);

    return {
        path: abbreviatedDerivationPath,
        hash,
        address,
        wif: node.toWIF(),
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

/**
 * Determine if a legacy wallet includes legacy paths that must be migrated
 * @param {object} wallet a cashtab wallet
 * @returns {number[]} array of legacy paths
 */
export const getLegacyPaths = wallet => {
    const legacyPaths = [];
    if ('paths' in wallet) {
        // If we are migrating a wallet created after version 2.2.0 that includes more paths than 1899
        for (const path of wallet.paths) {
            if (path.path !== 1899) {
                // Path 1899 will be added by default, it is not an 'extra' path
                legacyPaths.push(path.path);
            }
        }
    }
    if ('Path145' in wallet) {
        // Wallet created before version 2.2.0 that includes Path145
        legacyPaths.push(145);
    }
    if ('Path245' in wallet) {
        // Wallet created before version 2.2.0 that includes Path145
        legacyPaths.push(245);
    }
    return legacyPaths;
};
