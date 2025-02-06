// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getSlpGenesisTargetOutput,
    getSlpSendTargetOutputs,
    getSlpBurnTargetOutputs,
    getMintBatons,
    getMintTargetOutputs,
    getMaxDecimalizedSlpQty,
    getNftParentGenesisTargetOutputs,
    getNftParentMintTargetOutputs,
    getNftParentFanInputs,
    getNftParentFanTxTargetOutputs,
    getNftChildGenesisInput,
    getNftChildGenesisTargetOutputs,
    getNft,
    getNftChildSendTargetOutputs,
    isTokenDustChangeOutput,
    getAgoraAdFuelSats,
} from 'token-protocols/slpv1';
import { getSendTokenInputs } from 'token-protocols';
import vectors from '../fixtures/vectors';
import tokenProtocolsVectors from '../../fixtures/vectors';
import { SEND_DESTINATION_ADDRESS, MOCK_TOKEN_ID } from '../fixtures/vectors';
import {
    AgoraOneshot,
    AgoraOneshotAdSignatory,
    AgoraPartial,
    AgoraPartialAdSignatory,
} from 'ecash-agora';
import {
    slpSend,
    SLP_NFT1_CHILD,
    shaRmd160,
    Script,
    fromHex,
    SLP_FUNGIBLE,
} from 'ecash-lib';
import appConfig from 'config/app';

const MOCK_WALLET_HASH = fromHex('12'.repeat(20));
const MOCK_PK = fromHex(
    '03000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
);
const BASE_PARAMS_SLP_PARTIAL = {
    makerPk: MOCK_PK,
    tokenId: MOCK_TOKEN_ID,
    tokenProtocol: 'SLP',
    enforcedLockTime: 500000001,
    dustAmount: 546,
};

