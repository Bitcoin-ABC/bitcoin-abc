// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BigNumber from 'bignumber.js';
import appConfig from 'config/app';
import { toXec } from 'wallet';

export const formatDate = (dateString: string, userLocale = 'en'): string => {
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    };
    const dateFormattingError = 'Unable to format date.';
    try {
        if (dateString) {
            return new Date(Number(dateString) * 1000).toLocaleDateString(
                userLocale,
                options,
            );
        }
        return new Date().toLocaleDateString(userLocale, options);
    } catch {
        return dateFormattingError;
    }
};

export const formatFiatBalance = (
    fiatBalance: number,
    userLocale = 'en-US',
) => {
    try {
        if (fiatBalance === 0) {
            return Number(fiatBalance).toFixed(appConfig.cashDecimals);
        }
        const options: Intl.NumberFormatOptions = {
            maximumFractionDigits: appConfig.cashDecimals,
        };
        return fiatBalance.toLocaleString(userLocale, options);
    } catch {
        return fiatBalance;
    }
};

export const formatBalance = (
    unformattedBalance: string,
    userLocale = 'en-US',
): string => {
    try {
        return new Number(unformattedBalance).toLocaleString(userLocale, {
            maximumFractionDigits: appConfig.cashDecimals,
        });
    } catch (err) {
        console.error(`Error in formatBalance for ${unformattedBalance}`);
        console.error(err);
        return unformattedBalance;
    }
};

/**
 * Apostrophe-like group separators used by some locales (notably de-CH).
 * ICU versions disagree between ASCII `'` (U+0027) and typographic `’` (U+2019);
 * we canonicalize to U+2019 for stable display and accept all variants when parsing.
 */
const APOSTROPHE_GROUP_SEPARATORS = new Set([
    "'", // U+0027 APOSTROPHE
    '\u2019', // RIGHT SINGLE QUOTATION MARK (Swiss typographic)
    '\u2018', // LEFT SINGLE QUOTATION MARK
    '\u02BC', // MODIFIER LETTER APOSTROPHE
]);
const CANONICAL_APOSTROPHE_GROUP_SEPARATOR = '\u2019';

const canonicalizeGroupSeparator = (separator: string): string =>
    APOSTROPHE_GROUP_SEPARATORS.has(separator)
        ? CANONICAL_APOSTROPHE_GROUP_SEPARATOR
        : separator;

/**
 * Remove thousands separators from a string. When the locale uses an
 * apostrophe-like group separator, strip every apostrophe variant so input
 * from either ICU form (or paste) normalizes correctly.
 */
const removeThousandsSeparators = (
    value: string,
    thousandsSeparator: string,
): string => {
    if (!thousandsSeparator) {
        return value;
    }
    const separators = APOSTROPHE_GROUP_SEPARATORS.has(thousandsSeparator)
        ? [...APOSTROPHE_GROUP_SEPARATORS]
        : [thousandsSeparator];

    let cleaned = value;
    for (const separator of separators) {
        const escaped = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleaned = cleaned.replace(new RegExp(escaped, 'g'), '');
    }
    return cleaned;
};

/**
 * Get the decimal separator for a given locale
 */
export const getDecimalSeparator = (locale: string = 'en-US'): string => {
    try {
        const parts = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }).formatToParts(1.1);
        return parts.find(part => part.type === 'decimal')?.value || '.';
    } catch {
        return '.';
    }
};

/**
 * Get the thousands separator for a given locale.
 * Returns '' when the locale does not use a group separator.
 */
export const getThousandsSeparator = (locale: string = 'en-US'): string => {
    try {
        // Prefer 1,000,000 — some locales (e.g. es-ES) omit grouping for 1000
        const parts = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).formatToParts(1000000);
        const separator = parts.find(part => part.type === 'group')?.value;
        if (typeof separator !== 'string') {
            return '';
        }
        return canonicalizeGroupSeparator(separator);
    } catch {
        return ',';
    }
};

/**
 * Parse user-typed amount text into a JavaScript decimal string
 * (`.` separator, no grouping).
 */
export const normalizeDecimalInput = (
    value: string,
    locale: string = 'en-US',
): string => {
    const decimalSeparator = getDecimalSeparator(locale);
    const thousandsSeparator = getThousandsSeparator(locale);

    const normalized = removeThousandsSeparators(value, thousandsSeparator);

    if (decimalSeparator === '.') {
        return normalized;
    }
    const escapedDecimalSeparator = decimalSeparator.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
    );
    return normalized.replace(new RegExp(escapedDecimalSeparator, 'g'), '.');
};

