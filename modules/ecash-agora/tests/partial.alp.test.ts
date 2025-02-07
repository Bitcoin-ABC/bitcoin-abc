// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use, assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    ALL_BIP143,
    ALP_STANDARD,
    DEFAULT_DUST_SATS,
    Ecc,
    P2PKHSignatory,
    Script,
    TxBuilderInput,
    alpSend,
    emppScript,
    fromHex,
    shaRmd160,
    toHex,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';

import { AgoraPartial } from '../src/partial.js';
import { makeAlpOffer, takeAlpOffer } from './partial-helper-alp.js';
import { Agora, TakenInfo } from '../src/agora.js';

use(chaiAsPromised);

// This test needs a lot of sats
const NUM_COINS = 500;
const COIN_VALUE = 1100000000n;

const BASE_PARAMS_ALP = {
    tokenId: '00'.repeat(32), // filled in later
    tokenType: ALP_STANDARD,
    tokenProtocol: 'ALP' as const,
    dustSats: DEFAULT_DUST_SATS,
};

const ecc = new Ecc();
const makerSk = fromHex('33'.repeat(32));
const makerPk = ecc.derivePubkey(makerSk);
const makerPkh = shaRmd160(makerPk);
const makerScript = Script.p2pkh(makerPkh);
const makerScriptHex = toHex(makerScript.bytecode);
const takerSk = fromHex('44'.repeat(32));
const takerPk = ecc.derivePubkey(takerSk);
const takerPkh = shaRmd160(takerPk);
const takerScript = Script.p2pkh(takerPkh);
const takerScriptHex = toHex(takerScript.bytecode);

