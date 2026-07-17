// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Capacitor } from '@capacitor/core';
import { isMobile } from 'helpers';

/**
 * Strip grouping / junk so keypad math runs on digits + locale decimal only.
 */
export const toSignificantAmount = (
    value: string,
    decimalSeparator: string,
): string => {
    if (!value) {
        return '';
    }
    const escapedDecimalSeparator = decimalSeparator.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
    );
    return value.replace(
        new RegExp(`[^\\d${escapedDecimalSeparator}]`, 'g'),
        '',
    );
};

/**
 * Append a digit, respecting max decimal places on the fractional part.
 */
export const appendDigitToAmount = (
    value: string,
    digit: string,
    decimalSeparator: string,
    maxDecimalPlaces?: number,
): string => {
    if (!/^\d$/.test(digit)) {
        return toSignificantAmount(value, decimalSeparator);
    }

    const significant = toSignificantAmount(value, decimalSeparator);
    const parts = significant.split(decimalSeparator);
    if (
        typeof maxDecimalPlaces === 'number' &&
        Number.isFinite(maxDecimalPlaces) &&
        parts.length > 1 &&
        parts[1].length >= maxDecimalPlaces
    ) {
        return significant;
    }

    return `${significant}${digit}`;
};

/**
 * Append the locale decimal separator when allowed.
 */
export const appendDecimalToAmount = (
    value: string,
    decimalSeparator: string,
    maxDecimalPlaces?: number,
): string => {
    if (maxDecimalPlaces === 0) {
        return toSignificantAmount(value, decimalSeparator);
    }

    const significant = toSignificantAmount(value, decimalSeparator);
    if (significant.includes(decimalSeparator)) {
        return significant;
    }

    return `${significant}${decimalSeparator}`;
};

/**
 * Remove the last significant character (digit or decimal separator).
 */
export const backspaceAmount = (
    value: string,
    decimalSeparator: string,
): string => {
    const significant = toSignificantAmount(value, decimalSeparator);
    if (significant.length === 0) {
        return '';
    }
    return significant.slice(0, -1);
};

/**
 * Mobile / native Cashtab should use the custom amount keypad so locale
 * decimal separators are applied consistently (no OS keyboard surprises).
 */
export const shouldUseAmountKeypad = (
    nav: Navigator = typeof navigator === 'undefined'
        ? (undefined as unknown as Navigator)
        : navigator,
): boolean => {
    try {
        if (Capacitor.isNativePlatform()) {
            return true;
        }
    } catch {
        // Capacitor may be unavailable in some test environments
    }

    if (typeof nav === 'undefined' || nav === null) {
        return false;
    }

    if (isMobile(nav)) {
        return true;
    }

    // Browsers without navigator.userAgentData (notably iOS Safari)
    const ua = nav.userAgent || '';
    return /Android.+Mobile|iPhone|iPod/i.test(ua);
};
