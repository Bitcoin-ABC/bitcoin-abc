// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

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
