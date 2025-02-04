// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import {
    agoraOfferCachetAlphaOne,
    heismanNftOneOffer,
} from 'components/Agora/fixtures/mocks';
import { fromHex } from 'ecash-lib';

export const UNSAFE_INTEGER_STRING = '10000000000000000';
export default {
    getBalanceSatsVectors: {
        expectedReturns: [
            {
                description: 'Kind of a normal balance calculation',
                nonSlpUtxos: [
                    { value: 546 },
                    { value: 150000000 },
                    { value: 62500000 },
                ],
                balanceSats: 212500546,
            },
            {
                description: 'Wallet balance of total XEC supply',
                nonSlpUtxos: [
                    { value: 700000000000000 },
                    { value: 700000000000000 },
                    { value: 700000000000000 },
                ],
                balanceSats: 2100000000000000,
            },
            {
                description: 'Empty array returns 0 balance',
                nonSlpUtxos: [],
                balanceSats: 0,
            },
        ],
        expectedErrors: [
            {
                description: 'Call with non-Array',
                nonSlpUtxos: { somekey: 'an object instead of an array' },
                errorMsg: 'nonSlpUtxos.reduce is not a function',
            },
        ],
    },
    toXec: {
        expectedReturns: [
            {
                description: 'Total XEC supply',
                satoshis: 2100000000000000,
                xec: 21000000000000,
            },
            {
                description: 'Total XEC supply less 1 satoshi',
                satoshis: 2099999999999999,
                xec: 20999999999999.99,
            },
            {
                description: '0 is 0',
                satoshis: 0,
                xec: 0,
            },
        ],
        expectedErrors: [
            {
                description: 'Bad XEC amount, too many decimal places',
                satoshis: 100.123,
                errorMsg: 'Input param satoshis must be an integer',
            },
        ],
    },
    toSatoshis: {
        expectedErrors: [
            {
                description: 'Bad XEC amount, too many decimal places',
                xec: 100.123,
                errorMsg:
                    'Result not an integer. Check input for valid XEC amount.',
            },
        ],
    },
    nanoSatoshisToXec: {
        expectedReturns: [
            {
                description: 'Smallest possible price',
                nanosatoshis: 1,
                xec: 0.00000000001,
            },
            {
                description: 'Another small price price',
                nanosatoshis: 3,
                xec: 0.00000000003,
            },
            {
                description: 'Total XEC supply',
                nanosatoshis: 2100000000000000 * 1e9,
                xec: 21000000000000,
            },
            {
                description: 'Total XEC supply less 1 satoshi',
                nanosatoshis: 2099999999999999 * 1e9,
                xec: 20999999999999.99,
            },
            {
                description: '0 is 0',
                nanosatoshis: 0,
                xec: 0,
            },
        ],
        expectedErrors: [
            {
                description: 'non-integer input',
                nanosatoshis: 100.123,
                errorMsg: 'Input param nanosats must be an integer',
            },
        ],
    },
    xecToNanoSatoshis: {
        expectedReturns: [
            {
                description: 'Overprecise nanosatoshis rounds to nearest int',
                xec: 0.000000000015,
                returned: 2,
            },
            {
                description:
                    'Overprecise nanosatoshis larger than one rounds to nearest int',
                xec: 0.000123456789999,
                returned: 12345679,
            },
            {
                description: 'We can round up to 1 nanosat',
                xec: 0.000000000009,
                returned: 1,
            },
            {
                description: 'We can round down to 0 nanosats',
                xec: 0.0000000000049,
                returned: 0,
            },
        ],
    },
    hasEnoughToken: {
        expectedReturns: [
            {
                description:
                    'Returns true if wallet has token in exactly required amount',
                tokens: new Map([
                    [
                        '28eb601e438b1df2f49b3d783f7b236496ad9c07e4af35e8d6c5050732ef030a',
                        '100',
                    ],
                ]),
                tokenId:
                    '28eb601e438b1df2f49b3d783f7b236496ad9c07e4af35e8d6c5050732ef030a',
                tokenQty: '100',
                hasEnough: true,
            },
            {
                description:
                    'Returns false if wallet has token but less than required amount',
                tokens: new Map([
                    [
                        '28eb601e438b1df2f49b3d783f7b236496ad9c07e4af35e8d6c5050732ef030a',
                        '99',
                    ],
                ]),
                tokenId:
                    '28eb601e438b1df2f49b3d783f7b236496ad9c07e4af35e8d6c5050732ef030a',
                tokenQty: '100',
                hasEnough: false,
            },
            {
                description: 'Returns false if wallet does not have this token',
                tokens: new Map([
                    [
                        '28eb601e438b1df2f49b3d783f7b236496ad9c07e4af35e8d6c5050732ef030a',
                        '99',
                    ],
                ]),
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenQty: '100',
                hasEnough: false,
            },
        ],
    },
    createCashtabWallet: {
        expectedReturns: [
            {
                description:
                    'Creates a Cashtab wallet from a valid bip39 mnemonic',
                mnemonic:
                    'beauty shoe decline spend still weird slot snack coach flee between paper',
                wallet: {
                    state: {
                        balanceSats: 0,
                        slpUtxos: [],
                        nonSlpUtxos: [],
                        tokens: new Map(),
                        parsedTxHistory: [],
                    },
                    mnemonic:
                        'beauty shoe decline spend still weird slot snack coach flee between paper',
                    paths: new Map([
                        [
                            1899,
                            {
                                address:
                                    'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                                hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
                                wif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
                                sk: fromHex(
                                    '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
                                ),
                                pk: fromHex(
                                    '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                                ),
                            },
                        ],
                    ]),
                    name: 'qqa9l',
                },
            },
        ],
    },
    fiatToSatoshis: {
        expectedReturns: [
            {
                description:
                    'Converts 1 USD from fiat to satoshis for string input',
                sendAmountFiat: '1',
                fiatPrice: 0.00006739,
                returned: 1483899,
            },
            {
                description:
                    'Converts total XEC supply in USD from fiat to satoshis for string input',
                sendAmountFiat: '1415190000',
                fiatPrice: 0.00006739,
                returned: 2100000000000000,
            },
            {
                description:
                    'Returns an integer even if input has arbitrarily high decimal precision for string input',
                sendAmountFiat: '123.123456789',
                fiatPrice: 0.00006739,
                returned: 182702859,
            },
            {
                description:
                    'Converts 1 USD from fiat to satoshis for number input',
                sendAmountFiat: 1,
                fiatPrice: 0.00006739,
                returned: 1483899,
            },
            {
                description:
                    'Converts total XEC supply in USD from fiat to satoshis for number input',
                sendAmountFiat: 1415190000,
                fiatPrice: 0.00006739,
                returned: 2100000000000000,
            },
            {
                description:
                    'Returns an integer even if input has arbitrarily high decimal precision for number input',
                sendAmountFiat: 123.123456789,
                fiatPrice: 0.00006739,
                returned: 182702859,
            },
        ],
    },
    getLegacyPaths: {
        expectedReturns: [
            {
                description:
                    'Determines legacy paths for a post-2.2.0 wallet with legacy paths',
                wallet: {
                    paths: [{ path: 1899 }, { path: 145 }, { path: 245 }],
                },
                returned: [145, 245],
            },
            {
                description:
                    'Determines legacy paths for a post-2.9.0 wallet with legacy paths',
                wallet: {
                    paths: new Map([
                        [1899, { address: 'string' }],
                        [145, { address: 'string' }],
                        [245, { address: 'string' }],
                    ]),
                },
                returned: [145, 245],
            },
            {
                description:
                    'Determines legacy paths for a pre-2.2.0 wallet with legacy paths',
                wallet: {
                    Path145: {},
                    Path245: {},
                    Path1899: {},
                },
                returned: [145, 245],
            },
            {
                description:
                    'Returns an empty array if the wallet contains no legacy paths',
                wallet: {
                    paths: [{ path: 1899 }],
                },
                returned: [],
            },
        ],
    },
    getWalletsForNewActiveWallet: {
        expectedReturns: [
            {
                description: 'Return expected wallets array',
                walletToActivate: { name: 'alpha', mnemonic: 'one' },
                wallets: [
                    { name: 'beta', mnemonic: 'two' },
                    { name: 'gamma', mnemonic: 'three' },
                    { name: 'alpha', mnemonic: 'one' },
                ],
                returned: [
                    { name: 'alpha', mnemonic: 'one' },
                    { name: 'beta', mnemonic: 'two' },
                    { name: 'gamma', mnemonic: 'three' },
                ],
            },
            {
                description:
                    'Returns wallets array unchanged if walletToActivate is already wallets[0]',
                walletToActivate: { name: 'alpha', mnemonic: 'one' },
                wallets: [
                    { name: 'alpha', mnemonic: 'one' },
                    { name: 'beta', mnemonic: 'two' },
                    { name: 'gamma', mnemonic: 'three' },
                ],
                returned: [
                    { name: 'alpha', mnemonic: 'one' },
                    { name: 'beta', mnemonic: 'two' },
                    { name: 'gamma', mnemonic: 'three' },
                ],
            },
        ],
        expectedErrors: [
            {
                description:
                    'Throws error if called with a wallet that is not in wallets',
                walletToActivate: { name: 'alphaprime', mnemonic: 'oneprime' },
                wallets: [
                    { name: 'beta', mnemonic: 'two' },
                    { name: 'gamma', mnemonic: 'three' },
                    { name: 'alpha', mnemonic: 'one' },
                ],
                errorMsg: `Error activating "alphaprime": Could not find wallet in wallets`,
            },
        ],
    },
    decimalizeTokenAmount: {
        expectedReturns: [
            {
                description:
                    'Decimalizes amount for 0-decimal token amount larger than JS max safe integer',
                amount: UNSAFE_INTEGER_STRING,
                decimals: 0,
                returned: UNSAFE_INTEGER_STRING,
            },
            {
                description:
                    'Decimalizes amount for 9-decimal token amount larger than JS max safe integer',
                amount: UNSAFE_INTEGER_STRING,
                decimals: 9,
                returned: '10000000.000000000',
            },
            {
                description:
                    'Decimalizes amount for 9-decimal token amount larger than JS max safe integer with non-zero decimal places',
                amount: '11111111123456789',
                decimals: 9,
                returned: '11111111.123456789',
            },
            {
                description: 'Decimalizes 0 by adding expected decimal places',
                amount: '0',
                decimals: 5,
                returned: '0.00000',
            },
            {
                description:
                    'Decimalizes a number less than 1 by adding expected decimal places',
                amount: '123',
                decimals: 9,
                returned: '0.000000123',
            },
            {
                description: 'Decimalizes smallest amount of slpv1 spec',
                amount: '1',
                decimals: 9,
                returned: '0.000000001',
            },
            {
                description:
                    'Can decimalize for arbitrary decimals, as long as decimals is an integer',
                amount: '11111111123456789123456789',
                decimals: 18,
                returned: '11111111.123456789123456789',
            },
        ],
        expectedErrors: [
            {
                description: 'Throws error if input is not a string',
                amount: 50,
                decimals: 0,
                error: 'amount must be a string',
            },
            {
                description:
                    'Throws error if input is not a stringified integer',
                amount: '123.45',
                decimals: 0,
                error: 'amount must be a stringified integer',
            },
            {
                description: 'Throws error if decimals is not an integer',
                amount: '123',
                decimals: 1.1234,
                error: 'decimals must be an integer',
            },
        ],
    },
    undecimalizeTokenAmount: {
        expectedReturns: [
            {
                description:
                    'Returns expected amount for a 0-decimal token that has a decimal point at the end',
                decimalizedAmount: '100.',
                decimals: 0,
                returned: '100',
            },
            {
                description:
                    'Handles a decimalized amount with no decimal place',
                decimalizedAmount: '100',
                decimals: 9,
                returned: '100000000000',
            },
            {
                description:
                    'Handles a decimalized amount with under-specified decimal places',
                decimalizedAmount: '100.123',
                decimals: 9,
                returned: '100123000000',
            },
        ],
        expectedErrors: [
            {
                description:
                    'Throws error if decimalizedAmount is not a string',
                decimalizedAmount: 100,
                decimals: 1,
                error: 'decimalizedAmount must be a string',
            },
            {
                description:
                    'Throws error if decimalizedAmount is an empty string',
                decimalizedAmount: '',
                decimals: 1,
                error: `decimalizedAmount must be a non-empty string containing only decimal numbers and optionally one decimal point "."`,
            },
            {
                description:
                    'Throws error if decimalizedAmount includes more than one decimal',
                decimalizedAmount: '100..2',
                decimals: 1,
                error: `decimalizedAmount must be a non-empty string containing only decimal numbers and optionally one decimal point "."`,
            },
            {
                description:
                    'Throws error if decimalizedAmount includes a decimal point that is not a period',
                decimalizedAmount: '100,25',
                decimals: 1,
                error: `decimalizedAmount must be a non-empty string containing only decimal numbers and optionally one decimal point "."`,
            },
            {
                description:
                    'Throws error if decimalizedAmount includes alphabet characters',
                decimalizedAmount: 'not a valid decimalizedAmount',
                decimals: 1,
                error: `decimalizedAmount must be a non-empty string containing only decimal numbers and optionally one decimal point "."`,
            },
            {
                description: 'Throws error if decimals is invalid',
                decimalizedAmount: '100.123',
                decimals: 1.23,
                error: 'decimals must be an integer',
            },
            {
                description:
                    'Throws precision error if decimals are over-specified for a 0-decimal token',
                decimalizedAmount: '100.0',
                decimals: 0,
                error: 'decimalizedAmount specified at greater precision than supported token decimals',
            },
            {
                description:
                    'Throws precision error if decimals are over-specified for a 9-decimal token',
                decimalizedAmount: '100.1234567891',
                decimals: 9,
                error: 'decimalizedAmount specified at greater precision than supported token decimals',
            },
        ],
    },
    sciToDecimal: {
        expectedReturns: [
            {
                description: 'Converts basic positive exponent',
                amount: '1e2',
                returned: '100',
            },
            {
                description: 'Handles leading zeros in the mantissa',
                amount: '01.2e3',
                returned: '1200',
            },
            {
                description: 'Handles positive exponents with multiple digits',
                amount: '1.23e21',
                returned: '1230000000000000000000',
            },
            {
                description: 'Handles amount causing problems in agora',
                amount: '1.74733288374534143e+18',
                returned: '1747332883745341430',
            },
            {
                description: 'Handles zero',
                amount: '0e3',
                returned: '0',
            },
        ],
        expectedErrors: [
            {
                description: 'We see expected error for negative exponents',
                amount: '1e-22',
                error: 'Negative exponents require special handling beyond simple conversion',
            },
            {
                description: 'Not scientific notation',
                amount: '17234',
                error: 'Invalid scientific notation format',
            },
            {
                description: 'Handles invalid format due to missing e',
                amount: '1.23',
                error: 'Invalid scientific notation format',
            },
            {
                description: 'Handles invalid format due to double e',
                amount: '1e2e3',
                error: 'Invalid scientific notation format',
            },
        ],
    },
    removeLeadingZeros: {
        expectedReturns: [
            {
                description: 'Removes leading zeros from a number string',
                givenString: '00000123',
                returned: '123',
            },
            {
                description: 'Removes leading zeros from a string of all zeros',
                givenString: '0000000',
                returned: '0',
            },
            {
                description: 'Preserves trailing zeros',
                givenString: '0000123000',
                returned: '123000',
            },
            {
                description:
                    'Removes leading zeros and preserves trailing zeros from an arbitrary string',
                givenString: '00000howaboutthisstring000',
                returned: 'howaboutthisstring000',
            },
        ],
    },
    hasUnfinalizedTxsInHistory: {
        expectedReturns: [
            {
                description:
                    'Returns true if valid wallet history has an unfinalized tx',
                wallet: { state: { parsedTxHistory: [{ txid: 'test' }] } },
                returned: true,
            },
            {
                description:
                    'Returns true for cashtab test wallet mock, which has an unconfirmed tx',
                wallet: walletWithXecAndTokens,
                returned: true,
            },
            {
                description:
                    'Returns false if valid wallet history has no unfinalized txs',
                wallet: {
                    state: {
                        parsedTxHistory: [
                            { txid: 'test', block: 'not undefined' },
                        ],
                    },
                },
                returned: false,
            },
            {
                description:
                    'Returns false if parsedTxHistory is not an array accessible at the state key',
                wallet: 'notanobject',
                returned: false,
            },
        ],
    },
    toBigInt: {
        expectedReturns: [
            {
                description: 'Converts scientific notation integer to BigInt',
                str: '1.40577399462323814e18',
                returned: 1405773994623238140n,
            },
            {
                description: 'Converts stringified decimal to BigInt',
                str: '1405773994623238140',
                returned: 1405773994623238140n,
            },
        ],
        expectedErrors: [
            {
                description:
                    'Scientific notation that is not an integer is rejected',
                str: '1.40577399462323814e3',
                error: 'Value is not an integer',
            },
            {
                description: 'JS natively rejects stringified non-integers',
                str: '1.40',
                error: 'Cannot convert 1.40 to a BigInt',
            },
        ],
    },
};
