// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    paybuttonDeepLinkToBip21Uri,
    payecashDeepLinkToBip21Uri,
    payecashDeepLinkToConnectRequest,
    payecashDeepLinkToAgoraAction,
    buildConnectCallbackUrl,
} from 'deeplinks';

describe('paybuttonDeepLinkToBip21Uri', () => {
    describe('valid PayButton URLs - paybutton.org', () => {
        it('converts address-only URL to BIP21 URI', () => {
            const result = paybuttonDeepLinkToBip21Uri(
                'https://paybutton.org/app?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0',
            );
            expect(result).toEqual({
                bip21Uri: 'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0',
                returnToBrowser: false,
            });
        });

        it('converts URL with amount to BIP21 URI', () => {
            const result = paybuttonDeepLinkToBip21Uri(
                'https://paybutton.org/app?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0&amount=0.001',
            );
            expect(result).toEqual({
                bip21Uri:
                    'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0?amount=0.001',
                returnToBrowser: false,
            });
        });

        it('sets returnToBrowser true when b=1', () => {
            const result = paybuttonDeepLinkToBip21Uri(
                'https://paybutton.org/app?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0&amount=0.001&b=1',
            );
            expect(result).toEqual({
                bip21Uri:
                    'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0?amount=0.001',
                returnToBrowser: true,
            });
        });

        it('sets returnToBrowser false when b=0', () => {
            const result = paybuttonDeepLinkToBip21Uri(
                'https://paybutton.org/app?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0&b=0',
            );
            expect(result).toEqual({
                bip21Uri: 'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0',
                returnToBrowser: false,
            });
        });

        it('handles multiple BIP21 params (amount, op_return_raw)', () => {
            const result = paybuttonDeepLinkToBip21Uri(
                'https://paybutton.org/app?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0&amount=1&op_return_raw=0400746162',
            );
            expect(result).toEqual({
                bip21Uri:
                    'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0?amount=1&op_return_raw=0400746162',
                returnToBrowser: false,
            });
        });

        it('handles b param with non-1 value as returnToBrowser false', () => {
            const result = paybuttonDeepLinkToBip21Uri(
                'https://paybutton.org/app?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0&b=2',
            );
            expect(result.returnToBrowser).toBe(false);
        });
    });

    describe('valid PayButton URLs - api.paybutton.org', () => {
        it('converts api.paybutton.org URL to BIP21 URI', () => {
            const result = paybuttonDeepLinkToBip21Uri(
                'https://api.paybutton.org/app?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0&amount=0.5&b=1',
            );
            expect(result).toEqual({
                bip21Uri:
                    'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0?amount=0.5',
                returnToBrowser: true,
            });
        });
    });

    describe('non-PayButton URLs', () => {
        it('returns null for ecash: BIP21 URI (not a PayButton link)', () => {
            const input =
                'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0?amount=0.001';
            const result = paybuttonDeepLinkToBip21Uri(input);
            expect(result).toEqual({
                bip21Uri: null,
                returnToBrowser: false,
            });
        });

        it('returns null for wrong protocol (http)', () => {
            const input =
                'http://paybutton.org/app?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0';
            const result = paybuttonDeepLinkToBip21Uri(input);
            expect(result).toEqual({
                bip21Uri: null,
                returnToBrowser: false,
            });
        });

        it('returns null for wrong hostname', () => {
            const input =
                'https://other-domain.org/app?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0';
            const result = paybuttonDeepLinkToBip21Uri(input);
            expect(result).toEqual({
                bip21Uri: null,
                returnToBrowser: false,
            });
        });

        it('returns null for wrong pathname', () => {
            const input =
                'https://paybutton.org/other?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0';
            const result = paybuttonDeepLinkToBip21Uri(input);
            expect(result).toEqual({
                bip21Uri: null,
                returnToBrowser: false,
            });
        });

        it('returns null when address param is missing', () => {
            const input = 'https://paybutton.org/app?amount=0.001';
            const result = paybuttonDeepLinkToBip21Uri(input);
            expect(result).toEqual({
                bip21Uri: null,
                returnToBrowser: false,
            });
        });

        it('returns null when address param is empty', () => {
            const input = 'https://paybutton.org/app?address=';
            const result = paybuttonDeepLinkToBip21Uri(input);
            expect(result).toEqual({
                bip21Uri: null,
                returnToBrowser: false,
            });
        });

        it('returns null for invalid URL string', () => {
            const input = 'not-a-valid-url';
            const result = paybuttonDeepLinkToBip21Uri(input);
            expect(result).toEqual({
                bip21Uri: null,
                returnToBrowser: false,
            });
        });
    });

    describe('edge cases', () => {
        it('returns null when path has trailing slash (/app/)', () => {
            const input =
                'https://paybutton.org/app/?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0';
            const result = paybuttonDeepLinkToBip21Uri(input);
            expect(result).toEqual({
                bip21Uri: null,
                returnToBrowser: false,
            });
        });

        it('preserves additional BIP21 params in query string', () => {
            const result = paybuttonDeepLinkToBip21Uri(
                'https://paybutton.org/app?address=ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0&label=Hello%20World',
            );
            expect(result).toEqual({
                bip21Uri:
                    'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0?label=Hello+World',
                returnToBrowser: false,
            });
        });
    });
});

