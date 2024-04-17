// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getSlpGenesisTargetOutput,
    getSlpSendTargetOutputs,
    getSlpBurnTargetOutputs,
    getAllSendUtxos,
    getSendTokenInputs,
    getExplicitBurnTargetOutputs,
    getMintBatons,
    getMintTargetOutputs,
    getMaxMintAmount,
    getNftParentGenesisTargetOutputs,
    getNftParentMintTargetOutputs,
    getNftParentFanInputs,
    getNftParentFanTxTargetOutputs,
    getNftChildGenesisInput,
    getNftChildGenesisTargetOutputs,
    getNft,
    getNftChildSendTargetOutputs,
} from 'slpv1';
import vectors from '../fixtures/vectors';
import { SEND_DESTINATION_ADDRESS } from '../fixtures/vectors';
import appConfig from 'config/app';

describe('slpv1 methods', () => {
    describe('Generating etoken genesis tx target outputs', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getSlpGenesisTargetOutput;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const { description, genesisConfig, targetOutputs } =
                expectedReturn;
            it(`getSlpGenesisTargetOutput: ${description}`, () => {
                // Output value should be zero for OP_RETURN
                const calculatedTargetOutputs =
                    getSlpGenesisTargetOutput(genesisConfig);

                // We expect 2 outputs or 3 outputs
                expect(calculatedTargetOutputs.length >= 2).toBe(true);

                // The output at the 0-index is the OP_RETURN
                expect(calculatedTargetOutputs[0].value).toBe(0);
                expect(calculatedTargetOutputs[0].script.toString('hex')).toBe(
                    targetOutputs[0].script,
                );
                // The output at the 1-index is dust to given address
                expect(calculatedTargetOutputs[1]).toStrictEqual({
                    value: appConfig.dustSats,
                });
                if (calculatedTargetOutputs.length > 2) {
                    // If we have a mint baton

                    // We will only have 3 outputs in this case
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(calculatedTargetOutputs.length).toBe(3);

                    // The mint baton is at index 2
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(calculatedTargetOutputs[2]).toStrictEqual({
                        value: appConfig.dustSats,
                    });
                }
            });
        });

        // Error cases
        expectedErrors.forEach(expectedError => {
            const { description, genesisConfig, errorMsg } = expectedError;
            it(`getSlpGenesisTargetOutput throws error for: ${description}`, () => {
                expect(() => getSlpGenesisTargetOutput(genesisConfig)).toThrow(
                    errorMsg,
                );
            });
        });
    });
    describe('Get all slpv1 SEND utxos from a mixed utxo set from ChronikClientNode', () => {
        const { expectedReturns } = vectors.getAllSendUtxos;
        expectedReturns.forEach(expectedReturn => {
            const { description, utxos, tokenId, tokenUtxos } = expectedReturn;
            it(`getAllSendUtxos: ${description}`, () => {
                expect(getAllSendUtxos(utxos, tokenId)).toStrictEqual(
                    tokenUtxos,
                );
            });
        });
    });
    describe('Get slpv1 send token inputs and outputs from in-node chronik-client', () => {
        const { expectedReturns, expectedErrors } = vectors.getSendTokenInputs;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                allSendUtxos,
                sendQty,
                decimals,
                tokenId,
                tokenInputs,
                sendAmounts,
                targetOutputs,
            } = expectedReturn;
            it(`getSendTokenInputs: ${description}`, () => {
                const calcTokenInputs = getSendTokenInputs(
                    allSendUtxos,
                    tokenId,
                    sendQty,
                    decimals,
                );
                expect(calcTokenInputs.tokenInputs).toStrictEqual(tokenInputs);
                expect(calcTokenInputs.sendAmounts).toStrictEqual(sendAmounts);
            });
            it(`getSlpSendTargetOutputs with in-node inputs: ${description}`, () => {
                const calculatedTargetOutputs = getSlpSendTargetOutputs(
                    { tokenInputs, sendAmounts },
                    SEND_DESTINATION_ADDRESS,
                );

                // We will always have the OP_RETURN output at index 0
                expect(calculatedTargetOutputs[0].value).toBe(0);
                expect(calculatedTargetOutputs[0].script.toString('hex')).toBe(
                    targetOutputs[0].script,
                );

                // We will always have the destination output at index 1
                expect(calculatedTargetOutputs[1].value).toBe(
                    appConfig.dustSats,
                );
                expect(calculatedTargetOutputs[1].address).toBe(
                    SEND_DESTINATION_ADDRESS,
                );

                // If there is a change output it is at index 2
                if (typeof calculatedTargetOutputs[2] !== 'undefined') {
                    // If we are here, assert the length must be 3

                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(calculatedTargetOutputs.length).toBe(3);

                    // assert the expected change output
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(calculatedTargetOutputs[2].value).toBe(
                        appConfig.dustSats,
                    );
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect('address' in calculatedTargetOutputs[2]).toBe(false);
                } else {
                    // If we are here, assert the length must be 2

                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(calculatedTargetOutputs.length).toBe(2);
                }
            });
        });
        expectedErrors.forEach(expectedError => {
            const {
                description,
                allSendUtxos,
                tokenId,
                sendQty,
                decimals,
                errorMsg,
            } = expectedError;
            it(`getSlpBurnTargetOutput throws error for: ${description}`, () => {
                expect(() =>
                    getSendTokenInputs(
                        allSendUtxos,
                        tokenId,
                        sendQty,
                        decimals,
                    ),
                ).toThrow(errorMsg);
            });
        });
    });
    describe('Get slpv1 send input utxos from in-node chronik-client', () => {
        const { expectedReturns, expectedErrors } = vectors.getSendTokenInputs;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                allSendUtxos,
                sendQty,
                tokenId,
                decimals,
                tokenInputs,
                sendAmounts,
                targetOutputs,
            } = expectedReturn;
            it(`getSendTokenInputs with in-node chronik utxos: ${description}`, () => {
                const calcTokenInputs = getSendTokenInputs(
                    allSendUtxos,
                    tokenId,
                    sendQty,
                    decimals,
                );
                expect(calcTokenInputs.tokenInputs).toStrictEqual(tokenInputs);
                expect(calcTokenInputs.sendAmounts).toStrictEqual(sendAmounts);
            });
            it(`getSlpSendTargetOutputs with in-node inputs: ${description}`, () => {
                const calculatedTargetOutputs = getSlpSendTargetOutputs(
                    { tokenInputs, sendAmounts },
                    SEND_DESTINATION_ADDRESS,
                );

                // We will always have the OP_RETURN output at index 0
                expect(calculatedTargetOutputs[0].value).toBe(0);
                expect(calculatedTargetOutputs[0].script.toString('hex')).toBe(
                    targetOutputs[0].script,
                );

                // We will always have the destination output at index 1
                expect(calculatedTargetOutputs[1].value).toBe(
                    appConfig.dustSats,
                );
                expect(calculatedTargetOutputs[1].address).toBe(
                    SEND_DESTINATION_ADDRESS,
                );

                // If there is a change output it is at index 2
                if (typeof calculatedTargetOutputs[2] !== 'undefined') {
                    // If we are here, assert the length must be 3

                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(calculatedTargetOutputs.length).toBe(3);

                    // assert the expected change output
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(calculatedTargetOutputs[2].value).toBe(
                        appConfig.dustSats,
                    );
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect('address' in calculatedTargetOutputs[2]).toBe(false);
                } else {
                    // If we are here, assert the length must be 2

                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(calculatedTargetOutputs.length).toBe(2);
                }
            });
        });
        expectedErrors.forEach(expectedError => {
            const {
                description,
                allSendUtxos,
                sendQty,
                tokenId,
                decimals,
                errorMsg,
            } = expectedError;
            it(`getSendTokenInputs with in-node chronik utxos throws error for: ${description}`, () => {
                expect(() =>
                    getSendTokenInputs(
                        allSendUtxos,
                        tokenId,
                        sendQty,
                        decimals,
                    ),
                ).toThrow(errorMsg);
            });
        });
    });
    describe('Generating etoken burn tx target outputs', () => {
        const { expectedReturns } = vectors.burnTxs;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                tokenUtxos,
                burnQty,
                tokenId,
                decimals,
                tokenInputInfo,
                outputScriptHex,
            } = expectedReturn;

            it(`getSlpBurnTargetOutputs: ${description}`, () => {
                // We get the same tokenInputInfo object for token burns that we do for token sends
                const calculatedTokenInputInfo = getSendTokenInputs(
                    tokenUtxos,
                    tokenId,
                    burnQty,
                    decimals,
                );

                expect(calculatedTokenInputInfo.sendAmounts).toStrictEqual(
                    tokenInputInfo.sendAmounts,
                );

                const targetOutput = getSlpBurnTargetOutputs(
                    calculatedTokenInputInfo,
                );

                // We will always have the OP_RETURN output at index 0
                expect(targetOutput[0].value).toBe(0);
                expect(targetOutput[0].script.toString('hex')).toBe(
                    outputScriptHex,
                );

                // BURN txs always have 2 outputs
                expect(targetOutput.length).toBe(2);
                // assert the expected change output
                expect(targetOutput[1].value).toBe(appConfig.dustSats);
                expect('address' in targetOutput[1]).toBe(false);
            });
        });
    });
    describe('Generating explicit etoken burn tx target output from in-node utxos', () => {
        const { expectedReturns } = vectors.explicitBurns;

        expectedReturns.forEach(expectedReturn => {
            const { description, burnUtxos, decimals, outputScriptHex } =
                expectedReturn;
            it(`getExplicitBurnTargetOutputs: ${description}`, () => {
                const targetOutputs = getExplicitBurnTargetOutputs(
                    burnUtxos,
                    decimals,
                );
                // We get an array of length 1
                expect(targetOutputs.length).toBe(1);
                // Output value should be zero for OP_RETURN
                expect(targetOutputs[0].value).toBe(0);
                // Test vs hex string as cannot store buffer type in vectors
                expect(targetOutputs[0].script.toString('hex')).toBe(
                    outputScriptHex,
                );
            });
        });

        // We expect an error if in-node utxos are used in a call without specifying the decimals param
        it(`getExplicitBurnTargetOutputs throws error if called with in-node utxos and no specified decimals`, () => {
            expect(() =>
                getExplicitBurnTargetOutputs([
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '3333333333333333333333333333333333333333333333333333333333333333',
                            amount: '100',
                        },
                    },
                ]),
            ).toThrow(
                'Invalid decimals -1 for tokenId 3333333333333333333333333333333333333333333333333333333333333333. Decimals must be an integer 0-9.',
            );
        });
    });
    describe('Get slpv1 mint baton(s)', () => {
        const { expectedReturns } = vectors.getMintBatons;
        expectedReturns.forEach(vector => {
            const { description, utxos, tokenId, returned } = vector;
            it(`getMintBatons: ${description}`, () => {
                expect(getMintBatons(utxos, tokenId)).toStrictEqual(returned);
            });
        });
    });
    describe('Generate target outputs for an slpv1 mint tx', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getMintTargetOutputs;
        expectedReturns.forEach(vector => {
            const { description, tokenId, decimals, mintQty, script } = vector;
            it(`getMintTargetOutputs: ${description}`, () => {
                const mintTargetOutputs = getMintTargetOutputs(
                    tokenId,
                    decimals,
                    mintQty,
                );
                expect(mintTargetOutputs[0].script.toString('hex')).toBe(
                    script,
                );
                expect(mintTargetOutputs.length).toBe(3);
                expect(mintTargetOutputs.splice(1, 3)).toStrictEqual([
                    { value: appConfig.dustSats },
                    { value: appConfig.dustSats },
                ]);
            });
        });
        expectedErrors.forEach(vector => {
            const { description, tokenId, decimals, mintQty, error } = vector;
            it(`getMintTargetOutputs throws error for: ${description}`, () => {
                expect(() =>
                    getMintTargetOutputs(tokenId, decimals, mintQty),
                ).toThrow(error);
            });
        });
    });
    describe('Gets max mint amount, decimalized', () => {
        const { expectedReturns } = vectors.getMaxMintAmount;
        expectedReturns.forEach(vector => {
            const { description, decimals, returned } = vector;
            it(`getMaxMintAmount: ${description}`, () => {
                expect(getMaxMintAmount(decimals)).toBe(returned);
            });
        });
    });
    describe('Get targetOutputs for NFT1 parent genesis tx', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getNftParentGenesisTargetOutputs;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const { description, genesisConfig, targetOutputs } =
                expectedReturn;
            it(`getNftParentGenesisTargetOutputs: ${description}`, () => {
                expect(getNftParentGenesisTargetOutputs(genesisConfig)).toEqual(
                    targetOutputs,
                );
            });
        });

        // Error cases
        expectedErrors.forEach(expectedError => {
            const { description, genesisConfig, errorMsg } = expectedError;
            it(`getNftParentGenesisTargetOutputs throws error for: ${description}`, () => {
                expect(() =>
                    getNftParentGenesisTargetOutputs(genesisConfig),
                ).toThrow(errorMsg);
            });
        });
    });
    describe('Generate target outputs for an slpv1 nft parent mint tx', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getNftParentMintTargetOutputs;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const { description, tokenId, mintQty, targetOutputs } =
                expectedReturn;
            it(`getNftParentMintTargetOutputs: ${description}`, () => {
                expect(getNftParentMintTargetOutputs(tokenId, mintQty)).toEqual(
                    targetOutputs,
                );
            });
        });

        // Error cases
        expectedErrors.forEach(expectedError => {
            const { description, tokenId, mintQty, errorMsg } = expectedError;
            it(`getNftParentMintTargetOutputs throws error for: ${description}`, () => {
                expect(() =>
                    getNftParentMintTargetOutputs(tokenId, mintQty),
                ).toThrow(errorMsg);
            });
        });
    });
    describe('Gets required inputs for an NFT1 parent fan-out tx, if present in given slpUtxos', () => {
        const { expectedReturns } = vectors.getNftParentFanInputs;
        expectedReturns.forEach(vector => {
            const { description, tokenId, slpUtxos, returned } = vector;
            it(`getNftParentFanInputs: ${description}`, () => {
                expect(getNftParentFanInputs(tokenId, slpUtxos)).toStrictEqual(
                    returned,
                );
            });
        });
    });
    describe('Generate target outputs for an NFT1 parent fan-out tx', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getNftParentFanTxTargetOutputs;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const { description, fanInputs, returned } = expectedReturn;
            it(`getNftParentFanTxTargetOutputs: ${description}`, () => {
                expect(getNftParentFanTxTargetOutputs(fanInputs)).toEqual(
                    returned,
                );
            });
        });

        expectedErrors.forEach(expectedError => {
            const { description, fanInputs, error } = expectedError;
            it(`getNftParentFanTxTargetOutputs throws error for: ${description}`, () => {
                expect(() => getNftParentFanTxTargetOutputs(fanInputs)).toThrow(
                    error,
                );
            });
        });
    });
    describe('Gets required input for an NFT1 child genesis tx, if present in given slpUtxos', () => {
        const { expectedReturns } = vectors.getNftChildGenesisInput;
        expectedReturns.forEach(vector => {
            const { description, tokenId, slpUtxos, returned } = vector;
            it(`getNftChildGenesisInput: ${description}`, () => {
                expect(
                    getNftChildGenesisInput(tokenId, slpUtxos),
                ).toStrictEqual(returned);
            });
        });
    });
    describe('Get targetOutputs for an NFT1 child genesis tx', () => {
        const { expectedReturns } = vectors.getNftChildGenesisTargetOutputs;
        expectedReturns.forEach(expectedReturn => {
            const { description, childGenesisConfig, returned } =
                expectedReturn;
            it(`getNftChildGenesisTargetOutputs: ${description}`, () => {
                expect(
                    getNftChildGenesisTargetOutputs(childGenesisConfig),
                ).toEqual(returned);
            });
        });
    });
    describe('Gets NFT utxo for an NFT 1 child', () => {
        const { expectedReturns } = vectors.getNft;
        expectedReturns.forEach(vector => {
            const { description, tokenId, slpUtxos, returned } = vector;
            it(`getNft: ${description}`, () => {
                expect(getNft(tokenId, slpUtxos)).toStrictEqual(returned);
            });
        });
    });
    describe('Get targetOutputs for an NFT1 child send tx', () => {
        const { expectedReturns } = vectors.getNftChildSendTargetOutputs;
        expectedReturns.forEach(expectedReturn => {
            const { description, tokenId, returned } = expectedReturn;
            it(`getNftChildSendTargetOutputs: ${description}`, () => {
                expect(getNftChildSendTargetOutputs(tokenId)).toEqual(returned);
            });
        });
    });
});
