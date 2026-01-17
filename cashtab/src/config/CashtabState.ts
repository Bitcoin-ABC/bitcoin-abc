// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * cashtabState.js
 * cashtabState should be a class, so that we can ensure the default cashtabState
 * is always a new one
 */

import CashtabSettings from 'config/CashtabSettings';
import CashtabCache from 'config/CashtabCache';
import { StoredCashtabWallet } from 'wallet';

export interface CashtabContact {
    name: string;
    address: string;
}

interface CashtabStateInterface {
    contactList: CashtabContact[];
    cashtabCache: CashtabCache;
    settings: CashtabSettings;
    wallets: StoredCashtabWallet[];
    /**
     * Address of the currently active wallet
     * When this changes, ecashWallet is automatically reinitialized with the sk from the wallet with this address
     */
    activeWalletAddress: string | null;
    /**
     * Map of tokenId => decimalized balance string for the active wallet
     * Generated from ecashWallet.utxos and cached token info
     */
    tokens: Map<string, string>;
}

class CashtabState implements CashtabStateInterface {
    contactList: CashtabContact[];
    cashtabCache: CashtabCache;
    settings: CashtabSettings;
    wallets: StoredCashtabWallet[];
    activeWalletAddress: string | null;
    tokens: Map<string, string>;
    constructor(
        contactList: CashtabContact[] = [],
        cashtabCache = new CashtabCache(),
        settings = new CashtabSettings(),
        wallets = [],
        activeWalletAddress: string | null = null,
        tokens: Map<string, string> = new Map(),
    ) {
        this.contactList = contactList;
        this.cashtabCache = cashtabCache;
        this.settings = settings;
        this.wallets = wallets;
        this.activeWalletAddress = activeWalletAddress;
        this.tokens = tokens;
    }
}

export default CashtabState;
