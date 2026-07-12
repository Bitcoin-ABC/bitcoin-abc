// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const DEFAULT_NOTIFICATIONS_SERVER_URL = 'https://push.etokens.cash';

export const NOTIFICATIONS_URL = (() => {
    const fromEnv = import.meta.env.VITE_NOTIFICATIONS_SERVER_URL;
    if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
        return fromEnv.replace(/\/$/, '');
    }
    return DEFAULT_NOTIFICATIONS_SERVER_URL;
})();

export const firebaseWebConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
        | string
        | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as
    | string
    | undefined;

export const isFirebaseWebConfigured = (): boolean =>
    Boolean(
        firebaseWebConfig.apiKey &&
        firebaseWebConfig.projectId &&
        firebaseWebConfig.messagingSenderId &&
        firebaseWebConfig.appId &&
        firebaseVapidKey,
    );
