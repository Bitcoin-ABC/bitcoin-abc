// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    ALL_BIP143,
    ALP_STANDARD,
    DEFAULT_DUST_SATS,
    Ecc,
    P2PKHSignatory,
    Script,
    TxBuilder,
    TxBuilderInput,
    alpSend,
    emppScript,
    fromHex,
    shaRmd160,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';

import { AgoraPartial, AgoraPartialSignatory } from '../src/partial.js';
import { Agora, AgoraOffer } from '../src/agora.js';
import { makeAlpGenesis } from './partial-helper-alp.js';

use(chaiAsPromised);

// This test needs a lot of sats
const NUM_COINS = 500;
const COIN_VALUE = 1000000n;

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
const takerSk = fromHex('44'.repeat(32));
const takerPk = ecc.derivePubkey(takerSk);
const takerPkh = shaRmd160(takerPk);
const takerScript = Script.p2pkh(takerPkh);

describe('AgoraPartial enforcedLockTime', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    async function makeBuilderInputs(
        satsArray: bigint[],
    ): Promise<TxBuilderInput[]> {
        const txid = await runner.sendToScript(satsArray, makerScript);
        return satsArray.map((sats, outIdx) => ({
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

    it('AgoraPartial enforcedLockTime', async () => {
        const LOCKTIME1 = 500000123;
        const LOCKTIME2 = 500000999;
        const agoraPartial = AgoraPartial.approximateParams(
            {
                offeredAtoms: 1000n,
                priceNanoSatsPerAtom: 1000000000000n,
                minAcceptedAtoms: 1n,
                makerPk,
                ...BASE_PARAMS_ALP,
                enforcedLockTime: LOCKTIME1,
            },
            32n,
        );
        const askedSats = agoraPartial.askedSats(100n);
        const requiredSats = askedSats + 2000n;
        const [fuelInput, takerInput] = await makeBuilderInputs([
            8000n,
            requiredSats,
        ]);

        const genesisOutputSats = 2000n;
        const genesisTx = makeAlpGenesis({
            tokenType: agoraPartial.tokenType,
            fuelInput,
            tokenAtomsArray: [
                agoraPartial.offeredAtoms(),
                agoraPartial.offeredAtoms(),
                agoraPartial.offeredAtoms(),
            ],
            extraOutputs: [
                { sats: genesisOutputSats, script: makerScript },
                { sats: genesisOutputSats, script: makerScript },
                { sats: genesisOutputSats, script: makerScript },
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
                                sats: genesisOutputSats,
                                outputScript: makerScript,
                            },
                        },
                        signatory: P2PKHSignatory(makerSk, makerPk, ALL_BIP143),
                    },
                ],
                outputs: [
                    {
                        sats: 0n,
                        script: emppScript([
                            offerPartial.adPushdata(),
                            alpSend(tokenId, offerPartial.tokenType, [
                                offerPartial.offeredAtoms(),
                            ]),
                        ]),
                    },
                    { sats: 546n, script: agoraP2sh },
                ],
            });
            const offerTx = txBuildOffer.sign();
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
            acceptedAtoms: 1n,
        });
        await assert.isRejected(
            chronik.broadcastTx(failedAcceptTx.ser(), true),
            /Failed getting \/broadcast-tx: 400: Broadcast failed: Transaction rejected by mempool: mandatory-script-verify-flag-failed \(Script failed an OP_EQUALVERIFY operation\)/,
        );

        // This example shows that it's important to choose different locktimes
        // for identical other offers, otherwise someone can spend them in a
        // single transaction, burning one of the offers.
        const successAcceptTx = offersLocktime1[0].acceptTx({
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
            acceptedAtoms: 1n,
        });
        const acceptTxid = (
            await chronik.broadcastTx(successAcceptTx.ser(), true)
        ).txid;

        const acceptTx = await chronik.tx(acceptTxid);
        expect(acceptTx.tokenEntries[0].burnSummary).to.equal(
            'Unexpected burn: Burns 1000 atoms',
        );
    });
});
