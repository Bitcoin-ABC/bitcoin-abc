import BigNumber from 'bignumber.js';
import { currency } from '@components/Common/Ticker.js';
import { fromSmallestDenomination } from '@utils/cashMethods';

// Validate cash amount
export const shouldRejectAmountInput = (
    cashAmount,
    selectedCurrency,
    fiatPrice,
    totalCashBalance,
) => {
    // Take cashAmount as input, a string from form input
    let error = false;
    let testedAmount = new BigNumber(cashAmount);

    if (selectedCurrency !== currency.ticker) {
        // Ensure no more than currency.cashDecimals decimal places
        testedAmount = new BigNumber(fiatToCrypto(cashAmount, fiatPrice));
    }

    // Validate value for > 0
    if (isNaN(testedAmount)) {
        error = 'Amount must be a number';
    } else if (testedAmount.lte(0)) {
        error = 'Amount must be greater than 0';
    } else if (
        testedAmount.lt(fromSmallestDenomination(currency.dustSats).toString())
    ) {
        error = `Send amount must be at least ${fromSmallestDenomination(
            currency.dustSats,
        ).toString()} ${currency.ticker}`;
    } else if (testedAmount.gt(totalCashBalance)) {
        error = `Amount cannot exceed your ${currency.ticker} balance`;
    } else if (!isNaN(testedAmount) && testedAmount.toString().includes('.')) {
        if (
            testedAmount.toString().split('.')[1].length > currency.cashDecimals
        ) {
            error = `${currency.ticker} transactions do not support more than ${currency.cashDecimals} decimal places`;
        }
    }
    // return false if no error, or string error msg if error
    return error;
};

export const fiatToCrypto = (
    fiatAmount,
    fiatPrice,
    cashDecimals = currency.cashDecimals,
) => {
    let cryptoAmount = new BigNumber(fiatAmount)
        .div(new BigNumber(fiatPrice))
        .toFixed(cashDecimals);
    return cryptoAmount;
};

export const isValidTokenName = tokenName => {
    return (
        typeof tokenName === 'string' &&
        tokenName.length > 0 &&
        tokenName.length < 68
    );
};

export const isValidTokenTicker = tokenTicker => {
    return (
        typeof tokenTicker === 'string' &&
        tokenTicker.length > 0 &&
        tokenTicker.length < 13
    );
};

export const isValidTokenDecimals = tokenDecimals => {
    return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(
        tokenDecimals,
    );
};

export const isValidTokenInitialQty = (tokenInitialQty, tokenDecimals) => {
    const minimumQty = new BigNumber(1 / 10 ** tokenDecimals);
    const tokenIntialQtyBig = new BigNumber(tokenInitialQty);
    return (
        tokenIntialQtyBig.gte(minimumQty) &&
        tokenIntialQtyBig.lt(100000000000) &&
        tokenIntialQtyBig.dp() <= tokenDecimals
    );
};

export const isValidTokenDocumentUrl = tokenDocumentUrl => {
    return (
        typeof tokenDocumentUrl === 'string' &&
        tokenDocumentUrl.length >= 0 &&
        tokenDocumentUrl.length < 68
    );
};

export const isValidTokenStats = tokenStats => {
    return (
        typeof tokenStats === 'object' &&
        'timestampUnix' in tokenStats &&
        'documentUri' in tokenStats &&
        'containsBaton' in tokenStats &&
        'initialTokenQty' in tokenStats &&
        'totalMinted' in tokenStats &&
        'totalBurned' in tokenStats &&
        'circulatingSupply' in tokenStats
    );
};

export const isValidCashtabSettings = settings => {
    try {
        const isValid =
            typeof settings === 'object' &&
            Object.prototype.hasOwnProperty.call(settings, 'fiatCurrency') &&
            currency.settingsValidation.fiatCurrency.includes(
                settings.fiatCurrency,
            );
        return isValid;
    } catch (err) {
        return false;
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
