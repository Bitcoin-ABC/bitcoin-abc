// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import appConfig from 'config/app';
import { FIRMA } from 'constants/tokens';
import {
    getAnalyticsPlatform,
    getFiatValueBucket,
    getPageViewParams,
    getScreenName,
} from 'components/Common/GoogleAnalytics';

const XECX_TOKEN_ID = appConfig.vipTokens.xecx.tokenId;
const OTHER_TOKEN_ID = 'aa'.repeat(32);

describe('GoogleAnalytics helpers', () => {
    it('reports web outside of the extension and native apps', () => {
        expect(getAnalyticsPlatform()).toBe('web');
    });
    it('names token screens by ticker for XECX and FIRMA only', () => {
        expect(getScreenName(`/token/${XECX_TOKEN_ID}`)).toBe('/token/XECX');
        expect(getScreenName(`/token/${FIRMA.tokenId}`)).toBe('/token/FIRMA');
        expect(getScreenName(`/send-token/${FIRMA.tokenId}`)).toBe(
            '/send-token/FIRMA',
        );
        expect(getScreenName(`/token/${OTHER_TOKEN_ID}`)).toBe(
            '/token/:tokenId',
        );
        expect(getScreenName('/convert')).toBe('/convert');
        expect(getScreenName('')).toBe('/');
    });
    it('sends normalized page paths and locations without token ids or queries', () => {
        document.title = 'Cashtab';
        const params = getPageViewParams(`/token/${OTHER_TOKEN_ID}`);
        expect(params).toEqual(
            expect.objectContaining({
                platform: 'web',
                page_path: '/token/:tokenId',
                page_location: `${window.location.origin}${window.location.pathname}#/token/:tokenId`,
                page_title: 'Cashtab',
            }),
        );
        expect(JSON.stringify(params)).not.toContain(OTHER_TOKEN_ID);
    });
    it('buckets fiat values', () => {
        expect(getFiatValueBucket(null)).toBe('unknown');
        expect(getFiatValueBucket(NaN)).toBe('unknown');
        expect(getFiatValueBucket(-1)).toBe('unknown');
        expect(getFiatValueBucket(0)).toBe('<10');
        expect(getFiatValueBucket(9.99)).toBe('<10');
        expect(getFiatValueBucket(10)).toBe('10-100');
        expect(getFiatValueBucket(999)).toBe('100-1k');
        expect(getFiatValueBucket(1000)).toBe('1k-10k');
        expect(getFiatValueBucket(10000)).toBe('10k+');
    });
});

describe('GoogleAnalytics on the extension', () => {
    const savedEnv = { ...process.env };
    const fetchMock = jest.fn(() => Promise.resolve({} as Response));

    beforeEach(() => {
        process.env.VITE_BUILD_ENV = 'extension';
        process.env.PROD = 'true';
        process.env.VITE_GOOGLE_ANALYTICS = 'G-TEST';
        fetchMock.mockClear();
        global.fetch = fetchMock as unknown as typeof fetch;
        window.localStorage.clear();
    });
    afterEach(() => {
        process.env = { ...savedEnv };
    });

    it('never initializes or sends anything, even with an id set', async () => {
        await jest.isolateModulesAsync(async () => {
            const GA = await import('components/Common/GoogleAnalytics');
            expect(GA.getAnalyticsPlatform()).toBe('extension');
            expect(await GA.default.init()).toBe(false);
            GA.trackEvent('swap_submit', { pair: 'XECX>FIRMA' });
            GA.trackPageView('/send');
            GA.Event('Onboarding.js', 'Create Wallet', 'New');
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    it('keeps the same client id across launches for experiments', async () => {
        let first = '';
        await jest.isolateModulesAsync(async () => {
            const GA = await import('components/Common/GoogleAnalytics');
            first = GA.getAnalyticsClientId();
        });
        await jest.isolateModulesAsync(async () => {
            const GA = await import('components/Common/GoogleAnalytics');
            expect(GA.getAnalyticsClientId()).toBe(first);
        });
    });
});
