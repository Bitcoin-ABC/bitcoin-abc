// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    paybuttonDeepLinkToBip21Uri,
    payecashDeepLinkToBip21Uri,
    payecashDeepLinkToConnectRequest,
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
