import BigNumber from 'bignumber.js';
import { currency } from '@components/Common/Ticker.js';

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

    if (selectedCurrency === 'USD') {
        // Ensure no more than 8 decimal places
        testedAmount = new BigNumber(fiatToCrypto(cashAmount, fiatPrice));
    }

    // Validate value for > 0
    if (isNaN(testedAmount)) {
        error = 'Amount must be a number';
    } else if (testedAmount.lte(0)) {
        error = 'Amount must be greater than 0';
    } else if (testedAmount.lt(currency.dust)) {
        error = `Send amount must be at least ${currency.dust} ${currency.ticker}`;
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

export const fiatToCrypto = (fiatAmount, fiatPrice) => {
    let cryptoAmount = new BigNumber(fiatAmount)
        .div(new BigNumber(fiatPrice))
        .toFixed(currency.cashDecimals);
    return cryptoAmount;
};
