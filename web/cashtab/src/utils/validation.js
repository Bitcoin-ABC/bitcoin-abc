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
    let testedAmount = cashAmount;

    if (selectedCurrency === 'USD') {
        testedAmount = (cashAmount / fiatPrice).toFixed(8);
    }

    // Validate value for > 0
    if (isNaN(testedAmount)) {
        error = 'Amount must be a number';
    } else if (testedAmount <= 0) {
        error = 'Amount must be greater than 0';
    } else if (testedAmount < currency.dust) {
        error = `Send amount must be at least ${currency.dust} ${currency.ticker}`;
    } else if (testedAmount > totalCashBalance) {
        error = `Amount cannot exceed your ${currency.ticker} balance`;
    } else if (!isNaN(testedAmount) && testedAmount.toString().includes('.')) {
        if (testedAmount.toString().split('.')[1].length > 8) {
            error = `${currency.ticker} transactions do not support more than 8 decimal places`;
        }
    }
    // return false if no error, or string error msg if error
    return error;
};
