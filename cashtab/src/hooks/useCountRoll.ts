// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number toward its target with an ease-out "count roll"
 * whenever the target changes. No animation on first render, and none
 * for users with prefers-reduced-motion.
 *
 * Used so XEC / XECX / Firma Alpha balances roll up when a tx arrives
 * (same moment as the websocket notification toast).
 *
 * @param target The value to display.
 * @param durationMs Roll duration (default 650ms).
 * @returns The value to render this frame (lands exactly on target).
 */
export const useCountRoll = (target: number, durationMs = 650): number => {
    const [display, setDisplay] = useState(target);
    const fromRef = useRef(target);
    const frameRef = useRef<number | null>(null);
    const isFirstRef = useRef(true);

    useEffect(() => {
        if (isFirstRef.current) {
            isFirstRef.current = false;
            fromRef.current = target;
            return;
        }
        if (target === fromRef.current) {
            return;
        }

        let reducedMotion = false;
        try {
            reducedMotion =
                window.matchMedia?.('(prefers-reduced-motion: reduce)')
                    ?.matches ?? false;
        } catch {
            reducedMotion = false;
        }
        const from = fromRef.current;
        fromRef.current = target;

        if (
            reducedMotion ||
            !Number.isFinite(from) ||
            !Number.isFinite(target)
        ) {
            setDisplay(target);
            return;
        }

        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
        }
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min((now - start) / durationMs, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(from + (target - from) * eased);
            if (t < 1) {
                frameRef.current = requestAnimationFrame(tick);
            } else {
                frameRef.current = null;
            }
        };
        frameRef.current = requestAnimationFrame(tick);
    }, [target, durationMs]);

    useEffect(
        () => () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }
        },
        [],
    );

    return display;
};
