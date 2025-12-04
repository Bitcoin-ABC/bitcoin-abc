// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Address } from 'ecash-lib';
import { getAddress } from './wallet';
import { webViewError } from './common';
import { Wallet } from 'ecash-wallet';

// Check the address string is a valid eCash address
export function isValidECashAddress(address: string): boolean {
    try {
        // Use Address.parse() to validate the address
        // This will throw an error if the address is invalid
        Address.parse(address);
        return true;
    } catch {
        return false;
    }
}

// Copy address to clipboard
export async function copyAddress(wallet: Wallet) {
    const address = getAddress(wallet);
    if (!address) {
        return;
    }

    try {
        await navigator.clipboard.writeText(address);
        // Address copied silently - no status message
    } catch (error) {
        webViewError('Failed to copy address:', error);
    }
}
