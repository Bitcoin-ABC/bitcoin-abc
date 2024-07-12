// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    sendXec,
    getMultisendTargetOutputs,
    ignoreUnspendableUtxos,
    getMaxSendAmountSatoshis,
    isFinalizedInput,
} from 'transactions';
import {
    getSendTokenInputs,
    getSlpSendTargetOutputs,
    getSlpBurnTargetOutputs,
} from 'slpv1';
import { MockChronikClient } from '../../../../modules/mock-chronik-client';
import vectors, {
    sendXecVectors,
    getMultisendTargetOutputsVectors,
    ignoreUnspendableUtxosVectors,
    sendSlp,
} from '../fixtures/vectors';
import slpv1Vectors from 'slpv1/fixtures/vectors';
import { wallet, walletWithTokensInNode } from 'transactions/fixtures/mocks';
import { Ecc, initWasm, Script, fromHex } from 'ecash-lib';

describe('Cashtab functions that build and broadcast rawtxs', () => {
    let ecc;
    beforeAll(async () => {
        // Initialize web assembly
        await initWasm();
        // Initialize Ecc
        ecc = new Ecc();
    });

    describe('We can broadcast XEC transactions', () => {
        // Unit test for each vector in fixtures for the sendingXecToSingleAddress case
        const { txs, errors } = sendXecVectors;

        // Successfully built and broadcast txs
        txs.forEach(async tx => {
            const {
                description,
                wallet,
                targetOutputs,
                satsPerKb,
                chaintipBlockheight,
                txid,
                hex,
            } = tx;
            it(`sendXec: ${description}`, async () => {
                const chronik = new MockChronikClient();
                chronik.setMock('broadcastTx', {
                    input: hex,
                    output: { txid },
                });
                expect(
                    await sendXec(
                        chronik,
                        ecc,
                        wallet,
                        targetOutputs,
                        satsPerKb,
                        chaintipBlockheight,
                    ),
                ).toStrictEqual({ hex, response: { txid } });
            });
        });

        // Error cases
        errors.forEach(async error => {
            const { description, wallet, targetOutputs, satsPerKb, msg, hex } =
                error;

            it(`sendXec: ${description}`, async () => {
                const chronik = new MockChronikClient();
                // e.g. ('block', {input: '', output: ''})
                if (typeof hex !== 'undefined') {
                    // For error cases that are not thrown until after the tx is successfully built,
                    // set a tx broadcast error that can be thrown by the broadcasting eCash node
                    chronik.setMock('broadcastTx', {
                        input: hex,
                        output: new Error(msg),
                    });
                }

                await expect(
                    sendXec(chronik, ecc, wallet, targetOutputs, satsPerKb),
                ).rejects.toThrow(msg);
            });
        });
    });
    it('We can build a tx to get the exact fee, then add another utxo if necessary', async () => {
        /**
         * We send 2000 satoshis with utxos of 1000, 1001, and 1000
         * Expected behavior
         * sendXec will build and attempt to broadcast the tx with total inputs of 2001 satoshis,
         * as 2001 > 2000
         * This will fail because tx fee is greater than 1 satoshi
         * Cashtab will add another input and successfully broadcast the tx
         */
        const chronik = new MockChronikClient();
        const hex =
            '0200000003c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef154680000000064417353fc52d6f47efffddf90656dcbd4313f476c292625e24c71660b7b075f36f2c163ff2c713ad8e593490cbbaa32b424c93671908731912de255327e394c65eb4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffc31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468010000006441ef045f01ba4b6dd75b470787de704c366ad8869369ae445f9fb744ee3ec220533324423ae6028e6fb72fbd3d7f6359eb9c1b35322ced7e2d263170a4092bebaa4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffc31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468020000006441faa831725c8e38a909cbf3ba594360b2d51fd884397347f4c0ce0d1379096636db4126d7f9caf34f7480d3700ffbed062352ea7e0b2fac15f5a35df880b9154c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff01d0070000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac00000000';
        const txid =
            '73af2c7dcf70811ef6fa68c671673529289b1304e1cb3979f9792780f2b885ab';
        chronik.setMock('broadcastTx', {
            input: hex,
            output: {
                txid,
            },
        });
        const walletWithEdgeCaseUtxos = {
            ...wallet,
            state: {
                ...wallet.state,
                nonSlpUtxos: [
                    {
                        outpoint: {
                            txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                            outIdx: 0,
                        },
                        blockHeight: -1,
                        isCoinbase: false,
                        value: 1000,
                        network: 'XEC',
                        path: 1899,
                    },
                    {
                        outpoint: {
                            txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                            outIdx: 1,
                        },
                        blockHeight: -1,
                        isCoinbase: false,
                        value: 1001,
                        network: 'XEC',
                        path: 1899,
                    },
                    {
                        outpoint: {
                            txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                            outIdx: 2,
                        },
                        blockHeight: -1,
                        isCoinbase: false,
                        value: 1000,
                        network: 'XEC',
                        path: 1899,
                    },
                ],
            },
        };
        expect(
            await sendXec(
                chronik,
                ecc,
                walletWithEdgeCaseUtxos,
                [
                    {
                        script: Script.fromAddress(
                            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                        ),

                        value: 2000,
                    },
                ],
                1000,
                800000,
            ),
        ).toStrictEqual({ hex, response: { txid } });
    });
    it('We will throw expected insufficient funds error if we have enough utxos to cover target send amount but not enough to cover the fee', async () => {
        /**
         * We send 2000 satoshis with utxos of 1000, and 1001
         * Expected behavior
         * sendXec will build and attempt to broadcast the tx with total inputs of 2001 satoshis,
         * as 2001 > 2000
         * This will fail because tx fee is greater than 1 satoshi
         * Cashtab will try to add another input, but no other inputs are available
         * So we get insufficient funds error
         */
        const chronik = new MockChronikClient();

        const walletWithEdgeCaseUtxos = {
            ...wallet,
            state: {
                ...wallet.state,
                nonSlpUtxos: [
                    {
                        outpoint: {
                            txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                            outIdx: 0,
                        },
                        blockHeight: -1,
                        isCoinbase: false,
                        value: 1000,
                        network: 'XEC',
                        path: 1899,
                    },
                    {
                        outpoint: {
                            txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                            outIdx: 1,
                        },
                        blockHeight: -1,
                        isCoinbase: false,
                        value: 1001,
                        network: 'XEC',
                        path: 1899,
                    },
                ],
            },
        };
        await expect(
            sendXec(
                chronik,
                ecc,
                walletWithEdgeCaseUtxos,
                [
                    {
                        script: Script.fromAddress(
                            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                        ),

                        value: 2000,
                    },
                ],
                1000,
                800000,
            ),
        ).rejects.toThrow('Insufficient funds');
    });
    describe('Forming multisend targetOutputs', () => {
        // Unit test for each vector in fixtures for the getMultisendTargetOutputs case
        const { formedOutputs, errors } = getMultisendTargetOutputsVectors;

        // Successfully built and broadcast txs
        formedOutputs.forEach(async formedOutput => {
            const { description, userMultisendInput, targetOutputs } =
                formedOutput;
            it(`getMultisendTargetOutputs: ${description}`, () => {
                expect(
                    getMultisendTargetOutputs(userMultisendInput),
                ).toStrictEqual(targetOutputs);
            });
        });

        // Error cases
        errors.forEach(async error => {
            const { description, userMultisendInput, msg } = error;

            it(`getMultisendTargetOutputs throws error for: ${description}`, () => {
                expect(() =>
                    getMultisendTargetOutputs(userMultisendInput),
                ).toThrow(msg);
            });
        });
    });
    describe('Ignore unspendable coinbase utxos', () => {
        // Unit test for each vector in fixtures for the ignoreUnspendableUtxos case
        const { expectedReturns } = ignoreUnspendableUtxosVectors;

        // Successfully built and broadcast txs
        expectedReturns.forEach(async formedOutput => {
            const {
                description,
                unfilteredUtxos,
                chaintipBlockheight,
                spendableUtxos,
            } = formedOutput;
            it(`ignoreUnspendableUtxos: ${description}`, () => {
                expect(
                    ignoreUnspendableUtxos(
                        unfilteredUtxos,
                        chaintipBlockheight,
                    ),
                ).toStrictEqual(spendableUtxos);
            });
        });
    });
    describe('We can create and broadcast SLP v1 SEND and BURN txs from utxos of nng or in-node chronik shape', () => {
        // Unit test for each vector in fixtures for the sendingXecToSingleAddress case
        const { expectedReturns } = sendSlp;

        // Successfully builds and broadcasts txs for in-node chronik-client-shaped input utxos
        expectedReturns.forEach(async tx => {
            const {
                description,
                wallet,
                tokenId,
                sendQty,
                decimals,
                sendAmounts,
                tokenInputs,
                destinationAddress,
                satsPerKb,
                chaintipBlockheight,
                txid,
                hex,
                burn,
            } = tx;
            it(`Build and broadcast an SLP V1 SEND and BURN tx from in-node chronik-client utxos: ${description}`, async () => {
                const chronik = new MockChronikClient();
                chronik.setMock('broadcastTx', {
                    input: hex,
                    output: { txid },
                });
                chronik.setMock('broadcastTx', {
                    input: burn.hex,
                    output: { txid: burn.txid },
                });

                // Get tokenInputs and sendAmounts
                const tokenInputInfo = getSendTokenInputs(
                    wallet.state.slpUtxos,
                    tokenId,
                    sendQty,
                    decimals,
                );

                expect(tokenInputInfo.tokenInputs).toStrictEqual(tokenInputs);
                expect(tokenInputInfo.sendAmounts).toStrictEqual(sendAmounts);

                // Get the targetOutputs
                const tokenSendTargetOutputs = getSlpSendTargetOutputs(
                    tokenInputInfo,
                    destinationAddress,
                );

                // SLP v1 SEND
                expect(
                    await sendXec(
                        chronik,
                        ecc,
                        wallet,
                        tokenSendTargetOutputs,
                        satsPerKb,
                        chaintipBlockheight,
                        tokenInputInfo.tokenInputs,
                    ),
                ).toStrictEqual({ hex, response: { txid } });

                // SLP v1 BURN

                // Get the targetOutputs
                const tokenBurnTargetOutputs =
                    getSlpBurnTargetOutputs(tokenInputInfo);

                expect(
                    await sendXec(
                        chronik,
                        ecc,
                        wallet,
                        tokenBurnTargetOutputs, // This is the only difference between SEND and BURN
                        satsPerKb,
                        chaintipBlockheight,
                        tokenInputInfo.tokenInputs,
                    ),
                ).toStrictEqual({
                    hex: burn.hex,
                    response: { txid: burn.txid },
                });
            });
        });
    });
    describe('We can build and broadcast NFT1 parent fan-out txs', () => {
        const { expectedReturns } = slpv1Vectors.getNftParentFanTxTargetOutputs;
        const CHAINTIP = 800000;
        const FEE_RATE_SATS_PER_KB = 1000;

        // Successfully built and broadcast txs
        expectedReturns.forEach(async tx => {
            const { description, fanInputs, returned, rawTx } = tx;

            const { hex, txid } = rawTx;
            it(`sendXec: ${description}`, async () => {
                const chronik = new MockChronikClient();
                chronik.setMock('broadcastTx', {
                    input: hex,
                    output: { txid },
                });
                expect(
                    await sendXec(
                        chronik,
                        ecc,
                        {
                            ...walletWithTokensInNode,
                            state: {
                                ...walletWithTokensInNode.state,
                                slpUtxos: [
                                    ...walletWithTokensInNode.state.slpUtxos,
                                    ...fanInputs,
                                ],
                            },
                        },
                        returned,
                        FEE_RATE_SATS_PER_KB,
                        CHAINTIP,
                        fanInputs,
                    ),
                ).toStrictEqual({ hex, response: { txid } });
            });
        });
    });
    describe('We can get the max amount of XEC that a wallet can send', () => {
        const MOCK_CHAINTIP = 800000;
        it('We determine the max-send amount as the total value of all nonSlpUtxos less the required fee in satoshis', () => {
            const SATOSHIS_PER_KB = 1000;
            expect(
                getMaxSendAmountSatoshis(
                    walletWithTokensInNode,
                    [],
                    MOCK_CHAINTIP,
                    SATOSHIS_PER_KB,
                ),
            ).toStrictEqual(999815);
        });
        it('We can also determine the max send amount if the user includes a Cashtab Msg', () => {
            const SATOSHIS_PER_KB = 1000;
            expect(
                getMaxSendAmountSatoshis(
                    walletWithTokensInNode,
                    [
                        {
                            value: 0,
                            script: new Script(
                                fromHex(
                                    '6a04007461622bf09f998ff09f93acf09faba1f09f9180f09f95b5efb88ff09f9191f09f8e83f09faa96f09f908bf09f8eaf',
                                ),
                            ),
                        },
                    ],
                    MOCK_CHAINTIP,
                    SATOSHIS_PER_KB,
                ),
            ).toStrictEqual(999756);
        });
        it('The max send amount is lower if the fee is higher', () => {
            const SATOSHIS_PER_KB = 2000;
            expect(
                getMaxSendAmountSatoshis(
                    walletWithTokensInNode,
                    [],
                    MOCK_CHAINTIP,
                    SATOSHIS_PER_KB,
                ),
            ).toStrictEqual(999630);
        });
        it('We must adjust for a higher fee if we have more utxos', () => {
            const SATOSHIS_PER_KB = 1000;
            const MOCK_BASE_XEC_UTXO = {
                path: 1899,
                outpoint: {
                    txid: '1111111111111111111111111111111111111111111111111111111111111111',
                },
                blockHeight: 700000,
                isCoinbase: false,
            };
            expect(
                getMaxSendAmountSatoshis(
                    {
                        ...walletWithTokensInNode,
                        state: {
                            ...walletWithTokensInNode.state,
                            nonSlpUtxos: [
                                ...walletWithTokensInNode.state.nonSlpUtxos,
                                { ...MOCK_BASE_XEC_UTXO, value: 1000000 },
                            ],
                        },
                    },
                    [],
                    MOCK_CHAINTIP,
                    SATOSHIS_PER_KB,
                ),
            ).toStrictEqual(1999674);
        });
        it('An immature Coinbase utxo will be ignored in the onMax calculation', () => {
            const SATOSHIS_PER_KB = 2000;
            const MOCK_STAKING_REWARD_UTXO = {
                path: 1899,
                outpoint: {
                    txid: '1111111111111111111111111111111111111111111111111111111111111111',
                },
                blockHeight: 799999,
                isCoinbase: true,
                value: 325000,
            };
            expect(
                getMaxSendAmountSatoshis(
                    {
                        ...walletWithTokensInNode,
                        state: {
                            ...walletWithTokensInNode.state,
                            nonSlpUtxos: [
                                ...walletWithTokensInNode.state.nonSlpUtxos,
                                MOCK_STAKING_REWARD_UTXO,
                            ],
                        },
                    },
                    [],
                    MOCK_CHAINTIP,
                    SATOSHIS_PER_KB,
                ),
            ).toStrictEqual(999630);
        });
    });
    describe('We can tell whether or not a requiredInput needs a normal p2pkh signature from the wallet', () => {
        const { expectedReturns } = vectors.isFinalizedInput;
        expectedReturns.forEach(expectedReturn => {
            const { description, requiredInput, returned } = expectedReturn;
            it(`isFinalizedInput: ${description}`, () => {
                expect(isFinalizedInput(requiredInput)).toBe(returned);
            });
        });
    });
});