/**
 * Format a number string with locale thousands and decimal separators.
 * Designed for formatting user input as they type (handles incomplete input).
 */
export const formatUserNumberInput = (
    value: string,
    decimalSeparator: string,
    thousandsSeparator: string,
): string => {
    if (!value) {
        return '';
    }
    const escapedDecimalSeparator = decimalSeparator.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
    );
    // Remove all non-digit characters except the decimal separator
    const cleanValue = value.replace(
        new RegExp(`[^\\d${escapedDecimalSeparator}]`, 'g'),
        '',
    );
    const parts = cleanValue.split(decimalSeparator);
    const integerPart = parts[0].replace(
        /\B(?=(\d{3})+(?!\d))/g,
        thousandsSeparator,
    );
    return parts.length > 1
        ? `${integerPart}${decimalSeparator}${parts[1]}`
        : integerPart;
};

/**
 * Format a dot-normalized amount string for locale-aware input display.
 * Accepts values already using `.` as the decimal marker (e.g. from bip21 or max).
 */
export const formatAmountForInputDisplay = (
    value: string | number | null | undefined,
    locale: string = 'en-US',
): string => {
    if (value === null || typeof value === 'undefined' || value === '') {
        return '';
    }
    const asString = String(value);
    const decimalSeparator = getDecimalSeparator(locale);
    const thousandsSeparator = getThousandsSeparator(locale);
    const withLocaleDecimal =
        decimalSeparator === '.'
            ? asString
            : asString.replace(/\./g, decimalSeparator);
    return formatUserNumberInput(
        withLocaleDecimal,
        decimalSeparator,
        thousandsSeparator,
    );
};

/**
 * Sanitize and locale-format a raw amount field value as the user types.
 * Returns the display string (with locale separators).
 */
export const sanitizeAndFormatAmountInput = (
    value: string,
    locale: string = 'en-US',
    maxDecimals?: number,
): string => {
    const decimalSeparator = getDecimalSeparator(locale);
    const thousandsSeparator = getThousandsSeparator(locale);
    let formatted = formatUserNumberInput(
        value,
        decimalSeparator,
        thousandsSeparator,
    );
    if (typeof maxDecimals === 'number') {
        const parts = formatted.split(decimalSeparator);
        if (parts.length > 1 && parts[1].length > maxDecimals) {
            formatted = `${parts[0]}${decimalSeparator}${parts[1].substring(
                0,
                maxDecimals,
            )}`;
        }
    }
    return formatted;
};

/**
 * Restore caret after locale reformatting by matching the count of
 * significant characters (digits + decimal separator) before the old caret.
 */
export const caretPosAfterFormat = (
    oldValue: string,
    oldCaret: number,
    newValue: string,
    decimalSeparator: string,
): number => {
    const prefix = oldValue.slice(0, Math.max(0, oldCaret));
    let significantCount = 0;
    for (const ch of prefix) {
        if (/\d/.test(ch) || ch === decimalSeparator) {
            significantCount += 1;
        }
    }
    if (significantCount === 0) {
        return 0;
    }
    let seen = 0;
    for (let i = 0; i < newValue.length; i++) {
        const ch = newValue[i];
        if (/\d/.test(ch) || ch === decimalSeparator) {
            seen += 1;
            if (seen >= significantCount) {
                return i + 1;
            }
        }
    }
    return newValue.length;
};

/**
 * Add locale number formatting to a decimalized
 * token quantity
 */
