// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { useEffect } from 'react';
import appConfig from 'config/app';
import { toast } from 'react-toastify';
import { isMobile } from 'helpers';

interface ExtendedWindow {
    bitcoinAbc?: 'cashtab';
}

/**
 * Functional logic specific to the webapp at cashtab.com
 * i.e. stuff that should not be built with the browser extension
 */
const WebApp = () => {
    /*
    See https://web.dev/push-notifications-subscribing-a-user/
    note that Safari still uses callback syntax, hence this method which handles both syntaxes
    https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission
    */
    const askPermissionForNotifications = () => {
        return new Promise(function (resolve, reject) {
            const permissionResult = Notification.requestPermission(function (
                result,
            ) {
                resolve(result);
            });

            if (permissionResult) {
                permissionResult.then(resolve, reject);
            }
        }).then(function (permissionResult) {
            if (permissionResult !== 'granted') {
                // Warning modal if user does not accept notifications
                toast.warn(
                    `Enabling notifications ensures that your browser will not delete your Cashtab wallet. Please manually enable notifications to continue using Cashtab.`,
                );
            } else {
                // If it is granted, ask again for persistent storage
                // Best way to do this is to show a modal that refreshes the page

                // Success modal when user accepts notifications, prompting a refresh
                toast.success(`Notification permission granted`);
            }
        });
    };

    const checkForPersistentStorage = async () => {
        // Request persistent storage for site
        if (navigator.storage && navigator.storage.persist) {
            // Check if storage is persistent
            const isPersisted = await navigator.storage.persisted();
            console.info(`Persisted storage status: ${isPersisted}`);
            // If not, request persistent storage
            if (!isPersisted) {
                console.info(`Requesting persistent storage`);
                const persistanceRequestResult =
                    await navigator.storage.persist();
                console.info(
                    `Persistent storage granted: ${persistanceRequestResult}`,
                );
                // If the request was not granted, ask the user to approve notification permissions
                if (!persistanceRequestResult) {
                    // Check if the browser supports notifications
                    const browserSupportsNotifications =
                        'Notification' in window;

                    // If the browser supports notifications, check the permission status
                    if (browserSupportsNotifications) {
                        const cashtabNotificationPermission =
                            Notification.permission;

                        // If the permission is not 'granted', ask for notification permissions
                        if (cashtabNotificationPermission !== 'granted') {
                            console.info(
                                `User has not granted notification permission and persistent storage status has not been granted. Requesting notification permission.`,
                            );
                            return askPermissionForNotifications();
                        }
                    }
                }
            }
        }
    };

    const getExtensionInstallationStatus = async () => {
        // Wait 2s to check
        // window.bitcoinAbc is set by the extension, and is undefined on page load
        // We will also want to wait for some configurable interval anyway, so that the page
        // does not load with a popup
        const popupWaitInterval = 2000;
        await new Promise(resolve => setTimeout(resolve, popupWaitInterval));
        return (
            window &&
            typeof (window as ExtendedWindow).bitcoinAbc !== 'undefined' &&
            (window as ExtendedWindow).bitcoinAbc === 'cashtab'
        );
    };

    const isDesktopChromeOrBrave = (): boolean => {
        // Check if user is on mobile
        if (isMobile(navigator)) {
            return false;
        }

        // Check user agent for Chrome or Brave (Brave identifies as Chrome)
        const userAgent = navigator.userAgent.toLowerCase();
        const isChromeOrBrave =
            userAgent.includes('chrome') && !userAgent.includes('edg');
        const isFirefox = userAgent.includes('firefox');

        return isChromeOrBrave && !isFirefox;
    };

    const handleExtensionStatus = async () => {
        if (appConfig.monitorExtension) {
            const extensionInstalled = await getExtensionInstallationStatus();
            console.info(
                `Cashtab browser extension: ${
                    extensionInstalled ? 'Installed' : 'Not installed'
                }`,
            );

            // Show extension installation notice if not installed and on desktop Chrome/Brave
            if (!extensionInstalled && isDesktopChromeOrBrave()) {
                toast.info(
                    <div>
                        <div
                            style={{ fontWeight: 'bold', marginBottom: '8px' }}
                        >
                            Install Cashtab Browser Extension
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            Enhance your webapp experience with our browser
                            extension for Chrome and Brave.
                        </div>
                        <a
                            href="https://chromewebstore.google.com/detail/cashtab/obldfcmebhllhjlhjbnghaipekcppeag"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: '#007bff',
                                textDecoration: 'underline',
                                fontWeight: 'bold',
                            }}
                        >
                            Install Extension →
                        </a>
                    </div>,
                    {
                        autoClose: 10000, // Show for 10 seconds
                        closeOnClick: true,
                        pauseOnHover: true,
                        style: {
                            minWidth: '400px',
                            maxWidth: '500px',
                        },
                    },
                );
            }
        }
    };

    useEffect(() => {
        checkForPersistentStorage();
        handleExtensionStatus();
    }, []);
    // Note: none of the above functionality requires rendering, so return null
    return null;
};

export default WebApp;
