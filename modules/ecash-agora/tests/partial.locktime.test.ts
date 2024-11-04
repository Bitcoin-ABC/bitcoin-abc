// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    ALL_BIP143,
    ALP_STANDARD,
    DEFAULT_DUST_LIMIT,
    Ecc,
    P2PKHSignatory,
    Script,
    TxBuilder,
    TxBuilderInput,
    alpSend,
    emppScript,
    fromHex,
    initWasm,
    shaRmd160,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';

import { AgoraPartial, AgoraPartialSignatory } from '../src/partial.js';
import { Agora, AgoraOffer } from '../src/agora.js';
import { makeAlpGenesis } from './partial-helper-alp.js';

use(chaiAsPromised);

// This test needs a lot of sats
const NUM_COINS = 500;
const COIN_VALUE = 1000000;

const BASE_PARAMS_ALP = {
    tokenId: '00'.repeat(32), // filled in later
    tokenType: ALP_STANDARD,
    tokenProtocol: 'ALP' as const,
    dustAmount: DEFAULT_DUST_LIMIT,
};

describe('AgoraPartial enforcedLockTime', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    let makerSk: Uint8Array;
    let makerPk: Uint8Array;
    let makerPkh: Uint8Array;
    let makerScript: Script;
    let takerSk: Uint8Array;
    let takerPk: Uint8Array;
    let takerPkh: Uint8Array;
    let takerScript: Script;

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
        takerSk = fromHex('44'.repeat(32));
        takerPk = ecc.derivePubkey(takerSk);
        takerPkh = shaRmd160(takerPk);
        takerScript = Script.p2pkh(takerPkh);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial enforcedLockTime', async () => {
        const LOCKTIME1 = 500000123;
        const LOCKTIME2 = 500000999;
        const agoraPartial = AgoraPartial.approximateParams({
            offeredTokens: 1000n,
            priceNanoSatsPerToken: 1000000000000n,
            minAcceptedTokens: 1n,
            makerPk,
            ...BASE_PARAMS_ALP,
            enforcedLockTime: LOCKTIME1,
        });
        const askedSats = agoraPartial.askedSats(100n);
        const requiredSats = askedSats + 2000n;
        const [fuelInput, takerInput] = await makeBuilderInputs([
            8000,
            Number(requiredSats),
        ]);

        const genesisOutputSats = 2000;
        const genesisTx = makeAlpGenesis({
            ecc,
            tokenType: agoraPartial.tokenType,
            fuelInput,
            tokenAmounts: [
                agoraPartial.offeredTokens(),
                agoraPartial.offeredTokens(),
                agoraPartial.offeredTokens(),
            ],
            extraOutputs: [
                { value: genesisOutputSats, script: makerScript },
                { value: genesisOutputSats, script: makerScript },
                { value: genesisOutputSats, script: makerScript },
            ],
        });
        const genesisTxid = (await chronik.broadcastTx(genesisTx.ser())).txid;
        const tokenId = genesisTxid;
        agoraPartial.tokenId = tokenId;

        for (let offerIdx = 0; offerIdx < 3; ++offerIdx) {
            const offerPartial = new AgoraPartial(agoraPartial);
            if (offerIdx == 2) {
                offerPartial.enforcedLockTime = LOCKTIME2;
            }
            const agoraScript = offerPartial.script();
            const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));
            const txBuildOffer = new TxBuilder({
                inputs: [
                    {
                        input: {
                            prevOut: {
                                txid: genesisTxid,
                                outIdx: offerIdx + 1,
                            },
                            signData: {
                                value: genesisOutputSats,
                                outputScript: makerScript,
                            },
                        },
                        signatory: P2PKHSignatory(makerSk, makerPk, ALL_BIP143),
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        script: emppScript([
                            offerPartial.adPushdata(),
                            alpSend(tokenId, offerPartial.tokenType, [
                                offerPartial.offeredTokens(),
                            ]),
                        ]),
                    },
                    { value: 546, script: agoraP2sh },
                ],
            });
            const offerTx = txBuildOffer.sign(ecc);
            await chronik.broadcastTx(offerTx.ser());
        }

        const agora = new Agora(chronik);
        const offers: (AgoraOffer & { variant: { type: 'PARTIAL' } })[] =
            (await agora.activeOffersByTokenId(tokenId)) as (AgoraOffer & {
                variant: { type: 'PARTIAL' };
            })[];
        expect(offers.length).to.equal(3);

        const offersLocktime1 = offers.filter(
            offer => offer.variant.params.enforcedLockTime == LOCKTIME1,
        );
        const offersLocktime2 = offers.filter(
            offer => offer.variant.params.enforcedLockTime == LOCKTIME2,
        );

        // Cannot co-spend other identical offer (due to different locktime)
        const failedAcceptTx = offersLocktime1[0].acceptTx({
            ecc,
            covenantSk: takerSk,
            covenantPk: takerPk,
            fuelInputs: [
                takerInput,
                {
                    input: offersLocktime2[0].txBuilderInput,
                    signatory: AgoraPartialSignatory(
                        offersLocktime2[0].variant.params,
                        1n,
                        takerSk,
                        takerPk,
                    ),
                },
            ],
            recipientScript: takerScript,
            acceptedTokens: 1n,
        });
        await assert.isRejected(
            chronik.broadcastTx(failedAcceptTx.ser(), true),
            'Failed getting /broadcast-tx: 400: Broadcast failed: Transaction rejected by mempool: mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)',
        );

        // This example shows that it's important to choose different locktimes
        // for identical other offers, otherwise someone can spend them in a
        // single transaction, burning one of the offers.
        const successAcceptTx = offersLocktime1[0].acceptTx({
            ecc,
            covenantSk: takerSk,
            covenantPk: takerPk,
            fuelInputs: [
                takerInput,
                {
                    input: offersLocktime1[1].txBuilderInput,
                    signatory: AgoraPartialSignatory(
                        offersLocktime1[1].variant.params,
                        1n,
                        takerSk,
                        takerPk,
                    ),
                },
            ],
            recipientScript: takerScript,
            acceptedTokens: 1n,
        });
        const acceptTxid = (
            await chronik.broadcastTx(successAcceptTx.ser(), true)
        ).txid;

        const acceptTx = await chronik.tx(acceptTxid);
        expect(acceptTx.tokenEntries[0].burnSummary).to.equal(
            'Unexpected burn: Burns 1000 base tokens',
        );
    });
});
