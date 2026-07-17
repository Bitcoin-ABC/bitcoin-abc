// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { getDecimalSeparator } from 'formatting';

export interface CashtabAmountKeypadProps {
    userLocale: string;
    onDigit: (digit: string) => void;
    onDecimal: () => void;
    onBackspace: () => void;
    className?: string;
}

/**
 * Dock height used for scroll clearance while the keypad is open.
 * Keep in sync with KeypadDock padding + 4×52px keys + 3×8px gaps.
 */
export const CASHTAB_AMOUNT_KEYPAD_OFFSET_PX = 255;

export const CASHTAB_AMOUNT_KEYPAD_OFFSET_VAR =
    '--cashtab-amount-keypad-offset';

/**
 * Optional extra bottom inset (e.g. fixed Send CTA height) so the keypad
 * sits above page actions instead of covering them. Set by the host screen.
 */
export const CASHTAB_FIXED_CTA_OFFSET_VAR = '--cashtab-fixed-cta-offset';

/**
 * Fixed dock above the Cashtab footer (70px) and any fixed CTA
 * (--cashtab-fixed-cta-offset). Portaled to document.body so parent
 * overflow/max-height (e.g. Send InputModesHolder) cannot clip keys.
 */
const KeypadDock = styled.div`
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(70px + var(--cashtab-fixed-cta-offset, 0px));
    z-index: 200;
    padding: 10px 16px 12px;
    background: ${props => props.theme.primaryBackground};
    border-top: 1px solid ${props => props.theme.border};
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
    box-sizing: border-box;

    @media (min-width: 769px) {
        bottom: var(--cashtab-fixed-cta-offset, 0px);
    }
`;

const KeypadShell = styled.div`
    width: 100%;
    max-width: 360px;
    margin: 0 auto;
`;

const KeyGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
`;

const KeyButton = styled.button<{
    $pressed?: boolean;
    $variant?: 'digit' | 'action';
}>`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 52px;
    width: 100%;
    border: none;
    border-radius: 12px;
    font-size: 28px;
    font-weight: 600;
    font-family: 'Space Grotesk', sans-serif;
    color: ${props => props.theme.primaryText};
    background: ${props =>
        props.$pressed
            ? 'rgba(255, 255, 255, 0.16)'
            : props.theme.inputBackground};
    transform: ${props => (props.$pressed ? 'scale(0.92)' : 'scale(1)')};
    transition:
        transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1),
        background-color 0.12s ease,
        color 0.12s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
    cursor: pointer;

    ${props =>
        props.$variant === 'action' &&
        `
        color: ${props.theme.secondaryText};
        font-size: 24px;
    `}

    @media (hover: hover) {
        &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.14);
            color: ${props => props.theme.primaryText};
        }
    }

    &:focus-visible {
        outline: 2px solid ${props => props.theme.accent};
        outline-offset: 2px;
    }
`;

/** Knock-out X on the filled backspace glyph (Cashtab dark theme). */
const THEME_STROKE_ON_FILLED = '#090916';

const DecimalDotIcon = () => (
    <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
    >
        <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
);

const BackspaceIcon = () => (
    <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
    >
        <path
            d="M10.3 5h8.2A3.5 3.5 0 0 1 22 8.5v7a3.5 3.5 0 0 1-3.5 3.5h-8.2a3.5 3.5 0 0 1-2.7-1.27l-4.28-5.16a1.65 1.65 0 0 1 0-2.14L7.6 5.27A3.5 3.5 0 0 1 10.3 5Z"
            fill="currentColor"
        />
        <path
            d="m12.5 9.75 4.5 4.5m0-4.5-4.5 4.5"
            stroke={THEME_STROKE_ON_FILLED}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

/**
 * Fixed mobile amount keypad with locale decimal separator.
 * Replaces the native keyboard for amount entry (no math operators).
 * Rendered in a portal so Send/form overflow cannot clip keys 7–9 / decimal / ⌫.
 */
const CashtabAmountKeypad: React.FC<CashtabAmountKeypadProps> = ({
    userLocale,
    onDigit,
    onDecimal,
    onBackspace,
    className = '',
}) => {
    const [pressedKey, setPressedKey] = useState<string | null>(null);
    const decimalLabel = getDecimalSeparator(userLocale);

    useEffect(() => {
        document.documentElement.style.setProperty(
            CASHTAB_AMOUNT_KEYPAD_OFFSET_VAR,
            `${CASHTAB_AMOUNT_KEYPAD_OFFSET_PX}px`,
        );
        return () => {
            document.documentElement.style.removeProperty(
                CASHTAB_AMOUNT_KEYPAD_OFFSET_VAR,
            );
        };
    }, []);

    const handlePress = useCallback((keyId: string, action: () => void) => {
        setPressedKey(keyId);
        action();
        window.setTimeout(() => setPressedKey(null), 140);
    }, []);

    const preventFocusSteal = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
    };

    const digitButton = (keyId: string, digit: string) => (
        <KeyButton
            key={keyId}
            type="button"
            aria-label={`Digit ${digit}`}
            $variant="digit"
            $pressed={pressedKey === keyId}
            onMouseDown={preventFocusSteal}
            onTouchStart={preventFocusSteal}
            onClick={() => handlePress(keyId, () => onDigit(digit))}
        >
            {digit}
        </KeyButton>
    );

    const keypad = (
        <KeypadDock className={className}>
            <KeypadShell
                data-cashtab-amount-keypad
                role="group"
                aria-label="Amount keypad"
            >
                <KeyGrid>
                    {digitButton('d1', '1')}
                    {digitButton('d2', '2')}
                    {digitButton('d3', '3')}
                    {digitButton('d4', '4')}
                    {digitButton('d5', '5')}
                    {digitButton('d6', '6')}
                    {digitButton('d7', '7')}
                    {digitButton('d8', '8')}
                    {digitButton('d9', '9')}
                    <KeyButton
                        type="button"
                        aria-label="Decimal separator"
                        $variant="action"
                        $pressed={pressedKey === 'dec'}
                        onMouseDown={preventFocusSteal}
                        onTouchStart={preventFocusSteal}
                        onClick={() => handlePress('dec', onDecimal)}
                    >
                        {decimalLabel === '.' ? (
                            <DecimalDotIcon />
                        ) : (
                            decimalLabel
                        )}
                    </KeyButton>
                    {digitButton('d0', '0')}
                    <KeyButton
                        type="button"
                        aria-label="Backspace"
                        $variant="action"
                        $pressed={pressedKey === 'backspace'}
                        onMouseDown={preventFocusSteal}
                        onTouchStart={preventFocusSteal}
                        onClick={() => handlePress('backspace', onBackspace)}
                    >
                        <BackspaceIcon />
                    </KeyButton>
                </KeyGrid>
            </KeypadShell>
        </KeypadDock>
    );

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(keypad, document.body);
};

export default CashtabAmountKeypad;
