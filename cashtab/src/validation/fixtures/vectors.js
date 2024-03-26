// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for validation functions
import appConfig from 'config/app';
import { CashtabSettings } from 'config/cashtabSettings';
import CashtabCache from 'config/CashtabCache';
import {
    mockCashtabCache,
    mockCashtabCacheNoBlocks,
    mockCashtabCache_pre_2_9_0,
} from 'helpers/fixtures/mocks';
import {
    validWalletJson,
    validWalletJsonMultiPath,
} from 'validation/fixtures/mocks';
import { walletWithXecAndTokens_pre_2_9_0 } from 'components/fixtures/mocks';
import { toXec } from 'wallet';
import { cashtabWalletFromJSON } from 'helpers';

const cloneObjectWithDeletedKey = (object, key) => {
    const clonedObject = { ...object };
    delete clonedObject[key];
    return clonedObject;
};

export default {
    shouldSendXecBeDisabled: {
        expectedReturns: [
            {
                description: 'Disabled on startup',
                formData: {
                    address: '',
                    amount: '',
                },
                balanceSats: 10000,
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
                    amount: '',
                },
                balanceSats: 10000,
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
                    amount: '50',
                },
                balanceSats: 10000,
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
                    amount: '50',
                },
                balanceSats: 0,
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
                    amount: '50',
                },
                balanceSats: 10000,
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
                    amount: '5',
                },
                balanceSats: 10000,
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
                    amount: '5',
                },
                balanceSats: 10000,
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
                    amount: '5',
                },
                balanceSats: 10000,
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
                    amount: '',
                },
                balanceSats: 10000,
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
    meetsAliasSpecInputCases: {
        expectedReturns: [
            {
                description:
                    'returns true for a valid lowercase alphanumeric input',
                inputStr: 'jasdf3873',
                response: true,
            },
            {
                description:
                    'returns expected error if input contains uppercase char',
                inputStr: 'jasDf3873',
                response:
                    'Alias may only contain lowercase characters a-z and 0-9',
            },
            {
                description:
                    'returns expected error if input contains special char',
                inputStr: 'Glück',
                response:
                    'Alias may only contain lowercase characters a-z and 0-9',
            },
            {
                description: 'returns expected error if input contains emoji',
                inputStr: '😉',
                response:
                    'Alias may only contain lowercase characters a-z and 0-9',
            },
            {
                description:
                    'returns expected error if input contains other special characters',
                inputStr: '( ͡° ͜ʖ ͡°)',
                response:
                    'Alias may only contain lowercase characters a-z and 0-9',
            },
            {
                description:
                    'returns expected error if input is an empty string',
                inputStr: '​',
                response:
                    'Alias may only contain lowercase characters a-z and 0-9',
            },
            {
                description:
                    'returns expected error if input contains an empty space',
                inputStr: '​jasdf3873',
                response:
                    'Alias may only contain lowercase characters a-z and 0-9',
            },
            {
                description: 'returns expected error if input contains symbols',
                inputStr: '​jasdf3873@#',
                response:
                    'Alias may only contain lowercase characters a-z and 0-9',
            },
            {
                description: 'returns expected error if input is not a string',
                inputStr: { testAlias: 'string at key' },
                response: 'Alias input must be a string',
            },
            {
                description:
                    'returns expected error if input contains underscores',
                inputStr: 'test_WITH_badchars',
                response:
                    'Alias may only contain lowercase characters a-z and 0-9',
            },
            {
                description:
                    'returns expected error if exceeds byte restriction',
                inputStr: '0123456789012345678901',
                response: `Invalid bytecount 22. Alias be 1-21 bytes.`,
            },
            {
                description: 'returns true for an alias of max bytecount',
                inputStr: '012345678901234567890',
                response: true,
            },
        ],
    },
    validAliasSendInputCases: {
        expectedReturns: [
            {
                description: 'Valid alias send input',
                sendToAliasInput: 'chicken.xec',
                response: true,
            },
            {
                description: 'Valid alias missing prefix',
                sendToAliasInput: 'chicken',
                response: `Must include '.xec' suffix when sending to an eCash alias`,
            },
            {
                description: 'Valid alias with double suffix',
                sendToAliasInput: 'chicken.xec.xec',
                response: `Must include '.xec' suffix when sending to an eCash alias`,
            },
            {
                description: 'Valid alias with bad suffix',
                sendToAliasInput: 'chicken.xe',
                response: `Must include '.xec' suffix when sending to an eCash alias`,
            },
            {
                description: 'Invalid alias (too long)',
                sendToAliasInput: '0123456789012345678901.xec',
                response: `Invalid bytecount 22. Alias be 1-21 bytes.`,
            },
            {
                description: 'Invalid alias (nonalphanumeric)',
                sendToAliasInput: 'Capitalized@.xec',
                response:
                    'Alias may only contain lowercase characters a-z and 0-9',
            },
        ],
    },
    parseAddressInput: {
        expectedReturns: [
            // address only
            {
                description: 'Blank string',
                addressInput: '',
                balanceSats: 10000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: '',
                        error: 'Invalid address',
                        isAlias: false,
                    },
                },
            },
            {
                description: 'Address only and no querystring',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                balanceSats: 10000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                },
            },
            {
                description: 'prefixless address input',
                addressInput: 'qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                balanceSats: 10000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                },
            },
            // alias only
            {
                description: 'alias only and no querystring',
                addressInput: 'chicken.xec',
                balanceSats: 10000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'chicken.xec',
                        error: false,
                        isAlias: true,
                    },
                },
            },
            {
                description: 'alias missing .xec suffix',
                addressInput: 'chicken',
                balanceSats: 10000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'chicken',
                        error: `Aliases must end with '.xec'`,
                        isAlias: true,
                    },
                },
            },
            // amount param only
            {
                description:
                    'Valid address with valid amount param equal to user balance, no decimals',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=500000',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                    amount: { value: '500000', error: false },
                    queryString: { value: 'amount=500000', error: false },
                },
            },
            {
                description:
                    'Valid address with valid amount param exceeding user balance by one satoshi, no decimals',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=500001',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                    amount: {
                        value: '500001',
                        error: `Amount 500,001.00 XEC exceeds wallet balance of 500,000.00 XEC`,
                    },
                    queryString: { value: 'amount=500001', error: false },
                },
            },
            {
                description:
                    'Valid address with valid amount param, with decimals',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=123.45',
                balanceSats: 5000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                    amount: { value: '123.45', error: false },
                    queryString: { value: 'amount=123.45', error: false },
                },
            },
            {
                description: 'Invalid address with valid amount param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfg?amount=500000',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfg',
                        error: 'Invalid address',
                        isAlias: false,
                    },
                    amount: { value: '500000', error: false },
                    queryString: { value: 'amount=500000', error: false },
                },
            },
            {
                description: 'etoken address with valid amount param',
                addressInput:
                    'etoken:qq9h6d0a5q65fgywv4ry64x04ep906mdkufhx2swv3?amount=500000',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'etoken:qq9h6d0a5q65fgywv4ry64x04ep906mdkufhx2swv3',
                        error: `eToken addresses are not supported for ${appConfig.ticker} sends`,
                        isAlias: false,
                    },
                    amount: { value: '500000', error: false },
                    queryString: { value: 'amount=500000', error: false },
                },
            },
            {
                description:
                    'Valid address with invalid amount param (too many decimal places)',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=123.456',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                    amount: {
                        value: '123.456',
                        error: `XEC transactions do not support more than 2 decimal places`,
                    },
                    queryString: { value: 'amount=123.456', error: false },
                },
            },
            {
                description: 'Valid alias with valid amount param',
                addressInput: 'chicken.xec?amount=125',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'chicken.xec',
                        error: false,
                        isAlias: true,
                    },
                    amount: { value: '125', error: false },
                    queryString: { value: 'amount=125', error: false },
                },
            },
            {
                description: 'Invalid alias with valid amount param',
                addressInput: 'chicken?amount=125',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'chicken',
                        error: `Aliases must end with '.xec'`,
                        isAlias: true,
                    },
                    amount: { value: '125', error: false },
                    queryString: { value: 'amount=125', error: false },
                },
            },

            // opreturn param only
            {
                description: 'Valid address with valid op_return_raw param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                    op_return_raw: {
                        value: '042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: false,
                    },
                    queryString: {
                        value: 'op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: false,
                    },
                },
            },
            {
                description: 'Valid alias with valid op_return_raw param',
                addressInput:
                    'chicken.xec?op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'chicken.xec',
                        error: false,
                        isAlias: true,
                    },
                    op_return_raw: {
                        value: '042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: false,
                    },
                    queryString: {
                        value: 'op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: false,
                    },
                },
            },
            {
                description: 'Valid address with invalid op_return_raw param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?op_return_raw=notvalid042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                    op_return_raw: {
                        value: 'notvalid042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: `Invalid op_return_raw param "notvalid042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d"`,
                    },
                    queryString: {
                        value: 'op_return_raw=notvalid042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: false,
                    },
                },
            },
            // Both op_return_raw and amount params
            {
                description: 'Valid amount and op_return_raw params',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=500&op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                    amount: { value: '500', error: false },
                    op_return_raw: {
                        value: '042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: false,
                    },
                    queryString: {
                        value: 'amount=500&op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: false,
                    },
                },
            },

            {
                description: 'invalid querystring (unsupported params)',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?*&@^&%@amount=-500000',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                    queryString: {
                        value: '*&@^&%@amount=-500000',
                        error: `Unsupported param "%@amount"`,
                    },
                },
            },
            // Querystring errors where no params can be returned
            {
                description: 'Invalid queryString, repeated param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=123.45&amount=678.9',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                    queryString: {
                        value: 'amount=123.45&amount=678.9',
                        error: 'bip21 parameters may not appear more than once',
                    },
                },
            },
            {
                description: 'Repeated op_return_raw param',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d&op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                        isAlias: false,
                    },
                    queryString: {
                        value: 'op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d&op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: `bip21 parameters may not appear more than once`,
                    },
                },
            },
        ],
    },
    isValidContactList: {
        expectedReturns: [
            {
                description: 'Legacy empty contact list',
                contactList: [{}],
                isValid: false,
            },
            {
                description: 'Empty contact list',
                contactList: [],
                isValid: true,
            },
            {
                description: 'Array of more than one empty object is invalid',
                contactList: [{}, {}],
                isValid: false,
            },
            {
                description: 'List with one valid entry',
                contactList: [
                    {
                        address:
                            'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                        name: 'Alpha',
                    },
                ],
                isValid: true,
            },
            {
                description: 'Multiple valid entries',
                contactList: [
                    {
                        address:
                            'ecash:qpdkc5p7f25hwkxsr69m3evlj4h7wqq9xcgmjc8sxr',
                        name: 'Alpha',
                    },
                    {
                        address:
                            'ecash:qpq235n3l3u6ampc8slapapnatwfy446auuv64ylt2',
                        name: 'Beta',
                    },
                    {
                        address:
                            'ecash:qz50e58nkeg2ej2f34z6mhwylp6ven8emy8pp52r82',
                        name: 'Gamma',
                    },
                ],
                isValid: true,
            },
            {
                description: 'Valid objects but also an empty object is false',
                contactList: [
                    {},
                    {
                        address:
                            'ecash:qpdkc5p7f25hwkxsr69m3evlj4h7wqq9xcgmjc8sxr',
                        name: 'Alpha',
                    },
                    {
                        address:
                            'ecash:qpq235n3l3u6ampc8slapapnatwfy446auuv64ylt2',
                        name: 'Beta',
                    },
                    {
                        address:
                            'ecash:qz50e58nkeg2ej2f34z6mhwylp6ven8emy8pp52r82',
                        name: 'Gamma',
                    },
                ],
                isValid: false,
            },
            {
                description: 'Valid alias formats are accepted',
                contactList: [
                    {
                        address: 'beta.xec',
                        name: 'Test',
                    },
                ],
                isValid: true,
            },
        ],
    },
    migrateLegacyCashtabSettings: {
        expectedReturns: [
            {
                description: 'Migrates a 1.4.x user to 1.5.0 settings',
                legacySettings: {
                    fiatCurrency: 'usd',
                    sendModal: false,
                    autoCameraOn: true,
                    hideMessagesFromUnknownSenders: false,
                    balanceVisible: true,
                },
                migratedSettings: {
                    fiatCurrency: 'usd',
                    sendModal: false,
                    autoCameraOn: true,
                    hideMessagesFromUnknownSenders: false,
                    balanceVisible: true,
                    minFeeSends: false,
                },
            },
            {
                description: 'User with only fiatCurrency in settings',
                legacySettings: {
                    fiatCurrency: 'gbp',
                },
                migratedSettings: {
                    fiatCurrency: 'gbp',
                    sendModal: false,
                    autoCameraOn: true,
                    hideMessagesFromUnknownSenders: false,
                    balanceVisible: true,
                    minFeeSends: false,
                },
            },
            {
                description: 'Migrates an empty object to default settings',
                legacySettings: {},
                migratedSettings: new CashtabSettings(),
            },
            {
                description:
                    'Returns object unchanged if it has all expected keys',
                legacySettings: {
                    fiatCurrency: 'brl',
                    sendModal: true,
                    autoCameraOn: true,
                    hideMessagesFromUnknownSenders: false,
                    balanceVisible: true,
                    minFeeSends: false,
                },
                migratedSettings: {
                    fiatCurrency: 'brl',
                    sendModal: true,
                    autoCameraOn: true,
                    hideMessagesFromUnknownSenders: false,
                    balanceVisible: true,
                    minFeeSends: false,
                },
            },
        ],
    },
    isValidCashtabSettings: {
        expectedReturns: [
            {
                description: 'A 1.4.x settings object is invalid',
                settings: {
                    fiatCurrency: 'usd',
                    sendModal: false,
                    autoCameraOn: true,
                    hideMessagesFromUnknownSenders: false,
                    balanceVisible: true,
                },
                isValid: false,
            },
            {
                description: 'A 1.5.0 settings object is valid',
                settings: {
                    fiatCurrency: 'usd',
                    sendModal: false,
                    autoCameraOn: true,
                    hideMessagesFromUnknownSenders: false,
                    balanceVisible: true,
                    minFeeSends: false,
                },
                isValid: true,
            },
            {
                description:
                    'Rejects an otherwise-valid settings object if the currency is not supported',
                settings: {
                    fiatCurrency: 'xau',
                    sendModal: false,
                    autoCameraOn: true,
                    hideMessagesFromUnknownSenders: false,
                    balanceVisible: true,
                    minFeeSends: false,
                },
                isValid: false,
            },
            {
                description:
                    'Rejects an otherwise-valid settings object if a ticker is misnamed',
                settings: {
                    fiatCurrencyTicker: 'usd',
                    sendModal: false,
                    autoCameraOn: true,
                    hideMessagesFromUnknownSenders: false,
                    balanceVisible: true,
                    minFeeSends: false,
                },
                isValid: false,
            },
            {
                description:
                    'Rejects an otherwise-valid settings object if it is from before the introduction of sendModal',
                settings: {
                    fiatCurrencyTicker: 'usd',
                    autoCameraOn: true,
                    hideMessagesFromUnknownSenders: false,
                    balanceVisible: true,
                },
                isValid: false,
            },
        ],
    },
    isValidCashtabCache: {
        expectedReturns: [
            {
                description: 'Returns false for legacy cashtabCache',
                cashtabCache: { tokenInfoById: {} },
                isValid: false,
            },
            {
                description:
                    'Returns false if there is not a map at tokens key',
                cashtabCache: { tokens: {} },
                isValid: false,
            },
            {
                description: 'Returns false for cashtabCache before 2.9.0',
                cashtabCache: mockCashtabCache_pre_2_9_0,
                isValid: false,
            },
            {
                description:
                    'Returns false for current version cashtabCache if it is missing the unknown token id',
                cashtabCache: { tokens: new Map() },
                isValid: false,
            },
            {
                description: 'Returns true for current version cashtabCache',
                cashtabCache: mockCashtabCache,
                isValid: true,
            },
            {
                description:
                    'Returns true for current version cashtabCache if blocks key is missing',
                cashtabCache: mockCashtabCacheNoBlocks,
                isValid: true,
            },
            {
                description: 'Returns true for default cashtabCache',
                cashtabCache: new CashtabCache(),
                isValid: true,
            },
        ],
    },
    isValidCashtabWallet: {
        expectedReturns: [
            {
                description: 'Returns true for a valid Cashtab wallet',
                wallet: cashtabWalletFromJSON(validWalletJson),
                returned: true,
            },
            {
                description:
                    'Returns false for a JSON-loaded pre-2.9.0 Cashtab wallet',
                wallet: cashtabWalletFromJSON(walletWithXecAndTokens_pre_2_9_0),
                returned: false,
            },
            {
                description: 'Returns false for a pre-2.9.0 Cashtab wallet',
                wallet: walletWithXecAndTokens_pre_2_9_0,
                returned: false,
            },
            {
                description: 'Returns false if not an object',
                wallet: 'a string',
                returned: false,
            },
            {
                description:
                    'Returns false if false (used to indicate no wallet yet set)',
                wallet: false,
                returned: false,
            },
            {
                description: 'Returns false if wallet is missing state',
                wallet: cloneObjectWithDeletedKey(
                    cashtabWalletFromJSON(validWalletJson),
                    'state',
                ),
                returned: false,
            },
            {
                description: 'Returns false if wallet is missing mnemonic',
                wallet: cloneObjectWithDeletedKey(
                    cashtabWalletFromJSON(validWalletJson),
                    'mnemonic',
                ),
                returned: false,
            },
            {
                description: 'Returns false if wallet is missing name',
                wallet: cloneObjectWithDeletedKey(
                    cashtabWalletFromJSON(validWalletJson),
                    'name',
                ),
                returned: false,
            },
            {
                description: 'Returns false if wallet is missing paths',
                wallet: cloneObjectWithDeletedKey(
                    cashtabWalletFromJSON(validWalletJson),
                    'paths',
                ),
                returned: false,
            },
            {
                description:
                    'Returns false if wallet is missing hash in path1899 path object',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    paths: new Map([
                        [
                            1899,
                            {
                                address: 'string',
                                wif: 'string',
                            },
                        ],
                    ]),
                },
                returned: false,
            },
            {
                description:
                    'Returns false if wallet is missing address in path1899 path object',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    paths: new Map([
                        [
                            1899,
                            {
                                hash: 'string',
                                wif: 'string',
                            },
                        ],
                    ]),
                },
                returned: false,
            },
            {
                description:
                    'Returns false if wallet is missing address in path1899 path object',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    paths: new Map([
                        [
                            1899,
                            {
                                address: 'string',
                                hash: 'string',
                            },
                        ],
                    ]),
                },
                returned: false,
            },
            {
                description: 'Returns true for a multi-path wallet',
                wallet: cashtabWalletFromJSON(validWalletJsonMultiPath),
                returned: true,
            },
            {
                description:
                    'Returns false if wallet is missing wif in a secondary path object',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    paths: new Map([
                        [
                            1899,
                            {
                                hash: 'string',
                                address: 'string',
                                wif: 'string',
                            },
                        ],
                        [
                            145,
                            {
                                hash: 'string',
                                address: 'string',
                            },
                        ],
                    ]),
                },
                returned: false,
            },
            {
                description: 'Returns false if wallet has no path info objects',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    paths: new Map(),
                },
                returned: false,
            },
            {
                description: 'Returns false if wallet.state is not an object',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    state: 'string',
                },
                returned: false,
            },
            {
                description: 'Returns false if no balanceSats in wallet.state',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    state: {
                        ...cloneObjectWithDeletedKey(
                            cashtabWalletFromJSON(validWalletJson).state,
                            'balanceSats',
                        ),
                    },
                },
                returned: false,
            },
            {
                description: 'Returns false if balances in wallet.state',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    state: {
                        ...cashtabWalletFromJSON(validWalletJson).state,
                        balances: {},
                    },
                },
                returned: false,
            },
            {
                description: 'Returns false if balanceSats is not a number',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    state: {
                        ...validWalletJson.state,
                        balanceSats: '100',
                        tokens: new Map(),
                    },
                },
                returned: false,
            },
            {
                description: 'Returns false if no slpUtxos in wallet.state',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    state: cloneObjectWithDeletedKey(
                        cashtabWalletFromJSON(validWalletJson).state,
                        'slpUtxos',
                    ),
                },
                returned: false,
            },
            {
                description: 'Returns false if no nonSlpUtxos in wallet.state',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    state: cloneObjectWithDeletedKey(
                        cashtabWalletFromJSON(validWalletJson).state,
                        'nonSlpUtxos',
                    ),
                },
                returned: false,
            },
            {
                description: 'Returns false if no tokens in wallet.state',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    state: cloneObjectWithDeletedKey(
                        cashtabWalletFromJSON(validWalletJson).state,
                        'tokens',
                    ),
                },
                returned: false,
            },
            {
                description:
                    'Returns false if hydratedUtxoDetails is in wallet.state',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    state: {
                        ...cashtabWalletFromJSON(validWalletJson).state,
                        hydratedUtxoDetails: [],
                    },
                },
                returned: false,
            },
            {
                description:
                    'Returns false if slpBalancesAndUtxos is in wallet.state',
                wallet: {
                    ...cashtabWalletFromJSON(validWalletJson),
                    state: {
                        ...cashtabWalletFromJSON(validWalletJson).state,
                        slpBalancesAndUtxos: [],
                    },
                },
                returned: false,
            },
        ],
    },
    isValidXecSendAmount: {
        expectedReturns: [
            {
                description: 'Dust minimum is valid',
                sendAmount: toXec(appConfig.dustSats).toString(),
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: true,
            },
            {
                description: '1 satoshi below dust min is invalid',
                sendAmount: toXec(appConfig.dustSats - 1).toString(),
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: `Send amount must be at least ${toXec(
                    appConfig.dustSats,
                ).toString()} ${appConfig.ticker}`,
            },
            {
                description: '0 is not a valid send amount',
                sendAmount: '0',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: `Amount must be greater than 0`,
            },
            {
                description:
                    'A value with one decimal place not exceeding user balance is accepted',
                sendAmount: '100.1',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: true,
            },
            {
                description:
                    'A value with two decimal places not exceeding user balance is accepted',
                sendAmount: '100.12',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: true,
            },
            {
                description:
                    'A value with more than two decimal places not exceeding user balance is rejected',
                sendAmount: '100.123',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: `${appConfig.ticker} transactions do not support more than ${appConfig.cashDecimals} decimal places`,
            },
            {
                description:
                    'A value using a decimal marker other than "." is rejected',
                sendAmount: '100,12',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: `Invalid amount "100,12": Amount can only contain numbers and '.' to denote decimal places.`,
            },
            {
                description: 'A non-number string is rejected',
                sendAmount: 'not a number',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: `Unable to parse sendAmount "not a number" as a number`,
            },
            {
                description: 'null is rejected',
                sendAmount: null,
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: `sendAmount type must be number or string`,
            },
            {
                description: 'undefined is rejected',
                sendAmount: undefined,
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: `sendAmount type must be number or string`,
            },
            {
                description:
                    'A value including non-numerical characters is rejected',
                sendAmount: '12a17',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: `Invalid amount "12a17": Amount can only contain numbers and '.' to denote decimal places.`,
            },
            {
                description:
                    'A value exactly matching wallet balance is accepted',
                sendAmount: '1000',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: true,
            },
            {
                description:
                    'A value exceeding wallet balance by 1 satoshi is rejected',
                sendAmount: '1000.01',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 0.000003,
                returned: `Amount ${toXec(100001).toLocaleString(
                    appConfig.defaultLocale,
                    {
                        minimumFractionDigits: appConfig.cashDecimals,
                    },
                )} ${appConfig.ticker} exceeds wallet balance of ${toXec(
                    100000,
                ).toLocaleString(appConfig.defaultLocale, {
                    minimumFractionDigits: 2,
                })} ${appConfig.ticker}`,
            },
            {
                description:
                    'A fiat value that converts to less than the user total balance is accepted',
                sendAmount: '1000',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: 'usd',
                fiatPrice: 1, // fiatPrice * sendAmount = 1000 XEC
                returned: true,
            },
            {
                description:
                    'A fiat value that converts to one satoshi more than the user total balance is rejected',
                sendAmount: '1000.01',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: 'usd',
                fiatPrice: 1, // fiatPrice * sendAmount = 1000 XEC
                returned: `Amount 1,000.01 XEC exceeds wallet balance of 1,000.00 XEC`,
            },
            {
                description:
                    'A fiat value that converts to more than the user total balance is rejected',
                sendAmount: '1000.01',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: appConfig.defaultLocale,
                selectedCurrency: appConfig.ticker,
                fiatPrice: 1, // fiatPrice * sendAmount = 1000.01 XEC
                returned: `Amount ${toXec(100001).toLocaleString(
                    appConfig.defaultLocale,
                    {
                        minimumFractionDigits: appConfig.cashDecimals,
                    },
                )} ${appConfig.ticker} exceeds wallet balance of ${toXec(
                    100000,
                ).toLocaleString(appConfig.defaultLocale, {
                    minimumFractionDigits: 2,
                })} ${appConfig.ticker}`,
            },
            {
                description:
                    'A fiat value that converts to more than the user total balance is rejected with error formatted in non-default locale',
                sendAmount: '1000.01',
                balanceSats: 100000, // 1,000.00 XEC
                userLocale: 'fr-FR',
                selectedCurrency: appConfig.ticker,
                fiatPrice: 1, // fiatPrice * sendAmount = 1000.01 XEC
                returned: `Amount ${toXec(100001).toLocaleString('fr-FR', {
                    minimumFractionDigits: appConfig.cashDecimals,
                })} ${appConfig.ticker} exceeds wallet balance of ${toXec(
                    100000,
                ).toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                })} ${appConfig.ticker}`,
            },
        ],
    },
    isValidMultiSendUserInput: {
        expectedReturns: [
            {
                description:
                    'Accepts correctly formed multisend output for amount exactly equal to wallet total balance',
                userMultisendInput: `ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr, 22\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
                balanceSats: 11000,
                userLocale: appConfig.defaultLocale,
                returned: true,
            },
            {
                description:
                    'Rejects correctly formed multisend output for amount exceeding wallet total balance by 1 satoshi',
                userMultisendInput: `ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr, 22\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
                balanceSats: 10999,
                userLocale: appConfig.defaultLocale,
                returned:
                    'Total amount sent (110.00 XEC) exceeds wallet balance of 109.99 XEC',
            },
            {
                description:
                    'Accepts correctly formed multisend output for amount exactly equal to wallet total balance if addresses are padded by extra spaces',
                userMultisendInput: `   ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr   , 22\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
                balanceSats: 11000,
                userLocale: appConfig.defaultLocale,
                returned: true,
            },
            {
                description:
                    'Returns expected error msg and line number if string includes an invalid address',
                userMultisendInput: `ecash:notValid, 22\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
                balanceSats: 11000,
                userLocale: appConfig.defaultLocale,
                returned: `Invalid address "ecash:notValid" at line 1`,
            },
            {
                description:
                    'Returns expected error msg for invalid value (dust)',
                userMultisendInput: `ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr, 1\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
                balanceSats: 11000,
                userLocale: appConfig.defaultLocale,
                returned: `Send amount must be at least 5.5 XEC: check value "1" at line 1`,
            },
            {
                description:
                    'Returns expected error msg and line numberfor invalid value (too many decimal places)',
                userMultisendInput: `ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr, 10.12\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 10.123\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
                balanceSats: 11000,
                userLocale: appConfig.defaultLocale,
                returned: `XEC transactions do not support more than 2 decimal places: check value "10.123" at line 2`,
            },
            {
                description: 'Returns expected error msg for an empty input',
                userMultisendInput: `    `,
                balanceSats: 11000,
                userLocale: appConfig.defaultLocale,
                returned: `Input must not be blank`,
            },
            {
                description:
                    'Returns expected error msg and line number for an empty row',
                userMultisendInput: `\n,  ecash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
                balanceSats: 11000,
                userLocale: appConfig.defaultLocale,
                returned: `Remove empty row at line 1`,
            },
            {
                description: 'Returns expected error msg for non-string input',
                userMultisendInput: undefined,
                balanceSats: 11000,
                userLocale: appConfig.defaultLocale,
                returned: `Input must be a string`,
            },
            {
                description:
                    'Returns expected error msg and line number if csv line does not include address and value',
                userMultisendInput: `ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y`,
                balanceSats: 11000,
                userLocale: appConfig.defaultLocale,
                returned: `Line 1 must have address and value, separated by a comma`,
            },
            {
                description:
                    'Returns expected error msg and line number if a line has more than one comma',
                userMultisendInput: `ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 170,23`,
                balanceSats: 11000,
                userLocale: appConfig.defaultLocale,
                returned: `Line 1: Comma can only separate address and value.`,
            },
        ],
    },
};
