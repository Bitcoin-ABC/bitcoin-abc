// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
    getMessaging,
    getToken,
    isSupported,
    onMessage,
    type Messaging,
} from 'firebase/messaging';
import { signMsg } from 'ecash-lib';
import { token as tokenConfig } from 'config/token';
import {
    NOTIFICATIONS_URL,
    firebaseWebConfig,
    firebaseVapidKey,
    isFirebaseWebConfigured,
} from 'config/notifications';

/** Token-server sizes: 512 / 256 / 128 / 64 / 32 — 128 for inline push icons. */
const PUSH_TOKEN_ICON_SIZE = 128 as const;

type PushPlatform = 'ios' | 'android' | 'web';

type RegistrationContext = {
    activeAddress: string;
    secretKey: Uint8Array;
};

let listenersInitialized = false;
let currentToken: string | null = null;
let registrationContext: RegistrationContext | null = null;
let registerInFlight: Promise<void> | null = null;
let firebaseApp: FirebaseApp | null = null;
let webMessaging: Messaging | null = null;
let webMessageListenerInitialized = false;
let webMessageListenerInit: Promise<void> | null = null;

export const isExtensionBuild = (): boolean =>
    import.meta.env.VITE_BUILD_ENV === 'extension';

export const isNativeMobile = (): boolean =>
    Capacitor.isNativePlatform() &&
    ['android', 'ios'].includes(Capacitor.getPlatform());

const hasWebNotificationApi = (): boolean =>
    typeof globalThis.Notification !== 'undefined';

const hasServiceWorkerApi = (): boolean =>
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

export const isWebPushSupported = (): boolean =>
    !isExtensionBuild() &&
    !isNativeMobile() &&
    isFirebaseWebConfigured() &&
    hasWebNotificationApi() &&
    hasServiceWorkerApi();

export const isPushNotificationsSupported = (): boolean =>
    isNativeMobile() || isWebPushSupported();

const getPushPlatform = (): PushPlatform => {
    if (isNativeMobile()) {
        return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    }
    return 'web';
};

const getXecNotificationIconUrl = (): string =>
    `${window.location.origin}/ecash192.png`;

const getXecNotificationBadgeUrl = (): string =>
    `${window.location.origin}/ecash48.png`;

const getTokenNotificationIconUrl = (tokenId: string): string =>
    `${tokenConfig.tokenIconsUrl}/${PUSH_TOKEN_ICON_SIZE}/${tokenId}.png`;

/**
 * Icon URL for browser Notification / service-worker display (inline left).
 * Android uses a local white drawable (`ic_cashtab_notification`) for the
 * status-bar icon, and FCM `imageUrl` (token icon) when `token_id` is present.
 */
const getPushNotificationIconUrl = (data?: Record<string, string>): string => {
    const tokenId = data?.token_id;
    if (tokenId) {
        return getTokenNotificationIconUrl(tokenId);
    }
    return getXecNotificationIconUrl();
};

/** Foreground web push only — native platforms use FCM system display. */
const showWebPushNotification = (
    title: string,
    body: string,
    data?: Record<string, string>,
): void => {
    if (Notification.permission !== 'granted') {
        return;
    }
    new Notification(title, {
        body,
        icon: getPushNotificationIconUrl(data),
        badge: getXecNotificationBadgeUrl(),
        tag: data?.txid,
        data,
    });
};

