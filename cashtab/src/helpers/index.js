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

/**
 * Get the width of a given string of text
 * Useful to customize the width of a component according to the size of displayed text
 *
 * Note
 * It is not practical to unit test this function as document is an html document
 * @param {html} document document global of a rendered web page
 * @param {string} text text to get width of
 * @param {string} font e.g. '16px Poppins'
 * @returns {number} pixel width of text
 */
export const getTextWidth = (document, text, font) => {
    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = font || getComputedStyle(document.body).font;
        return context.measureText(text).width;
    } catch (err) {
        // If we do not have access to HTML methods, e.g. if we are in the test environment
        // Return a hard-coded width
        return 200;
    }
};
