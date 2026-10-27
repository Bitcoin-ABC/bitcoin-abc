// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useEffect } from 'react';
import { useLocation } from 'react-router';
import { Capacitor } from '@capacitor/core';
import appConfig from 'config/app';
import { FIRMA } from 'constants/tokens';

interface ReactGA {
    initialize: (
        trackingID: string,
        options?: { gtagOptions?: Record<string, unknown> },
    ) => void;
    gtag: (...args: unknown[]) => void;
    send: (fieldsObject: Record<string, unknown>) => void;
    event: (
        optionsOrName:
            | {
                  category: string;
                  action: string;
                  label?: string;
              }
            | string,
        params?: Record<string, unknown>,
    ) => void;
}

/**
 * Where this build of Cashtab is running. Sent with every hit so web,
 * Android and iOS can be compared in one GA4 property.
 *
 * The extension sends nothing. MV3 forbids the remote gtag.js script, and
 * the alternative (Measurement Protocol) needs an API secret bundled in
 * the extension. Use the Chrome Web Store dashboard for extension usage.
 */
export type AnalyticsPlatform = 'web' | 'android' | 'ios' | 'extension';

/** GA4 event param values must be string or number. */
export type AnalyticsParams = Record<string, string | number>;

export const getAnalyticsPlatform = (): AnalyticsPlatform => {
    if (import.meta.env.VITE_BUILD_ENV === 'extension') {
        return 'extension';
    }
    const native = Capacitor.getPlatform();
    if (native === 'android' || native === 'ios') {
        return native;
    }
    return 'web';
};

const platform = getAnalyticsPlatform();
const appVersion = import.meta.env.VITE_VERSION ?? 'unknown';
const measurementId = import.meta.env.VITE_GOOGLE_ANALYTICS;
/** Set VITE_GA_DEBUG=true to see hits in GA4 DebugView. */
const debugMode = import.meta.env.VITE_GA_DEBUG === 'true';

const CLIENT_ID_KEY = 'cashtab.analytics.clientId';

let enabled = false;

/**
 * Params attached to every event and page view, on every platform.
 */
const getDefaultParams = (): AnalyticsParams => ({
    platform,
    app_version: appVersion,
    ...(debugMode ? { debug_mode: 1 } : {}),
});

let clientId: string | null = null;
/**
 * Stable per-install id for experiment bucketing. It is random, never
 * derived from wallet data, and never sent to analytics.
 */
export const getAnalyticsClientId = (): string => {
    if (clientId !== null) {
        return clientId;
    }
    try {
        const stored = window.localStorage.getItem(CLIENT_ID_KEY);
        if (stored) {
            clientId = stored;
            return clientId;
        }
    } catch {
        // Storage unavailable; fall through to a per-session id
    }
    clientId = `${Math.floor(Math.random() * 2 ** 31)}.${Math.floor(
        Date.now() / 1000,
    )}`;
    try {
        window.localStorage.setItem(CLIENT_ID_KEY, clientId);
    } catch {
        // Keep the in-memory id for this session
    }
    return clientId;
};

/** GA4 user properties, e.g. experiment variants. */
const userProperties: Record<string, string> = { platform };

export const setAnalyticsUserProperty = (name: string, value: string) => {
    userProperties[name] = value;
    if (enabled && ReactGA !== undefined) {
        ReactGA.gtag('set', 'user_properties', { [name]: value });
    }
};

let ReactGA: ReactGA | undefined;
let ReactGALoaded = false;

// Lazy load react-ga4 for Vite compatibility (can't use require in browser).
// Never loaded on the extension, so nothing is sent from there.
const loadReactGA = async () => {
    if (ReactGALoaded || ReactGA !== undefined) return ReactGA;
    if (platform !== 'extension') {
        try {
            const module = await import('react-ga4');
            ReactGA = (module.default || module) as unknown as ReactGA;
            ReactGALoaded = true;
        } catch (e) {
            console.warn('Failed to load react-ga4:', e);
        }
    }
    return ReactGA;
};

/**
 * Turn a route into a stable screen name for reports. Token pages carry a
 * 64-hex token id, which would split one screen into thousands of rows.
 */
