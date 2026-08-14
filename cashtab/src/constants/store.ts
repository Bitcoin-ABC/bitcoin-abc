// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Play Store listing for the Cashtab Android app. */
export const ANDROID_STORE_URL =
    'https://play.google.com/store/apps/details?id=com.cashtab.app';

/**
 * Live latest native versions (kept in sync with package.json). Fetched at
 * runtime when Play Store lookup is unavailable. The `ios` field is stored
 * for a future App Store listing; there is no published iOS app yet.
 */
export const NATIVE_LATEST_VERSION_URL =
    'https://cashtab.com/native-latest.json';
