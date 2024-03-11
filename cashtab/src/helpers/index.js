// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import appConfig from 'config/app';

/**
 * Call in a web browser. Return true if browser is on a mobile device.
 * Return false if browser is desktop or browser is too old to support navigator.userAgentData
 * @param {object | undefined} navigator
 * @returns {boolean}
 */
export const isMobile = navigator => {
    return (
        typeof navigator?.userAgentData?.mobile !== 'undefined' &&
        navigator.userAgentData.mobile === true
    );
};

/**
 * Call in a web browser. Return user locale if available or default (e.g. 'en-US') if not.
 * @param {object | undefined} navigator
 * @returns {string}
 */
export const getUserLocale = navigator => {
    if (typeof navigator?.language !== 'undefined') {
        return navigator.language;
    }
    return appConfig.defaultLocale;
};

/**
 * Convert cashtabCache to a JSON for storage
 * @param {object} cashtabCache {tokens: <Map of genesis info by tokenId>}
 * @returns {JSON}
 */
export const cashtabCacheToJSON = cashtabCache => {
    return {
        ...cashtabCache,
        tokens: Array.from(cashtabCache.tokens.entries()),
    };
};

/**
 * Convert stored cashtabCache from JSON to more useful data types
 * For now, this means converting the one key 'tokens' from a keyvalue array to a Map
 * @param {JSON} storedCashtabCache
 * @returns {Map}
 */
export const storedCashtabCacheToMap = storedCashtabCache => {
    return {
        ...storedCashtabCache,
        tokens: new Map(storedCashtabCache.tokens),
    };
};
