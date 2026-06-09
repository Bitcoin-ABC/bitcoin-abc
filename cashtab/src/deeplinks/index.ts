// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * PayButton deep link detection and conversion to BIP21 URI
 *
 * PayButton spec: https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/paybutton.md
 *
 * PayButton deep links: https://paybutton.org/app?address=...&amount=...&b=1
 * - address: BIP21 address (ecash:...)
 * - Other params (amount, op_return_raw, etc.) become BIP21 query params
 *
 * pay.e.cash deep links: https://docs.e.cash/pay
 * - bip21=<bip21-uri> wraps the BIP21 URI in a query string
 * - connect=1&return_url=<https-url> opens wallet connect (native app returns address via callback URL hash)
 *
 * For both:
 * - b=1: return to browser after send/reject/connect
 */

export interface DeepLinkResult {
    bip21Uri: string | null;
    returnToBrowser: boolean;
}

export interface PayEcashConnectResult {
    isConnect: boolean;
    returnUrl: string | null;
    returnToBrowser: boolean;
}

/** Hash param dApps read after Cashtab opens the connect callback URL. */
export const PAY_ECASH_CONNECT_HASH_PARAM = 'cashtab_connect';

export const isValidHttpsReturnUrl = (url: string): boolean => {
    try {
        return new URL(url).protocol === 'https:';
    } catch {
        return false;
    }
};

export const buildConnectCallbackUrl = (
    returnUrl: string,
    address: string,
): string => {
    const callback = new URL(returnUrl);
    callback.hash = `${PAY_ECASH_CONNECT_HASH_PARAM}=${encodeURIComponent(address)}`;
    return callback.toString();
};

/**
 * Convert a PayButton deep link URL to a BIP21 URI
 *
 * @param deepLink - URL like https://paybutton.org/app?address=ecash:...&amount=1&b=1
 * @returns BIP21 URI and returnToBrowser flag, or bip21Uri=null if not a paybutton URL
 */
export function paybuttonDeepLinkToBip21Uri(deepLink: string): DeepLinkResult {
    try {
        const url = new URL(deepLink);

        if (
            url.protocol !== 'https:' ||
            (url.hostname !== 'paybutton.org' &&
                url.hostname !== 'api.paybutton.org') ||
            url.pathname !== '/app'
        ) {
            return { bip21Uri: null, returnToBrowser: false };
        }

        const address = url.searchParams.get('address');
        if (!address) {
            return { bip21Uri: null, returnToBrowser: false };
        }
        url.searchParams.delete('address');

        // b=1 means return to browser
        const b = url.searchParams.get('b');
        if (b !== null) {
            url.searchParams.delete('b');
        }

        const queryString = url.searchParams.toString();
        const bip21Uri = queryString ? `${address}?${queryString}` : address;

        return {
            bip21Uri,
            returnToBrowser: b === '1',
        };
    } catch {
        return { bip21Uri: null, returnToBrowser: false };
    }
}

export function payecashDeepLinkToBip21Uri(deepLink: string): DeepLinkResult {
    try {
        const url = new URL(deepLink);

        // The pay.e.cash link is a a simple wrapper around a BIP21 URI, passed
        // as a param via bip21 query parameter. We can use a simple string
        // matching to extract the BIP21 URI. If any other param is present
        // before the bip21 query parameter, it is invalid. If any other param
        // is present after the bip21 query parameter, it is considered part of
        // the BIP21 URI.
        if (
            url.protocol !== 'https:' ||
            url.hostname !== 'pay.e.cash' ||
            (url.pathname !== '' && url.pathname !== '/') ||
            url.searchParams.get('bip21') === null
        ) {
            return { bip21Uri: null, returnToBrowser: false };
        }

        const rawBip21Uri = new URL(url.search.split('bip21=', 2)[1]);

        // b=1 means return to browser
        const b = rawBip21Uri.searchParams.get('b');
        if (b !== null) {
            rawBip21Uri.searchParams.delete('b');
        }

        const address = rawBip21Uri.protocol + rawBip21Uri.pathname;
        const queryString = rawBip21Uri.searchParams.toString();
        const bip21Uri = queryString ? `${address}?${queryString}` : address;

        return {
            bip21Uri,
            returnToBrowser: b === '1',
        };
    } catch {
        return { bip21Uri: null, returnToBrowser: false };
    }
}

export function payecashDeepLinkToConnectRequest(
    deepLink: string,
): PayEcashConnectResult {
    const empty: PayEcashConnectResult = {
        isConnect: false,
        returnUrl: null,
        returnToBrowser: false,
    };

    try {
        const url = new URL(deepLink);

        if (
            url.protocol !== 'https:' ||
            url.hostname !== 'pay.e.cash' ||
            (url.pathname !== '' && url.pathname !== '/')
        ) {
            return empty;
        }

        const connect = url.searchParams.get('connect');
        if (connect !== '1' && connect !== 'true') {
            return empty;
        }

        if (url.searchParams.get('bip21') !== null) {
            return empty;
        }

        const returnUrl = url.searchParams.get('return_url');
        if (!returnUrl || !isValidHttpsReturnUrl(returnUrl)) {
            return empty;
        }

        const b = url.searchParams.get('b');
        return {
            isConnect: true,
            returnUrl,
            returnToBrowser: b === '1',
        };
    } catch {
        return empty;
    }
}
