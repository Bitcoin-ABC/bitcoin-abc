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
};