describe('slpv1 methods', () => {
    let MOCK_AGORA_P2SH, MOCK_ONESHOT, MOCK_PARTIAL, MOCK_PARTIAL_P2SH;
    beforeAll(async () => {

        MOCK_ONESHOT = new AgoraOneshot({
            enforcedOutputs: [
                {
                    value: 0,
                    script: slpSend(MOCK_TOKEN_ID, SLP_NFT1_CHILD, [0, 1]),
                },
                {
                    value: 10000, // list price satoshis
                    script: Script.p2pkh(MOCK_WALLET_HASH),
                },
            ],
            cancelPk: MOCK_PK,
        });
        MOCK_AGORA_P2SH = Script.p2sh(
            shaRmd160(MOCK_ONESHOT.script().bytecode),
        );
        MOCK_PARTIAL = new AgoraPartial({
            truncTokens: 1000n,
            numTokenTruncBytes: 0,
            tokenScaleFactor: 1000000n,
            scaledTruncTokensPerTruncSat: 1000000n,
            numSatsTruncBytes: 0,
            minAcceptedScaledTruncTokens: 1000000n,
            ...BASE_PARAMS_SLP_PARTIAL,
            tokenType: SLP_FUNGIBLE,
            scriptLen: 0x7f,
        });
        MOCK_PARTIAL_P2SH = Script.p2sh(
            shaRmd160(MOCK_PARTIAL.script().bytecode),
        );
    });
    describe('Generating etoken genesis tx target outputs', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getSlpGenesisTargetOutput;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                genesisInfo,
                initialQuantity,
                mintBatonOutIdx,
                targetOutputs,
            } = expectedReturn;
            it(`getSlpGenesisTargetOutput: ${description}`, () => {
                expect(
                    getSlpGenesisTargetOutput(
                        genesisInfo,
                        initialQuantity,
                        mintBatonOutIdx,
                    ),
                ).toStrictEqual(targetOutputs);
            });
        });

        // Error cases
        expectedErrors.forEach(expectedError => {
            const {
                description,
                genesisInfo,
                initialQuantity,
                mintBatonOutIdx,
                errorMsg,
            } = expectedError;
            it(`getSlpGenesisTargetOutput throws error for: ${description}`, () => {
                expect(() =>
                    getSlpGenesisTargetOutput(
                        genesisInfo,
                        initialQuantity,
                        mintBatonOutIdx,
                    ),
                ).toThrow(errorMsg);
            });
        });
    });
    describe('Get slpv1 send token inputs and outputs', () => {
        const { expectedReturns, expectedErrors } =
            tokenProtocolsVectors.getSendTokenInputs;
        expectedReturns.forEach(expectedReturn => {
            const { description, tokenInputs, sendAmounts, targetOutputs } =
                expectedReturn;
            it(`getSlpSendTargetOutputs: ${description}`, () => {
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
            const {
                description,
                tokenId,
                decimals,
                mintQty,
                tokenProtocolNumber,
                targetOutputs,
            } = vector;
            it(`getMintTargetOutputs: ${description}`, () => {
                expect(
                    getMintTargetOutputs(
                        tokenId,
                        decimals,
                        mintQty,
                        tokenProtocolNumber,
                    ),
                ).toStrictEqual(targetOutputs);
            });
        });
        expectedErrors.forEach(vector => {
            const {
                description,
                tokenId,
                decimals,
                mintQty,
                tokenProtocolNumber,
                error,
            } = vector;
            it(`getMintTargetOutputs throws error for: ${description}`, () => {
                expect(() =>
                    getMintTargetOutputs(
                        tokenId,
                        decimals,
                        mintQty,
                        tokenProtocolNumber,
                    ),
                ).toThrow(error);
            });
        });
    });
    describe('Gets max mint/send/burn SLP amount, decimalized', () => {
        const { expectedReturns } = vectors.getMaxDecimalizedSlpQty;
        expectedReturns.forEach(vector => {
            const { description, decimals, returned } = vector;
            it(`getMaxDecimalizedSlpQty: ${description}`, () => {
                expect(getMaxDecimalizedSlpQty(decimals)).toBe(returned);
            });
        });
    });
    describe('Get targetOutputs for NFT1 parent genesis tx', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getNftParentGenesisTargetOutputs;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                genesisInfo,
                initialQuantity,
                mintBatonOutIdx,
                targetOutputs,
            } = expectedReturn;
            it(`getNftParentGenesisTargetOutputs: ${description}`, () => {
                expect(
                    getNftParentGenesisTargetOutputs(
                        genesisInfo,
                        initialQuantity,
                        mintBatonOutIdx,
                    ),
                ).toStrictEqual(targetOutputs);
            });
        });

        // Error cases
        expectedErrors.forEach(expectedError => {
            const {
                description,
                genesisInfo,
                initialQuantity,
                mintBatonOutIdx,
                errorMsg,
            } = expectedError;
            it(`getNftParentGenesisTargetOutputs throws error for: ${description}`, () => {
                expect(() =>
                    getNftParentGenesisTargetOutputs(
                        genesisInfo,
                        initialQuantity,
                        mintBatonOutIdx,
                    ),
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
                expect(
                    getNftParentMintTargetOutputs(tokenId, mintQty),
                ).toStrictEqual(targetOutputs);
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
                expect(getNftParentFanTxTargetOutputs(fanInputs)).toStrictEqual(
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
            const { description, genesisInfo, returned } = expectedReturn;
            it(`getNftChildGenesisTargetOutputs: ${description}`, () => {
                expect(
                    getNftChildGenesisTargetOutputs(genesisInfo),
                ).toStrictEqual(returned);
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
                ).toStrictEqual(returned);
            });
        });
    });
    describe('isTokenDustChangeOutput correctly identifies a token dust change output', () => {
        const { expectedReturns } = vectors.isTokenDustChangeOutput;
        expectedReturns.forEach(expectedReturn => {
            const { description, targetOutput, returned } = expectedReturn;
            it(`isTokenDustChangeOutput: ${description}`, () => {
                expect(isTokenDustChangeOutput(targetOutput)).toStrictEqual(
                    returned,
                );
            });
        });
    });
    describe('getAgoraAdFuelSats correctly determines one-input fee for an agora offer tx', () => {
        const MOCK_WALLET_SK = fromHex('33'.repeat(32));
        const SATS_PER_KB_MIN = 1000;
        const SATS_PER_KB_ALT = 2000;

        it(`getAgoraAdFuelSats for minimum eCash fee NFT listing`, () => {
            expect(
                getAgoraAdFuelSats(
                    MOCK_ONESHOT.adScript(),
                    AgoraOneshotAdSignatory(MOCK_WALLET_SK),
                    [
                        {
                            value: 0,
                            script: slpSend(MOCK_TOKEN_ID, SLP_NFT1_CHILD, [1]),
                        },
                        {
                            value: appConfig.dustSats,
                            script: MOCK_AGORA_P2SH,
                        },
                    ],
                    SATS_PER_KB_MIN,
                ),
            ).toEqual(314);
        });
        it(`getAgoraAdFuelSats for a different fee level NFT listing`, () => {
            expect(
                getAgoraAdFuelSats(
                    MOCK_ONESHOT.adScript(),
                    AgoraOneshotAdSignatory(MOCK_WALLET_SK),
                    // Note: for NFT listings, the offerOutputs parameter is more or less constant,
                    // at least in Cashtab
                    // maybe you could have a case where sendAmounts array is not [1], mb you have a weird
                    // NFT with "change" ... will not see this in Cashtab
                    // So, arguably this function could be a constant. However, we will extend to support
                    // partial agora offers, and we may change how these offers are made in the future
                    // Also note... if you set this to a variable in this test, you get failures because
                    // of the way ecash-lib copies objects and jest not liking it
                    [
                        {
                            value: 0,
                            script: slpSend(MOCK_TOKEN_ID, SLP_NFT1_CHILD, [1]),
                        },
                        {
                            value: appConfig.dustSats,
                            script: MOCK_AGORA_P2SH,
                        },
                    ],
                    SATS_PER_KB_ALT,
                ),
            ).toEqual(628);
        });
        it(`getAgoraAdFuelSats for minimum eCash fee SLP partial listing and no token change`, () => {
            const tokenSendAmount = 10000;
            expect(
                getAgoraAdFuelSats(
                    MOCK_PARTIAL.adScript(),
                    AgoraPartialAdSignatory(MOCK_WALLET_SK),
                    [
                        {
                            value: 0,
                            script: slpSend(MOCK_TOKEN_ID, SLP_FUNGIBLE, [
                                tokenSendAmount,
                            ]),
                        },
                        {
                            value: appConfig.dustSats,
                            script: MOCK_PARTIAL_P2SH,
                        },
                    ],
                    SATS_PER_KB_MIN,
                ),
            ).toEqual(368);
        });
        it(`getAgoraAdFuelSats for minimum eCash fee SLP partial listing and a token change output`, () => {
            // Not expected for this use case to come up in Cashtab, but we demonstrate that the fee
            // increases with an additional output as expected
            const tokenSendAmount = 9900;
            const tokenChangeAmount = 100;
            expect(
                getAgoraAdFuelSats(
                    MOCK_PARTIAL.adScript(),
                    AgoraPartialAdSignatory(MOCK_WALLET_SK),
                    [
                        {
                            value: 0,
                            script: slpSend(MOCK_TOKEN_ID, SLP_FUNGIBLE, [
                                tokenSendAmount,
                                tokenChangeAmount,
                            ]),
                        },
                        {
                            value: appConfig.dustSats,
                            script: MOCK_PARTIAL_P2SH,
                        },
                        {
                            value: appConfig.dustSats,
                            script: Script.fromAddress(
                                SEND_DESTINATION_ADDRESS,
                            ),
                        },
                    ],
                    SATS_PER_KB_MIN,
                ),
            ).toEqual(411);
        });
        it(`getAgoraAdFuelSats for alternate eCash fee SLP partial listing and no token change`, () => {
            const tokenSendAmount = 10000;
            expect(
                getAgoraAdFuelSats(
                    MOCK_PARTIAL.adScript(),
                    AgoraPartialAdSignatory(MOCK_WALLET_SK),
                    [
                        {
                            value: 0,
                            script: slpSend(MOCK_TOKEN_ID, SLP_FUNGIBLE, [
                                tokenSendAmount,
                            ]),
                        },
                        {
                            value: appConfig.dustSats,
                            script: MOCK_PARTIAL_P2SH,
                        },
                    ],
                    SATS_PER_KB_ALT,
                ),
            ).toEqual(736);
        });
    });
});