describe('AgoraPartial ALP', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    async function makeBuilderInputs(
        values: bigint[],
    ): Promise<TxBuilderInput[]> {
        const txid = await runner.sendToScript(values, makerScript);
        return values.map((sats, outIdx) => ({
            input: {
                prevOut: {
                    txid,
                    outIdx,
                },
                signData: {
                    sats,
                    outputScript: makerScript,
                },
            },
            signatory: P2PKHSignatory(makerSk, makerPk, ALL_BIP143),
        }));
    }

    before(async () => {
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    interface TestCase {
        offeredAtoms: bigint;
        info: string;
        priceNanoSatsPerAtom: bigint;
        acceptedAtoms: bigint;
        askedSats: bigint;
        allowUnspendable?: boolean;
    }
    const TEST_CASES: TestCase[] = [
        {
            offeredAtoms: 1000n,
            info: '1sat/token, full accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 1000n,
            askedSats: 1000n,
        },
        {
            offeredAtoms: 1000n,
            info: '1sat/token, dust accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 546n,
            askedSats: 546n,
            allowUnspendable: true,
        },
        {
            offeredAtoms: 1000n,
            info: '1000sat/token, full accept',
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            acceptedAtoms: 1000n,
            askedSats: 1000225n,
        },
        {
            offeredAtoms: 1000n,
            info: '1000sat/token, half accept',
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            acceptedAtoms: 500n,
            askedSats: 500113n,
        },
        {
            offeredAtoms: 1000n,
            info: '1000sat/token, 1 accept',
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            acceptedAtoms: 1n,
            askedSats: 1001n,
        },
        {
            offeredAtoms: 1000n,
            info: '1000000sat/token, full accept',
            priceNanoSatsPerAtom: 1000000n * 1000000000n,
            acceptedAtoms: 1000n,
            askedSats: 1000013824n,
        },
        {
            offeredAtoms: 1000n,
            info: '1000000sat/token, half accept',
            priceNanoSatsPerAtom: 1000000n * 1000000000n,
            acceptedAtoms: 500n,
            askedSats: 500039680n,
        },
        {
            offeredAtoms: 1000n,
            info: '1000000sat/token, 1 accept',
            priceNanoSatsPerAtom: 1000000n * 1000000000n,
            acceptedAtoms: 1n,
            askedSats: 1048576n,
        },
        {
            offeredAtoms: 1000n,
            info: '1000000000sat/token, 1 accept',
            priceNanoSatsPerAtom: 1000000000n * 1000000000n,
            acceptedAtoms: 1n,
            askedSats: 1006632960n,
        },
        {
            offeredAtoms: 1000000n,
            info: '0.001sat/token, full accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 1000000n,
            askedSats: 1000n,
        },
        {
            offeredAtoms: 1000000n,
            info: '1sat/token, full accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 1000000n,
            askedSats: 1000000n,
        },
        {
            offeredAtoms: 1000000n,
            info: '1sat/token, half accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 500000n,
            askedSats: 500000n,
        },
        {
            offeredAtoms: 1000000n,
            info: '1sat/token, dust accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 546n,
            askedSats: 546n,
        },
        {
            offeredAtoms: 1000000n,
            info: '1000sat/token, full accept',
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            acceptedAtoms: 999936n,
            askedSats: 999948288n,
        },
        {
            offeredAtoms: 1000000n,
            info: '1000sat/token, half accept',
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            acceptedAtoms: 499968n,
            askedSats: 499974144n,
        },
        {
            offeredAtoms: 1000000n,
            info: '1000sat/token, 256 accept',
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            acceptedAtoms: 256n,
            askedSats: 262144n,
        },
        {
            offeredAtoms: 1000000n,
            info: '1000000sat/token, 1024 accept',
            priceNanoSatsPerAtom: 1000000n * 1000000000n,
            acceptedAtoms: 1024n,
            askedSats: 1040187392n,
        },
        {
            offeredAtoms: 1000000n,
            info: '1000000sat/token, 256 accept',
            priceNanoSatsPerAtom: 1000000n * 1000000000n,
            acceptedAtoms: 256n,
            askedSats: 268435456n,
        },
        {
            offeredAtoms: 1000000000n,
            info: '0.001sat/token, full accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 1000000000n,
            askedSats: 1000000n,
        },
        {
            offeredAtoms: 1000000000n,
            info: '0.001sat/token, half accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 500000000n,
            askedSats: 500000n,
        },
        {
            offeredAtoms: 1000000000n,
            info: '0.001sat/token, dust accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 546000n,
            askedSats: 546n,
        },
        {
            offeredAtoms: 1000000000n,
            info: '1sat/token, full accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 1000000000n,
            askedSats: 1000000000n,
        },
        {
            offeredAtoms: 1000000000n,
            info: '1sat/token, half accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 500000000n,
            askedSats: 500000000n,
        },
        {
            offeredAtoms: 1000000000n,
            info: '1sat/token, dust accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 546n,
            askedSats: 546n,
        },
        {
            offeredAtoms: 1000000000n,
            info: '1000sat/token, 983040 accept',
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            acceptedAtoms: 983040n,
            askedSats: 989855744n,
        },
        {
            offeredAtoms: 1000000000n,
            info: '1000sat/token, 65536 accept',
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            acceptedAtoms: 65536n,
            askedSats: 67108864n,
        },
        {
            offeredAtoms: 1000000000000n,
            info: '0.000001sat/token, full accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 999999995904n,
            askedSats: 1000108n,
        },
        {
            offeredAtoms: 1000000000000n,
            info: '0.000001sat/token, half accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 546045952n,
            askedSats: 547n,
        },
        {
            offeredAtoms: 1000000000000n,
            info: '0.001sat/token, full accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 999999995904n,
            askedSats: 1068115230n,
        },
        {
            offeredAtoms: 1000000000000n,
            info: '0.001sat/token, dust accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 589824n,
            askedSats: 630n,
        },
        {
            offeredAtoms: 0x7fffffffffffn,
            info: '0.000000001sat/token, full accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 0x7fffc4660000n,
            askedSats: 140744n,
        },
        {
            offeredAtoms: 0x7fffffffffffn,
            info: '0.000000001sat/token, dust accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 0x7f1e660000n,
            askedSats: 546n,
        },
        {
            offeredAtoms: 0x7fffffffffffn,
            info: '0.000001sat/token, full accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 0x7ffffff10000n,
            askedSats: 143165576n,
        },
        {
            offeredAtoms: 0x7fffffffffffn,
            info: '0.000001sat/token, dust accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 0x1ffd0000n,
            askedSats: 546n,
        },
        {
            offeredAtoms: 0x7fffffffffffn,
            info: '0.001sat/token, max sats accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 799999983616n,
            askedSats: 1041666816n,
        },
        {
            offeredAtoms: 0x7fffffffffffn,
            info: '0.001sat/token, dust accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 0x70000n,
            askedSats: 768n,
        },
        {
            offeredAtoms: 0x7fffffffffffn,
            info: '1sat/token, max sats accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 999948288n,
            askedSats: 999948288n,
        },
        {
            offeredAtoms: 0x7fffffffffffn,
            info: '1sat/token, min accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 0x10000n,
            askedSats: 0x10000n,
        },
        {
            offeredAtoms: 0xffffffffffffn,
            info: '0.000000001sat/token, full accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 0xffffff000000n,
            askedSats: 281505n,
        },
        {
            offeredAtoms: 0xffffffffffffn,
            info: '0.000000001sat/token, dust accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 0x7f1c000000n,
            askedSats: 546n,
        },
        {
            offeredAtoms: 0xffffffffffffn,
            info: '0.000001sat/token, full accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 0xffffff000000n,
            askedSats: 306783360n,
        },
        {
            offeredAtoms: 0xffffffffffffn,
            info: '0.000001sat/token, dust accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 0x1e000000n,
            askedSats: 549n,
        },
        {
            offeredAtoms: 0xffffffffffffn,
            info: '0.001sat/token, max sats accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 0x8000000000n,
            askedSats: 1073741824n,
        },
        {
            offeredAtoms: 0xffffffffffffn,
            info: '0.001sat/token, min accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 0x1000000n,
            askedSats: 32768n,
        },
        {
            offeredAtoms: 0xffffffffffffn,
            info: '1sat/token, max sats accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 989855744n,
            askedSats: 989855744n,
        },
        {
            offeredAtoms: 0xffffffffffffn,
            info: '1sat/token, min accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 0x1000000n,
            askedSats: 0x1000000n,
        },
    ];

    for (const testCase of TEST_CASES) {
        it(`AgoraPartial ALP ${testCase.offeredAtoms} for ${testCase.info}`, async () => {
            const agora = new Agora(chronik);
            const agoraPartial = await agora.selectParams({
                offeredAtoms: testCase.offeredAtoms,
                priceNanoSatsPerAtom: testCase.priceNanoSatsPerAtom,
                minAcceptedAtoms: testCase.acceptedAtoms,
                makerPk,
                ...BASE_PARAMS_ALP,
            });
            const askedSats = agoraPartial.askedSats(testCase.acceptedAtoms);
            const requiredSats = askedSats + 2000n;
            const [fuelInput, takerInput] = await makeBuilderInputs([
                4000n,
                requiredSats,
            ]);

            const offer = await makeAlpOffer({
                chronik,
                agoraPartial,
                makerSk,
                fuelInput,
            });
            const acceptTxid = await takeAlpOffer({
                chronik,
                takerSk,
                offer,
                takerInput,
                acceptedAtoms: testCase.acceptedAtoms,
                allowUnspendable: testCase.allowUnspendable,
            });
            const acceptTx = await chronik.tx(acceptTxid);
            // TODO we do not even get here, keep debugging
            const offeredAtoms = agoraPartial.offeredAtoms();
            const isFullAccept = testCase.acceptedAtoms == offeredAtoms;
            if (isFullAccept) {
                // FULL ACCEPT
                // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
                expect(acceptTx.outputs[0].outputScript).to.equal(
                    toHex(
                        emppScript([
                            agoraPartial.adPushdata(),
                            alpSend(
                                agoraPartial.tokenId,
                                agoraPartial.tokenType,
                                [0n, agoraPartial.offeredAtoms()],
                            ),
                        ]).bytecode,
                    ),
                );
                expect(acceptTx.outputs[0].sats).to.equal(0n);
                expect(acceptTx.outputs[0].token).to.equal(undefined);
                // 1st output is sats to maker
                expect(acceptTx.outputs[1].token).to.equal(undefined);
                expect(acceptTx.outputs[1].sats).to.equal(testCase.askedSats);
                expect(acceptTx.outputs[1].outputScript).to.equal(
                    makerScriptHex,
                );
                // 2nd output is tokens to taker
                expect(acceptTx.outputs[2].token?.atoms).to.equal(offeredAtoms);
                expect(acceptTx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
                expect(acceptTx.outputs[2].outputScript).to.equal(
                    takerScriptHex,
                );
                // Offer is now gone
                const newOffers = await agora.activeOffersByTokenId(
                    offer.token.tokenId,
                );
                expect(newOffers).to.deep.equal([]);
                return;
            }

            // PARTIAL ACCEPT
            const leftoverTokens = offeredAtoms - testCase.acceptedAtoms;
            const leftovertruncAtoms =
                leftoverTokens >> BigInt(8 * agoraPartial.numAtomsTruncBytes);
            // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
            expect(acceptTx.outputs[0].outputScript).to.equal(
                toHex(
                    emppScript([
                        agoraPartial.adPushdata(),
                        alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                            0n,
                            leftoverTokens,
                            testCase.acceptedAtoms,
                        ]),
                    ]).bytecode,
                ),
            );
            expect(acceptTx.outputs[0].sats).to.equal(0n);
            expect(acceptTx.outputs[0].token).to.equal(undefined);
            // 1st output is sats to maker
            expect(acceptTx.outputs[1].token).to.equal(undefined);
            expect(acceptTx.outputs[1].sats).to.equal(testCase.askedSats);
            expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
            // 2nd output is back to the P2SH Script
            expect(acceptTx.outputs[2].token?.atoms).to.equal(leftoverTokens);
            expect(acceptTx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
            expect(acceptTx.outputs[2].outputScript.slice(0, 4)).to.equal(
                'a914',
            );
            // 3rd output is tokens to taker
            expect(acceptTx.outputs[3].token?.atoms).to.equal(
                testCase.acceptedAtoms,
            );
            expect(acceptTx.outputs[3].sats).to.equal(DEFAULT_DUST_SATS);
            expect(acceptTx.outputs[3].outputScript).to.equal(takerScriptHex);
            // Offer is now modified
            const newOffers = await agora.activeOffersByTokenId(
                offer.token.tokenId,
            );
            expect(newOffers.length).to.equal(1);
            const newOffer = newOffers[0];
            expect(newOffer.variant).to.deep.equal({
                type: 'PARTIAL',
                params: new AgoraPartial({
                    ...agoraPartial,
                    truncAtoms: leftovertruncAtoms,
                }),
            });

            // Cancel leftover offer
            const cancelFeeSats = newOffer.cancelFeeSats({
                recipientScript: makerScript,
                extraInputs: [fuelInput], // dummy input for measuring
            });
            const cancelTxSer = newOffer
                .cancelTx({
                    cancelSk: makerSk,
                    fuelInputs: await makeBuilderInputs([cancelFeeSats]),
                    recipientScript: makerScript,
                })
                .ser();
            const cancelTxid = (await chronik.broadcastTx(cancelTxSer)).txid;
            const cancelTx = await chronik.tx(cancelTxid);
            expect(cancelTx.outputs[1].token?.atoms).to.equal(leftoverTokens);
            expect(cancelTx.outputs[1].outputScript).to.equal(makerScriptHex);

            // takerIndex is 2 for full accept, 3 for partial accept
            const takerIndex = isFullAccept ? 2 : 3;

            // Get takenInfo from offer creation params
            const takenInfo: TakenInfo = {
                sats: BigInt(testCase.askedSats),
                takerScriptHex: acceptTx.outputs[takerIndex].outputScript,
                atoms: testCase.acceptedAtoms,
            };

            // Tx history by token ID
            const offers = [
                {
                    ...offer,
                    status: 'TAKEN',
                    takenInfo,
                },
                {
                    ...newOffer,
                    status: 'CANCELED',
                },
            ];
            const actualOffers = await agora.historicOffers({
                type: 'TOKEN_ID',
                tokenId: offer.token.tokenId,
                table: 'UNCONFIRMED',
            });
            if (offers[0].status !== actualOffers.offers[0].status) {
                offers.reverse();
            }
            expect(actualOffers).to.deep.equal({
                offers,
                numTxs: 3,
                numPages: 1,
            });
        });
    }
    it('Without manually setting an over-ride, we are unable to accept an agora partial if the remaining offer would be unacceptable due to the terms of the contract', async () => {
        const thisTestCase: TestCase = {
            offeredAtoms: 1000n,
            info: '1sat/token, dust accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 546n,
            askedSats: 546n,
            allowUnspendable: true,
        };
        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams({
            offeredAtoms: thisTestCase.offeredAtoms,
            priceNanoSatsPerAtom: thisTestCase.priceNanoSatsPerAtom,
            minAcceptedAtoms: thisTestCase.acceptedAtoms,
            makerPk,
            ...BASE_PARAMS_ALP,
        });
        const askedSats = agoraPartial.askedSats(thisTestCase.acceptedAtoms);
        const requiredSats = askedSats + 2000n;
        const [fuelInput, takerInput] = await makeBuilderInputs([
            4000n,
            requiredSats,
        ]);

        const offer = await makeAlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });

        const expectedError = `Accepting ${thisTestCase.acceptedAtoms} token satoshis would leave an amount lower than the min acceptable by the terms of this contract, and hence unacceptable. Accept fewer tokens or the full offer.`;

        // We can get the error from the isolated method
        expect(() =>
            agoraPartial.preventUnacceptableRemainder(
                thisTestCase.acceptedAtoms,
            ),
        ).to.throw(Error, expectedError);

        // We get an error for test cases that would result in unspendable amounts
        // if we do not pass allowUnspendable to agoraOffer.acceptTx
        await assert.isRejected(
            takeAlpOffer({
                chronik,
                takerSk,
                offer,
                takerInput,
                acceptedAtoms: thisTestCase.acceptedAtoms,
                allowUnspendable: false,
            }),
            expectedError,
        );

        // We can estimate the fee without this error, even though the offer is unacceptable
        expect(
            offer.acceptFeeSats({
                recipientScript: offer.txBuilderInput.signData
                    ?.redeemScript as Script,
                acceptedAtoms: thisTestCase.acceptedAtoms,
            }),
        ).to.equal(1725n);
    });
    it('Without manually setting an over-ride, we are unable to accept an agora partial if the remaining offer would be unacceptable due to a price less than dust', async () => {
        // ecash-agora does not support creating an agora partial with min accept amount priced less than dust
        // from the approximateParams method
        // However we can still do this if we manually create a new AgoraPartial
        // I think it is okay to preserve this, as the protocol does technically allow it,
        // and perhaps a power user wants to do this for some reason

        // Manually build an offer equivalent to previous test but accepting 500 tokens
        const agoraPartial = new AgoraPartial({
            truncAtoms: 1000n,
            numAtomsTruncBytes: 0,
            atomsScaleFactor: 2145336n,
            scaledTruncAtomsPerTruncSat: 2145336n,
            numSatsTruncBytes: 0,
            minAcceptedScaledTruncAtoms: 1072668000n,
            scriptLen: 209,
            enforcedLockTime: 1333546081,
            makerPk,
            ...BASE_PARAMS_ALP,
        });
        const acceptedAtoms = 500n;
        const askedSats = agoraPartial.askedSats(acceptedAtoms);
        const requiredSats = askedSats + 2000n;
        const [fuelInput, takerInput] = await makeBuilderInputs([
            4000n,
            requiredSats,
        ]);

        const offer = await makeAlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });

        const expectedError = `Accepting 500 token satoshis would leave an amount priced lower than dust. Accept fewer tokens or the full offer.`;

        // We can get the error from the isolated method
        expect(() =>
            agoraPartial.preventUnacceptableRemainder(acceptedAtoms),
        ).to.throw(Error, expectedError);

        // And from attempting to accept
        await assert.isRejected(
            takeAlpOffer({
                chronik,
                takerSk,
                offer,
                takerInput,
                acceptedAtoms: acceptedAtoms,
                allowUnspendable: false,
            }),
            expectedError,
        );
    });
});
