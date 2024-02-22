// Copyright (c) 2018 Daniel Cousens
// Copyright (c) 2023 Bitcoin ABC
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { coinSelect } = require('../src/coinSelect');

describe('coinSelect() accumulative algorithm for utxo selection in coinselect.js', async function () {
    it('adds a change output if change > dust', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.deepEqual(coinSelect(stubChronikUtxos, [{ value: 1000 }], 1), {
            inputs: [{ value: 1000 }, { value: 2000 }],
            outputs: [{ value: 1000 }, { value: 1626 }],
            fee: 374,
        });
    });
    it('Does not include decimals in a change output', function () {
        const stubChronikUtxos = [
            {
                value: 206191611,
            },
        ];
        const mockFeeRate = 2.01;
        assert.deepEqual(
            coinSelect(stubChronikUtxos, [{ value: 11000 }], mockFeeRate),
            {
                inputs: [
                    {
                        value: 206191611,
                    },
                ],
                outputs: [{ value: 11000 }, { value: 206180156 }],
                fee: 455,
            },
        );
    });
    it('does not add a change output if change < dust', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.deepEqual(coinSelect(stubChronikUtxos, [{ value: 550 }], 1), {
            inputs: [{ value: 1000 }],
            outputs: [{ value: 550 }],
            fee: 450,
        });
    });
    it('handles a one-input tx with change and no OP_RETURN', function () {
        assert.deepEqual(
            coinSelect([{ value: '100000' }], [{ value: 10000 }], 1),
            {
                inputs: [{ value: 100000 }],
                outputs: [{ value: 10000 }, { value: 89774 }],
                fee: 226,
            },
        );
    });
    it('handles eCash max length OP_RETURN in output script', function () {
        const OP_RETURN_MAX_SIZE =
            '6a04007461624cd75f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f323135';

        const FEE_OF_SAME_TX_WITHOUT_OP_RETURN_OUTPUT_SEE_TEST_ABOVE = 226;

        const TX_OUTPUT_BASE = 8 + 1;

        const expectedFee =
            FEE_OF_SAME_TX_WITHOUT_OP_RETURN_OUTPUT_SEE_TEST_ABOVE +
            TX_OUTPUT_BASE +
            OP_RETURN_MAX_SIZE.length / 2;

        assert.deepEqual(
            coinSelect(
                [{ value: '100000' }],
                [
                    {
                        value: 0,
                        script: Buffer.from(OP_RETURN_MAX_SIZE, 'hex'),
                    },
                    { value: 10000 },
                ],
                1,
            ),
            {
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
            },
        );
        // Also works if script output is a hex string and not a Buffer
        assert.deepEqual(
            coinSelect(
                [{ value: '100000' }],
                [
                    {
                        value: 0,
                        script: OP_RETURN_MAX_SIZE,
                    },
                    { value: 10000 },
                ],
                1,
            ),
            {
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
            },
        );
    });
    it('adds a change output if change > dust', function () {
        const stubChronikUtxos = [
            { value: '1000' },
            { value: '2000' },
            { value: '3000' },
        ];
        assert.deepEqual(coinSelect(stubChronikUtxos, [{ value: 1000 }], 1), {
            inputs: [{ value: 1000 }, { value: 2000 }],
            outputs: [{ value: 1000 }, { value: 1626 }],
            fee: 374,
        });
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
});