export const decimalizedTokenQtyToLocaleFormat = (
    decimalizedTokenQty: string,
    userLocale: string,
): string => {
    // Note that we cannot parseFloat(decimalizedTokenQty) because it will round some numbers at
    // upper end of possible token quantities
    // So, use a string method

    // Get the decimal point of this locale
    const localeDecimalSymbol = Number(1).toLocaleString(userLocale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })[1];

    // Get the thousands separator of this locale
    const localeThousand = Number(1000).toLocaleString(userLocale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    // length of '1,000' or '1 000'
    const LOCALE_HAS_THOUSANDS_LENGTH = 5;
    const hasThousandSeparator =
        localeThousand.length === LOCALE_HAS_THOUSANDS_LENGTH;
    const localeThousandsSymbol = hasThousandSeparator ? localeThousand[1] : '';

    // While we support output format in other locales, Cashtab only handles decimalized strings with '.'
    // Split for decimals
    const beforeAndAfterDecimalStrings = decimalizedTokenQty.split('.');
    const beforeDecimalString = beforeAndAfterDecimalStrings[0];

    // Add thousands separator to beforeDecimalString
    let localeTokenString = beforeDecimalString.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        localeThousandsSymbol,
    );
    if (beforeAndAfterDecimalStrings.length > 1) {
        localeTokenString = `${localeTokenString}${localeDecimalSymbol}${beforeAndAfterDecimalStrings[1]}`;
    }

    return localeTokenString;
};

export const toFormattedXec = (
    satoshis: number,
    userLocale: string,
): string => {
    const xecAmountRaw = toXec(satoshis);
    let xecAmount = xecAmountRaw;
    // Format up to max supply
    const trillion = 1e12;
    const billion = 1e9;
    const million = 1e6;
    const thousand = 1e3;
    let units = 'T';
    let minimumFractionDigits = 0;
    if (xecAmount >= trillion) {
        xecAmount = xecAmount / trillion;
    } else if (xecAmount >= billion) {
        xecAmount = xecAmount / billion;
        units = 'B';
    } else if (xecAmount >= million) {
        xecAmount = xecAmount / million;
        units = 'M';
    } else if (xecAmount >= thousand) {
        xecAmount = xecAmount / thousand;
        units = 'k';
    } else {
        units = '';
        // Always display with 2 decimals, e.g. 42 XEC is displayed as 42.00 XEC
        minimumFractionDigits = 2;
    }
    // Avoid "1,000k" when rounding would hit the next unit, e.g. 999,999.99 XEC
    if (units !== '' && Number(xecAmount.toFixed(2)) >= 1000) {
        if (units === 'k') {
            xecAmount = xecAmountRaw / million;
            units = 'M';
        } else if (units === 'M') {
            xecAmount = xecAmountRaw / billion;
            units = 'B';
        } else if (units === 'B') {
            xecAmount = xecAmountRaw / trillion;
            units = 'T';
        }
    }
    return `${xecAmount.toLocaleString(userLocale, {
        maximumFractionDigits: 2,
        minimumFractionDigits,
    })}${units}`;
};

/**
 * Determine how many decimal places to render to support
 * at least AGORA_SPOT_PRICE_XEC_RENDERED_DECIMALS places of precision
 * for prices less than 1 (fiat unit) i.e. $1 or 1 XEC
 *
 * 20 is max decimals supported by Intl.NumberFormat. So this is our
 * max for fiat representations, since fiat could in theory be less
 * than XEC
 *
 * XEC max price resolution is 1 nanosatoshi, or 1e-11 XEC
 * So, we render no more than 11 digits of precision for XEC prices
 */
const MAX_DIGITS_TO_RENDER_XEC = 11;
const MAX_DIGITS_TO_RENDER_FIAT = 20;

/**
 * We want to render certain precision levels no matter what at certain price thresholds
 * For example, <= 10 XEC we should see 4 decimal places, as in Agora, this can have a
 * substantial impact across large numbers of tokens
 *
 * For fiat, typically fiat units are > than 1 XEC, so we arbitarily say 2 decimals if > 1
 */
const EXTRA_PRECISION_CUTOFF_XEC = 10;
const EXTRA_PRECISION_CUTOFF_FIAT = 1;
/**
 * Because agora offers are priced in nanosatoshis per token satoshi,
 * we should provide higher resolution than 2 decimal places
 * For now, we arbitrary choose 4. 2 is frequently losing info for low spot prices,
 * and more than 4 is imo too much info to conveniently mentally parse
 */
