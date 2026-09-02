// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { renderHook } from '@testing-library/react';
import { CASHTAB_OS_KEYBOARD_ATTR } from 'components/Common/cashtabOsKeyboard';
import { useOsKeyboardChrome } from 'hooks/useOsKeyboardChrome';

describe('useOsKeyboardChrome', () => {
    const originalVisualViewport = window.visualViewport;

    afterEach(() => {
        document.documentElement.removeAttribute(CASHTAB_OS_KEYBOARD_ATTR);
        document.documentElement.style.removeProperty(
            '--cashtab-mobile-footer-offset',
        );
        Object.defineProperty(window, 'visualViewport', {
            configurable: true,
            value: originalVisualViewport,
        });
    });

    it('subscribes on mount and clears chrome on unmount', () => {
        const matchMedia = jest.fn().mockReturnValue({
            matches: true,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        });
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: matchMedia,
        });

        const listeners = new Set<(event?: Event) => void>();
        const visualViewport = {
            height: window.innerHeight,
            offsetTop: 0,
            addEventListener: (
                type: string,
                listener: EventListenerOrEventListenerObject,
            ) => {
                if (type === 'resize' && typeof listener === 'function') {
                    listeners.add(listener as (event?: Event) => void);
                }
            },
            removeEventListener: (
                type: string,
                listener: EventListenerOrEventListenerObject,
            ) => {
                if (type === 'resize' && typeof listener === 'function') {
                    listeners.delete(listener as (event?: Event) => void);
                }
            },
        };
        Object.defineProperty(window, 'visualViewport', {
            configurable: true,
            value: visualViewport,
        });

        const { unmount } = renderHook(() => useOsKeyboardChrome());
        visualViewport.height = Math.max(0, window.innerHeight - 300);
        listeners.forEach(listener => listener());
        expect(
            document.documentElement.hasAttribute(CASHTAB_OS_KEYBOARD_ATTR),
        ).toBe(true);

        unmount();
        expect(
            document.documentElement.hasAttribute(CASHTAB_OS_KEYBOARD_ATTR),
        ).toBe(false);
    });
});
