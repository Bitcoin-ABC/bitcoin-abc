// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

interface ImportMetaEnv {
    readonly VITE_BUILD_ENV?: string;
    readonly VITE_GOOGLE_ANALYTICS?: string;
    readonly VITE_RECAPTCHA_SITE_KEY?: string;
    readonly VITE_RECAPTCHA_V3_SITE_KEY?: string;
    readonly VITE_VERSION?: string;
    readonly VITE_TESTNET?: string;
    readonly VITE_NOTIFICATIONS_SERVER_URL?: string;
    readonly VITE_FIREBASE_API_KEY?: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
    readonly VITE_FIREBASE_PROJECT_ID?: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly VITE_FIREBASE_APP_ID?: string;
    readonly VITE_FIREBASE_VAPID_KEY?: string;
    readonly VITE_TOKEN_ICONS_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Fix JSX namespace for styled-components v4 compatibility
declare namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }
}
