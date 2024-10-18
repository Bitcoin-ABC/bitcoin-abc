// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import appConfig from 'config/app';
import { toXec } from 'wallet';

export const formatDate = (dateString, userLocale = 'en') => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateFormattingError = 'Unable to format date.';
    try {
        if (dateString) {
            return new Date(dateString * 1000).toLocaleDateString(
                userLocale,
                options,
            );
        }
        return new Date().toLocaleDateString(userLocale, options);
    } catch (error) {
        return dateFormattingError;
    }
};

export const formatFiatBalance = (fiatBalance, optionalLocale) => {
    try {
        if (fiatBalance === 0) {
            return Number(fiatBalance).toFixed(appConfig.cashDecimals);
        }
        if (optionalLocale === undefined) {
            return fiatBalance.toLocaleString({
                maximumFractionDigits: appConfig.cashDecimals,
            });
        }
        return fiatBalance.toLocaleString(optionalLocale, {
            maximumFractionDigits: appConfig.cashDecimals,
        });
    } catch (err) {
        return fiatBalance;
    }
};

export const formatBalance = (unformattedBalance, optionalLocale) => {
    try {
        if (optionalLocale === undefined) {
            return new Number(unformattedBalance).toLocaleString({
                maximumFractionDigits: appConfig.cashDecimals,
            });
        }
        return new Number(unformattedBalance).toLocaleString(optionalLocale, {
            maximumFractionDigits: appConfig.cashDecimals,
        });
    } catch (err) {
        console.error(`Error in formatBalance for ${unformattedBalance}`);
        console.error(err);
        return unformattedBalance;
    }
};

/**
 * Add locale number formatting to a decimalized token quantity
 * @param {string} decimalizedTokenQty e.g. 100.123
 * @param {string} userLocale e.g. 'en-US'
 */
export const decimalizedTokenQtyToLocaleFormat = (
    decimalizedTokenQty,
    userLocale,
) => {
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

export const toFormattedXec = (satoshis, userLocale) => {
    // Get XEC balance
    let xecAmount = toXec(satoshis);
    // Format up to max supply
    const trillion = 1e12;
    const billion = 1e9;
    const million = 1e6;
    const thousand = 1e3;
    let units = 'T';
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
    }
    return `${xecAmount.toLocaleString(userLocale, {
        maximumFractionDigits: 2,
    })}${units}`;
};

/**
 * Determine how many decimal places to render to support at least 2 places of precision
 * @param {number} number
 * @returns {integer}
 */
const MAX_DIGITS_TO_RENDER = 20; // max supported by Intl.NumberFormat
const DESIRED_PRECISION = appConfig.cashDecimals;
export const getMinimumFractionDigits = number => {
    if (number === 0 || number >= 1) {
        return DESIRED_PRECISION;
    }
    if (number < 0.00000000000000000001) {
        return MAX_DIGITS_TO_RENDER;
    }
    return Math.min(
        MAX_DIGITS_TO_RENDER,
        Math.floor(Math.log10(1 / number)) + 2,
    );
};

/**
 * Agora token prices may be much less than $1
 * Format so you have 2 decimals of price precision and account for crazy leading zeros
 * @param {object} settings
 * @param {string} userLocale
 * @param {number} priceXec
 * @param {number | null} fiatPrice
 */
export const getFormattedFiatPrice = (
    settings,
    userLocale,
    priceXec,
    fiatPrice,
) => {
    const renderFiat = typeof fiatPrice === 'number';
    const renderedPrice = renderFiat ? priceXec * fiatPrice : priceXec;
    let ticker = 'XEC';
    if (renderFiat) {
        ticker = settings.fiatCurrency.toUpperCase();
    }
    let renderedDecimalPlaces = getMinimumFractionDigits(renderedPrice);

    if (renderFiat) {
        // Note that while some locales will include the currency code
        // as well, we force it, since imo we need to make sure it's there
        return `${new Intl.NumberFormat(userLocale, {
            style: 'currency',
            currency: ticker,
            minimumFractionDigits: renderedDecimalPlaces,
            maximumFractionDigits: renderedDecimalPlaces,
        }).format(renderedPrice)} ${ticker}`;
    }

    return `${renderedPrice.toLocaleString(userLocale, {
        maximumFractionDigits: renderedDecimalPlaces,
        minimumFractionDigits: renderedDecimalPlaces,
    })} ${ticker}`;
};
