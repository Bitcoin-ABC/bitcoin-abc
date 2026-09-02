// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    applyOsKeyboardChrome,
    CASHTAB_MOBILE_FOOTER_OFFSET_VAR,
    CASHTAB_OS_KEYBOARD_ATTR,
    CASHTAB_OS_KEYBOARD_INSET_THRESHOLD_PX,
    getLayoutKeyboardShrinkPx,
    getVisualViewportKeyboardInsetPx,
    inputAcceptsOsKeyboard,
    isMobileFooterViewport,
    isOsKeyboardOpen,
    subscribeOsKeyboardChrome,
} from 'components/Common/cashtabOsKeyboard';

const mobileMatchMedia = ((query: string) => ({
    matches: query === '(max-width: 768px)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
})) as unknown as typeof window.matchMedia;

const desktopMatchMedia = ((query: string) => ({
    matches: query === '(min-width: 769px)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
})) as unknown as typeof window.matchMedia;

describe('cashtabOsKeyboard', () => {
    afterEach(() => {
        applyOsKeyboardChrome(false);
        document.body.innerHTML = '';
    });

    describe('inputAcceptsOsKeyboard', () => {
        it('accepts a text input', () => {
            const input = document.createElement('input');
            input.type = 'text';
            expect(inputAcceptsOsKeyboard(input)).toBe(true);
        });

        it('accepts type=number and inputMode=decimal', () => {
            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            expect(inputAcceptsOsKeyboard(numberInput)).toBe(true);

            const decimalInput = document.createElement('input');
            decimalInput.inputMode = 'decimal';
            expect(inputAcceptsOsKeyboard(decimalInput)).toBe(true);
        });

        it('accepts a textarea', () => {
            expect(
                inputAcceptsOsKeyboard(document.createElement('textarea')),
            ).toBe(true);
        });

        it('rejects amount-keypad fields (readOnly + inputMode none)', () => {
            const input = document.createElement('input');
            input.readOnly = true;
            input.inputMode = 'none';
            expect(inputAcceptsOsKeyboard(input)).toBe(false);
        });

        it('rejects disabled, checkbox, and button inputs', () => {
            const disabled = document.createElement('input');
            disabled.disabled = true;
            expect(inputAcceptsOsKeyboard(disabled)).toBe(false);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            expect(inputAcceptsOsKeyboard(checkbox)).toBe(false);

            const button = document.createElement('input');
            button.type = 'button';
            expect(inputAcceptsOsKeyboard(button)).toBe(false);
        });

        it('rejects null and non-fields', () => {
            expect(inputAcceptsOsKeyboard(null)).toBe(false);
            expect(inputAcceptsOsKeyboard(document.createElement('div'))).toBe(
                false,
            );
        });
    });

    describe('getLayoutKeyboardShrinkPx', () => {
        it('returns 0 when the layout has not shrunk', () => {
            expect(getLayoutKeyboardShrinkPx(800, 800)).toBe(0);
            expect(getLayoutKeyboardShrinkPx(800, 900)).toBe(0);
        });

        it('returns the shrink vs the closed height', () => {
            expect(getLayoutKeyboardShrinkPx(800, 500)).toBe(300);
        });
    });

    describe('getVisualViewportKeyboardInsetPx', () => {
        it('returns 0 when visualViewport is missing', () => {
            expect(
                getVisualViewportKeyboardInsetPx({
                    innerHeight: 800,
                    visualViewport: null,
                } as unknown as Window),
            ).toBe(0);
        });

        it('returns the overlay inset', () => {
            expect(
                getVisualViewportKeyboardInsetPx({
                    innerHeight: 800,
                    visualViewport: { height: 500, offsetTop: 0 },
                } as unknown as Window),
            ).toBe(300);
        });
    });

    describe('isMobileFooterViewport', () => {
        it('follows the 768px footer breakpoint', () => {
            expect(isMobileFooterViewport(mobileMatchMedia)).toBe(true);
            expect(isMobileFooterViewport(desktopMatchMedia)).toBe(false);
        });

        it('falls back to innerWidth when matchMedia is missing', () => {
            expect(isMobileFooterViewport(undefined, 375)).toBe(true);
            expect(isMobileFooterViewport(undefined, 1024)).toBe(false);
        });
    });

    describe('isOsKeyboardOpen', () => {
        it('is false on desktop even with a keyboard-sized inset', () => {
            expect(
                isOsKeyboardOpen({
                    isMobileFooter: false,
                    visualViewportInsetPx: 400,
                    layoutShrinkPx: 400,
                }),
            ).toBe(false);
        });

        it('is false on mobile when a field is focused but the keyboard is gone', () => {
            expect(
                isOsKeyboardOpen({
                    isMobileFooter: true,
                    visualViewportInsetPx: 0,
                    layoutShrinkPx: 0,
                }),
            ).toBe(false);
        });

        it('is true on mobile when the visual viewport shrinks by a keyboard', () => {
            expect(
                isOsKeyboardOpen({
                    isMobileFooter: true,
                    visualViewportInsetPx:
                        CASHTAB_OS_KEYBOARD_INSET_THRESHOLD_PX,
                }),
            ).toBe(true);
        });

        it('is true on mobile when the layout viewport shrinks (Android resize)', () => {
            expect(
                isOsKeyboardOpen({
                    isMobileFooter: true,
                    visualViewportInsetPx: 0,
                    layoutShrinkPx: CASHTAB_OS_KEYBOARD_INSET_THRESHOLD_PX,
                }),
            ).toBe(true);
        });
    });

    describe('applyOsKeyboardChrome', () => {
        it('sets and clears the html attribute and footer offset var', () => {
            applyOsKeyboardChrome(true);
            expect(
                document.documentElement.hasAttribute(CASHTAB_OS_KEYBOARD_ATTR),
            ).toBe(true);
            expect(
                document.documentElement.style.getPropertyValue(
                    CASHTAB_MOBILE_FOOTER_OFFSET_VAR,
                ),
            ).toBe('0px');

            applyOsKeyboardChrome(false);
            expect(
                document.documentElement.hasAttribute(CASHTAB_OS_KEYBOARD_ATTR),
            ).toBe(false);
            expect(
                document.documentElement.style.getPropertyValue(
                    CASHTAB_MOBILE_FOOTER_OFFSET_VAR,
                ),
            ).toBe('');
        });
    });

    describe('subscribeOsKeyboardChrome', () => {
        type ResizeListener = () => void;

        const makeWin = (innerHeight: number, vvHeight: number) => {
            const vvListeners = new Set<ResizeListener>();
            const winListeners = new Set<ResizeListener>();
            const visualViewport = {
                height: vvHeight,
                offsetTop: 0,
                addEventListener: (
                    type: string,
                    listener: EventListenerOrEventListenerObject,
                ) => {
                    if (type === 'resize' && typeof listener === 'function') {
                        vvListeners.add(listener as ResizeListener);
                    }
                },
                removeEventListener: (
                    type: string,
                    listener: EventListenerOrEventListenerObject,
                ) => {
                    if (type === 'resize' && typeof listener === 'function') {
                        vvListeners.delete(listener as ResizeListener);
                    }
                },
            };
            return {
                innerHeight,
                innerWidth: 375,
                visualViewport,
                matchMedia: mobileMatchMedia,
                addEventListener: (
                    type: string,
                    listener: EventListenerOrEventListenerObject,
                ) => {
                    if (type === 'resize' && typeof listener === 'function') {
                        winListeners.add(listener as ResizeListener);
                    }
                },
                removeEventListener: (
                    type: string,
                    listener: EventListenerOrEventListenerObject,
                ) => {
                    if (type === 'resize' && typeof listener === 'function') {
                        winListeners.delete(listener as ResizeListener);
                    }
                },
                requestAnimationFrame: (cb: FrameRequestCallback) => {
                    cb(0);
                    return 1;
                },
                fireVvResize: () => {
                    vvListeners.forEach(listener => listener());
                },
                fireWinResize: () => {
                    winListeners.forEach(listener => listener());
                },
            };
        };

        it('does not hide chrome just because a mobile text field is focused', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);
            const win = makeWin(800, 800);

            const unsubscribe = subscribeOsKeyboardChrome({
                win: win as unknown as Window,
                matchMediaFn: mobileMatchMedia,
            });
            try {
                input.focus();
                expect(
                    document.documentElement.hasAttribute(
                        CASHTAB_OS_KEYBOARD_ATTR,
                    ),
                ).toBe(false);
            } finally {
                unsubscribe();
            }
        });

        it('hides chrome when the visual viewport shrinks and shows it when restored', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);
            const win = makeWin(800, 800);

            const unsubscribe = subscribeOsKeyboardChrome({
                win: win as unknown as Window,
                matchMediaFn: mobileMatchMedia,
            });
            try {
                input.focus();
                win.visualViewport.height = 500;
                win.fireVvResize();
                expect(
                    document.documentElement.hasAttribute(
                        CASHTAB_OS_KEYBOARD_ATTR,
                    ),
                ).toBe(true);

                // Keyboard dismissed, field still focused
                win.visualViewport.height = 800;
                win.fireVvResize();
                expect(
                    document.documentElement.hasAttribute(
                        CASHTAB_OS_KEYBOARD_ATTR,
                    ),
                ).toBe(false);
            } finally {
                unsubscribe();
            }
        });

        it('hides chrome when the layout viewport shrinks (Android resize)', () => {
            const win = makeWin(800, 800);

            const unsubscribe = subscribeOsKeyboardChrome({
                win: win as unknown as Window,
                matchMediaFn: mobileMatchMedia,
            });
            try {
                win.innerHeight = 500;
                win.visualViewport.height = 500;
                win.fireWinResize();
                expect(
                    document.documentElement.hasAttribute(
                        CASHTAB_OS_KEYBOARD_ATTR,
                    ),
                ).toBe(true);

                win.innerHeight = 800;
                win.visualViewport.height = 800;
                win.fireWinResize();
                expect(
                    document.documentElement.hasAttribute(
                        CASHTAB_OS_KEYBOARD_ATTR,
                    ),
                ).toBe(false);
            } finally {
                unsubscribe();
            }
        });

        it('does not hide chrome for the custom amount keypad field', () => {
            const input = document.createElement('input');
            input.readOnly = true;
            input.inputMode = 'none';
            document.body.appendChild(input);

            const unsubscribe = subscribeOsKeyboardChrome({
                matchMediaFn: mobileMatchMedia,
            });
            try {
                input.focus();
                expect(
                    document.documentElement.hasAttribute(
                        CASHTAB_OS_KEYBOARD_ATTR,
                    ),
                ).toBe(false);
            } finally {
                unsubscribe();
            }
        });

        it('does not hide chrome on desktop', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);
            const win = makeWin(800, 500);

            const unsubscribe = subscribeOsKeyboardChrome({
                win: win as unknown as Window,
                matchMediaFn: desktopMatchMedia,
            });
            try {
                input.focus();
                win.fireVvResize();
                expect(
                    document.documentElement.hasAttribute(
                        CASHTAB_OS_KEYBOARD_ATTR,
                    ),
                ).toBe(false);
            } finally {
                unsubscribe();
            }
        });
    });
});