describe('payecashDeepLinkToBip21Uri', () => {
    it('unwraps a pay.e.cash HTTPS link into the inner BIP21 URI', () => {
        const deepLink =
            'https://pay.e.cash?bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5?amount=1.5';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri:
                'ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5?amount=1.5',
            returnToBrowser: false,
        });
    });

    it('parses when the BIP21 URI has no query parameters', () => {
        const deepLink =
            'https://pay.e.cash?bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri: 'ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5',
            returnToBrowser: false,
        });
    });

    it('accepts pay.e.cash with a trailing slash before query', () => {
        const deepLink =
            'https://pay.e.cash/?bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri: 'ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5',
            returnToBrowser: false,
        });
    });

    it('returns null when pathname is not empty', () => {
        const deepLink =
            'https://pay.e.cash/pay?bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri: null,
            returnToBrowser: false,
        });
    });

    it('parses when there is a tabId parameter', () => {
        const deepLink =
            'https://pay.e.cash/?tabId=1&bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5?amount=1.5&op_return_raw=0400746162';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri:
                'ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5?amount=1.5&op_return_raw=0400746162',
            returnToBrowser: false,
        });
    });

    it('sets returnToBrowser when inner URI has b=1 and strips b', () => {
        const deepLink =
            'https://pay.e.cash/?bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5?b=1';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri: 'ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5',
            returnToBrowser: true,
        });
    });

    it('does not set returnToBrowser for b other than 1 but still strips b', () => {
        const deepLink =
            'https://pay.e.cash/?bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5?b=0';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri: 'ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5',
            returnToBrowser: false,
        });
    });

    it('leaves amount and strips only b when both present', () => {
        const deepLink =
            'https://pay.e.cash/?bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5?amount=2&b=1';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri:
                'ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5?amount=2',
            returnToBrowser: true,
        });
    });

    it('parses when there is both tabId and b parameters', () => {
        const deepLink =
            'https://pay.e.cash/?tabId=1&bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5?amount=1.5&op_return_raw=0400746162&b=1';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri:
                'ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5?amount=1.5&op_return_raw=0400746162',
            returnToBrowser: true,
        });
    });

    it('returns null for wrong host', () => {
        const deepLink =
            'https://example.com/?bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri: null,
            returnToBrowser: false,
        });
    });

    it('requires HTTPS', () => {
        const deepLink =
            'http://pay.e.cash/?bip21=ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri: null,
            returnToBrowser: false,
        });
    });

    it('returns null when inner BIP21 is not a URI', () => {
        const deepLink = 'https://pay.e.cash/?bip21=%';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri: null,
            returnToBrowser: false,
        });
    });

    it('returns null for malformed deep link string', () => {
        const deepLink = 'not-a-url';
        expect(payecashDeepLinkToBip21Uri(deepLink)).toEqual({
            bip21Uri: null,
            returnToBrowser: false,
        });
    });
});

describe('payecashDeepLinkToConnectRequest', () => {
    it('parses a valid pay.e.cash connect link', () => {
        const deepLink =
            'https://pay.e.cash/?connect=1&return_url=https://blitzchips.com/&b=1';
        expect(payecashDeepLinkToConnectRequest(deepLink)).toEqual({
            isConnect: true,
            returnUrl: 'https://blitzchips.com/',
            returnToBrowser: true,
        });
    });

    it('accepts connect=true without b', () => {
        const deepLink =
            'https://pay.e.cash/?connect=true&return_url=https://example.com/app';
        expect(payecashDeepLinkToConnectRequest(deepLink)).toEqual({
            isConnect: true,
            returnUrl: 'https://example.com/app',
            returnToBrowser: false,
        });
    });

    it('rejects connect without return_url', () => {
        const deepLink = 'https://pay.e.cash/?connect=1&b=1';
        expect(payecashDeepLinkToConnectRequest(deepLink)).toEqual({
            isConnect: false,
            returnUrl: null,
            returnToBrowser: false,
        });
    });

    it('rejects when bip21 is also present', () => {
        const deepLink =
            'https://pay.e.cash/?connect=1&return_url=https://blitzchips.com/&bip21=ecash:qq';
        expect(payecashDeepLinkToConnectRequest(deepLink)).toEqual({
            isConnect: false,
            returnUrl: null,
            returnToBrowser: false,
        });
    });
});