const AGORA_SPOT_PRICE_XEC_RENDERED_DECIMALS = 4;
export const getMinimumFractionDigits = (
    number: number,
    isFiatPrice: boolean,
): number => {
    const maxDigitsToReturn = isFiatPrice
        ? MAX_DIGITS_TO_RENDER_FIAT
        : MAX_DIGITS_TO_RENDER_XEC;
    if (number === 0) {
        // If we really have zero, then any decimal places are too many significant figures
        return 0;
    }
    if (number >= EXTRA_PRECISION_CUTOFF_FIAT && isFiatPrice) {
        // We always use 2 decimals of precision for amounts >=1 fiat unit
        // The intense precision stuff is for handling low spot prices with high resolution
        // This is an important differentiating feature of agora, which can price offers in
        // nanosatoshis per token satoshi
        return appConfig.cashDecimals;
    }
    if (!isFiatPrice) {
        if (Number.isInteger(number)) {
            // Special handling for exact XEC prices
            // e.g. we want a price of exactly 1 XEC to be instantly
            // visually distinguishable from prices very close to 1 XEC
            return 0;
        }
        if (number > 1 && number < EXTRA_PRECISION_CUTOFF_XEC) {
            // For XEC spot between 1 and EXTRA_PRECISION_CUTOFF_XEC
            // Always return 4 decimals
            return AGORA_SPOT_PRICE_XEC_RENDERED_DECIMALS;
        }
        if (number >= EXTRA_PRECISION_CUTOFF_XEC) {
            // 2 decimals for XEC prices >= EXTRA_PRECISION_CUTOFF_XEC
            return appConfig.cashDecimals;
        }
    }
    if (number < 0.00000000000000000001) {
        // If we are less than the lowest possible fiat price
        // determined by MAX_DIGITS_TO_RENDER_FIAT
        return maxDigitsToReturn;
    }

    // For values between 0 and 1 the resolution is 4 digits + the leading zeros after the decimal point
    return Math.min(
        maxDigitsToReturn,
        Math.floor(Math.log10(1 / number)) +
            AGORA_SPOT_PRICE_XEC_RENDERED_DECIMALS,
    );
};

/**
 * Agora token prices may be much less than $1
 * Format so you have appropriate significant figures and account for crazy leading zeros
 */
export const getFormattedFiatPrice = (
    fiatTicker: string,
    userLocale: string,
    priceXec: number | string,
    fiatPrice: number | null,
): string => {
    const renderFiat = typeof fiatPrice === 'number';
    priceXec = typeof priceXec === 'number' ? priceXec : parseFloat(priceXec);
    const renderedPrice = renderFiat ? priceXec * fiatPrice : priceXec;
    let ticker = 'XEC';
    if (renderFiat) {
        ticker = fiatTicker.toUpperCase();
    }

    if (renderFiat) {
        const renderedDecimalPlaces = getMinimumFractionDigits(
            renderedPrice,
            true,
        );
        // Note that while some locales will include the currency code
        // as well, we force it, since imo we need to make sure it's there
        return `${new Intl.NumberFormat(userLocale, {
            style: 'currency',
            currency: ticker,
            minimumFractionDigits: renderedDecimalPlaces,
            maximumFractionDigits: renderedDecimalPlaces,
        }).format(renderedPrice)} ${ticker}`;
    }

    // Fall back to price in XEC if fiatPrice is unavailable
    return getAgoraSpotPriceXec(renderedPrice, userLocale);
};

/**
 * Render the spot price of an Agora Partial in XEC
 */
export const getAgoraSpotPriceXec = (
    priceXec: number | string,
    userLocale: string,
): string => {
    priceXec = typeof priceXec === 'number' ? priceXec : parseFloat(priceXec);
    const renderedDecimalPlaces = getMinimumFractionDigits(priceXec, false);

    return `${decimalizedTokenQtyToLocaleFormat(
        priceXec.toLocaleString(userLocale, {
            maximumFractionDigits: renderedDecimalPlaces,
            minimumFractionDigits: renderedDecimalPlaces,
        }),
        userLocale,
    )} XEC`;
};

/**
 * Calculate % delta in offer price if it is greater than spot price
 * Return with 4 decimals if delta is < 1%
 * Otherwise no decimals
 *
 * Intended to be called on prices in nanosatoshis per token satoshi but any bigint would work
 * as long as both prices are same units
 */
export const getPercentDeltaOverSpot = (
    thisPrice: bigint,
    spotPrice: bigint,
    userLocale: string,
): string => {
    const deltaPct = Number(
        new BigNumber(thisPrice.toString())
            .div(spotPrice.toString())
            .minus(1)
            .times(100),
    );
    const renderedDeltaDecimals = deltaPct > 1 ? 0 : 4;
    return `${deltaPct.toLocaleString(userLocale, {
        minimumFractionDigits: renderedDeltaDecimals,
        maximumFractionDigits: renderedDeltaDecimals,
    })}%`;
};
