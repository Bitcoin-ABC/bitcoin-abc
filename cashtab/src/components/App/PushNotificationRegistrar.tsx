// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useContext, useEffect, useRef } from 'react';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import {
    initWebPushForegroundListener,
    isPushNotificationsSupported,
    registerPushNotifications,
} from 'services/pushNotificationService';

/**
 * Registers push notifications when enabled and the active wallet is ready
 * (Android via Capacitor Firebase Messaging; web via FCM + service worker).
 */
const PushNotificationRegistrar: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    const lastRegisteredAddressRef = useRef<string | null>(null);

    const cashtabLoaded =
        isWalletContextLoaded(ContextValue) && ContextValue.cashtabLoaded;
    const pushNotificationsEnabled =
        isWalletContextLoaded(ContextValue) &&
        ContextValue.cashtabState.settings.pushNotificationsEnabled;
    const activeAddress =
        isWalletContextLoaded(ContextValue) && ContextValue.ecashWallet !== null
            ? ContextValue.ecashWallet.address
            : null;
    const secretKey =
        isWalletContextLoaded(ContextValue) && ContextValue.ecashWallet !== null
            ? ContextValue.ecashWallet.sk
            : null;

    useEffect(() => {
        if (
            !cashtabLoaded ||
            !pushNotificationsEnabled ||
            !isPushNotificationsSupported()
        ) {
            lastRegisteredAddressRef.current = null;
            return;
        }

        void initWebPushForegroundListener();

        if (!activeAddress || !secretKey) {
            lastRegisteredAddressRef.current = null;
            return;
        }

        if (lastRegisteredAddressRef.current === activeAddress) {
            return;
        }

        lastRegisteredAddressRef.current = activeAddress;
        void registerPushNotifications(activeAddress, secretKey);
    }, [cashtabLoaded, pushNotificationsEnabled, activeAddress, secretKey]);

    return null;
};

export default PushNotificationRegistrar;
