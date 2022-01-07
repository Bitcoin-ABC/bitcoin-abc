import { currency } from '@components/Common/Ticker.js';

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
            return Number(fiatBalance).toFixed(currency.cashDecimals);
        }
        if (optionalLocale === undefined) {
            return fiatBalance.toLocaleString({
                maximumFractionDigits: currency.cashDecimals,
            });
        }
        return fiatBalance.toLocaleString(optionalLocale, {
            maximumFractionDigits: currency.cashDecimals,
        });
    } catch (err) {
        return fiatBalance;
    }
};

export const formatSavedBalance = (swBalance, optionalLocale) => {
    try {
        if (swBalance === undefined) {
            return 'N/A';
        } else {
            if (optionalLocale === undefined) {
                return new Number(swBalance).toLocaleString({
                    maximumFractionDigits: currency.cashDecimals,
                });
            } else {
                return new Number(swBalance).toLocaleString(optionalLocale, {
                    maximumFractionDigits: currency.cashDecimals,
                });
            }
        }
    } catch (err) {
        return 'N/A';
    }
};

export const formatBalance = (unformattedBalance, optionalLocale) => {
    try {
        if (optionalLocale === undefined) {
            return new Number(unformattedBalance).toLocaleString({
                maximumFractionDigits: currency.cashDecimals,
            });
        }
        return new Number(unformattedBalance).toLocaleString(optionalLocale, {
            maximumFractionDigits: currency.cashDecimals,
        });
    } catch (err) {
        console.log(`Error in formatBalance for ${unformattedBalance}`);
        console.log(err);
        return unformattedBalance;
    }
};
