// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import cashaddr from 'ecashaddrjs';

/**
 * Get the total XEC amount sent in a one-to-many XEC tx
 * @param {array} destinationAddressAndValueArray
 * Array constructed by user input of addresses and values
 * e.g. [
 *  "<address>, <value>",
 *   "<address>, <value>"
 *  ]
 * @returns {number} total value of XEC
 */
export const sumOneToManyXec = destinationAddressAndValueArray => {
    return destinationAddressAndValueArray.reduce((prev, curr) => {
        return parseFloat(prev) + parseFloat(curr.split(',')[1]);
    }, 0);
};

export const getWalletState = wallet => {
    if (!wallet || !wallet.state) {
        return {
            balanceSats: 0,
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: [],
            parsedTxHistory: [],
        };
    }

    return wallet.state;
};

export function convertEtokenToEcashAddr(eTokenAddress) {
    if (!eTokenAddress) {
        return new Error(
            `cashMethods.convertToEcashAddr() error: No etoken address provided`,
        );
    }

    // Confirm input is a valid eToken address
    const isValidInput = cashaddr.isValidCashAddress(eTokenAddress, 'etoken');
    if (!isValidInput) {
        return new Error(
            `cashMethods.convertToEcashAddr() error: ${eTokenAddress} is not a valid etoken address`,
        );
    }

    // Check for etoken: prefix
    const isPrefixedEtokenAddress = eTokenAddress.slice(0, 7) === 'etoken:';

    // If no prefix, assume it is checksummed for an etoken: prefix
    const testedEtokenAddr = isPrefixedEtokenAddress
        ? eTokenAddress
        : `etoken:${eTokenAddress}`;

    let ecashAddress;
    try {
        const { type, hash } = cashaddr.decode(testedEtokenAddr);
        ecashAddress = cashaddr.encode('ecash', type, hash);
    } catch (err) {
        return err;
    }

    return ecashAddress;
}

export function convertToEcashPrefix(bitcoincashPrefixedAddress) {
    // Prefix-less addresses may be valid, but the cashaddr.decode function used below
    // will throw an error without a prefix. Hence, must ensure prefix to use that function.
    const hasPrefix = bitcoincashPrefixedAddress.includes(':');
    if (hasPrefix) {
        // Is it bitcoincash: or simpleledger:
        const { type, hash, prefix } = cashaddr.decode(
            bitcoincashPrefixedAddress,
        );

        let newPrefix;
        if (prefix === 'bitcoincash') {
            newPrefix = 'ecash';
        } else if (prefix === 'simpleledger') {
            newPrefix = 'etoken';
        } else {
            return bitcoincashPrefixedAddress;
        }

        const convertedAddress = cashaddr.encode(newPrefix, type, hash);

        return convertedAddress;
    } else {
        return bitcoincashPrefixedAddress;
    }
}

export function convertEcashtoEtokenAddr(eCashAddress) {
    const isValidInput = cashaddr.isValidCashAddress(eCashAddress, 'ecash');
    if (!isValidInput) {
        return new Error(`${eCashAddress} is not a valid ecash address`);
    }

    // Check for ecash: prefix
    const isPrefixedEcashAddress = eCashAddress.slice(0, 6) === 'ecash:';

    // If no prefix, assume it is checksummed for an ecash: prefix
    const testedEcashAddr = isPrefixedEcashAddress
        ? eCashAddress
        : `ecash:${eCashAddress}`;

    let eTokenAddress;
    try {
        const { type, hash } = cashaddr.decode(testedEcashAddr);
        eTokenAddress = cashaddr.encode('etoken', type, hash);
    } catch (err) {
        return new Error('eCash to eToken address conversion error');
    }
    return eTokenAddress;
}

/**
 * Get hash values to use for chronik calls
 * @param {object} wallet valid cashtab wallet
 * @returns {string[]} array of hashes of all addresses in wallet
 */
export const getHashArrayFromWallet = wallet => {
    const hashArray = [];
    for (const path of wallet.paths) {
        hashArray.push(path.hash);
    }
    return hashArray;
};
