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
    readonly VITE_VERSION?: string;
    readonly VITE_TESTNET?: string;
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
