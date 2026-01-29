// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use } from 'chai';
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
import { Agora } from '../src/agora.js';

use(chaiAsPromised);

const BASE_PARAMS_ALP = {
    tokenId: '00'.repeat(32), // filled in later
    tokenType: ALP_STANDARD,
    tokenProtocol: 'ALP' as const,
    dustSats: DEFAULT_DUST_SATS,
};

const BIGSATS = BigInt(149 * 5000000000 - 20000);

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

async function makeBuilderInputs(
    runner: TestRunner,
    values: bigint[],
): Promise<TxBuilderInput[]> {
    const txid = await runner.sendToTwoScripts(
        { script: makerScript, sats: values[0] },
        { script: takerScript, sats: values[1] },
    );
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

describe('AgoraPartial ALP 7450M XEC vs 2p48-1 full accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(1, BIGSATS + 11000n);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 2p48-1 full accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 0xffffffffffffn,
                priceNanoSatsPerAtom: 2600000n, // scaled to use the XEC
                makerPk: makerPk,
                minAcceptedAtoms: 0xffffffffn,
                ...BASE_PARAMS_ALP,
            },
            32n,
        );

        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0xffffffn,
                numAtomsTruncBytes: 3,
                atomsScaleFactor: 127n,
                scaledTruncAtomsPerTruncSat: 190n,
                numSatsTruncBytes: 2,
                makerPk,
                minAcceptedScaledTruncAtoms: 32511n,
                ...BASE_PARAMS_ALP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 204,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0xffffff000000n);
        expect(agoraPartial.askedSats(0x1000000n)).to.equal(65536n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x1000000n)).to.equal(
            3906250n,
        );
        expect(agoraPartial.askedSats(0xffffff000000n)).to.equal(734936694784n);
        expect(agoraPartial.priceNanoSatsPerAtom(0xffffff000000n)).to.equal(
            2611019n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(2611019n);

        const offer = await makeAlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeAlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms: agoraPartial.offeredAtoms(),
        });

        const acceptTx = await chronik.tx(acceptTxid);
        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0n,
                        agoraPartial.offeredAtoms(),
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].sats).to.equal(0n);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].sats).to.equal(734936694784n);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is tokens to taker
        expect(acceptTx.outputs[2].token?.atoms).to.equal(0xffffff000000n);
        expect(acceptTx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[2].outputScript).to.equal(takerScriptHex);
    });
});

describe('AgoraPartial 7450M XEC vs 2p48-1 small accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(1, BIGSATS + 11000n);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 2p48-1 small accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 0xffffffffffffn,
                priceNanoSatsPerAtom: 30000000000000n, // scaled to use the XEC
                makerPk,
                minAcceptedAtoms: 0x1000000n,
                ...BASE_PARAMS_ALP,
            },
            32n,
        );
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0xffffffn,
                numAtomsTruncBytes: 3,
                atomsScaleFactor: 128n,
                scaledTruncAtomsPerTruncSat: 1n,
                numSatsTruncBytes: 4,
                makerPk,
                minAcceptedScaledTruncAtoms: 128n,
                ...BASE_PARAMS_ALP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 205,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0xffffff000000n);
        expect(agoraPartial.askedSats(0x1000000n)).to.equal(549755813888n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x1000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.askedSats(0xffffff000000n)).to.equal(
            9223371487098961920n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom(0xffffff000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(32768000000000n);

        const offer = await makeAlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptedAtoms = 0x1000000n;
        const acceptTxid = await takeAlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms,
        });

        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0n,
                        agoraPartial.offeredAtoms() - acceptedAtoms,
                        acceptedAtoms,
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].sats).to.equal(0n);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].sats).to.equal(549755813888n);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is back to the P2SH Script
        expect(acceptTx.outputs[2].token?.atoms).to.equal(
            agoraPartial.offeredAtoms() - acceptedAtoms,
        );
        expect(acceptTx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[2].outputScript.slice(0, 4)).to.equal('a914');
        // 3rd output is tokens to taker
        expect(acceptTx.outputs[3].token?.atoms).to.equal(acceptedAtoms);
        expect(acceptTx.outputs[3].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[3].outputScript).to.equal(takerScriptHex);
    });
});

describe('AgoraPartial 7450M XEC vs 2p47-1 full accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(1, BIGSATS + 11000n);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 2p47-1 full accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 0x7fffffffffffn,
                priceNanoSatsPerAtom: 5000000n, // scaled to use the XEC
                makerPk: makerPk,
                minAcceptedAtoms: 0xffffffffn,
                ...BASE_PARAMS_ALP,
            },
            32n,
        );
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0x7fffff38n,
                numAtomsTruncBytes: 2,
                atomsScaleFactor: 1n,
                scaledTruncAtomsPerTruncSat: 200n,
                numSatsTruncBytes: 2,
                makerPk,
                minAcceptedScaledTruncAtoms: 0xffffn,
                ...BASE_PARAMS_ALP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 199,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0x7fffff380000n);
        expect(agoraPartial.askedSats(0x10000n)).to.equal(65536n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x10000n)).to.equal(
            1000000000n,
        );
        expect(agoraPartial.askedSats(0x7fffff380000n)).to.equal(703687426048n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x7fffff380000n)).to.equal(
            5000000n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(5000000n);

        const offer = await makeAlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeAlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms: agoraPartial.offeredAtoms(),
        });

        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0n,
                        agoraPartial.offeredAtoms(),
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].sats).to.equal(0n);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].sats).to.equal(703687426048n);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is tokens to taker
        expect(acceptTx.outputs[2].token?.atoms).to.equal(
            agoraPartial.offeredAtoms(),
        );
        expect(acceptTx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[2].outputScript).to.equal(takerScriptHex);
    });
});

