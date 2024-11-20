// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import appConfig from 'config/app';
import CashtabCache, { CashtabCachedTokenInfo } from 'config/CashtabCache';
import {
    CashtabWallet,
    StoredCashtabState,
    CashtabPathInfo,
    StoredCashtabPathInfo,
    LegacyCashtabWallet,
    LegacyPathInfo,
    CashtabWalletState,
} from 'wallet';
import { LegacyCashtabWallet_Pre_2_55_0 } from 'components/App/fixtures/mocks';

/**
 * the userAgentData key is supported by recent
 * versions of Chromium-based browsers
 */
interface ExtendedNavigator extends Navigator {
    userAgentData?: NavigatorUAData;
}
interface NavigatorUAData {
    readonly brands: NavigatorUABrandVersion[];
    readonly mobile: boolean;
    readonly platform: string;
    getHighEntropyValues(hints: string[]): Promise<Record<string, string>>;
}

interface NavigatorUABrandVersion {
    readonly brand: string;
    readonly version: string;
}

/**
 * Call in a web browser. Return true if browser is on a mobile device.
 * Return false if browser is desktop or browser is too old to support navigator.userAgentData
 * @param navigator
 */
export const isMobile = (navigator: ExtendedNavigator): boolean => {
    return (
        typeof navigator?.userAgentData?.mobile !== 'undefined' &&
        navigator.userAgentData.mobile === true
    );
};

/**
 * Call in a web browser. Return user locale if available or default (e.g. 'en-US') if not.
 * @param navigator
 * @returns
 */
export const getUserLocale = (navigator?: ExtendedNavigator): string => {
    if (typeof navigator?.language !== 'undefined') {
        return navigator.language;
    }
    return appConfig.defaultLocale;
};

export interface CashtabCacheJson extends Omit<CashtabCache, 'tokens'> {
    tokens: [string, CashtabCachedTokenInfo][];
}
/**
 * Convert cashtabCache to a JSON for storage
 * @param cashtabCache {tokens: <Map of genesis info by tokenId>}
 */
export const cashtabCacheToJSON = (
    cashtabCache: CashtabCache,
): CashtabCacheJson => {
    return {
        ...cashtabCache,
        tokens: Array.from(cashtabCache.tokens.entries()),
    };
};

/**
 * Convert stored cashtabCache from JSON to more useful data types
 * For now, this means converting the one key 'tokens' from a keyvalue array to a Map
 * @param storedCashtabCache
 */
export const storedCashtabCacheToMap = (
    storedCashtabCache: CashtabCacheJson,
): CashtabCache => {
    return {
        ...storedCashtabCache,
        tokens: new Map(storedCashtabCache.tokens),
    };
};

export interface StoredCashtabWallet {
    name: string;
    mnemonic: string;
    paths: [number, StoredCashtabPathInfo][];
    state: StoredCashtabState;
}

/**
 * Convert stored cashtabWallet, which includes Map type stored as keyvalue array to some keys
 * to include actual Maps at these keys
 * @param storedCashtabWallet
 * @returns
 */
export const cashtabWalletFromJSON = (
    storedCashtabWallet: StoredCashtabWallet | LegacyCashtabWallet,
): CashtabWallet | LegacyCashtabWallet => {
    // If you are pulling a pre-2.9.0 wallet out of storage, no conversion necessary
    // Cashtab will find this wallet invalid and migrate it
    // But, you need to ber able to handle pulling old wallets from storage
    if (
        'Path1899' in storedCashtabWallet ||
        // Pre 2.9.0 wallet
        (Array.isArray(storedCashtabWallet.paths) &&
            storedCashtabWallet.paths.length > 0 &&
            typeof (storedCashtabWallet.paths[0] as LegacyPathInfo).path !==
                'undefined')
    ) {
        return storedCashtabWallet as LegacyCashtabWallet;
    }
    const activeCashtabWalletPathInfos: [number, CashtabPathInfo][] = [];
    for (const [path, storedPathInfo] of (
        storedCashtabWallet as
            | LegacyCashtabWallet_Pre_2_55_0
            | StoredCashtabWallet
    ).paths) {
        if ('sk' in storedPathInfo && 'pk' in storedPathInfo) {
            // If the stored wallet is > 2.55.0, it will have sk and pk fields
            activeCashtabWalletPathInfos.push([
                path,
                {
                    ...storedPathInfo,
                    sk: new Uint8Array(storedPathInfo.sk),
                    pk: new Uint8Array(storedPathInfo.pk),
                },
            ]);
        } else {
            activeCashtabWalletPathInfos.push([
                path,
                // Note we know here that storedPathInfo is actually NOT of CashtabPathInfo type
                // We expect this wallet to be revived as invalid for migration
                storedPathInfo as CashtabPathInfo,
            ]);
        }
    }
    return {
        ...(storedCashtabWallet as StoredCashtabWallet),
        paths: new Map(activeCashtabWalletPathInfos),
        state: {
            ...storedCashtabWallet.state,
            tokens: new Map(
                (storedCashtabWallet as StoredCashtabWallet).state.tokens,
            ),
        },
    } as CashtabWallet;
};

