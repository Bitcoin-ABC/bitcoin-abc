// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Dock height used for scroll clearance while the keypad is open.
 * Keep in sync with KeypadDock padding + 4×52px keys + 3×8px gaps.
 */
export const CASHTAB_AMOUNT_KEYPAD_OFFSET_PX = 255;

export const CASHTAB_AMOUNT_KEYPAD_OFFSET_VAR =
    '--cashtab-amount-keypad-offset';

/**
 * Optional extra bottom inset (e.g. fixed Send CTA height) so the keypad
 * sits above page actions instead of covering them. Set by the host screen
 * and/or re-measured when the keypad mounts.
 */
export const CASHTAB_FIXED_CTA_OFFSET_VAR = '--cashtab-fixed-cta-offset';

/** Host screens mark the fixed bottom CTA with this attribute for measurement. */
export const CASHTAB_FIXED_CTA_ATTR = 'data-cashtab-fixed-cta';

/** Cashtab bottom nav height on narrow viewports (see Footer / SendButtonContainer). */
export const CASHTAB_MOBILE_FOOTER_OFFSET_PX = 70;

/** Extra gap so the amount field is not flush against the keypad top edge. */
export const CASHTAB_AMOUNT_KEYPAD_SCROLL_PAD_PX = 12;

/**
 * Parse a CSS pixel custom property, falling back when unset or invalid.
 */
export const parseCssPxProperty = (
    styles: CSSStyleDeclaration,
    property: string,
    fallback: number,
): number => {
    const n = parseFloat(styles.getPropertyValue(property));
    return Number.isFinite(n) ? n : fallback;
};

/**
 * Mobile footer clearance; desktop Send layouts dock the keypad above the CTA only.
 */
export const getMobileFooterOffsetPx = (
    matchMediaFn: typeof window.matchMedia | undefined = typeof window !==
    'undefined'
        ? window.matchMedia
        : undefined,
): number => {
    if (
        typeof matchMediaFn === 'function' &&
        matchMediaFn('(min-width: 769px)').matches
    ) {
        return 0;
    }
    return CASHTAB_MOBILE_FOOTER_OFFSET_PX;
};

/**
 * Measure the fixed CTA height from the DOM (preferred) or the CSS variable.
 */
export const measureFixedCtaOffsetPx = (
    doc: Document = typeof document !== 'undefined'
        ? document
        : (undefined as unknown as Document),
): number => {
    if (typeof doc === 'undefined' || doc === null) {
        return 0;
    }
    const cta = doc.querySelector<HTMLElement>(`[${CASHTAB_FIXED_CTA_ATTR}]`);
    if (cta && cta.offsetHeight > 0) {
        return cta.offsetHeight;
    }
    return parseCssPxProperty(
        getComputedStyle(doc.documentElement),
        CASHTAB_FIXED_CTA_OFFSET_VAR,
        0,
    );
};

/**
 * Bottom inset occupied by footer + fixed CTA + open amount keypad (+ pad).
 * Used for scroll-margin / manual scroll so the focused amount field stays visible.
 */
export const getAmountKeypadClearancePx = (
    doc: Document = typeof document !== 'undefined'
        ? document
        : (undefined as unknown as Document),
    matchMediaFn?: typeof window.matchMedia,
): number => {
    if (typeof doc === 'undefined' || doc === null) {
        return (
            CASHTAB_MOBILE_FOOTER_OFFSET_PX +
            CASHTAB_AMOUNT_KEYPAD_OFFSET_PX +
            CASHTAB_AMOUNT_KEYPAD_SCROLL_PAD_PX
        );
    }
    const rootStyles = getComputedStyle(doc.documentElement);
    const keypadOffset = parseCssPxProperty(
        rootStyles,
        CASHTAB_AMOUNT_KEYPAD_OFFSET_VAR,
        CASHTAB_AMOUNT_KEYPAD_OFFSET_PX,
    );
    return (
        getMobileFooterOffsetPx(matchMediaFn) +
        measureFixedCtaOffsetPx(doc) +
        keypadOffset +
        CASHTAB_AMOUNT_KEYPAD_SCROLL_PAD_PX
    );
};

/**
 * Find the nearest scrollable ancestor (or the window scrolling element).
 */
