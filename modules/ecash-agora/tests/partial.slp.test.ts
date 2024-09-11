// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    ALL_BIP143,
    DEFAULT_DUST_LIMIT,
    Ecc,
    P2PKHSignatory,
    SLP_FUNGIBLE,
    Script,
    TxBuilderInput,
    fromHex,
    initWasm,
    shaRmd160,
    slpSend,
    toHex,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';

import { AgoraPartial } from '../src/partial.js';
import { makeSlpOffer, takeSlpOffer } from './partial-helper-slp.js';
import { Agora } from '../src/agora.js';

use(chaiAsPromised);

// This test needs a lot of sats
const NUM_COINS = 500;
const COIN_VALUE = 1100000000;

const BASE_PARAMS_SLP = {
    tokenId: '00'.repeat(32), // filled in later
    tokenType: SLP_FUNGIBLE,
    tokenProtocol: 'SLP' as const,
    dustAmount: DEFAULT_DUST_LIMIT,
};

describe('AgoraPartial SLP', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    let makerSk: Uint8Array;
    let makerPk: Uint8Array;
    let makerPkh: Uint8Array;
    let makerScript: Script;
    let makerScriptHex: string;
    let takerSk: Uint8Array;
    let takerPk: Uint8Array;
    let takerPkh: Uint8Array;
    let takerScript: Script;
    let takerScriptHex: string;

    async function makeBuilderInputs(
        values: number[],
    ): Promise<TxBuilderInput[]> {
        const txid = await runner.sendToScript(values, makerScript);
        return values.map((value, outIdx) => ({
            input: {
                prevOut: {
                    txid,
                    outIdx,
                },
                signData: {
                    value,
                    outputScript: makerScript,
                },
            },
            signatory: P2PKHSignatory(makerSk, makerPk, ALL_BIP143),
        }));
    }

    before(async () => {
        await initWasm();
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        ecc = runner.ecc;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);

        makerSk = fromHex('33'.repeat(32));
        makerPk = ecc.derivePubkey(makerSk);
        makerPkh = shaRmd160(makerPk);
        makerScript = Script.p2pkh(makerPkh);
        makerScriptHex = toHex(makerScript.bytecode);
        takerSk = fromHex('44'.repeat(32));
        takerPk = ecc.derivePubkey(takerSk);
        takerPkh = shaRmd160(takerPk);
        takerScript = Script.p2pkh(takerPkh);
        takerScriptHex = toHex(takerScript.bytecode);
    });

    after(() => {
        runner.stop();
    });

    interface TestCase {
        offeredTokens: bigint;
        info: string;
        priceNanoSatsPerToken: bigint;
        acceptedTokens: bigint;
        askedSats: number;
    }
    const TEST_CASES: TestCase[] = [
        {
            offeredTokens: 1000n,
            info: '1sat/token, full accept',
            priceNanoSatsPerToken: 1000000000n,
            acceptedTokens: 1000n,
            askedSats: 1000,
        },
        {
            offeredTokens: 1000n,
            info: '1sat/token, dust accept',
            priceNanoSatsPerToken: 1000000000n,
            acceptedTokens: 546n,
            askedSats: 546,
        },
        {
            offeredTokens: 1000n,
            info: '1000sat/token, full accept',
            priceNanoSatsPerToken: 1000n * 1000000000n,
            acceptedTokens: 1000n,
            askedSats: 1000225,
        },
        {
            offeredTokens: 1000n,
            info: '1000sat/token, half accept',
            priceNanoSatsPerToken: 1000n * 1000000000n,
            acceptedTokens: 500n,
            askedSats: 500113,
        },
        {
            offeredTokens: 1000n,
            info: '1000sat/token, 1 accept',
            priceNanoSatsPerToken: 1000n * 1000000000n,
            acceptedTokens: 1n,
            askedSats: 1001,
        },
        {
            offeredTokens: 1000n,
            info: '1000000sat/token, full accept',
            priceNanoSatsPerToken: 1000000n * 1000000000n,
            acceptedTokens: 1000n,
            askedSats: 1000013824,
        },
        {
            offeredTokens: 1000n,
            info: '1000000sat/token, half accept',
            priceNanoSatsPerToken: 1000000n * 1000000000n,
            acceptedTokens: 500n,
            askedSats: 500039680,
        },
        {
            offeredTokens: 1000n,
            info: '1000000sat/token, 1 accept',
            priceNanoSatsPerToken: 1000000n * 1000000000n,
            acceptedTokens: 1n,
            askedSats: 1048576,
        },
        {
            offeredTokens: 1000n,
            info: '1000000000sat/token, 1 accept',
            priceNanoSatsPerToken: 1000000000n * 1000000000n,
            acceptedTokens: 1n,
            askedSats: 1006632960,
        },
        {
            offeredTokens: 1000000n,
            info: '0.001sat/token, full accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 1000000n,
            askedSats: 1000,
        },
        {
            offeredTokens: 1000000n,
            info: '1sat/token, full accept',
            priceNanoSatsPerToken: 1000000000n,
            acceptedTokens: 1000000n,
            askedSats: 1000000,
        },
        {
            offeredTokens: 1000000n,
            info: '1sat/token, half accept',
            priceNanoSatsPerToken: 1000000000n,
            acceptedTokens: 500000n,
            askedSats: 500000,
        },
        {
            offeredTokens: 1000000n,
            info: '1sat/token, dust accept',
            priceNanoSatsPerToken: 1000000000n,
            acceptedTokens: 546n,
            askedSats: 546,
        },
        {
            offeredTokens: 1000000n,
            info: '1000sat/token, full accept',
            priceNanoSatsPerToken: 1000n * 1000000000n,
            acceptedTokens: 1000000n,
            askedSats: 1001151232,
        },
        {
            offeredTokens: 1000000n,
            info: '1000sat/token, half accept',
            priceNanoSatsPerToken: 1000n * 1000000000n,
            acceptedTokens: 500000n,
            askedSats: 500575744,
        },
        {
            offeredTokens: 1000000n,
            info: '1000sat/token, 1 accept',
            priceNanoSatsPerToken: 1000n * 1000000000n,
            acceptedTokens: 1n,
            askedSats: 1024,
        },
        {
            offeredTokens: 1000000n,
            info: '1000000sat/token, 1000 accept',
            priceNanoSatsPerToken: 1000000n * 1000000000n,
            acceptedTokens: 1000n,
            askedSats: 1005060096,
        },
        {
            offeredTokens: 1000000n,
            info: '1000000sat/token, 1 accept',
            priceNanoSatsPerToken: 1000000n * 1000000000n,
            acceptedTokens: 1n,
            askedSats: 1048576,
        },
        {
            offeredTokens: 1000000n,
            info: '1000000sat/token, 1 accept',
            priceNanoSatsPerToken: 1000000000n * 1000000000n,
            acceptedTokens: 1n,
            askedSats: 1006632960,
        },
        {
            offeredTokens: 1000000000n,
            info: '0.001sat/token, full accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 1000000000n,
            askedSats: 1000000,
        },
        {
            offeredTokens: 1000000000n,
            info: '0.001sat/token, half accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 500000000n,
            askedSats: 500000,
        },
        {
            offeredTokens: 1000000000n,
            info: '0.001sat/token, dust accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 546000n,
            askedSats: 546,
        },
        {
            offeredTokens: 1000000000n,
            info: '1sat/token, full accept',
            priceNanoSatsPerToken: 1000000000n,
            acceptedTokens: 1000000000n,
            askedSats: 1000000000,
        },
        {
            offeredTokens: 1000000000n,
            info: '1sat/token, half accept',
            priceNanoSatsPerToken: 1000000000n,
            acceptedTokens: 500000000n,
            askedSats: 500000000,
        },
        {
            offeredTokens: 1000000000n,
            info: '1sat/token, dust accept',
            priceNanoSatsPerToken: 1000000000n,
            acceptedTokens: 546n,
            askedSats: 546,
        },
        {
            offeredTokens: 1000000000n,
            info: '1000sat/token, 983040 accept',
            priceNanoSatsPerToken: 1000n * 1000000000n,
            acceptedTokens: 983040n,
            askedSats: 989855744,
        },
        {
            offeredTokens: 1000000000n,
            info: '1000sat/token, 65536 accept',
            priceNanoSatsPerToken: 1000n * 1000000000n,
            acceptedTokens: 65536n,
            askedSats: 67108864,
        },
        {
            offeredTokens: 1000000000000n,
            info: '0.000001sat/token, full accept',
            priceNanoSatsPerToken: 1000n,
            acceptedTokens: 999999995904n,
            askedSats: 1000108,
        },
        {
            offeredTokens: 1000000000000n,
            info: '0.000001sat/token, half accept',
            priceNanoSatsPerToken: 1000n,
            acceptedTokens: 546045952n,
            askedSats: 547,
        },
        {
            offeredTokens: 1000000000000n,
            info: '0.001sat/token, full accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 999999995904n,
            askedSats: 1068115230,
        },
        {
            offeredTokens: 1000000000000n,
            info: '0.001sat/token, dust accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 589824n,
            askedSats: 630,
        },
        {
            offeredTokens: 1000000000000000n,
            info: '0.000000001sat/token, full accept',
            priceNanoSatsPerToken: 1n,
            acceptedTokens: 999999986991104n,
            askedSats: 1000358,
        },
        {
            offeredTokens: 1000000000000000n,
            info: '0.000000001sat/token, dust accept',
            priceNanoSatsPerToken: 1n,
            acceptedTokens: 546014494720n,
            askedSats: 547,
        },
        {
            offeredTokens: 1000000000000000n,
            info: '0.000001sat/token, full accept',
            priceNanoSatsPerToken: 1000n,
            acceptedTokens: 999999986991104n,
            askedSats: 1072883592,
        },
        {
            offeredTokens: 1000000000000000n,
            info: '0.000001sat/token, dust accept',
            priceNanoSatsPerToken: 1000n,
            acceptedTokens: 570425344n,
            askedSats: 612,
        },
        {
            offeredTokens: 1000000000000000n,
            info: '0.001sat/token, 1/1000 accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 999989182464n,
            askedSats: 1004470272,
        },
        {
            offeredTokens: 1000000000000000n,
            info: '0.001sat/token, min accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 0x1000000n,
            askedSats: 65536,
        },
        {
            offeredTokens: 1000000000000000n,
            info: '1sat/token, 1/1000000 accept',
            priceNanoSatsPerToken: 1000000000n,
            acceptedTokens: 989855744n,
            askedSats: 989855744,
        },
        {
            offeredTokens: 1000000000000000n,
            info: '1sat/token, min accept',
            priceNanoSatsPerToken: 1000000000n,
            acceptedTokens: 0x1000000n,
            askedSats: 16777216,
        },
        {
            offeredTokens: 1000000000000000000n,
            info: '0.000000001sat/token, full accept',
            priceNanoSatsPerToken: 1n,
            acceptedTokens: 999999997191651328n,
            askedSats: 1047737894,
        },
        {
            offeredTokens: 1000000000000000000n,
            info: '0.000000001sat/token, dust accept',
            priceNanoSatsPerToken: 1n,
            acceptedTokens: 558345748480n,
            askedSats: 585,
        },
        {
            offeredTokens: 1000000000000000000n,
            info: '0.000001sat/token, 1/1000 accept',
            priceNanoSatsPerToken: 1000n,
            acceptedTokens: 999997235527680n,
            askedSats: 1002438656,
        },
        {
            offeredTokens: 1000000000000000000n,
            info: '0.000001sat/token, min accept',
            priceNanoSatsPerToken: 1000n,
            acceptedTokens: 0x100000000n,
            askedSats: 65536,
        },
        {
            offeredTokens: 1000000000000000000n,
            info: '0.001sat/token, 1/1000000 accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 996432412672n,
            askedSats: 1006632960,
        },
        {
            offeredTokens: 1000000000000000000n,
            info: '0.001sat/token, min accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 0x100000000n,
            askedSats: 16777216,
        },
        {
            offeredTokens: 0x7fffffffffffffffn,
            info: '0.000000001sat/token, max sats accept',
            priceNanoSatsPerToken: 1n,
            acceptedTokens: 999999997191651328n,
            askedSats: 1010248448,
        },
        {
            offeredTokens: 0x7fffffffffffffffn,
            info: '0.000000001sat/token, dust accept',
            priceNanoSatsPerToken: 1n,
            acceptedTokens: 558345748480n,
            askedSats: 768,
        },
        {
            offeredTokens: 0x7fffffffffffffffn,
            info: '0.000001sat/token, max sats accept',
            priceNanoSatsPerToken: 1000n,
            acceptedTokens: 999997235527680n,
            askedSats: 1017249792,
        },
        {
            offeredTokens: 0x7fffffffffffffffn,
            info: '0.000001sat/token, min accept',
            priceNanoSatsPerToken: 1000n,
            acceptedTokens: 0x100000000n,
            askedSats: 65536,
        },
        {
            offeredTokens: 0x7fffffffffffffffn,
            info: '0.001sat/token, max sats accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 0xc300000000n,
            askedSats: 1090519040,
        },
        {
            offeredTokens: 0x7fffffffffffffffn,
            info: '0.001sat/token, min accept',
            priceNanoSatsPerToken: 1000000n,
            acceptedTokens: 0x100000000n,
            askedSats: 16777216,
        },
        {
            offeredTokens: 0xffffffffffffffffn,
            info: '0.000000001sat/token, max sats accept',
            priceNanoSatsPerToken: 1n,
            acceptedTokens: 999999228392505344n,
            askedSats: 1027665664,
        },
        {
            offeredTokens: 0xffffffffffffffffn,
            info: '0.000000001sat/token, dust accept',
            priceNanoSatsPerToken: 1n,
            acceptedTokens: 0x10000000000n,
            askedSats: 1280,
        },
        {
            offeredTokens: 0xffffffffffffffffn,
            info: '0.000001sat/token, max sats accept',
            priceNanoSatsPerToken: 1000n,
            acceptedTokens: 999456069648384n,
            askedSats: 1089339392,
        },
        {
            offeredTokens: 0xffffffffffffffffn,
            info: '0.000001sat/token, min accept',
            priceNanoSatsPerToken: 1000n,
            acceptedTokens: 0x10000000000n,
            askedSats: 1245184,
        },
    ];

    for (const testCase of TEST_CASES) {
        it(`AgoraPartial SLP ${testCase.offeredTokens} for ${testCase.info}`, async () => {
            const agoraPartial = AgoraPartial.approximateParams({
                offeredTokens: testCase.offeredTokens,
                priceNanoSatsPerToken: testCase.priceNanoSatsPerToken,
                minAcceptedTokens: testCase.acceptedTokens,
                makerPk,
                ...BASE_PARAMS_SLP,
            });
            const askedSats = agoraPartial.askedSats(testCase.acceptedTokens);
            const requiredSats = askedSats + 2000n;
            const [fuelInput, takerInput] = await makeBuilderInputs([
                4000,
                Number(requiredSats),
            ]);

            const offer = await makeSlpOffer({
                chronik,
                ecc,
                agoraPartial,
                makerSk,
                fuelInput,
            });
            const acceptTxid = await takeSlpOffer({
                chronik,
                ecc,
                takerSk,
                offer,
                takerInput,
                acceptedTokens: testCase.acceptedTokens,
            });
            const acceptTx = await chronik.tx(acceptTxid);
            const offeredTokens = agoraPartial.offeredTokens();
            const agora = new Agora(chronik);
            if (testCase.acceptedTokens == offeredTokens) {
                // FULL ACCEPT
                // 0th output is OP_RETURN SLP SEND
                expect(acceptTx.outputs[0].outputScript).to.equal(
                    toHex(
                        slpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                            0,
                            agoraPartial.offeredTokens(),
                        ]).bytecode,
                    ),
                );
                // 1st output is sats to maker
                expect(acceptTx.outputs[1].token).to.equal(undefined);
                expect(acceptTx.outputs[1].value).to.equal(testCase.askedSats);
                expect(acceptTx.outputs[1].outputScript).to.equal(
                    makerScriptHex,
                );
                // 2nd output is tokens to taker
                expect(acceptTx.outputs[2].token?.amount).to.equal(
                    offeredTokens.toString(),
                );
                expect(acceptTx.outputs[2].value).to.equal(DEFAULT_DUST_LIMIT);
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
            const leftoverTokens = offeredTokens - testCase.acceptedTokens;
            const leftoverTruncTokens =
                leftoverTokens >> BigInt(8 * agoraPartial.numTokenTruncBytes);
            // 0th output is OP_RETURN SLP SEND
            expect(acceptTx.outputs[0].outputScript).to.equal(
                toHex(
                    slpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0,
                        leftoverTokens,
                        testCase.acceptedTokens,
                    ]).bytecode,
                ),
            );
            // 1st output is sats to maker
            expect(acceptTx.outputs[1].token).to.equal(undefined);
            expect(acceptTx.outputs[1].value).to.equal(testCase.askedSats);
            expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
            // 2nd output is back to the P2SH Script
            expect(acceptTx.outputs[2].token?.amount).to.equal(
                leftoverTokens.toString(),
            );
            expect(acceptTx.outputs[2].value).to.equal(DEFAULT_DUST_LIMIT);
            expect(acceptTx.outputs[2].outputScript.slice(0, 4)).to.equal(
                'a914',
            );
            // 3rd output is tokens to taker
            expect(acceptTx.outputs[3].token?.amount).to.equal(
                testCase.acceptedTokens.toString(),
            );
            expect(acceptTx.outputs[3].value).to.equal(DEFAULT_DUST_LIMIT);
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
                    truncTokens: leftoverTruncTokens,
                }),
            });

            // Cancel leftover offer
            const cancelFeeSats = newOffer.cancelFeeSats({
                recipientScript: makerScript,
                extraInputs: [fuelInput], // dummy input for measuring
            });
            const cancelTxSer = newOffer
                .cancelTx({
                    ecc,
                    cancelSk: makerSk,
                    fuelInputs: await makeBuilderInputs([
                        Number(cancelFeeSats),
                    ]),
                    recipientScript: makerScript,
                })
                .ser();
            const cancelTxid = (await chronik.broadcastTx(cancelTxSer)).txid;
            const cancelTx = await chronik.tx(cancelTxid);
            expect(cancelTx.outputs[1].token?.amount).to.equal(
                leftoverTokens.toString(),
            );
            expect(cancelTx.outputs[1].outputScript).to.equal(makerScriptHex);
        });
    }
});
