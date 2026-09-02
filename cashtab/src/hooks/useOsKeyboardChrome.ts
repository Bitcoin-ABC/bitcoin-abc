// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { useEffect } from 'react';
import { subscribeOsKeyboardChrome } from 'components/Common/cashtabOsKeyboard';

/**
 * Hide the mobile bottom nav and drop fixed CTAs while the OS keyboard is open.
 */
export const useOsKeyboardChrome = (): void => {
    useEffect(() => subscribeOsKeyboardChrome(), []);
};
