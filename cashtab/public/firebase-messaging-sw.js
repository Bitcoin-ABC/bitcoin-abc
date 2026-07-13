// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/* global importScripts, firebase */
importScripts(
    'https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js',
);
importScripts(
    'https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js',
);

firebase.initializeApp({
    apiKey: '__VITE_FIREBASE_API_KEY__',
    authDomain: '__VITE_FIREBASE_AUTH_DOMAIN__',
    projectId: '__VITE_FIREBASE_PROJECT_ID__',
    messagingSenderId: '__VITE_FIREBASE_MESSAGING_SENDER_ID__',
    appId: '__VITE_FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

const tokenIconsBaseUrl = '__VITE_TOKEN_ICONS_URL__';
const notificationIconUrl = `${self.location.origin}/ecash192.png`;
const notificationBadgeUrl = `${self.location.origin}/ecash48.png`;

// Web/service-worker display (inline left). Android FCM uses the local
// ic_cashtab_notification drawable for the status-bar icon and, for token
// txs, icons.etokens.cash/128 via android.notification.imageUrl.
const getPushNotificationIconUrl = data => {
    const tokenId = data?.token_id;
    if (tokenId) {
        return `${tokenIconsBaseUrl}/128/${tokenId}.png`;
    }
    return notificationIconUrl;
};

messaging.onBackgroundMessage(payload => {
    const title =
        payload.notification?.title ?? payload.data?.title ?? 'Cashtab';
    const body = payload.notification?.body ?? payload.data?.body ?? '';
    const tag = payload.data?.txid;
    const data = payload.data ?? {};
    return self.registration.showNotification(title, {
        body,
        icon: getPushNotificationIconUrl(data),
        badge: notificationBadgeUrl,
        tag,
        data,
    });
});
