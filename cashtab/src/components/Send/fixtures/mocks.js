// See src/validation, ref parseAddressInput
// These could change, which would break tests, which is expected behavior if we haven't
// updated tests properly on changing the app
export const SEND_ADDRESS_VALIDATION_ERRORS = [
    `Aliases must end with '.xec'`,
    'eToken addresses are not supported for ${appConfig.ticker} sends',
    'Invalid address',
    'bip21 parameters may not appear more than once',
    `Unsupported param`,
    `Invalid op_return_raw param`,
];

// See function shouldRejectAmountInput in validation/index.js
export const SEND_AMOUNT_VALIDATION_ERRORS = [
    `Invalid XEC send amount`,
    'Amount must be a number',
    'Amount must be greater than 0',
    `Send amount must be at least 5.50 XEC`,
    `Amount cannot exceed your XEC balance`,
    `XEC transactions do not support more than 2 decimal places`,
];
