// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getSlpGenesisTargetOutput,
    getSlpSendTargetOutputs,
    getSlpBurnTargetOutputs,
    getAllSendUtxos,
    getSendTokenInputs,
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

describe('slpv1 methods', () => {
    describe('Generating etoken genesis tx target outputs', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getSlpGenesisTargetOutput;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const { description, genesisConfig, targetOutputs } =
                expectedReturn;
            it(`getSlpGenesisTargetOutput: ${description}`, () => {
                expect(getSlpGenesisTargetOutput(genesisConfig)).toStrictEqual(
                    targetOutputs,
                );
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
    describe('Get slpv1 send token inputs and outputs', () => {
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
                expect(
                    getSlpSendTargetOutputs(
                        { tokenInputs, sendAmounts },
                        SEND_DESTINATION_ADDRESS,
                    ),
                ).toStrictEqual(targetOutputs);
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
                targetOutputs,
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

                expect(
                    getSlpBurnTargetOutputs(calculatedTokenInputInfo),
                ).toStrictEqual(targetOutputs);
            });
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
            const { description, tokenId, decimals, mintQty, targetOutputs } =
                vector;
            it(`getMintTargetOutputs: ${description}`, () => {
                expect(
                    getMintTargetOutputs(tokenId, decimals, mintQty),
                ).toStrictEqual(targetOutputs);
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
            const { description, tokenId, destinationAddress, returned } =
                expectedReturn;
            it(`getNftChildSendTargetOutputs: ${description}`, () => {
                expect(
                    getNftChildSendTargetOutputs(tokenId, destinationAddress),
                ).toEqual(returned);
            });
        });
    });
});
