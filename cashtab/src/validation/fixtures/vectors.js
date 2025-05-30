// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for validation functions
import appConfig from 'config/app';
import CashtabSettings from 'config/CashtabSettings';
import CashtabCache from 'config/CashtabCache';
import {
    mockCashtabCache,
    mockCashtabCacheNoBlocks,
    mockCashtabCache_pre_2_9_0,
} from 'helpers/fixtures/mocks';
import {
    validWalletJson,
    validWalletJsonMultiPath,
    invalidWalletBadSkType,
} from 'validation/fixtures/mocks';
import {
    walletWithXecAndTokens_pre_2_9_0,
    walletWithXecAndTokens_pre_2_55_0,
} from 'components/App/fixtures/mocks';
import { toXec } from 'wallet';
import { cashtabWalletFromJSON } from 'helpers';
import { tokenTestWallet } from 'components/Etokens/fixtures/mocks';
import {
    agoraPartialAlphaWallet,
    agoraPartialBetaWallet,
} from 'components/Agora/fixtures/mocks';
import { walletWithZeroBalanceZeroHistory } from 'components/Home/fixtures/mocks';

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
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description:
                    'Disabled if address has been entered but no amount',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    amount: '',
                    multiAddressInput: '',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description:
                    'Disabled if amount has been entered but no address',
                formData: {
                    address: '',
                    amount: '50',
                    multiAddressInput: '',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description:
                    'Enabled for valid address and amount in send to one mode',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    amount: '50',
                    multiAddressInput: '',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: false,
            },
            {
                description:
                    'Disabled for valid address and amount entered in send to one mode, but app is in send to many mode and input is blank',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    amount: '50',
                    multiAddressInput: '',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: true,
                sendDisabled: true,
            },
            {
                description: 'Disabled on zero balance for send to one',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    amount: '50',
                    multiAddressInput: '',
                },
                balanceSats: 0,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description: 'Disabled on zero balance for send to many',
                formData: {
                    address: '',
                    amount: '',
                    multiAddressInput:
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22',
                },
                balanceSats: 0,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: true,
                sendDisabled: true,
            },
            {
                description: 'Disabled for invalid address',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg',
                    amount: '50',
                    multiAddressInput: '',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: 'a string indicating a validation error msg',
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description: 'Disabled for invalid amount',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    amount: '5',
                    multiAddressInput: '',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: 'a string indicating a validation error msg',
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description:
                    'Disabled for invalid cashtab msg send to one if user has cashtab msg enabled',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    amount: '5',
                    multiAddressInput: '',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: true,
                cashtabMsgError: 'a string indicating a validation error msg',
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description:
                    'Enabled for invalid cashtab msg send to one if user has cashtab msg disabled',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    amount: '5',
                    multiAddressInput: '',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: 'a string indicating a validation error msg',
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: false,
            },
            {
                description:
                    'Disabled for invalid op_return_raw send to one if user has op_return_raw enabled',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    amount: '5',
                    multiAddressInput: '',
                    opReturnRaw: 'something invalid', // note this function does not check this field
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: true,
                cashtabMsgError: false,
                sendWithOpReturnRaw: true,
                opReturnRawError: 'a string indicating a validation error msg',
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description:
                    'Enabled for invalid op_return_raw if user has op_return_raw disabled',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    amount: '5',
                    multiAddressInput: '',
                    opReturnRaw: 'something invalid', // note this function does not check this field
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: 'a string indicating a validation error msg',
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: false,
            },
            {
                description:
                    'Disabled for invalid opreturn msg send to many if cashtab msg is invalid and enabled',
                formData: {
                    address: '',
                    amount: '',
                    multiAddressInput:
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: true,
                cashtabMsgError: 'a string indicating a validation error msg',
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description: 'Disabled on priceApi error',
                formData: {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    amount: '5',
                    multiAddressInput: '',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: true,
                isOneToManyXECSend: false,
                sendDisabled: true,
            },
            {
                description:
                    'Enabled if isOneToManyXECSend and amount is not entered',
                formData: {
                    address: '',
                    amount: '',
                    multiAddressInput:
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: false,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: true,
                sendDisabled: false,
            },
            {
                description:
                    'Disabled if isOneToManyXECSend and we have a multiSendAddressError',
                formData: {
                    address: '',
                    amount: '',
                    multiAddressInput:
                        // bad input
                        'eash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22',
                },
                balanceSats: 10000,
                apiError: false,
                sendAmountError: false,
                sendAddressError: false,
                multiSendAddressError: true,
                sendWithCashtabMsg: false,
                cashtabMsgError: false,
                sendWithOpReturnRaw: false,
                opReturnRawError: false,
                priceApiError: false,
                isOneToManyXECSend: true,
                sendDisabled: true,
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
                        error: 'Invalid address',
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
                        error: `Invalid address`,
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
                        error: 'Invalid address',
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
                        error: `Invalid address`,
                    },
                    amount: { value: '125', error: false },
                    queryString: { value: 'amount=125', error: false },
                },
            },
            // no op_return_raw, additional outputs
            {
                description:
                    'Valid primary address & amount, valid secondary addr & amount',
                addressInput:
                    'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv?amount=110&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5&amount=5.50',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
                        error: false,
                    },
                    amount: { value: '110', error: false },
                    parsedAdditionalXecOutputs: {
                        error: false,
                        value: [
                            [
                                'ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5',
                                '5.50',
                            ],
                        ],
                    },
                    queryString: {
                        value: 'amount=110&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5&amount=5.50',
                        error: false,
                    },
                },
            },
            {
                description:
                    'Valid primary address & amount, invalid secondary addr',
                addressInput:
                    'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv?amount=110&addr=someinvalidaddress&amount=5.50',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
                        error: false,
                    },
                    amount: { value: '110', error: false },
                    parsedAdditionalXecOutputs: {
                        error: `Invalid address "someinvalidaddress"`,
                        value: null,
                    },
                    queryString: {
                        value: 'amount=110&addr=someinvalidaddress&amount=5.50',
                        error: false,
                    },
                },
            },
            {
                description:
                    'Valid primary address & amount, invalid secondary amount',
                addressInput:
                    'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv?amount=110&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5&amount=5.123',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
                        error: false,
                    },
                    amount: { value: '110', error: false },
                    parsedAdditionalXecOutputs: {
                        error: `Invalid amount 5.123 for address ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5: XEC transactions do not support more than 2 decimal places`,
                        value: null,
                    },
                    queryString: {
                        value: 'amount=110&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5&amount=5.123',
                        error: false,
                    },
                },
            },
            {
                description:
                    'Valid primary address & amount, valid secondary addr & amount, but the secondary amount param does not directly follow the secondary addr param',
                addressInput:
                    'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv?amount=110&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5&op_return_raw=0401020304&amount=5.50',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
                        error: false,
                    },
                    amount: { value: '110', error: false },
                    parsedAdditionalXecOutputs: {
                        error: `No amount key for addr ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5`,
                        value: null,
                    },
                    queryString: {
                        value: 'amount=110&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5&op_return_raw=0401020304&amount=5.50',
                        error: false,
                    },
                },
            },
            {
                description:
                    'Valid primary address & amount, valid secondary addr, but no corresponding amount param',
                addressInput:
                    'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv?amount=110&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
                        error: false,
                    },
                    amount: { value: '110', error: false },
                    parsedAdditionalXecOutputs: {
                        error: `No amount key for addr ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5`,
                        value: null,
                    },
                    queryString: {
                        value: 'amount=110&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5',
                        error: false,
                    },
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
                        error: 'Invalid address',
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
                    },
                    op_return_raw: {
                        value: 'notvalid042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: `Invalid op_return_raw param: Input must be lowercase hex a-f 0-9.`,
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
            // Both op_return_raw and amount params, with an additional output
            {
                description:
                    'Valid amount and op_return_raw params and valid second output',
                addressInput:
                    'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv?amount=110&op_return_raw=0470617977202562dd05deda1c101b10562527bcd6bec20268fb94eed01843ba049cd774bec1&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5&amount=5.50',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
                        error: false,
                    },
                    amount: { value: '110', error: false },
                    op_return_raw: {
                        value: '0470617977202562dd05deda1c101b10562527bcd6bec20268fb94eed01843ba049cd774bec1',
                        error: false,
                    },
                    parsedAdditionalXecOutputs: {
                        error: false,
                        value: [
                            [
                                'ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5',
                                '5.50',
                            ],
                        ],
                    },
                    queryString: {
                        value: 'amount=110&op_return_raw=0470617977202562dd05deda1c101b10562527bcd6bec20268fb94eed01843ba049cd774bec1&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5&amount=5.50',
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
                    },
                    queryString: {
                        value: '*&@^&%@amount=-500000',
                        error: `Unsupported param "%@amount"`,
                    },
                },
            },
            // token txs
            {
                description:
                    'bip21 token: token_id specified but token_decimalized_qty unspecified',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?token_id=1111111111111111111111111111111111111111111111111111111111111111',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                    },
                    queryString: {
                        value: 'token_id=1111111111111111111111111111111111111111111111111111111111111111',
                        error: `Invalid bip21 token tx: token_decimalized_qty must be specified if token_id is specified`,
                    },
                },
            },
            {
                description:
                    'bip21 token: token_decimalized_qty specified but token_id unspecified',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?token_decimalized_qty=100.123',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                    },
                    queryString: {
                        value: 'token_decimalized_qty=100.123',
                        error: `Invalid bip21 token tx: token_id must be specified if token_decimalized_qty is specified`,
                    },
                },
            },
            {
                description:
                    'bip21 token: token_id specified, token_decimalized_qty specified, and amount specified (not supported for bip21 token)',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?token_id=1111111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=100.123&amount=100',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                    },
                    queryString: {
                        value: 'token_id=1111111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=100.123&amount=100',
                        error: `Invalid bip21 token tx: bip21 token txs may only include the params token_id, token_decimalized_qty, and (optionally) firma`,
                    },
                },
            },
            {
                description:
                    'bip21 token: valid bip21 token but invalid token_id',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?token_id=gg11111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=100.123',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                    },
                    token_id: {
                        value: 'gg11111111111111111111111111111111111111111111111111111111111111',
                        error: 'token_id is not a valid tokenId',
                    },
                    token_decimalized_qty: { value: '100.123', error: false },
                    queryString: {
                        value: 'token_id=gg11111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=100.123',
                        error: false,
                    },
                },
            },
            {
                description:
                    'bip21 token: valid bip21 token but invalid token_decimalized_qty',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?token_id=1111111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=notanumber',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                    },
                    token_id: {
                        value: '1111111111111111111111111111111111111111111111111111111111111111',
                        error: false,
                    },
                    token_decimalized_qty: {
                        value: 'notanumber',
                        error: 'Invalid token_decimalized_qty',
                    },
                    queryString: {
                        value: 'token_id=1111111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=notanumber',
                        error: false,
                    },
                },
            },
            {
                description:
                    'bip21 token: valid bip21 token tx with valid params, no firma',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?token_id=1111111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=100.123',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                    },
                    token_id: {
                        value: '1111111111111111111111111111111111111111111111111111111111111111',
                        error: false,
                    },
                    token_decimalized_qty: {
                        value: '100.123',
                        error: false,
                    },
                    queryString: {
                        value: 'token_id=1111111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=100.123',
                        error: false,
                    },
                },
            },
            {
                description:
                    'bip21 token: valid bip21 token tx with valid params in reverse order still valid',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?token_decimalized_qty=100.123&token_id=1111111111111111111111111111111111111111111111111111111111111111',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                    },
                    token_id: {
                        value: '1111111111111111111111111111111111111111111111111111111111111111',
                        error: false,
                    },
                    token_decimalized_qty: {
                        value: '100.123',
                        error: false,
                    },
                    queryString: {
                        value: 'token_decimalized_qty=100.123&token_id=1111111111111111111111111111111111111111111111111111111111111111',
                        error: false,
                    },
                },
            },
            {
                description:
                    'bip21 token: valid bip21 token tx with valid params including firma',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?token_id=1111111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=100.123&firma=deadbeef',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                    },
                    token_id: {
                        value: '1111111111111111111111111111111111111111111111111111111111111111',
                        error: false,
                    },
                    token_decimalized_qty: {
                        value: '100.123',
                        error: false,
                    },
                    firma: {
                        error: false,
                        value: 'deadbeef',
                    },
                    queryString: {
                        value: 'token_id=1111111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=100.123&firma=deadbeef',
                        error: false,
                    },
                },
            },
            {
                description:
                    'bip21 token: valid bip21 token tx with valid params but invalid firma',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?token_id=1111111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=100.123&firma=deadbee',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                    },
                    token_id: {
                        value: '1111111111111111111111111111111111111111111111111111111111111111',
                        error: false,
                    },
                    token_decimalized_qty: {
                        value: '100.123',
                        error: false,
                    },
                    firma: {
                        error: 'firma input must be in hex bytes. Length of firma push must be divisible by two.',
                        value: 'deadbee',
                    },
                    queryString: {
                        value: 'token_id=1111111111111111111111111111111111111111111111111111111111111111&token_decimalized_qty=100.123&firma=deadbee',
                        error: false,
                    },
                },
            },
            // Querystring errors where no params can be returned
            {
                description:
                    'Invalid queryString, repeated amount param without corresponding address',
                addressInput:
                    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx?amount=123.45&amount=678.9',
                balanceSats: 50000000,
                userLocale: appConfig.defaultLocale,
                parsedAddressInput: {
                    address: {
                        value: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
                        error: false,
                    },
                    amount: {
                        value: null,
                        error: 'Duplicated amount param without matching address',
                    },
                    queryString: {
                        value: 'amount=123.45&amount=678.9',
                        error: 'The amount param appears without a corresponding addr param',
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
                    },
                    op_return_raw: {
                        error: 'Duplicated op_return_raw param',
                        value: null,
                    },
                    queryString: {
                        value: 'op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d&op_return_raw=042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                        error: `The op_return_raw param may not appear more than once`,
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
                description: 'Valid alias formats are not accepted',
                contactList: [
                    {
                        address: 'beta.xec',
                        name: 'Test',
                    },
                ],
                isValid: false,
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
                    autoCameraOn: false,
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
                description:
                    'Returns false for a JSON-loaded pre-2.55.0 Cashtab wallet',
                wallet: cashtabWalletFromJSON(
                    walletWithXecAndTokens_pre_2_55_0,
                ),
                returned: false,
            },
            {
                description:
                    'Returns false for a Cashtab wallet with sk as string instead of uint8array',
                wallet: invalidWalletBadSkType,
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
            // Wallets used for various tests in Cashtab are valid
            {
                description: 'Returns true for token test wallet',
                wallet: tokenTestWallet,
                returned: true,
            },
            {
                description: 'Returns true for agora alpha test wallet',
                wallet: agoraPartialAlphaWallet,
                returned: true,
            },
            {
                description: 'Returns true for agora beta test wallet',
                wallet: agoraPartialBetaWallet,
                returned: true,
            },
            {
                description: 'Returns true for Home screen test wallet',
                wallet: walletWithZeroBalanceZeroHistory,
                returned: true,
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
                returned: `Send amount must be at least 5.46 XEC: check value "1" at line 1`,
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
    isValidTokenSendOrBurnAmount: {
        expectedReturns: [
            {
                description:
                    'A decimalized string with no decimals equivalent to the user balance of this token is valid for a token with no decimals',
                amount: '100',
                tokenBalance: '100',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description: '0 is rejected',
                amount: '0',
                tokenBalance: '100',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: 'Amount must be greater than 0',
            },
            {
                description: 'Blank input is rejected',
                amount: '',
                tokenBalance: '100',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: 'Amount is required',
            },
            {
                description: 'Rejects non-string input',
                amount: 50,
                tokenBalance: '100',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: 'Amount must be a string',
            },
            {
                description:
                    'Rejects input including a decimal marker other than "."',
                amount: '95,1',
                tokenBalance: '100',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description: 'Rejects input multiple decimal points',
                amount: '95.1.23',
                tokenBalance: '100',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description:
                    'Rejects input multiple consecutive decimal points',
                amount: '95..23',
                tokenBalance: '100',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description: 'Rejects input containing non-decimal characters',
                amount: '100.a',
                tokenBalance: '100',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description:
                    'We cannot send a token satoshi more than tokenBalance',
                amount: '100.1',
                tokenBalance: '100',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned: 'Amount 100.1 exceeds balance of 100',
            },
            {
                description:
                    'We get non-plural error msg if token supports only 1 decimal place',
                amount: '99.12',
                tokenBalance: '100',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned: 'This token supports no more than 1 decimal place',
            },
            {
                description:
                    'We cannot specify more decimal places than supported by the token',
                amount: '99.123',
                tokenBalance: '100',
                decimals: 2,
                tokenProtocol: 'SLP',
                returned: 'This token supports no more than 2 decimal places',
            },
            {
                description:
                    'We cannot have decimals for a token supporting 0 decimals',
                amount: '99.1',
                tokenBalance: '100',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: 'This token does not support decimal places',
            },
            {
                description:
                    'We can specify fewer decimal places than supported by the token',
                amount: '99.123',
                tokenBalance: '100',
                decimals: 9,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We can specify the exact decimal places supported by the token',
                amount: '99.123456789',
                tokenBalance: '100',
                decimals: 9,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We can include a decimal point at the end of the string and no decimal places',
                amount: '99.',
                tokenBalance: '100',
                decimals: 9,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We can include a decimal point at the end of the string and no decimal places, even if the token supports 0 decimals',
                amount: '99.',
                tokenBalance: '100',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We accept the max supported list, send, or burn amount for a 0-decimal SLP token',
                amount: '18446744073709551615',
                tokenBalance: '19000000000000000000',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We accept the max supported list, send, or burn amount for a 9-decimal SLP token',
                amount: '18446744073.709551615',
                tokenBalance: '19000000000',
                decimals: 9,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We accept the max supported list, send, or burn amount for a 0-decimal ALP token',
                amount: '281474976710655',
                tokenBalance: '19000000000000000000',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We accept the max supported list, send, or burn amount for a 9-decimal ALP token',
                amount: '281474.976710655',
                tokenBalance: '19000000000',
                decimals: 9,
                tokenProtocol: 'ALP',
                returned: true,
            },
            {
                description:
                    'We reject one token satoshi more less than the max supported list, send, or burn amount for a 0-decimal SLP token',
                amount: '18446744073709551616',
                tokenBalance: '19000000000000000000',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned:
                    'Amount 18446744073709551616 exceeds max supported qty for this token in one tx (18446744073709551615)',
            },
            {
                description:
                    'We reject one token satoshi more less than the max supported list, send, or burn amount for a 9-decimal SLP token',
                amount: '18446744073.709551616',
                tokenBalance: '19000000000',
                decimals: 9,
                tokenProtocol: 'SLP',
                returned:
                    'Amount 18446744073.709551616 exceeds max supported qty for this token in one tx (18446744073.709551615)',
            },
            {
                description:
                    'We reject one token satoshi more less than the max supported list, send, or burn amount for a 0-decimal ALP token',
                amount: '281474976710656',
                tokenBalance: '19000000000000000000',
                decimals: 0,
                tokenProtocol: 'ALP',
                returned:
                    'Amount 281474976710656 exceeds max supported qty for this token in one tx (281474976710655)',
            },
            {
                description:
                    'We reject one token satoshi more less than the max supported list, send, or burn amount for a 9-decimal ALP token',
                amount: '281474.976710656',
                tokenBalance: '19000000000',
                decimals: 9,
                tokenProtocol: 'ALP',
                returned:
                    'Amount 281474.976710656 exceeds max supported qty for this token in one tx (281474.976710655)',
            },
        ],
    },
    isValidTokenMintAmount: {
        expectedReturns: [
            {
                description:
                    'A decimalized string with no decimals is valid for a token with no decimals',
                amount: '100',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description: '0 is rejected',
                amount: '0',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: 'Amount must be greater than 0',
            },
            {
                description: 'Blank input is rejected',
                amount: '',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: 'Amount is required',
            },
            {
                description: 'Rejects non-string input',
                amount: 50,
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: 'Amount must be a string',
            },
            {
                description:
                    'Rejects input including a decimal marker other than "."',
                amount: '95,1',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description: 'Rejects input with multiple decimal points',
                amount: '95.1.23',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description:
                    'Rejects input multiple consecutive decimal points',
                amount: '95..23',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description: 'Rejects input containing non-decimal characters',
                amount: '100.a',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description:
                    'We get non-plural error msg if token supports only 1 decimal place',
                amount: '99.12',
                decimals: 1,
                tokenProtocol: 'SLP',
                returned: 'This token supports no more than 1 decimal place',
            },
            {
                description:
                    'We cannot specify more decimal places than supported by the token',
                amount: '99.123',
                decimals: 2,
                tokenProtocol: 'SLP',
                returned: 'This token supports no more than 2 decimal places',
            },
            {
                description:
                    'We cannot have decimals for a token supporting 0 decimals',
                amount: '99.1',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: 'This token does not support decimal places',
            },
            {
                description:
                    'We can specify fewer decimal places than supported by the token',
                amount: '99.123',
                decimals: 9,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We can specify the exact decimal places supported by the token',
                amount: '99.123456789',
                decimals: 9,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We can include a decimal point at the end of the string and no decimal places',
                amount: '99.',
                decimals: 9,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We can include a decimal point at the end of the string and no decimal places, even if the token supports 0 decimals',
                amount: '99.',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description: 'We accept the max mint amount for SLP',
                amount: '18446744073709551615',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned: true,
            },
            {
                description:
                    'We reject one token satoshi more than the max mint amount for SLP',
                amount: '18446744073709551616',
                decimals: 0,
                tokenProtocol: 'SLP',
                returned:
                    'Amount 18446744073709551616 exceeds max mint amount for this token (18446744073709551615)',
            },
            // Note this is really the max mint amount for 1 output
            // ALP could do higher qtys
            // But Cashtab is currently limited to one output
            {
                description: 'We accept the max mint amount for ALP',
                amount: '281474976710655',
                decimals: 0,
                tokenProtocol: 'ALP',
                returned: true,
            },
            {
                description:
                    'We reject one token satoshi more than the max mint amount for ALP',
                amount: '281474976710656',
                decimals: 0,
                tokenProtocol: 'ALP',
                returned:
                    'Amount 281474976710656 exceeds max mint amount for this token (281474976710655)',
            },
        ],
    },
    getOpReturnRawError: {
        expectedReturns: [
            {
                description: 'Valid lowercase hex of max length is good',
                opReturnRaw: Array(222).fill('01').join(''),
                returned: false,
            },
            {
                description:
                    'Valid lowercase hex of 1 more than max length is rejected',
                opReturnRaw: Array(223).fill('01').join(''),
                returned: 'op_return_raw exceeds 222 bytes',
            },
            {
                description:
                    'Valid lowercase hex of max length that starts with "6a" is rejected',
                opReturnRaw: '6adeadbeef',
                returned:
                    'op_return_raw will have OP_RETURN (6a) prepended automatically',
            },
            {
                description: 'Valid hex of odd length below max is rejected',
                opReturnRaw: Array(12).fill('01').join('') + '1',
                returned:
                    'op_return_raw input must be in hex bytes. Length of input must be divisible by two.',
            },
            {
                description: 'Uppercase hex is rejected',
                opReturnRaw: Array(12).fill('FF').join(''),
                returned: 'Input must be lowercase hex a-f 0-9.',
            },
            {
                description:
                    'Even-length string containing non-hex characters is rejected',
                opReturnRaw: 'livebeef',
                returned: 'Input must be lowercase hex a-f 0-9.',
            },
            {
                description:
                    'Even-length string containing a space is rejected',
                opReturnRaw: 'dead beef',
                returned: 'Input must be lowercase hex a-f 0-9.',
            },
            {
                description: 'Empty string is rejected',
                opReturnRaw: '',
                returned: 'Cashtab will not send an empty op_return_raw',
            },
            {
                description: 'String of even spaces is rejected',
                opReturnRaw: '  ',
                returned: 'Input must be lowercase hex a-f 0-9.',
            },
        ],
    },
    getFirmaPushError: {
        expectedReturns: [
            {
                description: 'Valid lowercase hex of max length is good',
                firmaPush: Array(164).fill('01').join(''),
                returned: false,
            },
            {
                description:
                    'Valid lowercase hex of 1 more than max length is rejected',
                firmaPush: Array(223).fill('01').join(''),
                returned: 'firma is 223 bytes; exceeds max 164 bytes',
            },
            {
                description:
                    'Valid lowercase hex of max length that starts with "6a" is rejected',
                firmaPush: '6adeadbeef',
                returned: `firma push cannot start with OP_RETURN ('6a')`,
            },
            {
                description: 'Valid hex of odd length below max is rejected',
                firmaPush: Array(12).fill('01').join('') + '1',
                returned:
                    'firma input must be in hex bytes. Length of firma push must be divisible by two.',
            },
            {
                description: 'Uppercase hex is rejected',
                firmaPush: Array(12).fill('FF').join(''),
                returned: 'firma push must be lowercase hex a-f 0-9.',
            },
            {
                description:
                    'Even-length string containing non-hex characters is rejected',
                firmaPush: 'livebeef',
                returned: 'firma push must be lowercase hex a-f 0-9.',
            },
            {
                description:
                    'Even-length string containing a space is rejected',
                firmaPush: 'dead beef',
                returned: 'firma push must be lowercase hex a-f 0-9.',
            },
            {
                description: 'Empty string is rejected',
                firmaPush: '',
                returned: 'firma push cannot be empty',
            },
            {
                description: 'String of even spaces is rejected',
                firmaPush: '  ',
                returned: 'firma push must be lowercase hex a-f 0-9.',
            },
        ],
    },
    nodeWillAcceptOpReturnRaw: {
        expectedReturns: [
            {
                description: 'Rejects a string that starts with 6a',
                opReturnRaw: '6a',
                returned: false,
            },
            {
                description:
                    'Rejects a string that starts with invalid pushdata',
                opReturnRaw: 'ff',
                returned: false,
            },
            {
                description: 'Rejects non-string input',
                opReturnRaw: null,
                returned: false,
            },
            {
                description: 'Rejects non-hex input',
                opReturnRaw: 'string',
                returned: false,
            },
            {
                description: 'Accepts a valid hex string under max length',
                opReturnRaw:
                    '042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                returned: true,
            },
            {
                description: 'Accepts a valid hex string of max length',
                opReturnRaw: Array(222).fill('01').join(''),
                returned: true,
            },
            {
                description: 'Rejects a valid hex string over max length',
                opReturnRaw: Array(223).fill('01').join(''),
                returned: false,
            },
            {
                description: 'Rejects a valid hex string of odd length',
                opReturnRaw: '010',
                returned: false,
            },
        ],
    },
    getContactNameError: {
        expectedReturns: [
            {
                description:
                    'Accepts a max-length contact name if it does not exist in current contacts',
                name: 'thisnameistwentyfourchar',
                contacts: [{ name: 'not that' }],
                returned: false,
            },
            {
                description:
                    'Accepts a max-length contact name if no contacts exist',
                name: 'thisnameistwentyfourchar',
                contacts: [],
                returned: false,
            },
            {
                description:
                    'Rejects a max-length + 1 contact name if it does not exist in current contacts',
                name: 'thisnameistwentyfivechars',
                contacts: [{ name: 'not that' }],
                returned: `Contact names cannot be longer than ${appConfig.localStorageMaxCharacters} characters`,
            },
            {
                description: 'Rejects an empty string',
                name: '',
                contacts: [{ name: 'not that' }],
                returned: 'Please enter a contact name',
            },
            {
                description:
                    'Rejects a contact name if it already exists in contacts',
                name: 'gamma',
                contacts: [
                    { name: 'alpha' },
                    { name: 'beta' },
                    { name: 'gamma' },
                ],
                returned: `"gamma" already exists in contacts`,
            },
        ],
    },
    getContactAddressError: {
        expectedReturns: [
            {
                description:
                    'No error from a valid ecash: prefixed address to an empty contact list',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                contacts: [],
                returned: false,
            },
            {
                description:
                    'Expected error from a valid ecash: prefixed address if exists in contact list',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                contacts: [
                    {
                        name: 'name',
                        address:
                            'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                    },
                ],
                returned: 'qqa...70g already in Contacts',
            },
            {
                description:
                    'Expected error from a valid prefixless ecash: address',
                address: 'qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                contacts: [],
                returned: `Addresses in Contacts must start with "ecash:" prefix`,
            },
            {
                description: 'Expected error from an invalid address',
                address: 'ecash:notvalid',
                contacts: [],
                returned: `Invalid address`,
            },
        ],
    },
    getWalletNameError: {
        expectedReturns: [
            {
                description:
                    'Accepts a string of max length if no wallets exist with the same name',
                name: 'thisnameistwentyfourchar',
                wallets: [],
                returned: false,
            },
            {
                description:
                    'Returns expected error for a string of max length if wallet exists with the same name',
                name: 'thisnameistwentyfourchar',
                wallets: [{ name: 'thisnameistwentyfourchar' }],
                returned:
                    'Wallet name "thisnameistwentyfourchar" already exists',
            },
            {
                description: 'Returns expected error for an empty string',
                name: '',
                wallets: [],
                returned: 'Wallet name cannot be a blank string',
            },
            {
                description: 'Returns expected error for blank spaces',
                name: '     ',
                wallets: [],
                returned: 'Wallet name cannot be only blank spaces',
            },
            {
                description:
                    'Returns expected error for wallet 1 char over the max name length',
                name: 'thisnameistwentyfivechars',
                wallets: [],
                returned: `Wallet name cannot exceed ${appConfig.localStorageMaxCharacters} characters`,
            },
        ],
    },
    getXecListPriceError: {
        expectedReturns: [
            {
                description: 'Accepts dust if price is in XEC',
                xecListPrice: '5.46',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                returned: false,
            },
            {
                description:
                    'Rejects input of one satoshi less than dust if price is in XEC',
                xecListPrice: '5.45',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                returned: 'List price cannot be less than dust (5.46 XEC).',
            },
            {
                description: 'Accepts dust if price is in fiat',
                xecListPrice: '5.46',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                returned: false,
            },
            {
                description:
                    'Rejects input of one satoshi less than dust if price is in fiat',
                xecListPrice: '5.45',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                returned: 'List price cannot be less than dust (5.46 XEC).',
            },
            {
                description:
                    'Accepts a price with 2-decimal places for XEC input',
                xecListPrice: '111.12',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                returned: false,
            },
            {
                description:
                    'Accepts a price with 2-decimal places for fiat input',
                xecListPrice: '111.12',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                returned: false,
            },
            {
                description:
                    'Accepts a price with 0-decimal places but a decimal point anyway for XEC input',
                xecListPrice: '111.',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                returned: false,
            },
            {
                description:
                    'Accepts a price with 0-decimal places but a decimal point anyway for fiat input',
                xecListPrice: '111.',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                returned: false,
            },
            {
                description: `Rejects input of greater than ${appConfig.cashDecimals} decimal places for XEC input`,
                xecListPrice: '111.123',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                returned: `List price supports up to ${appConfig.cashDecimals} decimal places.`,
            },
            {
                description: `Rejects input of greater than ${appConfig.cashDecimals} decimal places for fiat input`,
                xecListPrice: '111.123',
                selectedCurrency: 'USD',
                fiatPrice: 1,
                returned: `List price supports up to ${appConfig.cashDecimals} decimal places.`,
            },
            {
                description: 'Rejects negative number for XEC input',
                xecListPrice: '-33',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                returned: 'List price must be a number greater than 5.46 XEC.',
            },
            {
                description: 'Rejects negative number for fiat input',
                xecListPrice: '-33',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                returned: 'List price must be a number greater than 5.46 XEC.',
            },
            {
                description: 'Rejects non-number input for XEC',
                xecListPrice: 'abc',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                returned: 'List price must be a number greater than 5.46 XEC.',
            },
            {
                description: 'Rejects non-number input for fiat',
                xecListPrice: 'abc',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                returned: 'List price must be a number greater than 5.46 XEC.',
            },
            {
                description: 'Rejects empty input for XEC',
                xecListPrice: '',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                returned: 'List price is required.',
            },
            {
                description: 'Rejects empty input for fiat',
                xecListPrice: '',
                selectedCurrency: 'GBP',
                fiatPrice: 1,
                returned: 'List price is required.',
            },
            {
                description: 'Rejects fiat input if fiatPrice is null',
                xecListPrice: '100',
                selectedCurrency: 'GBP',
                fiatPrice: null,
                returned:
                    'Cannot input price in GBP while fiat price is unavailable.',
            },
        ],
    },
    getAgoraPartialListPriceError: {
        expectedReturns: [
            {
                description:
                    'Accepts price if minimum token accept costs exactly dust, xec price',
                xecListPrice: '5.46',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                tokenDecimals: 0,
                returned: false,
            },
            {
                description:
                    'Accepts price if minimum token accept costs 1 nanosatoshi less than dust, xec price, because price validation does not depend on min buy qty, instead this is handled by qty validation',
                xecListPrice: '5.45999999999',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                tokenDecimals: 0,
                returned: false,
            },
            {
                description:
                    'Accepts price if minimum token accept costs exactly dust, fiat price',
                xecListPrice: '5.46',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                tokenDecimals: 0,
                returned: false,
            },
            {
                description:
                    'Rejects price if minimum token accept costs 1 nanosatoshi less than dust, fiat price',
                xecListPrice: '5.45999999999',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                tokenDecimals: 0,
                returned: false,
            },
            {
                description: 'Accepts the lowest possible price for XEC input',
                xecListPrice: '0.00000000001', // 1 nanosatoshi
                selectedCurrency: 'XEC',
                fiatPrice: null,
                tokenDecimals: 0,
                returned: false,
            },
            {
                description:
                    'Rejects the the lowest possible price for XEC input if token decimals means the price per token satoshi is less than 1 nanosatoshi of XEC',
                xecListPrice: '0.00000000001', // 1 nanosatoshi
                selectedCurrency: 'XEC',
                fiatPrice: null,
                tokenDecimals: 1,
                returned:
                    'Price cannot be lower than 1 nanosatoshi per 1 token satoshi',
            },
            {
                description: 'Accepts the lowest possible price for fiat input',
                xecListPrice: '0.00000000001', // 1 nanosatoshi
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                tokenDecimals: 0,
                returned: false,
            },
            {
                description:
                    'Rejects the the lowest possible price for fiat input if token decimals means the price per token satoshi is less than 1 nanosatoshi of XEC',
                xecListPrice: '0.00000000001', // 1 nanosatoshi
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                tokenDecimals: 1,
                returned:
                    'Price cannot be lower than 1 nanosatoshi per 1 token satoshi',
            },
            {
                description:
                    'Accepts a price with 0-decimal places but a decimal point anyway for XEC input',
                xecListPrice: '111.',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                tokenDecimals: 0,
                returned: false,
            },
            {
                description:
                    'Accepts a price with 0-decimal places but a decimal point anyway for fiat input',
                xecListPrice: '111.',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                tokenDecimals: 0,
                returned: false,
            },
            {
                description: `Rejects input of greater than 11 decimal places for XEC input`,
                xecListPrice: '111.123456789012',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                tokenDecimals: 0,
                returned: `List price supports up to 11 decimal places.`,
            },
            {
                description: `Rejects input of greater than 11 decimal places for fiat input`,
                xecListPrice: '111.123456789012',
                selectedCurrency: 'USD',
                fiatPrice: 1,
                tokenDecimals: 0,
                returned: `List price supports up to 11 decimal places.`,
            },
            {
                description: 'Rejects negative number for XEC input',
                xecListPrice: '-33',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                tokenDecimals: 0,
                returned: 'List price must be a number',
            },
            {
                description: 'Rejects negative number for fiat input',
                xecListPrice: '-33',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                tokenDecimals: 0,
                returned: 'List price must be a number',
            },
            {
                description: 'Rejects non-number input for XEC',
                xecListPrice: 'abc',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                tokenDecimals: 0,
                returned: 'List price must be a number',
            },
            {
                description: 'Rejects non-number input for fiat',
                xecListPrice: 'abc',
                selectedCurrency: 'CAD',
                fiatPrice: 1,
                tokenDecimals: 0,
                returned: 'List price must be a number',
            },
            {
                description: 'Rejects empty input for XEC',
                xecListPrice: '',
                selectedCurrency: 'XEC',
                fiatPrice: null,
                tokenDecimals: 0,
                returned: 'List price is required.',
            },
            {
                description: 'Rejects empty input for fiat',
                xecListPrice: '',
                selectedCurrency: 'GBP',
                fiatPrice: 1,
                tokenDecimals: 0,
                returned: 'List price is required.',
            },
            {
                description: 'Rejects fiat input if fiatPrice is null',
                xecListPrice: '100',
                selectedCurrency: 'GBP',
                fiatPrice: null,
                tokenDecimals: 0,
                returned:
                    'Cannot input price in GBP while fiat price is unavailable.',
            },
        ],
    },
    getAgoraPartialAcceptTokenQtyError: {
        expectedReturns: [
            {
                description:
                    'We reject an amount less than the min accept of the offer',
                takeTokenDecimalizedQty: '9',
                decimalizedTokenQtyMin: '10',
                decimalizedTokenQtyMax: '100',
                decimals: 0,
                userLocale: 'en-US',
                returned: 'Must purchase at least 10 to accept this offer',
            },
            {
                description: 'Blank input is rejected',
                takeTokenDecimalizedQty: '',
                decimalizedTokenQtyMin: '10',
                decimalizedTokenQtyMax: '100',
                decimals: 0,
                userLocale: 'en-US',
                returned: 'Select a buy amount',
            },
            {
                description: 'Rejects non-string input',
                takeTokenDecimalizedQty: 15,
                decimalizedTokenQtyMin: '10',
                decimalizedTokenQtyMax: '100',
                decimals: 0,
                userLocale: 'en-US',
                returned: 'Amount must be a string',
            },
            {
                description:
                    'Rejects input including a decimal marker other than "."',
                takeTokenDecimalizedQty: '15,1',
                decimalizedTokenQtyMin: '10',
                decimalizedTokenQtyMax: '100',
                decimals: 0,
                userLocale: 'en-US',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description: 'Rejects multiple non-consecutive decimal points',
                takeTokenDecimalizedQty: '15.1.23',
                decimalizedTokenQtyMin: '10',
                decimalizedTokenQtyMax: '100',
                decimals: 0,
                userLocale: 'en-US',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description: 'Rejects multiple consecutive decimal points',
                takeTokenDecimalizedQty: '95..23',
                decimalizedTokenQtyMin: '10',
                decimalizedTokenQtyMax: '100',
                decimals: 0,
                userLocale: 'en-US',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description: 'Rejects input containing a non-decimal character',
                takeTokenDecimalizedQty: '95.a',
                decimalizedTokenQtyMin: '10',
                decimalizedTokenQtyMax: '100',
                decimals: 0,
                userLocale: 'en-US',
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description:
                    'User is trying to purchase a qty of tokens such that remaining qty is less than min',
                takeTokenDecimalizedQty: '100',
                decimalizedTokenQtyMin: '10',
                decimalizedTokenQtyMax: '105',
                decimals: 0,
                userLocale: 'en-US',
                returned: 'Must accept <= 95 or the full offer',
            },
            {
                description: 'Error msg is formatted to decimals of the token',
                takeTokenDecimalizedQty: '100.000000000',
                decimalizedTokenQtyMin: '10.123456789',
                decimalizedTokenQtyMax: '105.000000000',
                decimals: 9,
                userLocale: 'en-US',
                returned: 'Must accept <= 94.876543211 or the full offer',
            },
            {
                description: 'The exact threshold is ok',
                takeTokenDecimalizedQty: '94.876543211',
                decimalizedTokenQtyMin: '10.123456789',
                decimalizedTokenQtyMax: '10.500000000',
                decimals: 9,
                userLocale: 'en-US',
                returned: false,
            },
            {
                description: 'The full offer is ok',
                takeTokenDecimalizedQty: '105.000000000',
                decimalizedTokenQtyMin: '10.123456789',
                decimalizedTokenQtyMax: '105.000000000',
                decimals: 9,
                userLocale: 'en-US',
                returned: false,
            },
            {
                description:
                    'One token satoshi less than the full offer is not ok',
                takeTokenDecimalizedQty: '104.999999999',
                decimalizedTokenQtyMin: '10.123456789',
                decimalizedTokenQtyMax: '105.000000000',
                decimals: 9,
                userLocale: 'en-US',
                returned: 'Must accept <= 94.876543211 or the full offer',
            },
        ],
    },
    getAgoraMinBuyError: {
        expectedReturns: [
            {
                description:
                    'We reject a min qty that is higher than the offered qty',
                xecListPrice: '1',
                selectedCurrency: 'XEC',
                fiatPrice: 1,
                minBuyTokenQty: '2',
                offeredTokenQty: '1',
                tokenDecimals: 0,
                tokenProtocol: 'ALP',
                tokenBalance: '100',
                userLocale: 'en-US',
                returned:
                    'The min buy must be less than or equal to the offered quantity',
            },
            {
                description:
                    'We can pass on an error from isValidTokenSendOrBurnAmount',
                xecListPrice: '1',
                selectedCurrency: 'XEC',
                fiatPrice: 1,
                minBuyTokenQty: '0', // 0 is invalid
                offeredTokenQty: '1',
                tokenDecimals: 0,
                tokenProtocol: 'ALP',
                tokenBalance: '100',
                userLocale: 'en-US',
                returned: 'Amount must be greater than 0',
            },
            {
                description: 'We give the required min qty if input is too low',
                xecListPrice: '1',
                selectedCurrency: 'XEC',
                fiatPrice: 1,
                minBuyTokenQty: '1', // 0 is invalid
                offeredTokenQty: '100',
                tokenDecimals: 0,
                tokenProtocol: 'ALP',
                tokenBalance: '100',
                userLocale: 'en-US',
                returned: `Total cost of minimum buy below dust. Min offered qty must be at least 6.`,
            },
            {
                description:
                    'We give the required min qty if input is too low with decimals',
                xecListPrice: '1',
                selectedCurrency: 'XEC',
                fiatPrice: 1,
                minBuyTokenQty: '1', // 0 is invalid
                offeredTokenQty: '100',
                tokenDecimals: 9,
                tokenProtocol: 'ALP',
                tokenBalance: '100',
                userLocale: 'en-US',
                returned: `Total cost of minimum buy below dust. Min offered qty must be at least 5.46.`,
            },
            {
                description:
                    'We give the required min qty if input is too low for a locale that does not use a period for decimal places',
                xecListPrice: '1',
                selectedCurrency: 'XEC',
                fiatPrice: 1,
                minBuyTokenQty: '1', // 0 is invalid
                offeredTokenQty: '100',
                tokenDecimals: 9,
                tokenProtocol: 'ALP',
                tokenBalance: '100',
                userLocale: 'fr-FR',
                returned: `Total cost of minimum buy below dust. Min offered qty must be at least 5,46.`,
            },
        ],
    },
    getReceiveAmountError: {
        expectedReturns: [
            {
                description: 'XEC: we accept an empty string',
                amount: '',
                decimals: 2,
                isXec: true,
                returned: false,
            },
            {
                description: 'XEC: 0 is rejected',
                amount: '0',
                decimals: 2,
                isXec: true,
                returned: 'Amount must be greater than 0',
            },
            {
                description: 'Token: 0 is rejected',
                amount: '0',
                decimals: 4,
                isXec: false,
                returned: 'Amount must be greater than 0',
            },
            {
                description: 'Token: blank input is rejected',
                amount: '',
                decimals: 0,
                isXec: false,
                returned: 'Amount is required for bip21 token sends',
            },
            {
                description: 'XEC: Rejects non-string input',
                amount: 50,
                isXec: true,
                returned: 'Amount must be a string',
            },
            {
                description: 'Token: Rejects non-string input',
                amount: 50,
                isXec: false,
                returned: 'Amount must be a string',
            },
            {
                description:
                    'XEC: Rejects input including a decimal marker other than "."',
                amount: '95,1',
                decimals: 1,
                isXec: true,
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description:
                    'Token: Rejects input including a decimal marker other than "."',
                amount: '95,1',
                decimals: 1,
                isXec: false,
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description: 'Rejects input multiple decimal points',
                amount: '95.1.23',
                decimals: 1,
                isXec: false,
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description:
                    'Rejects input multiple consecutive decimal points',
                amount: '95..23',
                decimals: 1,
                isXec: false,
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description: 'Rejects input containing non-decimal characters',
                amount: '100.a',
                decimals: 1,
                isXec: false,
                returned:
                    'Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."',
            },
            {
                description: 'We get an error for too many XEC decimals',
                amount: '99.123',
                decimals: 2,
                isXec: true,
                returned: 'XEC supports up to 2 decimal places',
            },
            {
                description: 'We get an error for XEC amounts below dust',
                amount: '5.45',
                decimals: 2,
                isXec: true,
                returned:
                    'XEC send amounts cannot be less than dust (5.46 XEC)',
            },
            {
                description: 'We accept 5.46 XEC',
                amount: '5.46',
                decimals: 2,
                isXec: true,
                returned: false,
            },
            {
                description: 'We accept 5.45 of a 2-decimal token',
                amount: '5.45',
                decimals: 2,
                isXec: false,
                returned: false,
            },
            {
                description:
                    'We get non-plural error msg if token supports only 1 decimal place',
                amount: '99.12',
                decimals: 1,
                isXec: false,
                returned: 'This token supports no more than 1 decimal place',
            },
            {
                description:
                    'We cannot specify more decimal places than supported by the token',
                amount: '99.123',
                decimals: 2,
                isXec: false,
                returned: 'This token supports no more than 2 decimal places',
            },
            {
                description:
                    'We cannot have decimals for a token supporting 0 decimals',
                amount: '99.1',
                decimals: 0,
                isXec: false,
                returned: 'This token does not support decimal places',
            },
            {
                description:
                    'We can specify fewer decimal places than supported by the token',
                amount: '99.123',
                decimals: 9,
                isXec: false,
                returned: false,
            },
            {
                description:
                    'We can specify the exact decimal places supported by the token',
                amount: '99.123456789',
                decimals: 9,
                isXec: false,
                returned: false,
            },
            {
                description:
                    'We can include a decimal point at the end of the string and no decimal places',
                amount: '99.',
                decimals: 9,
                isXec: false,
                returned: false,
            },
            {
                description:
                    'We can include a decimal point at the end of the string and no decimal places, even if the token supports 0 decimals',
                amount: '99.',
                decimals: 0,
                isXec: false,
                returned: false,
            },
        ],
    },
};
