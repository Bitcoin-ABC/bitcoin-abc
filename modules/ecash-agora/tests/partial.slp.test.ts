// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use, assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    ALL_BIP143,
    DEFAULT_DUST_SATS,
    Ecc,
    P2PKHSignatory,
    SLP_FUNGIBLE,
    Script,
    TxBuilderInput,
    fromHex,
    shaRmd160,
    slpSend,
    toHex,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';

import { AgoraPartial } from '../src/partial.js';
import { makeSlpOffer, takeSlpOffer } from './partial-helper-slp.js';
import { Agora, TakenInfo } from '../src/agora.js';
import { Wallet } from 'ecash-wallet/src/wallet.js';

use(chaiAsPromised);

// This test needs a lot of sats
const NUM_COINS = 500;
const COIN_VALUE = 1100000000n;

const BASE_PARAMS_SLP = {
    tokenId: '00'.repeat(32), // filled in later
    tokenType: SLP_FUNGIBLE,
    tokenProtocol: 'SLP' as const,
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

describe('AgoraPartial SLP', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    async function makeBuilderInputs(
        values: bigint[],
    ): Promise<TxBuilderInput[]> {
        // NB for these "not big sats" tests, we can just send to both, no need to sendToTwoScripts
        const txid = await runner.sendToScript(values, makerScript);
        // Send some cash to the taker, since the accept() tests spend from this wallet
        await runner.sendToScript(values, takerScript);
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
            info: '1sat/token, dust accept, must allowUnspendable',
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
            offeredAtoms: 1000000000000000n,
            info: '0.000000001sat/token, full accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 999999986991104n,
            askedSats: 1000358n,
        },
        {
            offeredAtoms: 1000000000000000n,
            info: '0.000000001sat/token, dust accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 546014494720n,
            askedSats: 547n,
        },
        {
            offeredAtoms: 1000000000000000n,
            info: '0.000001sat/token, full accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 999999986991104n,
            askedSats: 1072883592n,
        },
        {
            offeredAtoms: 1000000000000000n,
            info: '0.000001sat/token, dust accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 570425344n,
            askedSats: 612n,
        },
        {
            offeredAtoms: 1000000000000000n,
            info: '0.001sat/token, 1/1000 accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 999989182464n,
            askedSats: 1004470272n,
        },
        {
            offeredAtoms: 1000000000000000n,
            info: '0.001sat/token, min accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 0x1000000n,
            askedSats: 65536n,
        },
        {
            offeredAtoms: 1000000000000000n,
            info: '1sat/token, 1/1000000 accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 989855744n,
            askedSats: 989855744n,
        },
        {
            offeredAtoms: 1000000000000000n,
            info: '1sat/token, min accept',
            priceNanoSatsPerAtom: 1000000000n,
            acceptedAtoms: 0x1000000n,
            askedSats: 16777216n,
        },
        {
            offeredAtoms: 1000000000000000000n,
            info: '0.000000001sat/token, full accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 999999997191651328n,
            askedSats: 1047737894n,
        },
        {
            offeredAtoms: 1000000000000000000n,
            info: '0.000000001sat/token, dust accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 558345748480n,
            askedSats: 585n,
        },
        {
            offeredAtoms: 1000000000000000000n,
            info: '0.000001sat/token, 1/1000 accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 999997235527680n,
            askedSats: 1002438656n,
        },
        {
            offeredAtoms: 1000000000000000000n,
            info: '0.000001sat/token, min accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 0x100000000n,
            askedSats: 65536n,
        },
        {
            offeredAtoms: 1000000000000000000n,
            info: '0.001sat/token, 1/1000000 accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 996432412672n,
            askedSats: 1006632960n,
        },
        {
            offeredAtoms: 1000000000000000000n,
            info: '0.001sat/token, min accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 0x100000000n,
            askedSats: 16777216n,
        },
        {
            offeredAtoms: 0x7fffffffffffffffn,
            info: '0.000000001sat/token, max sats accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 999999997191651328n,
            askedSats: 1010248448n,
        },
        {
            offeredAtoms: 0x7fffffffffffffffn,
            info: '0.000000001sat/token, dust accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 558345748480n,
            askedSats: 768n,
        },
        {
            offeredAtoms: 0x7fffffffffffffffn,
            info: '0.000001sat/token, max sats accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 999997235527680n,
            askedSats: 1017249792n,
        },
        {
            offeredAtoms: 0x7fffffffffffffffn,
            info: '0.000001sat/token, min accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 0x100000000n,
            askedSats: 65536n,
        },
        {
            offeredAtoms: 0x7fffffffffffffffn,
            info: '0.001sat/token, max sats accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 0xc300000000n,
            askedSats: 1090519040n,
        },
        {
            offeredAtoms: 0x7fffffffffffffffn,
            info: '0.001sat/token, min accept',
            priceNanoSatsPerAtom: 1000000n,
            acceptedAtoms: 0x100000000n,
            askedSats: 16777216n,
        },
        {
            offeredAtoms: 0xffffffffffffffffn,
            info: '0.000000001sat/token, max sats accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 999999228392505344n,
            askedSats: 1027665664n,
        },
        {
            offeredAtoms: 0xffffffffffffffffn,
            info: '0.000000001sat/token, dust accept',
            priceNanoSatsPerAtom: 1n,
            acceptedAtoms: 0x10000000000n,
            askedSats: 1280n,
        },
        {
            offeredAtoms: 0xffffffffffffffffn,
            info: '0.000001sat/token, max sats accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 999456069648384n,
            askedSats: 1089339392n,
        },
        {
            offeredAtoms: 0xffffffffffffffffn,
            info: '0.000001sat/token, min accept',
            priceNanoSatsPerAtom: 1000n,
            acceptedAtoms: 0x10000000000n,
            askedSats: 1245184n,
        },
    ];

    let cancelTxsMatchCount = 0;
    for (const testCase of TEST_CASES) {
        it(`AgoraPartial SLP ${testCase.offeredAtoms} for ${testCase.info}`, async () => {
            const agora = new Agora(chronik);
            const agoraPartial = await agora.selectParams({
                offeredAtoms: testCase.offeredAtoms,
                priceNanoSatsPerAtom: testCase.priceNanoSatsPerAtom,
                minAcceptedAtoms: testCase.acceptedAtoms,
                makerPk,
                ...BASE_PARAMS_SLP,
            });
            const askedSats = agoraPartial.askedSats(testCase.acceptedAtoms);
            const requiredSats = askedSats + 2000n;
            const [fuelInput] = await makeBuilderInputs([4000n, requiredSats]);

            const offer = await makeSlpOffer({
                chronik,
                agoraPartial,
                makerSk,
                fuelInput,
            });
            const acceptTxid = await takeSlpOffer({
                chronik,
                takerSk,
                offer,
                acceptedAtoms: testCase.acceptedAtoms,
                allowUnspendable: testCase.allowUnspendable,
            });
            const acceptTx = await chronik.tx(acceptTxid);
            const offeredAtoms = agoraPartial.offeredAtoms();
            const isFullAccept = testCase.acceptedAtoms == offeredAtoms;
            if (isFullAccept) {
                // FULL ACCEPT
                // 0th output is OP_RETURN SLP SEND
                expect(acceptTx.outputs[0].outputScript).to.equal(
                    toHex(
                        slpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                            0n,
                            agoraPartial.offeredAtoms(),
                        ]).bytecode,
                    ),
                );
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
            // 0th output is OP_RETURN SLP SEND
            expect(acceptTx.outputs[0].outputScript).to.equal(
                toHex(
                    slpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0n,
                        leftoverTokens,
                        testCase.acceptedAtoms,
                    ]).bytecode,
                ),
            );
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
            const cancelTx = newOffer.cancelTx({
                cancelSk: makerSk,
                fuelInputs: await makeBuilderInputs([cancelFeeSats]),
                recipientScript: makerScript,
            });
            const cancelTxid = cancelTx.txid();

            // Let's build and broadcast using cancel() instead
            const cancelWallet = Wallet.fromSk(makerSk, chronik);
            await cancelWallet.sync();
            const cancelResult = await newOffer.cancel({
                wallet: cancelWallet,
            });
            const broadcastCancelTxid = cancelResult.broadcasted[0];
            if (broadcastCancelTxid === cancelTxid) {
                cancelTxsMatchCount++;
                console.log(
                    `${cancelTxsMatchCount} of ${TEST_CASES.length} produce equal txids with cancelTx() and cancel()`,
                );

                // Between ~5 and ~8 of 46 of these txs are identical from each method

                // On inspection, when cancel() txid does not match,
                // it is because cancel has selected different fuel inputs
                // This is expected behavior, these txs still show change
                // going to the cancel wallet as expected
            }
            const cancelChronikTx = await chronik.tx(broadcastCancelTxid);
            expect(cancelChronikTx.outputs[1].token?.atoms).to.equal(
                leftoverTokens,
            );
            expect(cancelChronikTx.outputs[1].outputScript).to.equal(
                makerScriptHex,
            );

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
            info: '1sat/token, dust accept, must allowUnspendable',
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
            ...BASE_PARAMS_SLP,
        });
        const askedSats = agoraPartial.askedSats(thisTestCase.acceptedAtoms);
        const requiredSats = askedSats + 2000n;
        const [fuelInput] = await makeBuilderInputs([4000n, requiredSats]);

        const offer = await makeSlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });

        const expectedError =
            'Accepting 546 token satoshis would leave an amount lower than the min acceptable by the terms of this contract, and hence unacceptable. Accept fewer tokens or the full offer.';

        // We can get the error from this isolated method
        expect(() =>
            agoraPartial.preventUnacceptableRemainder(
                thisTestCase.acceptedAtoms,
            ),
        ).to.throw(Error, expectedError);

        // Or by attempting to accept the offer
        await assert.isRejected(
            takeSlpOffer({
                chronik,
                takerSk,
                offer,
                acceptedAtoms: thisTestCase.acceptedAtoms,
                allowUnspendable: false,
            }),
            expectedError,
        );
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
            scriptLen: 216,
            enforcedLockTime: 1087959628,
            makerPk,
            ...BASE_PARAMS_SLP,
        });
        const acceptedAtoms = 500n;
        const askedSats = agoraPartial.askedSats(acceptedAtoms);
        const requiredSats = askedSats + 2000n;
        const [fuelInput] = await makeBuilderInputs([4000n, requiredSats]);

        const offer = await makeSlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });

        const expectedError =
            'Accepting 500 token satoshis would leave an amount priced lower than dust. Accept fewer tokens or the full offer.';

        // We can get the error from this isolated method
        expect(() =>
            agoraPartial.preventUnacceptableRemainder(acceptedAtoms),
        ).to.throw(Error, expectedError);

        // Or by attempting to accept the offer
        await assert.isRejected(
            takeSlpOffer({
                chronik,
                takerSk,
                offer,
                acceptedAtoms: acceptedAtoms,
                allowUnspendable: false,
            }),
            expectedError,
        );

        // We also check if allowUnspendable is specified as undefined
        await assert.isRejected(
            takeSlpOffer({
                chronik,
                takerSk,
                offer,
                acceptedAtoms: acceptedAtoms,
                allowUnspendable: undefined,
            }),
            expectedError,
        );

        // And if the user simply omits the allowUnspendable param
        await assert.isRejected(
            takeSlpOffer({
                chronik,
                takerSk,
                offer,
                acceptedAtoms: acceptedAtoms,
            }),
            expectedError,
        );
    });
});