/**
 * Store Map objects as keyvalue arrays before saving in localforage
 * @param cashtabWallet
 */
export const cashtabWalletToJSON = (
    cashtabWallet: LegacyCashtabWallet | CashtabWallet,
): StoredCashtabWallet | LegacyCashtabWallet => {
    if (
        typeof (cashtabWallet as unknown as CashtabWallet).paths ===
            'undefined' ||
        !((cashtabWallet as unknown as CashtabWallet).paths instanceof Map)
    ) {
        // Cashtab wallets before 2.9.0 were already JSON
        // We do not plan to ever use this function on such a wallet
        // Handle so we can be sure no errors are thrown
        return cashtabWallet as LegacyCashtabWallet;
    }

    // Convert sk and pk from Uint8Array to Array for JSON storage
    // Note that we only expect valid CashtabWallet type here, Legacy handled above
    // And in practice, we do not expect to ever store legacy type as they are migrated on app startup
    const storedCashtabPaths: [number, StoredCashtabPathInfo][] = [];
    (cashtabWallet as CashtabWallet).paths.forEach((pathInfo, path) => {
        storedCashtabPaths.push([
            path,
            'sk' in pathInfo && 'pk' in pathInfo
                ? {
                      ...pathInfo,
                      sk: Array.from(pathInfo.sk),
                      pk: Array.from(pathInfo.pk),
                  }
                : pathInfo,
        ]);
    });

    return {
        ...(cashtabWallet as CashtabWallet),
        paths: storedCashtabPaths,
        state: {
            ...(cashtabWallet.state as CashtabWalletState),
            tokens: Array.from(
                (cashtabWallet as CashtabWallet).state.tokens.entries(),
            ),
        },
    } as StoredCashtabWallet;
};

/**
 * Convert cashtab wallets to JSON for localforage writing
 * @param wallets array of valid cashtab wallets
 */
export const cashtabWalletsToJSON = (
    wallets: CashtabWallet[] | LegacyCashtabWallet[],
): (StoredCashtabWallet | LegacyCashtabWallet)[] => {
    const jsonWallets = [];
    for (const wallet of wallets) {
        jsonWallets.push(cashtabWalletToJSON(wallet));
    }
    return jsonWallets;
};

/**
 * Convert cashtab wallets from JSON after reading from localforage
 * @param {array} storedWallets array of stored JSON cashtab wallets
 * @returns {array} wallets
 */
export const cashtabWalletsFromJSON = (
    storedWallets: (StoredCashtabWallet | LegacyCashtabWallet)[],
): (LegacyCashtabWallet | CashtabWallet)[] => {
    const wallets = [];
    for (const storedWallet of storedWallets) {
        wallets.push(cashtabWalletFromJSON(storedWallet));
    }
    return wallets;
};

/**
 * Get the width of a given string of text
 * Useful to customize the width of a component according to the size of displayed text
 *
 * Note
 * It is not practical to unit test this function as document is an html document
 * @param document document global of a rendered web page
 * @param text text to get width of
 * @param font e.g. '16px Poppins'
 * @returns pixel width of text
 */
export const getTextWidth = (
    document: Document,
    text: string,
    font: string,
): number => {
    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context !== null) {
            context.font = font || getComputedStyle(document.body).font;
            return context.measureText(text).width;
        }
        return 200;
    } catch (err) {
        // If we do not have access to HTML methods, e.g. if we are in the test environment
        // Return a hard-coded width
        return 200;
    }
};
