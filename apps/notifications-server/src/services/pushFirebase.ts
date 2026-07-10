// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { readFileSync } from 'fs';
import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

let firebaseApp: App | null | undefined;
let messagingClient: Messaging | null | undefined;

const parseServiceAccountJson = (): Record<string, unknown> | null => {
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
    if (!path) {
        return null;
    }

    try {
        const raw = readFileSync(path, 'utf8');
        return JSON.parse(raw) as Record<string, unknown>;
    } catch (error) {
        console.error(
            `[push] Failed to read FIREBASE_SERVICE_ACCOUNT_PATH (${path}):`,
            error,
        );
        return null;
    }
};

export const initPushFirebaseFromEnv = (): Messaging | null => {
    if (messagingClient !== undefined) {
        return messagingClient;
    }

    const serviceAccount = parseServiceAccountJson();
    if (serviceAccount === null) {
        messagingClient = null;
        firebaseApp = null;
        console.info(
            '[push] FIREBASE_SERVICE_ACCOUNT_PATH unset or unreadable — push delivery disabled',
        );
        return null;
    }

    firebaseApp =
        getApps().length > 0
            ? getApps()[0]
            : initializeApp({
                  credential: cert(
                      serviceAccount as Parameters<typeof cert>[0],
                  ),
              });
    messagingClient = getMessaging(firebaseApp);
    console.info('[push] Firebase Admin initialized for FCM delivery');
    return messagingClient;
};

export const getPushMessagingClient = (): Messaging | null => {
    if (messagingClient === undefined) {
        return initPushFirebaseFromEnv();
    }
    return messagingClient;
};
