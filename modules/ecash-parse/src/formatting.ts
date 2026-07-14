// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import appConfig from './constants/app';
import { toXec } from './amounts';

export const decimalizedTokenQtyToLocaleFormat = (
    decimalizedTokenQty: string,
    userLocale: string,
): string => {
    const localeDecimalSymbol = Number(1).toLocaleString(userLocale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })[1];

    const localeThousand = Number(1000).toLocaleString(userLocale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    const LOCALE_HAS_THOUSANDS_LENGTH = 5;
    const hasThousandSeparator =
        localeThousand.length === LOCALE_HAS_THOUSANDS_LENGTH;
    const localeThousandsSymbol = hasThousandSeparator ? localeThousand[1] : '';

    const beforeAndAfterDecimalStrings = decimalizedTokenQty.split('.');
    const beforeDecimalString = beforeAndAfterDecimalStrings[0];

    let localeTokenString = beforeDecimalString.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        localeThousandsSymbol,
    );
    if (beforeAndAfterDecimalStrings.length > 1) {
        localeTokenString = `${localeTokenString}${localeDecimalSymbol}${beforeAndAfterDecimalStrings[1]}`;
    }

    return localeTokenString;
};

const TRILLION = 1e12;
const BILLION = 1e9;
const MILLION = 1e6;
const THOUSAND = 1e3;

/**
 * Compact human-readable amount for notifications (e.g. 1.5k, 2.3M, 1.1B).
 * Prefers readability over full precision.
 */
export const toFormattedCompactAmount = (
    amount: number,
    userLocale: string,
    minimumFractionDigitsBelowThousand = 0,
): string => {
    if (!Number.isFinite(amount)) {
        return String(amount);
    }

    const amountRaw = amount;
    let scaled = amountRaw;
    let units = 'T';
    let minimumFractionDigits = 0;

    if (scaled >= TRILLION) {
        scaled = scaled / TRILLION;
    } else if (scaled >= BILLION) {
        scaled = scaled / BILLION;
        units = 'B';
    } else if (scaled >= MILLION) {
        scaled = scaled / MILLION;
        units = 'M';
    } else if (scaled >= THOUSAND) {
        scaled = scaled / THOUSAND;
        units = 'k';
    } else {
        units = '';
        minimumFractionDigits = minimumFractionDigitsBelowThousand;
    }

    // Avoid "1,000k" when rounding would hit the next unit
    if (units !== '' && Number(scaled.toFixed(2)) >= 1000) {
        if (units === 'k') {
            scaled = amountRaw / MILLION;
            units = 'M';
        } else if (units === 'M') {
            scaled = amountRaw / BILLION;
            units = 'B';
        } else if (units === 'B') {
            scaled = amountRaw / TRILLION;
            units = 'T';
        }
    }

    return `${scaled.toLocaleString(userLocale, {
        maximumFractionDigits: 2,
        minimumFractionDigits,
    })}${units}`;
};

/** Compact XEC amount from satoshis (e.g. 42.00, 625.01k, 1.5M). */
export const toFormattedXec = (
    satoshis: number | bigint,
    userLocale: string,
): string =>
    toFormattedCompactAmount(
        toXec(satoshis),
        userLocale,
        appConfig.cashDecimals,
    );

/**
 * Compact token quantity for notifications.
 * Small amounts keep full decimalized locale form; large amounts use k/M/B/T.
 */
export const toFormattedTokenQty = (
    decimalizedTokenQty: string,
    userLocale: string,
): string => {
    const amount = Number(decimalizedTokenQty);
    if (!Number.isFinite(amount) || Math.abs(amount) < THOUSAND) {
        return decimalizedTokenQtyToLocaleFormat(
            decimalizedTokenQty,
            userLocale,
        );
    }
    return toFormattedCompactAmount(amount, userLocale);
};

/** Compact fiat for notification bodies when amount is large. */
export const toFormattedFiatNotification = (
    fiatAmount: number,
    userLocale: string,
    selectedFiatTicker: string,
): string => {
    if (Math.abs(fiatAmount) >= THOUSAND) {
        return `${toFormattedCompactAmount(
            fiatAmount,
            userLocale,
        )} ${selectedFiatTicker}`;
    }
    return `${new Intl.NumberFormat(userLocale, {
        style: 'currency',
        currency: selectedFiatTicker,
        minimumFractionDigits: appConfig.cashDecimals,
        maximumFractionDigits: appConfig.cashDecimals,
    }).format(fiatAmount)} ${selectedFiatTicker}`;
};
