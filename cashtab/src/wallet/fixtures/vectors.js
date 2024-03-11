// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export default {
    getBalanceSatsVectors: {
        expectedReturns: [
            {
                description: 'Kind of a normal balance calculation',
                nonSlpUtxos: [
                    { value: '546' },
                    { value: '150000000' },
                    { value: '62500000' },
                ],
                balanceSats: 212500546,
            },
            {
                description: 'Wallet balance of total XEC supply',
                nonSlpUtxos: [
                    { value: '700000000000000' },
                    { value: '700000000000000' },
                    { value: '700000000000000' },
                ],
                balanceSats: 2100000000000000,
            },
            {
                description: 'Empty array returns 0 balance',
                nonSlpUtxos: [],
                balanceSats: 0,
            },
            {
                description:
                    'Array containing valid and invalid chronik utxos returns NaN',
                nonSlpUtxos: [
                    { noValueKey: '546' },
                    { value: { thisKeyIsNotAString: 500 } },
                    { value: '62500000' },
                ],
                balanceSats: NaN,
            },
            {
                description:
                    'Array containing invalid chronik utxos returns NaN',
                nonSlpUtxos: [
                    { noValueKey: '546' },
                    { value: { thisKeyIsNotAString: 500 } },
                ],
                balanceSats: NaN,
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
    hasEnoughToken: {
        expectedReturns: [
            {
                description:
                    'Returns true if wallet has token in exactly required amount',
                tokens: [
                    {
                        tokenId:
                            '28eb601e438b1df2f49b3d783f7b236496ad9c07e4af35e8d6c5050732ef030a',
                        balance: '100',
                    },
                ],
                tokenId:
                    '28eb601e438b1df2f49b3d783f7b236496ad9c07e4af35e8d6c5050732ef030a',
                tokenQty: '100',
                hasEnough: true,
            },
            {
                description:
                    'Returns false if wallet has token but less than required amount',
                tokens: [
                    {
                        tokenId:
                            '28eb601e438b1df2f49b3d783f7b236496ad9c07e4af35e8d6c5050732ef030a',
                        balance: '99',
                    },
                ],
                tokenId:
                    '28eb601e438b1df2f49b3d783f7b236496ad9c07e4af35e8d6c5050732ef030a',
                tokenQty: '100',
                hasEnough: false,
            },
            {
                description: 'Returns false if wallet does not have this token',
                tokens: [
                    {
                        tokenId:
                            '28eb601e438b1df2f49b3d783f7b236496ad9c07e4af35e8d6c5050732ef030a',
                        balance: '99',
                    },
                ],
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
                        balances: {},
                        slpUtxos: [],
                        nonSlpUtxos: [],
                        tokens: [],
                        parsedTxHistory: [],
                    },
                    mnemonic:
                        'beauty shoe decline spend still weird slot snack coach flee between paper',
                    Path145: {
                        publicKey:
                            '03939a29fd67fa602926637a82f53e1826696353613cac03e34160f040ae2dfcb5',
                        hash160: 'a28f8852f868f88e71ec666c632d6f86e978f046',
                        cashAddress:
                            'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
                        fundingWif:
                            'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
                    },
                    Path245: {
                        publicKey:
                            '03f73fe2631da9732f2480debbc7ff8d99c5c06764e0f5095b789ff190788bee72',
                        hash160: '600efb12a6f813eccf13171a8bc62055212d8d6c',
                        cashAddress:
                            'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
                        fundingWif:
                            'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
                    },
                    Path1899: {
                        publicKey:
                            '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                        hash160: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
                        cashAddress:
                            'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                        fundingWif:
                            'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
                    },
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
};