export const getScreenName = (pathname: string): string => {
    const tokenMatch = pathname.match(/^\/(token|send-token)\/([0-9a-f]{64})/);
    if (tokenMatch !== null) {
        const [, base, tokenId] = tokenMatch;
        if (tokenId === appConfig.vipTokens.xecx.tokenId) {
            return `/${base}/XECX`;
        }
        if (tokenId === FIRMA.tokenId) {
            return `/${base}/FIRMA`;
        }
        return `/${base}/:tokenId`;
    }
    return pathname === '' ? '/' : pathname;
};

/**
 * GA4-native event. Use snake_case names (max 40 chars) and snake_case
 * params. Platform and app version are added automatically.
 */
export const trackEvent = (name: string, params: AnalyticsParams = {}) => {
    const fullParams = { ...getDefaultParams(), ...params };
    // Fire and forget - load ReactGA asynchronously and track event
    loadReactGA().then(ga => {
        if (ga) {
            ga.event(name, fullParams);
        }
    });
};

/**
 * Page view with a normalized path. Query strings are dropped: they can
 * carry addresses and amounts (e.g. /send?address=...), and they split one
 * screen into many report rows. page_location is set explicitly so the
 * hash route in the URL does not leak them either.
 */
export const getPageViewParams = (pathname: string): AnalyticsParams => {
    const screen = getScreenName(pathname);
    return {
        ...getDefaultParams(),
        page_path: screen,
        page_location: `${window.location.origin}${window.location.pathname}#${screen}`,
        page_title: document.title,
    };
};

export const trackPageView = (pathname: string) => {
    const params = getPageViewParams(pathname);
    loadReactGA().then(ga => {
        if (ga) {
            ga.send({
                hitType: 'pageview',
                page: params.page_path,
                ...params,
            });
        }
    });
};

const RouteTracker: React.FC = () => {
    const location = useLocation();
    useEffect(() => {
        trackPageView(location.pathname);
    }, [location.pathname]);
    return null;
};

const init = async () => {
    if (!import.meta.env.PROD || !measurementId) {
        return false;
    }
    const ga = await loadReactGA();
    if (typeof ga === 'undefined') {
        // We return false here to prevent rendering route tracker
        // see top level index.tsx
        // in this case ReactGA is undefined and will not have an initialize method
        return false;
    }
    ga.initialize(measurementId, {
        gtagOptions: {
            // RouteTracker sends every page view, including the first
            send_page_view: false,
            ...getDefaultParams(),
        },
    });
    // Also covers legacy Event() hits, which do not take params
    ga.gtag('set', getDefaultParams());
    ga.gtag('set', 'user_properties', userProperties);
    enabled = true;
    return true;
};

/**
 * Legacy Universal Analytics-style event, kept so existing reports
 * (e.g. Onboarding "Create Wallet") continue unchanged. New code should
 * use trackEvent.
 */
export const Event = (category: string, action: string, label: string) => {
    // Fire and forget - load ReactGA asynchronously and track event
    loadReactGA().then(ga => {
        if (ga) {
            ga.event({
                category,
                action,
                label,
            });
        }
    });
};

export default {
    RouteTracker,
    init,
};

/**
 * XECX / FIRMA / other, so funnels can be split by token without sending
 * 64-hex ids for every token.
 */
export const getAnalyticsTokenLabel = (tokenId: string | undefined): string => {
    if (tokenId === appConfig.vipTokens.xecx.tokenId) {
        return 'XECX';
    }
    if (tokenId === FIRMA.tokenId) {
        return 'FIRMA';
    }
    return 'other';
};

/**
 * Coarse trade size in the user's fiat currency. We never send exact
 * amounts; on-chain data is the source of truth for volume.
 */
export const getFiatValueBucket = (fiatValue: number | null): string => {
    if (fiatValue === null || !Number.isFinite(fiatValue) || fiatValue < 0) {
        return 'unknown';
    }
    if (fiatValue < 10) {
        return '<10';
    }
    if (fiatValue < 100) {
        return '10-100';
    }
    if (fiatValue < 1000) {
        return '100-1k';
    }
    if (fiatValue < 10000) {
        return '1k-10k';
    }
    return '10k+';
};

/**
 * Where a buy / redeem / swap was started from, so lift from a new entry
 * point (e.g. Convert) can be measured against the existing screens.
 */
export type TradeSource = 'convert' | 'token_page' | 'deeplink' | 'alpswap';
