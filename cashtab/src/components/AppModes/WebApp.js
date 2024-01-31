import { useEffect } from 'react';
import { Modal } from 'antd';
import appConfig from 'config/app';

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
            console.log(`permissionResult`, permissionResult);
            if (permissionResult !== 'granted') {
                // Warning modal if user does not accept notifications
                Modal.warn({
                    title: 'Notification permission refused',
                    content:
                        'Please enable notifications from Cashtab.com to help prevent your browser from deleting Cashtab wallet info.',
                });
            } else {
                console.log(`Notification permission granted`);
                // If it is granted, ask again for persistent storage
                // Best way to do this is to show a modal that refreshes the page

                // Success modal when user accepts notifications, prompting a refresh
                Modal.success({
                    title: 'Notification permission granted',
                    content: 'Please refresh the page',
                    onOk: () => {
                        console.log(
                            `Reloading page to retry for persistent storage permission`,
                        );
                        window.location.reload(true);
                    },
                });
            }
        });
    };

    const checkForPersistentStorage = async () => {
        // Request persistent storage for site
        if (navigator.storage && navigator.storage.persist) {
            // Check if storage is persistent
            const isPersisted = await navigator.storage.persisted();
            console.log(`Persisted storage status: ${isPersisted}`);
            // If not, request persistent storage
            if (!isPersisted) {
                console.log(`Requesting persistent storage`);
                const persistanceRequestResult =
                    await navigator.storage.persist();
                console.log(
                    `Persistent storage granted: ${persistanceRequestResult}`,
                );
                // If the request was not granted, ask the user to approve notification permissions
                if (!persistanceRequestResult) {
                    // Check if the browser supports notifications
                    const browserSupportsNotifications =
                        'Notification' in window;

                    console.log(
                        `browserSupportsNotifications`,
                        browserSupportsNotifications,
                    );

                    // If the browser supports notifications, check the permission status
                    if (browserSupportsNotifications) {
                        const cashtabNotificationPermission =
                            Notification.permission;

                        console.log(
                            `cashtabNotificationPermission`,
                            cashtabNotificationPermission,
                        );

                        // If the permission is not 'granted', ask for notification permissions
                        if (cashtabNotificationPermission !== 'granted') {
                            console.log(
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
        return window && window.bitcoinAbc && window.bitcoinAbc === 'cashtab';
    };

    const handleExtensionStatus = async () => {
        if (appConfig.monitorExtension) {
            const extensionInstalled = await getExtensionInstallationStatus();
            // TODO if false and other conditions are met, show popup advertising browser extension
            console.log(
                `Cashtab browser extension: ${
                    extensionInstalled ? 'Installed' : 'Not installed'
                }`,
            );
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
