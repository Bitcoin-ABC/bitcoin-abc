// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CASHTAB_MOBILE_FOOTER_OFFSET_VAR } from './cashtabAmountKeypadScroll';

export { CASHTAB_MOBILE_FOOTER_OFFSET_VAR } from './cashtabAmountKeypadScroll';

/** Set on <html> while the OS keyboard is treating the mobile chrome as covered. */
export const CASHTAB_OS_KEYBOARD_ATTR = 'data-cashtab-os-keyboard';

/** visualViewport inset that counts as an on-screen OS keyboard (not URL-bar jitter). */
export const CASHTAB_OS_KEYBOARD_INSET_THRESHOLD_PX = 150;

const NO_OS_KEYBOARD_INPUT_TYPES = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
]);

/**
 * True when focusing this node would raise the system keyboard.
 * Amount-keypad fields are readOnly + inputMode=none and return false.
 */
export const inputAcceptsOsKeyboard = (
    el: EventTarget | null | undefined,
): boolean => {
    if (el == null || !(el instanceof HTMLElement)) {
        return false;
    }
    if (el instanceof HTMLTextAreaElement) {
        return !el.disabled && !el.readOnly;
    }
    if (!(el instanceof HTMLInputElement)) {
        return false;
    }
    if (el.disabled || el.readOnly) {
        return false;
    }
    if (el.inputMode === 'none') {
        return false;
    }
    return !NO_OS_KEYBOARD_INPUT_TYPES.has(el.type);
};

/**
 * Overlay keyboards shrink visualViewport vs innerHeight (iOS).
 * Android adjustResize shrinks both together, so this inset is ~0 there —
 * use layout shrink vs a keyboard-closed innerHeight instead.
 */
export const getVisualViewportKeyboardInsetPx = (
    win: Pick<Window, 'innerHeight' | 'visualViewport'> = window,
): number => {
    const vv = win.visualViewport;
    if (!vv) {
        return 0;
    }
    return Math.max(0, win.innerHeight - vv.height - (vv.offsetTop || 0));
};

/**
 * How much the layout viewport has shrunk vs the last keyboard-closed height.
 * Covers Android adjustResize, where visualViewport inset stays ~0.
 */
export const getLayoutKeyboardShrinkPx = (
    closedInnerHeightPx: number,
    currentInnerHeightPx: number,
): number => Math.max(0, closedInnerHeightPx - currentInnerHeightPx);

/**
 * Narrow Cashtab chrome (fixed 70px footer). Desktop sidebar is unchanged.
 */
export const isMobileFooterViewport = (
    matchMediaFn?: typeof window.matchMedia,
    innerWidth?: number,
): boolean => {
    if (typeof matchMediaFn === 'function') {
        return matchMediaFn('(max-width: 768px)').matches;
    }
    if (typeof innerWidth === 'number') {
        return innerWidth <= 768;
    }
    return false;
};

export interface OsKeyboardOpenState {
    isMobileFooter: boolean;
    visualViewportInsetPx: number;
    layoutShrinkPx?: number;
    insetThresholdPx?: number;
}

/**
 * Hide the bottom nav only while the OS keyboard is actually on screen.
 * Focus is not enough: dismissing the keyboard often leaves the field focused.
 */
export const isOsKeyboardOpen = ({
    isMobileFooter,
    visualViewportInsetPx,
    layoutShrinkPx = 0,
    insetThresholdPx = CASHTAB_OS_KEYBOARD_INSET_THRESHOLD_PX,
}: OsKeyboardOpenState): boolean => {
    if (!isMobileFooter) {
        return false;
    }
    return (
        visualViewportInsetPx >= insetThresholdPx ||
        layoutShrinkPx >= insetThresholdPx
    );
};

/**
 * Toggle the html attribute and footer-offset CSS variable used by Footer / CTAs.
 */
export const applyOsKeyboardChrome = (
    open: boolean,
    root: HTMLElement = document.documentElement,
): void => {
    if (open) {
        root.setAttribute(CASHTAB_OS_KEYBOARD_ATTR, '');
        root.style.setProperty(CASHTAB_MOBILE_FOOTER_OFFSET_VAR, '0px');
        return;
    }
    root.removeAttribute(CASHTAB_OS_KEYBOARD_ATTR);
    root.style.removeProperty(CASHTAB_MOBILE_FOOTER_OFFSET_VAR);
};

export interface SubscribeOsKeyboardChromeOptions {
    win?: Window;
    doc?: Document;
    matchMediaFn?: typeof window.matchMedia;
}

/**
 * Keep Footer / fixed CTA offsets in sync with the OS keyboard.
 * Returns an unsubscribe that clears the chrome.
 */
export const subscribeOsKeyboardChrome = (
    options: SubscribeOsKeyboardChromeOptions = {},
): (() => void) => {
    const win =
        options.win ?? (typeof window !== 'undefined' ? window : undefined);
    const doc =
        options.doc ?? (typeof document !== 'undefined' ? document : undefined);
    if (!win || !doc) {
        return () => undefined;
    }

    const matchMediaFn = options.matchMediaFn ?? win.matchMedia?.bind(win);
    const root = doc.documentElement;
    let closedInnerWidth = win.innerWidth;
    let closedInnerHeight = win.innerHeight;

    const sync = () => {
        if (win.innerWidth !== closedInnerWidth) {
            closedInnerWidth = win.innerWidth;
            closedInnerHeight = win.innerHeight;
        }
        const open = isOsKeyboardOpen({
            isMobileFooter: isMobileFooterViewport(
                matchMediaFn,
                win.innerWidth,
            ),
            visualViewportInsetPx: getVisualViewportKeyboardInsetPx(win),
            layoutShrinkPx: getLayoutKeyboardShrinkPx(
                closedInnerHeight,
                win.innerHeight,
            ),
        });
        if (!open) {
            closedInnerHeight = win.innerHeight;
            closedInnerWidth = win.innerWidth;
        }
        applyOsKeyboardChrome(open, root);
    };

    const onFocusOut = () => {
        win.requestAnimationFrame(sync);
    };

    doc.addEventListener('focusin', sync);
    doc.addEventListener('focusout', onFocusOut);
    win.addEventListener('resize', sync);
    const vv = win.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    const mql =
        typeof matchMediaFn === 'function'
            ? matchMediaFn('(max-width: 768px)')
            : undefined;
    mql?.addEventListener?.('change', sync);

    sync();

    return () => {
        doc.removeEventListener('focusin', sync);
        doc.removeEventListener('focusout', onFocusOut);
        win.removeEventListener('resize', sync);
        vv?.removeEventListener('resize', sync);
        vv?.removeEventListener('scroll', sync);
        mql?.removeEventListener?.('change', sync);
        applyOsKeyboardChrome(false, root);
    };
};
