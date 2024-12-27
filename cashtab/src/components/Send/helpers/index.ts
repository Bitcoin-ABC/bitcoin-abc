// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Get the total XEC amount sent in a one-to-many XEC tx
 * @param destinationAddressAndValueArray
 * Array constructed by user input of addresses and values
 * e.g. [
 *  "<address>, <value>",
 *   "<address>, <value>"
 *  ]
 * @returns total value of XEC
 */
export const sumOneToManyXec = (
    destinationAddressAndValueArray: string[],
): number => {
    return destinationAddressAndValueArray.reduce((prev, curr) => {
        return prev + parseFloat(curr.split(',')[1]);
    }, 0);
};
