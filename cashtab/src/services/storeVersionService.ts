// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { App } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { ANDROID_STORE_URL, NATIVE_LATEST_VERSION_URL } from 'constants/store';
import { isAppVersionOutdated } from 'helpers/appVersion';

const HTTP_TIMEOUT_MS = 8000;

/** Play Store embeds the version as `[[["x.y.z"]]` in the page blob. */
const PLAY_STORE_TRIPLE_QUOTED_PATCH = /\[\[\["(\d+\.\d+\.\d+)"\]\]/;
const PLAY_STORE_TRIPLE_QUOTED_MINOR = /\[\[\["(\d+\.\d+)"\]\]/;

export type NativeStorePlatform = 'ios' | 'android';

export interface PublishedStoreVersion {
    version: string;
    storeUrl: string;
}

export interface AppUpdatePromptInfo {
    installedVersion: string;
    latestVersion: string;
    storeUrl: string;
}

export interface NativeLatestFile {
    ios?: string;
    android?: string;
    version?: string;
}

/**
 * Parse the published version out of a Google Play Store HTML listing.
 */
export const parsePlayStoreVersion = (html: string): string | null => {
    if (html.trim() === '') {
        return null;
    }
    const patchMatch = html.match(PLAY_STORE_TRIPLE_QUOTED_PATCH);
    if (patchMatch?.[1]) {
        return patchMatch[1];
    }
    const minorMatch = html.match(PLAY_STORE_TRIPLE_QUOTED_MINOR);
    if (minorMatch?.[1]) {
        return minorMatch[1];
    }
    return null;
};

/**
 * Read the platform version from `native-latest.json`.
 */
export const parseNativeLatestFile = (
    payload: unknown,
    platform: NativeStorePlatform,
): string | null => {
    if (payload === null || typeof payload !== 'object') {
        return null;
    }
    const file = payload as NativeLatestFile;
    const platformVersion = file[platform];
    if (typeof platformVersion === 'string' && platformVersion.trim() !== '') {
        return platformVersion.trim();
    }
    if (typeof file.version === 'string' && file.version.trim() !== '') {
        return file.version.trim();
    }
    return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const parseJsonData = (data: unknown): unknown => {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data) as unknown;
        } catch {
            return null;
        }
    }
    return data;
};

const asResponseText = (data: unknown): string => {
    if (typeof data === 'string') {
        return data;
    }
    if (isRecord(data) || Array.isArray(data)) {
        return JSON.stringify(data);
    }
    return '';
};

const nativeGet = async (
    url: string,
    responseType: 'json' | 'text',
): Promise<unknown> => {
    const response = await CapacitorHttp.get({
        url,
        responseType,
        connectTimeout: HTTP_TIMEOUT_MS,
        readTimeout: HTTP_TIMEOUT_MS,
        headers: {
            'Accept':
                responseType === 'json' ? 'application/json' : 'text/html',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent':
                'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        },
    });
    if (response.status < 200 || response.status >= 300) {
        return null;
    }
    return response.data;
};

/**
 * Fetch the published Android version from the Play Store listing HTML.
 */
export const fetchAndroidStoreVersion =
    async (): Promise<PublishedStoreVersion | null> => {
        try {
            const data = await nativeGet(
                `${ANDROID_STORE_URL}&hl=en&gl=US`,
                'text',
            );
            const version = parsePlayStoreVersion(asResponseText(data));
            if (version === null) {
                return null;
            }
            return { version, storeUrl: ANDROID_STORE_URL };
        } catch {
            return null;
        }
    };

/**
 * Fallback latest Android version from the live web deploy (`native-latest.json`).
 */
export const fetchNativeLatestFallback =
    async (): Promise<PublishedStoreVersion | null> => {
        try {
            const data = await nativeGet(NATIVE_LATEST_VERSION_URL, 'json');
            const version = parseNativeLatestFile(
                parseJsonData(data),
                'android',
            );
            if (version === null) {
                return null;
            }
            return {
                version,
                storeUrl: ANDROID_STORE_URL,
            };
        } catch {
            return null;
        }
    };

/**
 * Latest published version for this native platform.
 * Android prefers the live Play Store listing so we do not prompt before
 * review lands, then falls back to `native-latest.json`.
 *
 * There is no published iOS app yet, so iOS always returns null (no lookup).
 */
export const fetchLatestPublishedVersion = async (
    platform: NativeStorePlatform,
): Promise<PublishedStoreVersion | null> => {
    if (platform !== 'android') {
        return null;
    }
    const fromStore = await fetchAndroidStoreVersion();
    if (fromStore !== null) {
        return fromStore;
    }
    return fetchNativeLatestFallback();
};

const readInstalledVersion = async (): Promise<string> => {
    try {
        const info = await App.getInfo();
        if (typeof info.version === 'string' && info.version.trim() !== '') {
            return info.version.trim();
        }
    } catch {
        // Fall through to the JS bundle version.
    }
    const bundleVersion = import.meta.env.VITE_VERSION;
    return typeof bundleVersion === 'string' ? bundleVersion.trim() : '';
};

/**
 * If this Android install is behind the latest published version, return
 * prompt details. Otherwise null (web, iOS, errors, or already current).
 *
 * iOS is a no-op until there is an App Store listing to open.
 */
export const getAppUpdatePrompt =
    async (): Promise<AppUpdatePromptInfo | null> => {
        if (!Capacitor.isNativePlatform()) {
            return null;
        }
        const platform = Capacitor.getPlatform();
        if (platform !== 'android') {
            return null;
        }
        try {
            const installedVersion = await readInstalledVersion();
            const published = await fetchLatestPublishedVersion(platform);
            if (published === null || published.storeUrl.trim() === '') {
                return null;
            }
            if (!isAppVersionOutdated(installedVersion, published.version)) {
                return null;
            }
            return {
                installedVersion,
                latestVersion: published.version,
                storeUrl: published.storeUrl,
            };
        } catch {
            return null;
        }
    };

/**
 * Open the Play Store listing (or a future App Store URL) for this app.
 */
export const openAppStoreListing = async (storeUrl: string): Promise<void> => {
    if (storeUrl.trim() === '') {
        return;
    }
    try {
        await AppLauncher.openUrl({ url: storeUrl });
    } catch {
        window.open(storeUrl, '_blank', 'noopener,noreferrer');
    }
};
