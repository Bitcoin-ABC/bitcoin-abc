// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { decodeCashAddress } from 'ecashaddrjs';
import { Wallet } from 'ecash-wallet';

/**
 * Address shown for receiving / QR / header copy.
 * HD: next unused receive (`receiveIndex`). Non-HD: the single address.
 * Peek only — does not advance indices.
 */
export const getCurrentReceiveAddress = (wallet: Wallet): string => {
    if (!wallet.isHD) {
        return wallet.address;
    }
    return wallet.getReceiveAddress(wallet.receiveIndex);
};

/**
 * Addresses at or below the current receive/change indices for Chronik
 * websocket subscription and multi-hash parseTx.
 * Peek only — does not advance indices.
 */
export const getWalletAddressesForSubscription = (wallet: Wallet): string[] => {
    if (!wallet.isHD) {
        return [wallet.address];
    }
    const addresses: string[] = [];
    for (let i = 0; i <= wallet.receiveIndex; i++) {
        addresses.push(wallet.getReceiveAddress(i));
    }
    for (let i = 0; i <= wallet.changeIndex; i++) {
        addresses.push(wallet.getChangeAddress(i));
    }
    return addresses;
};

/**
 * Hash160 payloads (hex) for every address we subscribe to / own.
 * Used by parseTx so send/receive classification covers change addresses.
 */
export const getWalletHashesForParseTx = (wallet: Wallet): string[] => {
    return getWalletAddressesForSubscription(wallet).map(address => {
        const { hash } = decodeCashAddress(address);
        return hash;
    });
};
