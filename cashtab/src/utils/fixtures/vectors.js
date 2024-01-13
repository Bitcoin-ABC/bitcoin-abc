// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for validation functions

export const validationVectors = {
    shouldDisableXecSend: {
        expectedReturns: [
            {
                description: 'Disabled on startup',
                formData: {
                    address: '',
                    value: '',
                },
                balances: { totalBalance: '10000' },
                apiError: false,
                sendBchAmountError: false,
                sendBchAddressError: false,
                isMsgError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description:
                    'Disabled if address has been entered but no value',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    value: '',
                },
                balances: { totalBalance: '10000' },
                apiError: false,
                sendBchAmountError: false,
                sendBchAddressError: false,
                isMsgError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description: 'Enabled for valid address and value',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    value: '50',
                },
                balances: { totalBalance: '10000' },
                apiError: false,
                sendBchAmountError: false,
                sendBchAddressError: false,
                isMsgError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: false,
            },
            {
                description: 'Disabled on zero balance',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    value: '50',
                },
                balances: { totalBalance: '0' },
                apiError: false,
                sendBchAmountError: false,
                sendBchAddressError: false,
                isMsgError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description: 'Disabled for invalid address',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg',
                    value: '50',
                },
                balances: { totalBalance: '10000' },
                apiError: false,
                sendBchAmountError: false,
                sendBchAddressError:
                    'a string indicating a validation error msg',
                isMsgError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description: 'Disabled for invalid value',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    value: '5',
                },
                balances: { totalBalance: '10000' },
                apiError: false,
                sendBchAmountError:
                    'a string indicating a validation error msg',
                sendBchAddressError: false,
                isMsgError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description: 'Disabled for invalid opreturn msg',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    value: '5',
                },
                balances: { totalBalance: '10000' },
                apiError: false,
                sendBchAmountError: false,
                sendBchAddressError: false,
                isMsgError: 'a string indicating a validation error msg',
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description: 'Disabled on priceApi error',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    value: '5',
                },
                balances: { totalBalance: '10000' },
                apiError: false,
                sendBchAmountError: false,
                sendBchAddressError: false,
                isMsgError: false,
                priceApiError: true,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description:
                    'Enabled if isOneToManyXECSend and value is not entered',
                formData: {
                    address:
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22',
                    value: '',
                },
                balances: { totalBalance: '10000' },
                apiError: false,
                sendBchAmountError: false,
                sendBchAddressError: false,
                isMsgError: false,
                priceApiError: false,
                isOneToManyXECSend: true,
                sendDisabled: false,
            },
        ],
    },
    validAliasInputCases: {
        expectedReturns: [
            {
                description:
                    'returns true for a valid lowercase alphanumeric input',
                aliasCreateInput: 'jasdf3873',
                isValid: true,
            },
            {
                description:
                    'returns false for an uppercase alphanumeric input',
                aliasCreateInput: 'jasDf3873',
                isValid: false,
            },
            {
                description: 'returns false for a non-english input',
                aliasCreateInput: 'Glück',
                isValid: false,
            },
            {
                description: 'returns false for an emoji input',
                aliasCreateInput: '😉',
                isValid: false,
            },
            {
                description: 'returns false for a special character input',
                aliasCreateInput: '( ͡° ͜ʖ ͡°)',
                isValid: false,
            },
            {
                description: 'returns false for an empty string',
                aliasCreateInput: '​',
                isValid: false,
            },
            {
                description:
                    'returns false for a valid alphanumeric input with spaces',
                aliasCreateInput: '​jasdf3873',
                isValid: false,
            },
            {
                description:
                    'returns false for a valid alphanumeric input with symbols',
                aliasCreateInput: '​jasdf3873@#',
                isValid: false,
            },
            {
                description: 'returns false for non-string input',
                aliasCreateInput: { testAlias: 'string at key' },
                isValid: false,
            },
        ],
    },
    parseAddressInputCases: {
        expectedReturns: [
            {
                description: 'Valid querystring with no-decimal amount param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=500000',
                parsedAddressInput: {
                    address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: '500000',
                    opreturn: null,
                    error: false,
                    queryString: 'amount=500000',
                },
            },
            {
                description: 'Valid querystring with decimals in amount param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=123.45',
                parsedAddressInput: {
                    address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: '123.45',
                    opreturn: null,
                    error: false,
                    queryString: 'amount=123.45',
                },
            },
            {
                description: 'Invalid queryString, repeated param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=123.45&amount=678.9',
                parsedAddressInput: {
                    address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: null,
                    opreturn: null,
                    error: `Supported bip21 params may not appear more than once`,
                    queryString: 'amount=123.45&amount=678.9',
                },
            },
            {
                description: 'Valid querystring with opreturn param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?opreturn=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                parsedAddressInput: {
                    address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: null,
                    opreturn:
                        '042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                    error: false,
                    queryString:
                        'opreturn=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                },
            },
            {
                description: 'Invalid opreturn param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?opreturn=notvalid042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                parsedAddressInput: {
                    address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: null,
                    opreturn: null,
                    error: `Invalid opreturn param "notvalid042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d"`,
                    queryString:
                        'opreturn=notvalid042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                },
            },
            {
                description: 'Valid amount and opreturn params',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=500&opreturn=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                parsedAddressInput: {
                    address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: '500',
                    opreturn:
                        '042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                    error: false,
                    queryString:
                        'amount=500&opreturn=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                },
            },
            {
                description: 'Repeated opreturn param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?opreturn=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d&opreturn=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                parsedAddressInput: {
                    address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: null,
                    opreturn: null,
                    error: `Supported bip21 params may not appear more than once`,
                    queryString:
                        'opreturn=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d&opreturn=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                },
            },
            {
                description: 'Invalid amount param (too many decimal places)',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=123.456',
                parsedAddressInput: {
                    address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: null,
                    opreturn: null,
                    error: `Invalid XEC send amount "123.456"`,
                    queryString: 'amount=123.456',
                },
            },
            {
                description: 'invalid querystring (unsupported params)',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?*&@^&%@amount=-500000',
                parsedAddressInput: {
                    address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: null,
                    opreturn: null,
                    error: `Unsupported param "*"`,
                    queryString: '*&@^&%@amount=-500000',
                },
            },
            {
                description: 'Address only and no querystring',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                parsedAddressInput: {
                    address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: null,
                    opreturn: null,
                    error: false,
                    queryString: null,
                },
            },
            {
                description: 'prefixless address input',
                addressInput: 'qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                parsedAddressInput: {
                    address: 'qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                    amount: null,
                    opreturn: null,
                    error: false,
                    queryString: null,
                },
            },
        ],
    },
};
