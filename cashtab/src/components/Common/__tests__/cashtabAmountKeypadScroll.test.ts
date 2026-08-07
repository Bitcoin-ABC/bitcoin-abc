// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    applyAmountKeypadScrollMargin,
    CASHTAB_AMOUNT_KEYPAD_OFFSET_PX,
    CASHTAB_AMOUNT_KEYPAD_OFFSET_VAR,
    CASHTAB_AMOUNT_KEYPAD_SCROLL_PAD_PX,
    CASHTAB_FIXED_CTA_ATTR,
    CASHTAB_FIXED_CTA_OFFSET_VAR,
    CASHTAB_MOBILE_FOOTER_OFFSET_PX,
    getAmountKeypadClearancePx,
    getMobileFooterOffsetPx,
    measureFixedCtaOffsetPx,
    parseCssPxProperty,
    scrollAmountFieldAboveKeypad,
} from 'components/Common/cashtabAmountKeypadScroll';

describe('cashtabAmountKeypadScroll', () => {
    describe('parseCssPxProperty', () => {
        it('parses a pixel custom property', () => {
            const styles = {
                getPropertyValue: (name: string) =>
                    name === '--x' ? '42px' : '',
            } as unknown as CSSStyleDeclaration;
            expect(parseCssPxProperty(styles, '--x', 0)).toBe(42);
        });

        it('falls back when unset', () => {
            const styles = {
                getPropertyValue: () => '',
            } as unknown as CSSStyleDeclaration;
            expect(parseCssPxProperty(styles, '--x', 7)).toBe(7);
        });
    });

    describe('getMobileFooterOffsetPx', () => {
        it('returns 0 on desktop breakpoints', () => {
            const matchMedia = (() => ({
                matches: true,
            })) as unknown as typeof window.matchMedia;
            expect(getMobileFooterOffsetPx(matchMedia)).toBe(0);
        });

        it('returns the Cashtab footer height on mobile', () => {
            const matchMedia = (() => ({
                matches: false,
            })) as unknown as typeof window.matchMedia;
            expect(getMobileFooterOffsetPx(matchMedia)).toBe(
                CASHTAB_MOBILE_FOOTER_OFFSET_PX,
            );
        });
    });

    describe('measureFixedCtaOffsetPx', () => {
        it('reads height from the marked CTA element', () => {
            const cta = document.createElement('div');
            cta.setAttribute(CASHTAB_FIXED_CTA_ATTR, '');
            Object.defineProperty(cta, 'offsetHeight', {
                configurable: true,
                value: 64,
            });
            document.body.appendChild(cta);
            try {
                expect(measureFixedCtaOffsetPx(document)).toBe(64);
            } finally {
                cta.remove();
            }
        });

        it('falls back to the CSS variable when no CTA is marked', () => {
            document.documentElement.style.setProperty(
                CASHTAB_FIXED_CTA_OFFSET_VAR,
                '48px',
            );
            try {
                expect(measureFixedCtaOffsetPx(document)).toBe(48);
            } finally {
                document.documentElement.style.removeProperty(
                    CASHTAB_FIXED_CTA_OFFSET_VAR,
                );
            }
        });
    });

    describe('getAmountKeypadClearancePx', () => {
        it('sums footer, CTA, keypad offset, and pad', () => {
            document.documentElement.style.setProperty(
                CASHTAB_AMOUNT_KEYPAD_OFFSET_VAR,
                `${CASHTAB_AMOUNT_KEYPAD_OFFSET_PX}px`,
            );
            document.documentElement.style.setProperty(
                CASHTAB_FIXED_CTA_OFFSET_VAR,
                '48px',
            );
            const matchMedia = (() => ({
                matches: false,
            })) as unknown as typeof window.matchMedia;
            try {
                expect(getAmountKeypadClearancePx(document, matchMedia)).toBe(
                    CASHTAB_MOBILE_FOOTER_OFFSET_PX +
                        48 +
                        CASHTAB_AMOUNT_KEYPAD_OFFSET_PX +
                        CASHTAB_AMOUNT_KEYPAD_SCROLL_PAD_PX,
                );
            } finally {
                document.documentElement.style.removeProperty(
                    CASHTAB_AMOUNT_KEYPAD_OFFSET_VAR,
                );
                document.documentElement.style.removeProperty(
                    CASHTAB_FIXED_CTA_OFFSET_VAR,
                );
            }
        });
    });

    describe('scrollAmountFieldAboveKeypad', () => {
        it('sets scroll-margin-bottom and scrolls when covered', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            const scrollIntoView = jest.fn();
            input.scrollIntoView = scrollIntoView;

            const scrollBy = jest
                .spyOn(window, 'scrollBy')
                .mockImplementation(() => undefined);

            jest.spyOn(input, 'getBoundingClientRect').mockReturnValue({
                top: 400,
                bottom: 450,
                left: 0,
                right: 100,
                width: 100,
                height: 50,
                x: 0,
                y: 400,
                toJSON: () => ({}),
            });

            document.documentElement.style.setProperty(
                CASHTAB_AMOUNT_KEYPAD_OFFSET_VAR,
                '255px',
            );
            document.documentElement.style.setProperty(
                CASHTAB_FIXED_CTA_OFFSET_VAR,
                '48px',
            );

            try {
                scrollAmountFieldAboveKeypad(input, {
                    behavior: 'auto',
                    viewHeightPx: 700,
                });

                const expectedClearance =
                    CASHTAB_MOBILE_FOOTER_OFFSET_PX +
                    48 +
                    255 +
                    CASHTAB_AMOUNT_KEYPAD_SCROLL_PAD_PX;
                expect(input.style.scrollMarginBottom).toBe(
                    `${expectedClearance}px`,
                );
                expect(scrollIntoView).toHaveBeenCalledWith({
                    block: 'nearest',
                    inline: 'nearest',
                    behavior: 'auto',
                });
                // 450 > 700 - clearance (≈ 315) → nudge up
                expect(scrollBy).toHaveBeenCalled();
            } finally {
                scrollBy.mockRestore();
                input.remove();
                document.documentElement.style.removeProperty(
                    CASHTAB_AMOUNT_KEYPAD_OFFSET_VAR,
                );
                document.documentElement.style.removeProperty(
                    CASHTAB_FIXED_CTA_OFFSET_VAR,
                );
            }
        });

        it('does not nudge when the field is already clear of the keypad', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.scrollIntoView = jest.fn();
            const scrollBy = jest
                .spyOn(window, 'scrollBy')
                .mockImplementation(() => undefined);
            jest.spyOn(input, 'getBoundingClientRect').mockReturnValue({
                top: 40,
                bottom: 90,
                left: 0,
                right: 100,
                width: 100,
                height: 50,
                x: 0,
                y: 40,
                toJSON: () => ({}),
            });

            try {
                scrollAmountFieldAboveKeypad(input, {
                    behavior: 'auto',
                    viewHeightPx: 900,
                });
                expect(scrollBy).not.toHaveBeenCalled();
            } finally {
                scrollBy.mockRestore();
                input.remove();
            }
        });

        it('returns a restore that clears keypad scroll-margin', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.scrollIntoView = jest.fn();

            try {
                const restore = scrollAmountFieldAboveKeypad(input, {
                    behavior: 'auto',
                    viewHeightPx: 900,
                });
                expect(input.style.scrollMarginBottom).not.toBe('');
                restore();
                expect(input.style.scrollMarginBottom).toBe('');
            } finally {
                input.remove();
            }
        });
    });

    describe('applyAmountKeypadScrollMargin', () => {
        it('restores a prior inline scroll-margin value and priority', () => {
            const input = document.createElement('input');
            input.style.setProperty('scroll-margin-bottom', '8px', 'important');
            document.body.appendChild(input);

            try {
                const restore = applyAmountKeypadScrollMargin(input);
                expect(
                    input.style.getPropertyValue('scroll-margin-bottom'),
                ).not.toBe('8px');
                restore();
                expect(
                    input.style.getPropertyValue('scroll-margin-bottom'),
                ).toBe('8px');
                expect(
                    input.style.getPropertyPriority('scroll-margin-bottom'),
                ).toBe('important');
            } finally {
                input.remove();
            }
        });

        it('reuses an existing restore so later writes keep the original baseline', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            try {
                const first = applyAmountKeypadScrollMargin(input);
                const second = applyAmountKeypadScrollMargin(
                    input,
                    document,
                    first,
                );
                expect(second).toBe(first);
                second();
                expect(input.style.scrollMarginBottom).toBe('');
            } finally {
                input.remove();
            }
        });
    });
});
