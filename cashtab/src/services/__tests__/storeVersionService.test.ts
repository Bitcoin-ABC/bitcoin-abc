// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { readFileSync } from 'fs';
import path from 'path';

const mockGetInfo = jest.fn();
const mockOpenUrl = jest.fn();
const mockHttpGet = jest.fn();
const mockIsNativePlatform = jest.fn(() => true);
const mockGetPlatform = jest.fn(() => 'android');

jest.mock('@capacitor/app', () => ({
    App: {
        getInfo: (...args: unknown[]) => mockGetInfo(...args),
    },
}));

jest.mock('@capacitor/app-launcher', () => ({
    AppLauncher: {
        openUrl: (...args: unknown[]) => mockOpenUrl(...args),
    },
}));

jest.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => mockIsNativePlatform(),
        getPlatform: () => mockGetPlatform(),
    },
    CapacitorHttp: {
        get: (...args: unknown[]) => mockHttpGet(...args),
    },
}));

import {
    fetchLatestPublishedVersion,
    getAppUpdatePrompt,
    openAppStoreListing,
    parseNativeLatestFile,
    parsePlayStoreVersion,
} from 'services/storeVersionService';
import { ANDROID_STORE_URL } from 'constants/store';

describe('parsePlayStoreVersion', () => {
    it('reads the triple-quoted semver from Play Store HTML', () => {
        const html =
            'st that data be deleted"]],1],"141":[[["5.25.0"]],[[[36]],[[[26,"8.0"]]]]]';
        expect(parsePlayStoreVersion(html)).toBe('5.25.0');
    });

    it('returns null when the listing has no version blob', () => {
        expect(parsePlayStoreVersion('<html>no version</html>')).toBeNull();
        expect(parsePlayStoreVersion('')).toBeNull();
    });
});

describe('parseNativeLatestFile', () => {
    it('prefers the platform field over version', () => {
        expect(
            parseNativeLatestFile({ ios: '5.25.1', android: '5.25.0' }, 'ios'),
        ).toBe('5.25.1');
        expect(
            parseNativeLatestFile(
                { version: '6.0.0', android: '5.25.0' },
                'android',
            ),
        ).toBe('5.25.0');
        expect(parseNativeLatestFile({ version: '1.2.3' }, 'ios')).toBe(
            '1.2.3',
        );
    });

    it('returns null for empty payloads', () => {
        expect(parseNativeLatestFile({}, 'ios')).toBeNull();
        expect(parseNativeLatestFile(null, 'android')).toBeNull();
    });
});

describe('public native-latest.json', () => {
    it('tracks package.json for both stores', () => {
        const pkg = JSON.parse(
            readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
        ) as { version: string };
        const latest = JSON.parse(
            readFileSync(
                path.join(process.cwd(), 'public/native-latest.json'),
                'utf8',
            ),
        ) as { ios: string; android: string };
        expect(latest.ios).toBe(pkg.version);
        expect(latest.android).toBe(pkg.version);
    });
});

describe('fetchLatestPublishedVersion', () => {
    beforeEach(() => {
        mockHttpGet.mockReset();
        mockGetPlatform.mockReturnValue('android');
    });

    it('uses the Play Store listing when it parses', async () => {
        mockHttpGet.mockResolvedValueOnce({
            status: 200,
            data: '[["141":[[["5.26.0"]]]]',
        });
        await expect(fetchLatestPublishedVersion('android')).resolves.toEqual({
            version: '5.26.0',
            storeUrl: ANDROID_STORE_URL,
        });
        expect(mockHttpGet).toHaveBeenCalledTimes(1);
    });

    it('falls back to native-latest.json when the Android store has no listing', async () => {
        mockHttpGet
            .mockResolvedValueOnce({
                status: 200,
                data: '<html>no version</html>',
            })
            .mockResolvedValueOnce({
                status: 200,
                data: { ios: '5.25.2', android: '5.25.2' },
            });
        await expect(fetchLatestPublishedVersion('android')).resolves.toEqual({
            version: '5.25.2',
            storeUrl: ANDROID_STORE_URL,
        });
    });

    it('does not look up a store on iOS (no App Store listing yet)', async () => {
        await expect(fetchLatestPublishedVersion('ios')).resolves.toBeNull();
        expect(mockHttpGet).not.toHaveBeenCalled();
    });
});

describe('getAppUpdatePrompt', () => {
    beforeEach(() => {
        mockHttpGet.mockReset();
        mockGetInfo.mockReset();
        mockIsNativePlatform.mockReturnValue(true);
        mockGetPlatform.mockReturnValue('android');
        mockGetInfo.mockResolvedValue({ version: '5.24.0' });
    });

    it('returns null on web', async () => {
        mockIsNativePlatform.mockReturnValue(false);
        await expect(getAppUpdatePrompt()).resolves.toBeNull();
        expect(mockHttpGet).not.toHaveBeenCalled();
    });

    it('returns null on iOS (no App Store listing yet)', async () => {
        mockGetPlatform.mockReturnValue('ios');
        await expect(getAppUpdatePrompt()).resolves.toBeNull();
        expect(mockHttpGet).not.toHaveBeenCalled();
    });

    it('prompts when the installed native version is behind the store', async () => {
        mockHttpGet.mockResolvedValueOnce({
            status: 200,
            data: '[[["5.25.0"]]]',
        });
        await expect(getAppUpdatePrompt()).resolves.toEqual({
            installedVersion: '5.24.0',
            latestVersion: '5.25.0',
            storeUrl: ANDROID_STORE_URL,
        });
    });

    it('does not prompt when already on the published version', async () => {
        mockGetInfo.mockResolvedValue({ version: '5.25.0' });
        mockHttpGet.mockResolvedValueOnce({
            status: 200,
            data: '[[["5.25.0"]]]',
        });
        await expect(getAppUpdatePrompt()).resolves.toBeNull();
    });

    it('returns null when lookups fail', async () => {
        mockHttpGet.mockRejectedValue(new Error('network'));
        await expect(getAppUpdatePrompt()).resolves.toBeNull();
    });
});

describe('openAppStoreListing', () => {
    beforeEach(() => {
        mockOpenUrl.mockReset();
        mockOpenUrl.mockResolvedValue(undefined);
    });

    it('opens the store URL via AppLauncher', async () => {
        await openAppStoreListing(ANDROID_STORE_URL);
        expect(mockOpenUrl).toHaveBeenCalledWith({ url: ANDROID_STORE_URL });
    });

    it('no-ops on an empty URL', async () => {
        await openAppStoreListing('  ');
        expect(mockOpenUrl).not.toHaveBeenCalled();
    });
});
