// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import styled from 'styled-components';
import { Capacitor } from '@capacitor/core';
import { ANDROID_STORE_URL } from 'constants/store';
import { isAndroidMobileWebUserAgent } from 'helpers';

/** Incremented each time the user dismisses the bar; hidden permanently at 3. */
const DISMISS_COUNT_KEY = 'cashtabAndroidAppBannerDismissCount';

const MAX_DISMISSALS_BEFORE_HIDE = 3;

const MESSAGE_FIRST =
    'For the best experience on your phone, use the Cashtab Android app.';
const MESSAGE_AFTER_FIRST_DISMISS =
    'Your private keys are more secure in the app.';

const BannerRoot = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.5rem 0.75rem;
    padding: 0.5rem 2.25rem 0.5rem 0.75rem;
    padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
    background: ${props => props.theme.primaryBackground};
    border-bottom: 1px solid ${props => props.theme.accent};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    color: ${props => props.theme.primaryText};
    text-align: center;
`;

const BannerText = styled.span`
    flex: 1 1 200px;
    max-width: 42rem;
`;

const DownloadLink = styled.a`
    font-weight: 600;
    white-space: nowrap;
`;

const DismissButton = styled.button`
    position: absolute;
    top: calc(0.35rem + env(safe-area-inset-top, 0px));
    right: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: ${props => props.theme.secondaryText};
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
        color: ${props => props.theme.primaryText};
        background: ${props => props.theme.txRowBackground};
    }
`;

/** Parses stored dismiss count; any value that is not a non-negative integer string is 0. */
function readDismissCount(): number {
    try {
        const raw = localStorage.getItem(DISMISS_COUNT_KEY);
        if (raw === null) {
            return 0;
        }
        const trimmed = raw.trim();
        if (!/^\d+$/.test(trimmed)) {
            return 0;
        }
        const n = parseInt(trimmed, 10);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
        return 0;
    }
}

/**
 * Fixed top bar on Cashtab Web for Android phone browsers, nudging users toward the
 * native app. Shown up to three times (tracked by dismiss count). Hidden in the Capacitor
 * app, after three dismissals, or on non-Android.
 */
const AndroidWebAppBanner: React.FC = () => {
    const [visible, setVisible] = useState(false);
    /** Dismissals already recorded before this banner instance (0 = first message). */
    const [priorDismissals, setPriorDismissals] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (import.meta.env.VITE_BUILD_ENV === 'extension') {
            return;
        }
        if (Capacitor.isNativePlatform()) {
            return;
        }
        const dismissCount = readDismissCount();
        if (dismissCount >= MAX_DISMISSALS_BEFORE_HIDE) {
            return;
        }
        if (!isAndroidMobileWebUserAgent(navigator)) {
            return;
        }
        setPriorDismissals(dismissCount);
        setVisible(true);
    }, []);

    const syncBodyPadding = useCallback(() => {
        const el = rootRef.current;
        if (!el || !visible) {
            return;
        }
        document.body.style.paddingTop = `${el.getBoundingClientRect().height}px`;
    }, [visible]);

    useLayoutEffect(() => {
        if (!visible) {
            document.body.style.paddingTop = '';
            return;
        }
        syncBodyPadding();
        const el = rootRef.current;
        if (!el) {
            return;
        }
        const ro = new ResizeObserver(syncBodyPadding);
        ro.observe(el);
        window.addEventListener('resize', syncBodyPadding);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', syncBodyPadding);
            document.body.style.paddingTop = '';
        };
    }, [visible, syncBodyPadding]);

    const dismiss = () => {
        const next = priorDismissals + 1;
        try {
            localStorage.setItem(DISMISS_COUNT_KEY, String(next));
        } catch {
            /* ignore */
        }
        setVisible(false);
    };

    if (!visible) {
        return null;
    }

    return (
        <BannerRoot
            ref={rootRef}
            role="region"
            aria-label="Cashtab Android app"
        >
            <BannerText>
                {priorDismissals === 0
                    ? MESSAGE_FIRST
                    : MESSAGE_AFTER_FIRST_DISMISS}
            </BannerText>
            <DownloadLink
                href={ANDROID_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
            >
                Get it on Google Play
            </DownloadLink>
            <DismissButton
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                title="Dismiss"
            >
                ×
            </DismissButton>
        </BannerRoot>
    );
};

export default AndroidWebAppBanner;