const postPushEndpoint = async (
    path: 'register' | 'unregister',
    body: Record<string, string>,
): Promise<void> => {
    const response = await fetch(`${NOTIFICATIONS_URL}/api/push/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
            error?: string;
        };
        throw new Error(result.error || `HTTP ${response.status}`);
    }
};

const registerTokenWithServer = async (
    token: string,
    context: RegistrationContext,
): Promise<void> => {
    const signature = signMsg(context.activeAddress, context.secretKey);
    await postPushEndpoint('register', {
        active_address: context.activeAddress,
        signature,
        platform: getPushPlatform(),
        fcm_token: token,
    });
};

const unregisterTokenWithServer = async (
    token: string,
    context: RegistrationContext,
): Promise<void> => {
    const signature = signMsg(context.activeAddress, context.secretKey);
    await postPushEndpoint('unregister', {
        active_address: context.activeAddress,
        signature,
        fcm_token: token,
    });
};

/**
 * Background / token-refresh registration. Failures are logged only — the user
 * is not in a settings toggle flow.
 */
const syncTokenWithServerInBackground = (token: string): void => {
    currentToken = token;
    const context = registrationContext;
    if (!context || !currentToken) {
        return;
    }

    registerInFlight = registerTokenWithServer(currentToken, context)
        .catch(error => {
            console.error('Failed to register push token with server:', error);
        })
        .finally(() => {
            registerInFlight = null;
        });
};

const ensureNativePushListeners = (): void => {
    if (!isNativeMobile() || listenersInitialized) {
        return;
    }

    listenersInitialized = true;
    void FirebaseMessaging.addListener('tokenReceived', event => {
        syncTokenWithServerInBackground(event.token);
    });
    void FirebaseMessaging.addListener('notificationActionPerformed', event => {
        console.log('Push notification opened:', event.notification);
    });
};

const getWebMessaging = async (): Promise<Messaging | null> => {
    if (!(await isSupported())) {
        return null;
    }
    if (webMessaging !== null) {
        return webMessaging;
    }
    if (firebaseApp === null) {
        firebaseApp = initializeApp(firebaseWebConfig);
    }
    webMessaging = getMessaging(firebaseApp);
    return webMessaging;
};

const ensureWebForegroundMessageListener = (): Promise<void> => {
    if (webMessageListenerInitialized) {
        return Promise.resolve();
    }
    if (webMessageListenerInit !== null) {
        return webMessageListenerInit;
    }

    webMessageListenerInit = (async () => {
        if (!isWebPushSupported()) {
            return;
        }

        const messaging = await getWebMessaging();
        if (messaging === null) {
            return;
        }

        webMessageListenerInitialized = true;
        onMessage(messaging, payload => {
            const title =
                payload.notification?.title ?? payload.data?.title ?? 'Cashtab';
            const body = payload.notification?.body ?? payload.data?.body ?? '';
            showWebPushNotification(title, body, payload.data);
        });
    })();

    return webMessageListenerInit;
};

const registerWebPushToken = async (): Promise<string | null> => {
    if (!isWebPushSupported() || !firebaseVapidKey) {
        return null;
    }

    const messaging = await getWebMessaging();
    if (messaging === null) {
        return null;
    }

    const registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
    );
    await navigator.serviceWorker.ready;

    return getToken(messaging, {
        vapidKey: firebaseVapidKey,
        serviceWorkerRegistration: registration,
    });
};

const ensureAndroidNotificationChannels = async (): Promise<void> => {
    if (Capacitor.getPlatform() !== 'android') {
        return;
    }

    await FirebaseMessaging.createChannel({
        id: 'cashtab_payments',
        name: 'Payments',
        description: 'Incoming payment notifications',
        importance: 4,
        visibility: 1,
    });
    await FirebaseMessaging.createChannel({
        id: 'cashtab_account',
        name: 'Account updates',
        description: 'Account and general Cashtab notifications',
        importance: 3,
        visibility: 1,
    });
};

/**
 * Current OS / browser notification permission for this app.
 */
export const getPushNotificationPermission = async (): Promise<
    'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'default'
> => {
    if (isNativeMobile()) {
        const permission = await FirebaseMessaging.checkPermissions();
        return permission.receive;
    }
    if (isWebPushSupported()) {
        return Notification.permission;
    }
    return 'denied';
};

export const initWebPushForegroundListener = (): Promise<void> =>
    ensureWebForegroundMessageListener();

/**
 * Register this device/browser for push notifications for the active wallet.
 *
 * @returns false if notification permission was denied or web push is unavailable
 * @throws if FCM token fetch or server registration fails
 */
export const registerPushNotifications = async (
    activeAddress: string,
    secretKey: Uint8Array,
): Promise<boolean> => {
    if (!isPushNotificationsSupported()) {
        return false;
    }

    registrationContext = { activeAddress, secretKey };

    if (registerInFlight !== null) {
        await registerInFlight;
    }

    if (isNativeMobile()) {
        ensureNativePushListeners();
        await ensureAndroidNotificationChannels();

        const permission = await FirebaseMessaging.requestPermissions();
        if (permission.receive !== 'granted') {
            return false;
        }

        const { token } = await FirebaseMessaging.getToken();
        currentToken = token;
        await registerTokenWithServer(token, registrationContext);
        return true;
    }

    if (!hasWebNotificationApi()) {
        return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        return false;
    }

    const token = await registerWebPushToken();
    if (!token) {
        return false;
    }

    currentToken = token;
    await registerTokenWithServer(token, registrationContext);
    await ensureWebForegroundMessageListener();
    return true;
};

/**
 * Stop push delivery for this device (server unregister + clear session token).
 */
export const disablePushNotifications = async (): Promise<void> => {
    await unregisterPushDeviceIfRegistered();
};

/**
 * Unregister the current device token (e.g. before sign-out or toggling off).
 */
export const unregisterPushDeviceIfRegistered = async (): Promise<void> => {
    if (currentToken === null || registrationContext === null) {
        registrationContext = null;
        return;
    }

    const token = currentToken;
    const context = registrationContext;

    try {
        await unregisterTokenWithServer(token, context);
        if (isNativeMobile()) {
            await FirebaseMessaging.deleteToken();
        }
    } catch (error) {
        console.error('Failed to unregister push token:', error);
    } finally {
        currentToken = null;
        registrationContext = null;
    }
};

/**
 * @internal Test hook — reset module state.
 */
export const resetPushNotificationServiceForTests = (): void => {
    listenersInitialized = false;
    currentToken = null;
    registrationContext = null;
    registerInFlight = null;
    firebaseApp = null;
    webMessaging = null;
    webMessageListenerInitialized = false;
    webMessageListenerInit = null;
};
