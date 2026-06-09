// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';

/**
 * Open a URL in the system browser. Used for wallet-connect callbacks only —
 * not for payment flows, where exitApp() alone returns to the open dApp tab.
 */
export const openExternalUrl = async (url: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
        await AppLauncher.openUrl({ url });
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
};
