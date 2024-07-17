// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { getTokenOfferMaps, isEqualTypedArray } from 'agora';
import {
    Ecc,
    initWasm,
    slpSend,
    SLP_NFT1_CHILD,
    SLP_NFT1_GROUP,
    Script,
    fromHex,
} from 'ecash-lib';
import { AgoraOneshot } from 'ecash-agora';

import vectors from '../fixtures/vectors';

describe('agora market methods', () => {
    const OP_RETURN_HEX = '6a';
    const SLP_LOKAD_HEX = '534c5000';
    const SLP_NFT1_CHILD_HEX = '41';
    const SLP_ACTION_SEND_HEX = '53454e44';
    const SLP_AMOUNT_ZERO_HEX = '0000000000000000';
    const SLP_AMOUNT_ONE_HEX = '0000000000000001';
    const sellerSk = fromHex('11'.repeat(32));
    const buyerSk = fromHex('22'.repeat(32));
    const BASE_AD_TXID =
        '0000000000000000000000000000000000000000000000000000000000000000';
    const BASE_OFFERED_TOKENID =
        '1111111111111111111111111111111111111111111111111111111111111111';
    const BASE_SELLER_HASH = '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d';
    const BASE_PRICE = 10000n;
    const VALID_SLP1_NFT_ENFORCED_OUTPUT = {
        value: BigInt(0),
        script: slpSend(BASE_OFFERED_TOKENID, SLP_NFT1_CHILD, [0, 1]),
    };
    const VALID_NFT_PAYMENT_ENFORCED_OUTPUT = {
        value: BASE_PRICE,
        script: Script.p2pkh(fromHex(BASE_SELLER_HASH)),
    };

    let ecc, sellerPk, buyerPk, BASE_AGORA_TX, agoraOneshot, txBuilderInput;
    beforeAll(async () => {
        // Initialize web assembly
        await initWasm();
        // Initialize Ecc
        ecc = new Ecc();
        sellerPk = ecc.derivePubkey(sellerSk);
        buyerPk = ecc.derivePubkey(buyerSk);
    });
    describe('We can compare typed Uint8Arrays', () => {
        const { expectedReturns } = vectors.isEqualTypedArray;

        expectedReturns.forEach(expectedReturn => {
            const { description, a, b, returned } = expectedReturn;
            it(`isEqualTypedArray: ${description}`, () => {
                expect(isEqualTypedArray(a, b)).toBe(returned);
            });
        });
    });
    describe('We can build a Map of valid token offers from an array of parsed agora txs', () => {
        it('An empty tx history array means an empty tokenOfferMap', () => {
            expect(getTokenOfferMaps([], sellerPk)).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map(),
            });
        });
        it('We throw expected error if getTokenOfferMaps is called with publicKey undefined', () => {
            expect(() => getTokenOfferMaps([])).toThrow(
                'getTokenOfferMaps called with undefined publicKey',
            );
        });
        it('A parsed agora ad that advertises a valid NFT sale by a public key that does not belong to this wallet is added to the offeredListings map', () => {
            // Define base enforcedOutputs for a valid parsed agora tx
            // Ref /modules/ecash-agora/oneshot.test.ts
            const enforcedOutputs = [
                VALID_SLP1_NFT_ENFORCED_OUTPUT,
                VALID_NFT_PAYMENT_ENFORCED_OUTPUT,
            ];
            agoraOneshot = new AgoraOneshot({
                enforcedOutputs,
                cancelPk: sellerPk,
            });
            const agoraScript = agoraOneshot.script();
            txBuilderInput = {
                prevOut: {
                    txid: BASE_AD_TXID,
                    outIdx: 1,
                },
                signData: {
                    redeemScript: agoraScript,
                    value: 546,
                },
            };

            BASE_AGORA_TX = {
                type: 'ONESHOT',
                params: agoraOneshot,
                outpoint: {
                    txid: BASE_AD_TXID,
                    outIdx: 1,
                },
                txBuilderInput,
                spentBy: undefined,
            };
            expect(getTokenOfferMaps([BASE_AGORA_TX], buyerPk)).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map([
                    [
                        BASE_OFFERED_TOKENID,
                        { params: agoraOneshot, txBuilderInput },
                    ],
                ]),
            });
        });
        it('A parsed agora ad that advertises a valid NFT sale by a public key that does belong to this wallet is added to the myListings map', () => {
            // Define base enforcedOutputs for a valid parsed agora tx
            // Ref /modules/ecash-agora/oneshot.test.ts

            expect(getTokenOfferMaps([BASE_AGORA_TX], sellerPk)).toStrictEqual({
                myListings: new Map([
                    [
                        BASE_OFFERED_TOKENID,
                        { params: agoraOneshot, txBuilderInput },
                    ],
                ]),
                offeredListings: new Map(),
            });
        });
        it('A value of undefined in the array of parsed agora txs is not added to myListings or offeredListings', () => {
            // Note: parseAgoraTx returns undefined if it parses an invalid agora tx, so this is an expected condition
            expect(
                getTokenOfferMaps([undefined, BASE_AGORA_TX], buyerPk),
            ).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map([
                    [
                        BASE_OFFERED_TOKENID,
                        { params: agoraOneshot, txBuilderInput },
                    ],
                ]),
            });
        });
        it('An offer that has already been spent is ignored', () => {
            const spentOffer = {
                ...BASE_AGORA_TX,
                spentBy: {
                    txid: '93c80c0c120c9f286e0f913930bfefc4f6a662be58acee12b253677cc568e8c8',
                    outIdx: 0,
                },
            };
            expect(getTokenOfferMaps([spentOffer], buyerPk)).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map(),
            });
        });
        it('An offer with more than 2 enforced outputs is ignored', () => {
            const enforcedOutputs = [
                VALID_SLP1_NFT_ENFORCED_OUTPUT,
                VALID_NFT_PAYMENT_ENFORCED_OUTPUT,
                { ...VALID_NFT_PAYMENT_ENFORCED_OUTPUT, value: 123n },
            ];
            const agoraOneshot = new AgoraOneshot({
                enforcedOutputs,
                cancelPk: sellerPk,
            });
            const agoraScript = agoraOneshot.script();

            const threeOutputOffer = {
                ...BASE_AGORA_TX,
                params: agoraOneshot,
                txBuilderInput: {
                    ...BASE_AGORA_TX.txBuilderInput,
                    signData: {
                        ...BASE_AGORA_TX.txBuilderInput.signData,
                        redeemScript: agoraScript,
                    },
                },
            };
            expect(
                getTokenOfferMaps([threeOutputOffer], buyerPk),
            ).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map(),
            });
        });
        it('An offer that burns XEC at the OP_RETURN is ignored', () => {
            const enforcedOutputs = [
                { ...VALID_SLP1_NFT_ENFORCED_OUTPUT, value: 100n },
                VALID_NFT_PAYMENT_ENFORCED_OUTPUT,
            ];
            const agoraOneshot = new AgoraOneshot({
                enforcedOutputs,
                cancelPk: sellerPk,
            });
            const agoraScript = agoraOneshot.script();

            const burningXecOffer = {
                ...BASE_AGORA_TX,
                params: agoraOneshot,
                txBuilderInput: {
                    ...BASE_AGORA_TX.txBuilderInput,
                    signData: {
                        ...BASE_AGORA_TX.txBuilderInput.signData,
                        redeemScript: agoraScript,
                    },
                },
            };
            expect(getTokenOfferMaps([burningXecOffer], buyerPk)).toStrictEqual(
                { myListings: new Map(), offeredListings: new Map() },
            );
        });
        it('An offer with a non-OP_RETURN script at index 0 enforced output is ignored', () => {
            const enforcedOutputs = [
                {
                    ...VALID_SLP1_NFT_ENFORCED_OUTPUT,
                    script: new Script(
                        fromHex(
                            `04${SLP_LOKAD_HEX}01${SLP_NFT1_CHILD_HEX}04${SLP_ACTION_SEND_HEX}20${BASE_OFFERED_TOKENID}08${SLP_AMOUNT_ZERO_HEX}08${SLP_AMOUNT_ONE_HEX}`,
                        ),
                    ),
                },
                VALID_NFT_PAYMENT_ENFORCED_OUTPUT,
            ];
            const agoraOneshot = new AgoraOneshot({
                enforcedOutputs,
                cancelPk: sellerPk,
            });
            const agoraScript = agoraOneshot.script();

            const nonOpReturnOffer = {
                ...BASE_AGORA_TX,
                params: agoraOneshot,
                txBuilderInput: {
                    ...BASE_AGORA_TX.txBuilderInput,
                    signData: {
                        ...BASE_AGORA_TX.txBuilderInput.signData,
                        redeemScript: agoraScript,
                    },
                },
            };
            expect(
                getTokenOfferMaps([nonOpReturnOffer], buyerPk),
            ).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map(),
            });
        });
        it('An offer whose LOKAD ID does not match SLP type 1 is ignored', () => {
            const badLokadHex = '01020304';
            const enforcedOutputs = [
                {
                    ...VALID_SLP1_NFT_ENFORCED_OUTPUT,
                    script: new Script(
                        fromHex(
                            `${OP_RETURN_HEX}04${badLokadHex}01${SLP_NFT1_CHILD_HEX}04${SLP_ACTION_SEND_HEX}20${BASE_OFFERED_TOKENID}08${SLP_AMOUNT_ZERO_HEX}08${SLP_AMOUNT_ONE_HEX}`,
                        ),
                    ),
                },
                VALID_NFT_PAYMENT_ENFORCED_OUTPUT,
            ];
            const agoraOneshot = new AgoraOneshot({
                enforcedOutputs,
                cancelPk: sellerPk,
            });
            const agoraScript = agoraOneshot.script();

            const nonSlpOneOffer = {
                ...BASE_AGORA_TX,
                params: agoraOneshot,
                txBuilderInput: {
                    ...BASE_AGORA_TX.txBuilderInput,
                    signData: {
                        ...BASE_AGORA_TX.txBuilderInput.signData,
                        redeemScript: agoraScript,
                    },
                },
            };
            expect(getTokenOfferMaps([nonSlpOneOffer], buyerPk)).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map(),
            });
        });
        it('A sale offer of an NFT collection/parent token is not added to the token offer map (type bit does not match NFT)', () => {
            const nftParentEnforcedOutput = {
                ...VALID_SLP1_NFT_ENFORCED_OUTPUT,
                script: slpSend(BASE_OFFERED_TOKENID, SLP_NFT1_GROUP, [0, 1]),
            };
            const enforcedOutputs = [
                nftParentEnforcedOutput,
                VALID_NFT_PAYMENT_ENFORCED_OUTPUT,
            ];
            const agoraOneshot = new AgoraOneshot({
                enforcedOutputs,
                cancelPk: sellerPk,
            });
            const agoraScript = agoraOneshot.script();

            const nftCollectionOffer = {
                ...BASE_AGORA_TX,
                params: agoraOneshot,
                txBuilderInput: {
                    ...BASE_AGORA_TX.txBuilderInput,
                    signData: {
                        ...BASE_AGORA_TX.txBuilderInput.signData,
                        redeemScript: agoraScript,
                    },
                },
            };
            expect(
                getTokenOfferMaps([nftCollectionOffer], buyerPk),
            ).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map(),
            });
        });
        it('If enforced output SLP action is not SEND, offer is ignored', () => {
            const badSlpActionHex = '99999999';
            const enforcedOutputs = [
                {
                    ...VALID_SLP1_NFT_ENFORCED_OUTPUT,
                    script: new Script(
                        fromHex(
                            `${OP_RETURN_HEX}04${SLP_LOKAD_HEX}01${SLP_NFT1_CHILD_HEX}04${badSlpActionHex}20${BASE_OFFERED_TOKENID}08${SLP_AMOUNT_ZERO_HEX}08${SLP_AMOUNT_ONE_HEX}`,
                        ),
                    ),
                },
                VALID_NFT_PAYMENT_ENFORCED_OUTPUT,
            ];
            const agoraOneshot = new AgoraOneshot({
                enforcedOutputs,
                cancelPk: sellerPk,
            });
            const agoraScript = agoraOneshot.script();

            const nonSlpActionSendOffer = {
                ...BASE_AGORA_TX,
                params: agoraOneshot,
                txBuilderInput: {
                    ...BASE_AGORA_TX.txBuilderInput,
                    signData: {
                        ...BASE_AGORA_TX.txBuilderInput.signData,
                        redeemScript: agoraScript,
                    },
                },
            };
            expect(
                getTokenOfferMaps([nonSlpActionSendOffer], buyerPk),
            ).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map(),
            });
        });
        it('If SLP OP_RETURN is invalid (invalid tokenId), offer is ignored', () => {
            const tooLongTokenId = `${BASE_OFFERED_TOKENID}11`;
            const enforcedOutputs = [
                {
                    ...VALID_SLP1_NFT_ENFORCED_OUTPUT,
                    script: new Script(
                        fromHex(
                            `${OP_RETURN_HEX}04${SLP_LOKAD_HEX}01${SLP_NFT1_CHILD_HEX}04${SLP_ACTION_SEND_HEX}21${tooLongTokenId}08${SLP_AMOUNT_ZERO_HEX}08${SLP_AMOUNT_ONE_HEX}`,
                        ),
                    ),
                },
                VALID_NFT_PAYMENT_ENFORCED_OUTPUT,
            ];
            const agoraOneshot = new AgoraOneshot({
                enforcedOutputs,
                cancelPk: sellerPk,
            });
            const agoraScript = agoraOneshot.script();

            const invalidTokenIdOffer = {
                ...BASE_AGORA_TX,
                params: agoraOneshot,
                txBuilderInput: {
                    ...BASE_AGORA_TX.txBuilderInput,
                    signData: {
                        ...BASE_AGORA_TX.txBuilderInput.signData,
                        redeemScript: agoraScript,
                    },
                },
            };
            expect(
                getTokenOfferMaps([invalidTokenIdOffer], buyerPk),
            ).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map(),
            });
        });
        it('If SLP OP_RETURN enforced output does not have send value of 0 for first first outIdx, offer is ignored', () => {
            const enforcedOutputs = [
                {
                    ...VALID_SLP1_NFT_ENFORCED_OUTPUT,
                    script: new Script(
                        fromHex(
                            `${OP_RETURN_HEX}04${SLP_LOKAD_HEX}01${SLP_NFT1_CHILD_HEX}04${SLP_ACTION_SEND_HEX}20${BASE_OFFERED_TOKENID}08${SLP_AMOUNT_ONE_HEX}08${SLP_AMOUNT_ONE_HEX}`,
                        ),
                    ),
                },
                VALID_NFT_PAYMENT_ENFORCED_OUTPUT,
            ];
            const agoraOneshot = new AgoraOneshot({
                enforcedOutputs,
                cancelPk: sellerPk,
            });
            const agoraScript = agoraOneshot.script();

            const wrongAmountOutidxOneOffer = {
                ...BASE_AGORA_TX,
                params: agoraOneshot,
                txBuilderInput: {
                    ...BASE_AGORA_TX.txBuilderInput,
                    signData: {
                        ...BASE_AGORA_TX.txBuilderInput.signData,
                        redeemScript: agoraScript,
                    },
                },
            };
            expect(
                getTokenOfferMaps([wrongAmountOutidxOneOffer], buyerPk),
            ).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map(),
            });
        });
        it('If SLP OP_RETURN enforced output does not have send value of 1 for second outIdx, offer is ignored', () => {
            const nonOneOutputHex = '0000000000000008';
            const enforcedOutputs = [
                {
                    ...VALID_SLP1_NFT_ENFORCED_OUTPUT,
                    script: new Script(
                        fromHex(
                            `${OP_RETURN_HEX}04${SLP_LOKAD_HEX}01${SLP_NFT1_CHILD_HEX}04${SLP_ACTION_SEND_HEX}20${BASE_OFFERED_TOKENID}08${SLP_AMOUNT_ZERO_HEX}08${nonOneOutputHex}`,
                        ),
                    ),
                },
                VALID_NFT_PAYMENT_ENFORCED_OUTPUT,
            ];
            const agoraOneshot = new AgoraOneshot({
                enforcedOutputs,
                cancelPk: sellerPk,
            });
            const agoraScript = agoraOneshot.script();

            const wrongAmountOutidxTwoOffer = {
                ...BASE_AGORA_TX,
                params: agoraOneshot,
                txBuilderInput: {
                    ...BASE_AGORA_TX.txBuilderInput,
                    signData: {
                        ...BASE_AGORA_TX.txBuilderInput.signData,
                        redeemScript: agoraScript,
                    },
                },
            };
            expect(
                getTokenOfferMaps([wrongAmountOutidxTwoOffer], buyerPk),
            ).toStrictEqual({
                myListings: new Map(),
                offeredListings: new Map(),
            });
        });
    });
});
