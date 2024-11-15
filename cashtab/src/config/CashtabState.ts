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
import { CashtabWallet } from 'wallet';

export interface CashtabContact {
    name: string;
    address: string;
}

interface CashtabState {
    contactList: CashtabContact[];
    cashtabCache: CashtabCache;
    settings: CashtabSettings;
    wallets: CashtabWallet[];
}

class CashtabState implements CashtabState {
    constructor(
        contactList: CashtabContact[] = [],
        cashtabCache = new CashtabCache(),
        settings = new CashtabSettings(),
        wallets = [],
    ) {
        this.contactList = contactList;
        this.cashtabCache = cashtabCache;
        this.settings = settings;
        this.wallets = wallets;
    }
}

export default CashtabState;
