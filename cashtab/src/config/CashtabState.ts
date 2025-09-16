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
import { ActiveCashtabWallet, StoredCashtabWallet } from 'wallet';

export interface CashtabContact {
    name: string;
    address: string;
}

interface CashtabStateInterface {
    contactList: CashtabContact[];
    cashtabCache: CashtabCache;
    settings: CashtabSettings;
    wallets: StoredCashtabWallet[];
    activeWallet?: ActiveCashtabWallet;
}

class CashtabState implements CashtabStateInterface {
    contactList: CashtabContact[];
    cashtabCache: CashtabCache;
    settings: CashtabSettings;
    wallets: StoredCashtabWallet[];
    activeWallet?: ActiveCashtabWallet;
    constructor(
        contactList: CashtabContact[] = [],
        cashtabCache = new CashtabCache(),
        settings = new CashtabSettings(),
        wallets = [],
        activeWallet?: ActiveCashtabWallet,
    ) {
        this.contactList = contactList;
        this.cashtabCache = cashtabCache;
        this.settings = settings;
        this.wallets = wallets;
        if (typeof activeWallet !== 'undefined') {
            this.activeWallet = activeWallet;
        }
    }
}

export default CashtabState;