describe('AgoraPartial ALP 7450M XEC vs 2p47-1 small accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(1, BIGSATS + 11000n);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 2p47-1 small accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 0x7fffffffffffn,
                priceNanoSatsPerAtom: 32000000000000n,
                makerPk,
                minAcceptedAtoms: 0x1000000n,
                ...BASE_PARAMS_ALP,
            },
            32n,
        );
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0x7fffffn,
                numAtomsTruncBytes: 3,
                atomsScaleFactor: 256n,
                scaledTruncAtomsPerTruncSat: 2n,
                numSatsTruncBytes: 4,
                makerPk,
                minAcceptedScaledTruncAtoms: 256n,
                ...BASE_PARAMS_ALP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 205,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0x7fffff000000n);
        expect(agoraPartial.askedSats(0x1000000n)).to.equal(549755813888n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x1000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.askedSats(0x7fffff000000n)).to.equal(
            4611685468671574016n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom(0x7fffff000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(32768000000000n);

        const offer = await makeAlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptedAtoms = 0x1000000n;
        const acceptTxid = await takeAlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms,
        });

        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0n,
                        agoraPartial.offeredAtoms() - acceptedAtoms,
                        acceptedAtoms,
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].sats).to.equal(0n);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].sats).to.equal(549755813888n);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is back to the P2SH Script
        expect(acceptTx.outputs[2].token?.atoms).to.equal(
            agoraPartial.offeredAtoms() - acceptedAtoms,
        );
        expect(acceptTx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[2].outputScript.slice(0, 4)).to.equal('a914');
        // 3rd output is tokens to taker
        expect(acceptTx.outputs[3].token?.atoms).to.equal(acceptedAtoms);
        expect(acceptTx.outputs[3].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[3].outputScript).to.equal(takerScriptHex);
    });
});

describe('AgoraPartial ALP 7450M XEC vs 100 full accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(1, BIGSATS + 11000n);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 100 full accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 100n,
                priceNanoSatsPerAtom: 7123456780n * 1000000000n, // scaled to use the XEC
                makerPk: makerPk,
                minAcceptedAtoms: 1n,
                ...BASE_PARAMS_ALP,
            },
            32n,
        );
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 100n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 0x7fff3a28n / 100n,
                scaledTruncAtomsPerTruncSat: 50576n,
                numSatsTruncBytes: 3,
                makerPk,
                minAcceptedScaledTruncAtoms: 0x7fff3a28n / 100n,
                ...BASE_PARAMS_ALP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 215,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(100n);
        expect(agoraPartial.minAcceptedAtoms()).to.equal(1n);
        expect(agoraPartial.askedSats(1n)).to.equal(7130316800n);
        expect(agoraPartial.askedSats(2n)).to.equal(7130316800n * 2n);
        expect(agoraPartial.askedSats(3n)).to.equal(7124724394n * 3n + 2n);
        expect(agoraPartial.askedSats(4n)).to.equal(7126122496n * 4n);
        expect(agoraPartial.askedSats(5n)).to.equal(71236059136n / 2n);
        expect(agoraPartial.askedSats(10n)).to.equal(71236059136n);
        expect(agoraPartial.askedSats(100n)).to.equal(712360591360n);

        const offer = await makeAlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeAlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms: 100n,
        });
        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0n,
                        agoraPartial.offeredAtoms(),
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].sats).to.equal(0n);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].sats).to.equal(712360591360n);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is tokens to taker
        expect(acceptTx.outputs[2].token?.atoms).to.equal(100n);
        expect(acceptTx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[2].outputScript).to.equal(takerScriptHex);
    });
});

describe('AgoraPartial ALP 7450M XEC vs 100 small accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(1, BIGSATS + 11000n);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 100 small accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 100n,
                priceNanoSatsPerAtom: 712345678000n * 1000000000n, // scaled to use the XEC
                makerPk: makerPk,
                minAcceptedAtoms: 1n,
                ...BASE_PARAMS_ALP,
            },
            32n,
        );
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 100n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 0x7ffe05f4n / 100n,
                scaledTruncAtomsPerTruncSat: 129471n,
                numSatsTruncBytes: 4,
                makerPk,
                minAcceptedScaledTruncAtoms: 0x7ffe05f4n / 100n,
                ...BASE_PARAMS_ALP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 216,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(100n);
        expect(agoraPartial.minAcceptedAtoms()).to.equal(1n);
        expect(agoraPartial.askedSats(1n)).to.equal(712964571136n);
        expect(agoraPartial.askedSats(10n)).to.equal(7125350744064n);
        expect(agoraPartial.askedSats(100n)).to.equal(71236327571456n);

        const offer = await makeAlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeAlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms: 1n,
        });
        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0n,
                        99n,
                        1n,
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].sats).to.equal(0n);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].sats).to.equal(712964571136n);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is back to the P2SH Script
        expect(acceptTx.outputs[2].token?.atoms).to.equal(99n);
        expect(acceptTx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[2].outputScript.slice(0, 4)).to.equal('a914');
        // 3rd output is tokens to taker
        expect(acceptTx.outputs[3].token?.atoms).to.equal(1n);
        expect(acceptTx.outputs[3].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[3].outputScript).to.equal(takerScriptHex);
    });
});