export const getScrollParent = (
    node: HTMLElement | null,
): HTMLElement | null => {
    let current = node?.parentElement ?? null;
    while (current) {
        const style = getComputedStyle(current);
        const overflowY = style.overflowY;
        if (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            current.scrollHeight > current.clientHeight
        ) {
            return current;
        }
        current = current.parentElement;
    }
    return (document.scrollingElement as HTMLElement | null) ?? null;
};

/** Restores inline scroll-margin-bottom after the amount keypad closes. */
export type AmountKeypadScrollMarginRestore = () => void;

/**
 * Apply keypad clearance as inline scroll-margin-bottom, preserving any prior
 * inline value/priority so the keypad unmount path can restore them.
 */
export const applyAmountKeypadScrollMargin = (
    el: HTMLElement,
    doc: Document = typeof document !== 'undefined'
        ? document
        : (undefined as unknown as Document),
    existingRestore?: AmountKeypadScrollMarginRestore | null,
): AmountKeypadScrollMarginRestore => {
    const clearance = getAmountKeypadClearancePx(doc);
    if (existingRestore) {
        el.style.setProperty('scroll-margin-bottom', `${clearance}px`);
        return existingRestore;
    }
    const prevValue = el.style.getPropertyValue('scroll-margin-bottom');
    const prevPriority = el.style.getPropertyPriority('scroll-margin-bottom');
    el.style.setProperty('scroll-margin-bottom', `${clearance}px`);
    return () => {
        if (prevValue) {
            el.style.setProperty(
                'scroll-margin-bottom',
                prevValue,
                prevPriority,
            );
        } else {
            el.style.removeProperty('scroll-margin-bottom');
        }
    };
};

/**
 * Scroll an amount field so it sits above the fixed keypad dock.
 * Custom keypads do not trigger the browser's OS-keyboard scroll-into-view.
 * Returns a restore for the inline scroll-margin written here — call it when
 * the keypad unmounts (pass the same restore back on later scroll passes).
 */
export const scrollAmountFieldAboveKeypad = (
    el: HTMLElement,
    options?: {
        behavior?: ScrollBehavior;
        doc?: Document;
        viewHeightPx?: number;
        scrollMarginRestore?: AmountKeypadScrollMarginRestore | null;
    },
): AmountKeypadScrollMarginRestore => {
    if (typeof window === 'undefined') {
        return () => undefined;
    }
    const doc = options?.doc ?? document;
    const clearance = getAmountKeypadClearancePx(doc);
    const behavior = options?.behavior ?? 'smooth';
    const viewHeight = options?.viewHeightPx ?? window.innerHeight;

    const restore = applyAmountKeypadScrollMargin(
        el,
        doc,
        options?.scrollMarginRestore,
    );
    el.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior,
    });

    // scroll-margin is ignored by some nested scrollers / older WebKit; nudge if still covered.
    const rect = el.getBoundingClientRect();
    const maxBottom = viewHeight - clearance;
    if (rect.bottom <= maxBottom && rect.top >= 0) {
        return restore;
    }
    const delta =
        rect.bottom > maxBottom
            ? rect.bottom - maxBottom
            : rect.top < 0
              ? rect.top
              : 0;
    if (delta === 0) {
        return restore;
    }
    const scrollParent = getScrollParent(el);
    if (scrollParent) {
        scrollParent.scrollBy({ top: delta, behavior });
    } else {
        window.scrollBy({ top: delta, behavior });
    }
    return restore;
};

/**
 * If the focused element is an amount input, scroll it above the keypad.
 * Returns a scroll-margin restore when an input was scrolled, else null.
 */
export const scrollFocusedAmountFieldAboveKeypad = (
    doc: Document = typeof document !== 'undefined'
        ? document
        : (undefined as unknown as Document),
    scrollMarginRestore?: AmountKeypadScrollMarginRestore | null,
): AmountKeypadScrollMarginRestore | null => {
    if (typeof doc === 'undefined' || doc === null) {
        return null;
    }
    const el = doc.activeElement;
    if (!(el instanceof HTMLElement)) {
        return null;
    }
    if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
        return null;
    }
    return scrollAmountFieldAboveKeypad(el, { doc, scrollMarginRestore });
};
