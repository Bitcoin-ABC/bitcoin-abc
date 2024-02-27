// Copyright (c) 2018 Daniel Cousens
// Copyright (c) 2023 Bitcoin ABC
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { coinSelect, getMaxSendAmountSatoshis } = require('../src/coinSelect');

const MOCK_TOKEN_UTXO = { value: '546' };
const MOCK_TOKEN_SEND_OUTPUT = {
    value: 0,
    script: Buffer.from(
        '6a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000bebc200080000000002faf080',
        'hex',
    ),
};
const OP_RETURN_MAX_SIZE =
    '6a04007461624cd75f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f323135';

describe('coinSelect() accumulative algorithm for utxo selection in coinselect.js', async function () {
    it('adds a change output if change > dust', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];

        const result = coinSelect(stubChronikUtxos, [{ value: 1000 }], 1);
        assert.deepEqual(result, {
            inputs: [{ value: 1000 }, { value: 2000 }],
            outputs: [{ value: 1000 }, { value: 1626 }],
            fee: 374,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of result.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }
    });
    it('Handles an slpv1 token send tx with token change and eCash change', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];

        // Assume we have 3 input utxos
        const tokenInputs = [MOCK_TOKEN_UTXO, MOCK_TOKEN_UTXO, MOCK_TOKEN_UTXO];

        // Target outputs for a typical slpv1 send with change
        // These would be calculated by an app dev since the script depends on token change
        const targetOutputs = [
            MOCK_TOKEN_SEND_OUTPUT,
            MOCK_TOKEN_UTXO,
            MOCK_TOKEN_UTXO,
            { value: 1000 },
        ];
        const result = coinSelect(
            stubChronikUtxos,
            targetOutputs,
            1,
            tokenInputs,
        );
        assert.deepEqual(result, {
            inputs: tokenInputs.concat([{ value: 1000 }, { value: 2000 }]),
            outputs: targetOutputs.concat([{ value: 1587 }]),
            fee: 959,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of result.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }
    });
    it('Handles an slpv1 token send tx with token change and no eCash change', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];

        // Assume we have 3 input utxos
        const tokenInputs = [MOCK_TOKEN_UTXO, MOCK_TOKEN_UTXO, MOCK_TOKEN_UTXO];

        // Target outputs for a typical slpv1 send with change
        // These would be calculated by an app dev since the script depends on token change
        const targetOutputs = [
            MOCK_TOKEN_SEND_OUTPUT,
            MOCK_TOKEN_UTXO,
            MOCK_TOKEN_UTXO,
            { value: 5473 },
        ];

        const result = coinSelect(
            stubChronikUtxos,
            targetOutputs,
            1,
            tokenInputs,
        );
        assert.deepEqual(result, {
            inputs: tokenInputs.concat([
                { value: 1000 },
                { value: 2000 },
                { value: 3000 },
            ]),
            outputs: targetOutputs,
            fee: 1073,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of result.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }
    });
    it('Handles an slpv1 token send tx with no token change and eCash change', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];

        // Assume we have 3 input utxos
        const tokenInputs = [MOCK_TOKEN_UTXO, MOCK_TOKEN_UTXO, MOCK_TOKEN_UTXO];

        // Target outputs for a typical slpv1 send with no change, i.e. only 1 output
        // These would be calculated by an app dev since the script depends on token change
        const targetOutputs = [
            MOCK_TOKEN_SEND_OUTPUT,
            MOCK_TOKEN_UTXO,
            { value: 1500 },
        ];

        const result = coinSelect(
            stubChronikUtxos,
            targetOutputs,
            1,
            tokenInputs,
        );

        assert.deepEqual(result, {
            inputs: tokenInputs.concat([{ value: 1000 }, { value: 2000 }]),
            outputs: targetOutputs.concat([{ value: 1667 }]),
            fee: 925,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of result.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }
    });
    it('Handles an slpv1 token send tx with no token change and no eCash change', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];

        // Assume we have 3 input utxos
        const tokenInputs = [MOCK_TOKEN_UTXO, MOCK_TOKEN_UTXO, MOCK_TOKEN_UTXO];

        // Target outputs for a typical slpv1 send with no change, i.e. only 1 output
        // These would be calculated by an app dev since the script depends on token change
        const targetOutputs = [
            MOCK_TOKEN_SEND_OUTPUT,
            MOCK_TOKEN_UTXO,
            { value: 6053 },
        ];

        const result = coinSelect(
            stubChronikUtxos,
            targetOutputs,
            1,
            tokenInputs,
        );

        assert.deepEqual(result, {
            inputs: tokenInputs.concat([
                { value: 1000 },
                { value: 2000 },
                { value: 3000 },
            ]),
            outputs: targetOutputs,
            fee: 1039,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of result.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }
    });
    it('Does not include decimals in a change output', function () {
        const stubChronikUtxos = [
            {
                value: 206191611,
            },
        ];
        const mockFeeRate = 2.01;

        const result = coinSelect(
            stubChronikUtxos,
            [{ value: 11000 }],
            mockFeeRate,
        );

        assert.deepEqual(result, {
            inputs: [
                {
                    value: 206191611,
                },
            ],
            outputs: [{ value: 11000 }, { value: 206180156 }],
            fee: 455,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of result.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }
    });
    it('does not add a change output if change < dust', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];

        const result = coinSelect(stubChronikUtxos, [{ value: 550 }], 1);

        assert.deepEqual(result, {
            inputs: [{ value: 1000 }],
            outputs: [{ value: 550 }],
            fee: 450,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of result.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }
    });
    it('handles a one-input tx with change and no OP_RETURN', function () {
        const result = coinSelect([{ value: '100000' }], [{ value: 10000 }], 1);

        assert.deepEqual(result, {
            inputs: [{ value: 100000 }],
            outputs: [{ value: 10000 }, { value: 89774 }],
            fee: 226,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of result.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }
    });
    it('handles eCash max length OP_RETURN in output script', function () {
        const FEE_OF_SAME_TX_WITHOUT_OP_RETURN_OUTPUT_SEE_TEST_ABOVE = 226;

        const TX_OUTPUT_BASE = 8 + 1;

        const expectedFee =
            FEE_OF_SAME_TX_WITHOUT_OP_RETURN_OUTPUT_SEE_TEST_ABOVE +
            TX_OUTPUT_BASE +
            OP_RETURN_MAX_SIZE.length / 2;

        const result = coinSelect(
            [{ value: '100000' }],
            [
                {
                    value: 0,
                    script: Buffer.from(OP_RETURN_MAX_SIZE, 'hex'),
                },
                { value: 10000 },
            ],
            1,
        );

        assert.deepEqual(result, {
            inputs: [{ value: 100000 }],
            outputs: [
                {
                    value: 0,
                    script: Buffer.from(OP_RETURN_MAX_SIZE, 'hex'),
                },
                { value: 10000 },
                { value: 89542 },
            ],
            fee: expectedFee,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of result.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }

        const resultHex = coinSelect(
            [{ value: '100000' }],
            [
                {
                    value: 0,
                    script: OP_RETURN_MAX_SIZE,
                },
                { value: 10000 },
            ],
            1,
        );
        // Also works if script output is a hex string and not a Buffer
        assert.deepEqual(resultHex, {
            inputs: [{ value: 100000 }],
            outputs: [
                {
                    value: 0,
                    script: OP_RETURN_MAX_SIZE,
                },
                { value: 10000 },
                { value: 89542 },
            ],
            fee: expectedFee,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of resultHex.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }
    });
    it('adds a change output if change > dust', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];

        const result = coinSelect(stubChronikUtxos, [{ value: 1000 }], 1);

        assert.deepEqual(result, {
            inputs: [{ value: 1000 }, { value: 2000 }],
            outputs: [{ value: 1000 }, { value: 1626 }],
            fee: 374,
        });

        // Inputs all have a 'number' at value key
        // TxBuilder can only sign if this is the case
        for (const input of result.inputs) {
            assert.equal(typeof input.value === 'number', true);
        }
    });
    it('throws expected error if called with feeRate < 1', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.throws(() => {
            coinSelect(stubChronikUtxos, [{ value: 500 }], 0.99);
        }, Error('feeRate must be a number >= 1'));
    });
    it('throws expected error if targetOutputs sum to dust', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.throws(() => {
            coinSelect(stubChronikUtxos, [{ value: 500 }], 1);
        }, Error('Transaction output amount must be at least the dust threshold of 546 satoshis'));
    });
    it('throws expected error if sum(targetOutputs) < sum(inputs) + fee', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.throws(() => {
            coinSelect(stubChronikUtxos, [{ value: 5600 }], 1);
        }, Error('Insufficient funds'));
    });
    it('ignores slp utxos from NNG chronik-client', function () {
        // Make all utxos slp utxos
        const stubChronikUtxos = [
            { value: '1000', slpToken: {} },
            { value: '2000', slpToken: {} },
            { value: '3000', slpToken: {} },
        ];
        // The wallet now has insufficient funds to send an eCash tx, as slp utxos will be ignored
        assert.throws(() => {
            coinSelect(stubChronikUtxos, [{ value: 900 }], 1);
        }, Error('Insufficient funds'));
    });
    it('ignores slp utxos from in-node chronik-client', function () {
        // Make all utxos slp utxos
        const stubChronikUtxos = [
            { value: '1000', token: {} },
            { value: '2000', token: {} },
            { value: '3000', token: {} },
        ];
        // The wallet now has insufficient funds to send an eCash tx, as slp utxos will be ignored
        assert.throws(() => {
            coinSelect(stubChronikUtxos, [{ value: 900 }], 1);
        }, Error('Insufficient funds'));
    });
    it('getMaxSendAmountSatoshis gets max send amount for a wallet with multiple utxos', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.equal(getMaxSendAmountSatoshis(stubChronikUtxos, 1), 5512);
    });
    it('getMaxSendAmountSatoshis gets the same result even if the wallet has token utxos with spendable amounts', function () {
        const stubChronikUtxos = [
            { value: '10000', token: {} }, // in-node chronik
            { value: '10000', slpToken: {} }, // NNG chronik
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.equal(getMaxSendAmountSatoshis(stubChronikUtxos, 1), 5512);
    });
    it('getMaxSendAmountSatoshis gets max send amount for a wallet with one utxo', function () {
        const stubChronikUtxos = [{ value: '1000' }];
        assert.equal(getMaxSendAmountSatoshis(stubChronikUtxos, 1), 808);
    });
    it('getMaxSendAmountSatoshis gets max send amount for a wallet with multiple utxos if the user specifies an OP_RETURN output', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.equal(
            getMaxSendAmountSatoshis(stubChronikUtxos, 1, [
                {
                    value: 0,
                    script: Buffer.from(OP_RETURN_MAX_SIZE, 'hex'),
                },
            ]),
            5280,
        );
    });
    it('getMaxSendAmountSatoshis gets max send amount for a wallet with multiple utxos at an arbitrary fee', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.equal(getMaxSendAmountSatoshis(stubChronikUtxos, 5.01), 3555);
    });
    it('getMaxSendAmountSatoshis throws error if wallet has insufficient funds to send a tx with the requested inputs and outputs', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.throws(() => {
            getMaxSendAmountSatoshis(stubChronikUtxos, 17.01);
        }, Error('Insufficient funds to send any satoshis from this wallet at fee rate of 17.01 satoshis per byte'));
    });
    it('getMaxSendAmountSatoshis will return dust amount if that is the max sendable amount', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.equal(getMaxSendAmountSatoshis(stubChronikUtxos, 11.176), 546);
    });
    it('getMaxSendAmountSatoshis will throw error if amount is 1 sat lower than dust', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.throws(() => {
            getMaxSendAmountSatoshis(stubChronikUtxos, 11.177);
        }, Error('Insufficient funds to send any satoshis from this wallet at fee rate of 11.177 satoshis per byte'));
    });
});
