// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { isValidTokenId } from 'validation';

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
 * - /token?action=<LIST|BUY>&tokenId=<tokenId>[&price=<xec>] opens an agora
 *   action on the token screen, see doc/standards/agora-deeplink.md. Agora
 *   actions use their own path so supporting them is optional for a wallet.
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

/**
 * An agora action requested by a deep link.
 * See doc/standards/agora-deeplink.md
 */
export interface AgoraActionResult {
    /**
     * Lowercase hex tokenId the action applies to. May be null even when the
     * link IS an agora action: validation-error results (a missing or invalid
     * tokenId, or a repeated parameter) set `error` with tokenId null.
     * Callers check `error` first; only a result with null error, action, and
     * tokenId means the link is not an agora action link at all.
     */
    tokenId: string | null;
    /**
     * 'LIST' or 'BUY'. Null when this is not an agora action link, and also
     * on error results that could not resolve a single action (a repeated
     * parameter, or an unrecognized action). Check `error` first.
     */
    action: null | 'LIST' | 'BUY';
    /** Suggested list price for LIST, in XEC. Never trusted; the wallet re-validates it. */
    price: string | null;
    /** Token quantity a BUY wants to buy. Never trusted; the wallet re-validates it. */
    quantity: string | null;
    /**
     * A validation error describing why an otherwise-recognized agora action
     * link is invalid (e.g. a price on a BUY, which the standard forbids), or
     * null. Callers should surface this rather than acting on the link.
     */
    error: string | null;
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

/**
 * Parse a pay.e.cash agora action deep link
 *
 * https://pay.e.cash/token?action=LIST&tokenId=<tokenId>&price=<xec>
 * https://pay.e.cash/token?action=BUY&tokenId=<tokenId>&quantity=<qty>
 *
 * See doc/standards/agora-deeplink.md
 *
 * Agora actions live on the /token path, and not at the root with the payment
 * links, so that supporting them is optional for a wallet.
 *
 * Note that the wallet, not the link, decides whether the token supports the
 * action and whether the user can perform it. We only parse here.
 *
 * @param deepLink - URL like https://pay.e.cash/token?action=BUY&tokenId=...
 * @returns the requested agora action, or all-null if this is not one
 */
export function payecashDeepLinkToAgoraAction(
    deepLink: string,
): AgoraActionResult {
    const empty: AgoraActionResult = {
        tokenId: null,
        action: null,
        price: null,
        quantity: null,
        error: null,
        returnToBrowser: false,
    };

    try {
        const url = new URL(deepLink);

        if (
            url.protocol !== 'https:' ||
            url.hostname !== 'pay.e.cash' ||
            // Accept exactly /token and /token/, nothing else
            (url.pathname !== '/token' && url.pathname !== '/token/')
        ) {
            return empty;
        }

        // A bip21 payment or connect request is not an agora action
        if (
            url.searchParams.get('bip21') !== null ||
            url.searchParams.get('connect') !== null
        ) {
            return empty;
        }

        const b = url.searchParams.get('b');

        // A parameter given more than once is ambiguous (which value wins?). On
        // the dedicated agora path this is a broken agora link, so surface it
        // rather than silently taking the first value or falling back. Error
        // returns never honor returnToBrowser — the user should stay in the
        // app and see what went wrong.
        for (const key of ['action', 'tokenId', 'price', 'quantity', 'b']) {
            if (url.searchParams.getAll(key).length > 1) {
                return {
                    ...empty,
                    error: 'This token action link has a repeated parameter',
                };
            }
        }

        // An empty ?action= is treated as absent, like every other empty-valued
        // parameter (the spec's empty-value rule), so it falls back rather than
        // surfacing an unrecognized-action error
        const action = (url.searchParams.get('action') || null)?.toUpperCase();
        if (action === undefined) {
            // No action at all: not an agora action link, fall back.
            return empty;
        }
        if (action !== 'LIST' && action !== 'BUY') {
            // A present but unrecognized action (e.g. a future action this
            // version does not implement). We must not act on it, but surface
            // it rather than silently falling back with no feedback.
            return {
                ...empty,
                error: 'This token action is not supported',
            };
        }

        // The action is recognized, so this link is meant as an agora action. A
        // missing or malformed tokenId is therefore a broken agora link, not a
        // fall-through to another handler: surface it as an error rather than
        // returning all-null, which would silently open the normal landing
        // page with no feedback. Validate the tokenId the same way Cashtab does
        // everywhere else.
        const tokenId = url.searchParams.get('tokenId');
        if (!isValidTokenId(tokenId)) {
            return {
                ...empty,
                action,
                error: 'This token action link has an invalid token id',
            };
        }

        // An empty value (e.g. ?price= with nothing after it) means the
        // parameter was not really provided; treat it as absent so it is not
        // mistaken for a real value — e.g. ?price= on a BUY must not trip the
        // "cannot specify a price" check below.
        const price = url.searchParams.get('price') || null;
        const quantity = url.searchParams.get('quantity') || null;

        // A BUY takes its price from the on-chain offer, so a price on a BUY is
        // invalid. LIST likewise takes no quantity. Surface either as an error
        // rather than a usable action.
        let error: null | string = null;
        if (action === 'BUY' && price !== null) {
            error = 'A buy link cannot specify a price';
        } else if (action === 'LIST' && quantity !== null) {
            error = 'A list link cannot specify a quantity';
        }
        if (error !== null) {
            return {
                ...empty,
                tokenId,
                action,
                error,
            };
        }

        return {
            tokenId,
            action,
            // price applies to LIST, quantity to BUY
            price: action === 'LIST' ? price : null,
            quantity: action === 'BUY' ? quantity : null,
            error: null,
            returnToBrowser: b === '1',
        };
    } catch {
        return empty;
    }
}
