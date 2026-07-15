// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { renderHook, act } from '@testing-library/react';
import { useCountRoll } from 'hooks/useCountRoll';

describe('useCountRoll', () => {
    const matchMediaMock = jest.fn();

    beforeEach(() => {
        matchMediaMock.mockReturnValue({ matches: false });
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: matchMediaMock,
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns the target on first render without animating', () => {
        const { result } = renderHook(() => useCountRoll(42));
        expect(result.current).toBe(42);
    });

    it('jumps immediately when prefers-reduced-motion is set', () => {
        matchMediaMock.mockReturnValue({ matches: true });

        const { result, rerender } = renderHook(
            ({ target }) => useCountRoll(target),
            { initialProps: { target: 0 } },
        );

        rerender({ target: 100 });
        expect(result.current).toBe(100);
    });

    it('eases toward a new target over requestAnimationFrame', () => {
        let rafCallback: FrameRequestCallback | null = null;
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
            rafCallback = cb;
            return 1;
        });
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

        let now = 0;
        jest.spyOn(performance, 'now').mockImplementation(() => now);

        const { result, rerender } = renderHook(
            ({ target }) => useCountRoll(target, 100),
            { initialProps: { target: 0 } },
        );

        rerender({ target: 100 });

        act(() => {
            now = 50;
            rafCallback?.(now);
        });
        expect(result.current).toBeGreaterThan(0);
        expect(result.current).toBeLessThan(100);

        act(() => {
            now = 100;
            rafCallback?.(now);
        });
        expect(result.current).toBe(100);
    });
});
