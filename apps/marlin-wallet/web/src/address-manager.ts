// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Address } from 'ecash-lib';
import { Wallet } from 'ecash-wallet';
import { webViewError } from './common';
import { config } from './config';
import { loadHdIndices, saveHdIndices } from './hd-indices-storage';

/**
 * Return the eCash address string for this wallet with the configured prefix.
 */
export function walletAddressWithPrefix(wallet: Wallet | null): string | null {
    if (!wallet || !wallet.address) {
        return null;
    }

    return Address.parse(wallet.address)
        .withPrefix(config.addressPrefix)
        .toString();
}

/** Check the address string is a valid eCash address. */
export function isValidECashAddress(address: string): boolean {
    try {
        Address.parse(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Tracks receive/subscribe/history addresses for the app.
 */
export class AddressManager {
    private ecashWallet: Wallet | null;
    private receiveIndex: number;
    private changeIndex: number;

    constructor(wallet: Wallet | null = null) {
        this.ecashWallet = wallet;
        const indices = loadHdIndices();
        this.receiveIndex = indices.receiveIndex;
        this.changeIndex = indices.changeIndex;
    }

    get wallet(): Wallet | null {
        return this.ecashWallet;
    }

    /** Last used receive address index (next index to derive on receive). */
    getReceiveIndex(): number {
        return this.receiveIndex;
    }

    /** Last used change address index (next index to derive on change). */
    getChangeIndex(): number {
        return this.changeIndex;
    }

    /**
     * Persist the receive address index. Updates memory only after a successful
     * save.
     *
     * The non-negative integer check is defensive only: callers should pass
     * indices from ecash-wallet / discovery, which are always valid. Invalid
     * values must never occur in normal operation.
     */
    setReceiveIndex(receiveIndex: number): void {
        if (!Number.isInteger(receiveIndex) || receiveIndex < 0) {
            throw new Error('HD indices must be non-negative integers');
        }
        saveHdIndices({
            receiveIndex,
            changeIndex: this.changeIndex,
        });
        this.receiveIndex = receiveIndex;
    }

    /**
     * Persist the change address index. Updates memory only after a successful
     * save.
     *
     * The non-negative integer check is defensive only: callers should pass
     * indices from ecash-wallet / discovery, which are always valid. Invalid
     * values must never occur in normal operation.
     */
    setChangeIndex(changeIndex: number): void {
        if (!Number.isInteger(changeIndex) || changeIndex < 0) {
            throw new Error('HD indices must be non-negative integers');
        }
        saveHdIndices({
            receiveIndex: this.receiveIndex,
            changeIndex,
        });
        this.changeIndex = changeIndex;
    }

    updateWallet(wallet: Wallet | null): void {
        this.ecashWallet = wallet;
    }

    /** Address shown on the main screen, QR code, and watch companion. */
    getCurrentReceiveAddress(): string | null {
        return walletAddressWithPrefix(this.ecashWallet);
    }

    /** Addresses to subscribe to on the Chronik WebSocket. */
    getSubscribeAddresses(): string[] {
        const address = this.getCurrentReceiveAddress();
        if (!address) {
            return [];
        }
        return [address];
    }

    /** Addresses to query when loading transaction history. */
    getHistoryAddresses(): string[] {
        const address = this.getCurrentReceiveAddress();
        if (!address) {
            return [];
        }
        return [address];
    }

    /** Copy the current receive address to the clipboard. */
    async copyReceiveAddress(): Promise<void> {
        const address = this.getCurrentReceiveAddress();
        if (!address) {
            return;
        }

        try {
            await navigator.clipboard.writeText(address);
        } catch (error) {
            webViewError('Failed to copy address:', error);
        }
    }
}