describe('payecashDeepLinkToAgoraAction', () => {
    const TOKEN_ID =
        '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326';
    const NOT_AN_AGORA_ACTION = {
        tokenId: null,
        action: null,
        price: null,
        quantity: null,
        error: null,
        returnToBrowser: false,
    };

    it('parses a LIST action with a price', () => {
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=LIST&tokenId=${TOKEN_ID}&price=5000`,
            ),
        ).toEqual({
            tokenId: TOKEN_ID,
            action: 'LIST',
            price: '5000',
            quantity: null,
            error: null,
            returnToBrowser: false,
        });
    });

    it('parses a BUY action with no price', () => {
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=BUY&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual({
            tokenId: TOKEN_ID,
            action: 'BUY',
            price: null,
            quantity: null,
            error: null,
            returnToBrowser: false,
        });
    });

    it('parses a BUY action with a quantity', () => {
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=BUY&tokenId=${TOKEN_ID}&quantity=100`,
            ),
        ).toEqual({
            tokenId: TOKEN_ID,
            action: 'BUY',
            price: null,
            quantity: '100',
            error: null,
            returnToBrowser: false,
        });
    });

    it('is invalid, with an error, for a price on a BUY', () => {
        // The standard forbids a price on a BUY; surface it as an error
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=BUY&tokenId=${TOKEN_ID}&price=5000`,
            ),
        ).toEqual({
            tokenId: TOKEN_ID,
            action: 'BUY',
            price: null,
            quantity: null,
            error: 'A buy link cannot specify a price',
            returnToBrowser: false,
        });
    });

    it('is invalid, with an error, for a quantity on a LIST', () => {
        // The standard forbids a quantity on a LIST; surface it as an error
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=LIST&tokenId=${TOKEN_ID}&quantity=100`,
            ),
        ).toEqual({
            tokenId: TOKEN_ID,
            action: 'LIST',
            price: null,
            quantity: null,
            error: 'A list link cannot specify a quantity',
            returnToBrowser: false,
        });
    });

    it('accepts a lowercase action', () => {
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=buy&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual({
            tokenId: TOKEN_ID,
            action: 'BUY',
            price: null,
            quantity: null,
            error: null,
            returnToBrowser: false,
        });
    });

    it('is invalid, with an error, for an uppercase tokenId (matching Cashtab)', () => {
        // Cashtab's isValidTokenId only accepts lowercase hex. The action is
        // recognized, so a malformed tokenId is a broken agora link, surfaced
        // as an error rather than a silent fall-through.
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=BUY&tokenId=${TOKEN_ID.toUpperCase()}`,
            ),
        ).toEqual({
            tokenId: null,
            action: 'BUY',
            price: null,
            quantity: null,
            error: 'This token action link has an invalid token id',
            returnToBrowser: false,
        });
    });

    it('sets returnToBrowser true when b=1', () => {
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=BUY&tokenId=${TOKEN_ID}&b=1`,
            ).returnToBrowser,
        ).toBe(true);
    });

    it('is invalid, with an error, if the tokenId is not a tokenId', () => {
        // A recognized action with a malformed tokenId is a broken agora link,
        // surfaced as an error rather than a silent fall-through.
        expect(
            payecashDeepLinkToAgoraAction(
                'https://pay.e.cash/token?action=BUY&tokenId=notatokenid',
            ),
        ).toEqual({
            tokenId: null,
            action: 'BUY',
            price: null,
            quantity: null,
            error: 'This token action link has an invalid token id',
            returnToBrowser: false,
        });
    });

    it('is invalid, with an error, if the tokenId is missing', () => {
        // A recognized action with no tokenId is a broken agora link, surfaced
        // as an error rather than a silent fall-through.
        expect(
            payecashDeepLinkToAgoraAction(
                'https://pay.e.cash/token?action=BUY',
            ),
        ).toEqual({
            tokenId: null,
            action: 'BUY',
            price: null,
            quantity: null,
            error: 'This token action link has an invalid token id',
            returnToBrowser: false,
        });
    });

    it('is invalid, with an error, for a present but unsupported action', () => {
        // A recognized path with an unknown action is surfaced (it may be a
        // future action), not silently dropped
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=SELLNFT&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual({
            tokenId: null,
            action: null,
            price: null,
            quantity: null,
            error: 'This token action is not supported',
            returnToBrowser: false,
        });
    });

    it('treats an empty action as absent, not as an unrecognized action', () => {
        // Per the spec's empty-value rule, ?action= with no value is absent,
        // so the link falls back like any non-agora link
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual(NOT_AN_AGORA_ACTION);
    });

    it('is invalid, with an error, if a parameter is repeated', () => {
        // A repeated param is ambiguous; we do not silently take the first
        const repeatedError = {
            tokenId: null,
            action: null,
            price: null,
            quantity: null,
            error: 'This token action link has a repeated parameter',
            returnToBrowser: false,
        };
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=BUY&tokenId=${TOKEN_ID}&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual(repeatedError);
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=BUY&action=LIST&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual(repeatedError);
        // Malformed links never honor b=1 — stay in-app so the error is seen
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=BUY&tokenId=${TOKEN_ID}&tokenId=${TOKEN_ID}&b=1`,
            ),
        ).toEqual(repeatedError);
        // A repeated b is itself ambiguous, and an ambiguous b is not honored
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=BUY&tokenId=${TOKEN_ID}&b=0&b=1`,
            ),
        ).toEqual(repeatedError);
    });

    it('treats an empty price/quantity as absent, not as a provided value', () => {
        // ?price= on a BUY must not trip the "cannot specify a price" error
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=BUY&tokenId=${TOKEN_ID}&price=`,
            ),
        ).toEqual({
            tokenId: TOKEN_ID,
            action: 'BUY',
            price: null,
            quantity: null,
            error: null,
            returnToBrowser: false,
        });
        // ?quantity= on a LIST must not trip the "cannot specify a quantity" error
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?action=LIST&tokenId=${TOKEN_ID}&quantity=`,
            ),
        ).toEqual({
            tokenId: TOKEN_ID,
            action: 'LIST',
            price: null,
            quantity: null,
            error: null,
            returnToBrowser: false,
        });
    });

    it('is not an agora action for a bip21 payment link', () => {
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?bip21=ecash:qq&action=BUY&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual(NOT_AN_AGORA_ACTION);
    });

    it('is not an agora action for a connect link', () => {
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token?connect=1&action=BUY&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual(NOT_AN_AGORA_ACTION);
    });

    it('is not an agora action for the wrong host or protocol', () => {
        expect(
            payecashDeepLinkToAgoraAction(
                `https://notpay.e.cash/token?action=BUY&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual(NOT_AN_AGORA_ACTION);
        expect(
            payecashDeepLinkToAgoraAction(
                `http://pay.e.cash/token?action=BUY&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual(NOT_AN_AGORA_ACTION);
    });

    it('accepts a trailing slash on the /token path', () => {
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token/?action=BUY&tokenId=${TOKEN_ID}`,
            ).action,
        ).toBe('BUY');
    });

    it('is not an agora action for a doubled slash on the path', () => {
        // Only /token and /token/ are accepted, exactly
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash/token//?action=BUY&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual(NOT_AN_AGORA_ACTION);
    });

    it('is not an agora action at the root path', () => {
        // Agora actions live on /token so that supporting them is optional.
        // The root path is for payment and connect links.
        expect(
            payecashDeepLinkToAgoraAction(
                `https://pay.e.cash?action=BUY&tokenId=${TOKEN_ID}`,
            ),
        ).toEqual(NOT_AN_AGORA_ACTION);
    });

    it('is not an agora action for an invalid URL', () => {
        expect(payecashDeepLinkToAgoraAction('not a url')).toEqual(
            NOT_AN_AGORA_ACTION,
        );
    });
});

describe('buildConnectCallbackUrl', () => {
    it('appends address to return_url hash', () => {
        const address = 'ecash:qp7g5uyxvun4r5afffs6pfy27eyhcqtj9cev06d8s5';
        expect(
            buildConnectCallbackUrl('https://blitzchips.com/', address),
        ).toBe(
            `https://blitzchips.com/#cashtab_connect=${encodeURIComponent(address)}`,
        );
    });
});
