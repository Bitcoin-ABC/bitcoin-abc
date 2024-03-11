// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';
import appConfig from 'config/app';
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
        console.log(`Error in formatBalance for ${unformattedBalance}`);
        console.log(err);
        return unformattedBalance;
    }
};

// unformattedBalance will always be a BigNumber, tokenDecimal will always be a number
export const formatTokenBalance = (
    unformattedBalance,
    tokenDecimal,
    defaultLocale = 'en',
) => {
    let formattedTokenBalance;
    let convertedTokenBalance;
    let locale = defaultLocale;
    try {
        if (
            tokenDecimal === undefined ||
            unformattedBalance === undefined ||
            typeof tokenDecimal !== 'number' ||
            !BN.isBigNumber(unformattedBalance)
        ) {
            return undefined;
        }
        if (navigator && navigator.language) {
            locale = navigator.language;
        }

        // Use toFixed to get a string with the correct decimal places
        formattedTokenBalance = new BN(unformattedBalance).toFixed(
            tokenDecimal,
        );
        // formattedTokenBalance is converted into a number as toLocaleString does not work with a string
        convertedTokenBalance = parseFloat(
            formattedTokenBalance,
        ).toLocaleString(locale, {
            minimumFractionDigits: tokenDecimal,
        });

        return convertedTokenBalance;
    } catch (err) {
        console.log(`Error in formatTokenBalance for ${unformattedBalance}`);
        console.log(err);
        return unformattedBalance;
    }
};
