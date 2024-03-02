// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';
import cashaddr from 'ecashaddrjs';
import { toXec } from 'wallet';

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

export const getWalletBalanceFromUtxos = nonSlpUtxos => {
    const totalBalanceInSatoshis = nonSlpUtxos.reduce(
        (previousBalance, utxo) => previousBalance.plus(new BN(utxo.value)),
        new BN(0),
    );
    return {
        totalBalanceInSatoshis: totalBalanceInSatoshis.toString(),
        totalBalance: toXec(totalBalanceInSatoshis.toNumber()).toString(),
    };
};

export const getWalletState = wallet => {
    if (!wallet || !wallet.state) {
        return {
            balances: { totalBalance: 0, totalBalanceInSatoshis: 0 },
            hydratedUtxoDetails: {},
            tokens: [],
            slpUtxos: [],
            nonSlpUtxos: [],
            parsedTxHistory: [],
            utxos: [],
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

export const getHashArrayFromWallet = wallet => {
    // If the wallet has wallet.Path1899.hash160, it's migrated and will have all of them
    // Return false for an umigrated wallet
    const hash160Array =
        wallet && wallet.Path1899 && 'hash160' in wallet.Path1899
            ? [
                  wallet.Path245.hash160,
                  wallet.Path145.hash160,
                  wallet.Path1899.hash160,
              ]
            : false;
    return hash160Array;
};

export const isActiveWebsocket = ws => {
    // Return true if websocket is connected and subscribed
    // Otherwise return false
    return (
        ws !== null &&
        ws &&
        'ws' in ws &&
        'readyState' in ws.ws &&
        ws.ws.readyState === 1 &&
        'subs' in ws &&
        ws.subs.length > 0
    );
};
