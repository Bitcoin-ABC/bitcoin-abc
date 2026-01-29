// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use } from 'chai';
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
import { Agora } from '../src/agora.js';

use(chaiAsPromised);

const BASE_PARAMS_SLP = {
    tokenId: '00'.repeat(32), // filled in later
    tokenType: SLP_FUNGIBLE,
    tokenProtocol: 'SLP' as const,
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

describe('Agora Partial 7450M XEC vs 2p64-1 full accept', () => {
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

    it('Agora Partial 7450M XEC vs 2p64-1 full accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 0xffffffffffffffffn,
                priceNanoSatsPerAtom: 40n, // scaled to use the XEC
                makerPk: makerPk,
                minAcceptedAtoms: 0xffffffffffffn,
                ...BASE_PARAMS_SLP,
            },
            32n,
        );

        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0xffffffn,
                numAtomsTruncBytes: 5,
                atomsScaleFactor: 127n,
                scaledTruncAtomsPerTruncSat: 189n,
                numSatsTruncBytes: 2,
                makerPk,
                minAcceptedScaledTruncAtoms: 32511n,
                ...BASE_PARAMS_SLP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 224,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0xffffff0000000000n);
        expect(agoraPartial.askedSats(0x10000000000n)).to.equal(65536n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x10000000000n)).to.equal(59n);
        expect(agoraPartial.askedSats(0xffffff0000000000n)).to.equal(
            738825273344n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom(0xffffff0000000000n)).to.equal(
            40n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(40n);

        const offer = await makeSlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeSlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms: agoraPartial.offeredAtoms(),
        });

        const acceptTx = await chronik.tx(acceptTxid);
        // 0th output is OP_RETURN SLP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                slpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                    0n,
                    agoraPartial.offeredAtoms(),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].sats).to.equal(0n);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].sats).to.equal(738825273344n);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is tokens to taker
        expect(acceptTx.outputs[2].token?.atoms).to.equal(0xffffff0000000000n);
        expect(acceptTx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[2].outputScript).to.equal(takerScriptHex);
    });
});

describe('Agora Partial 7450M XEC vs 2p64-1 small accept', () => {
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

    it('Agora Partial 7450M XEC vs 2p64-1 small accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 0xffffffffffffffffn,
                priceNanoSatsPerAtom: 500000000n, // scaled to use the XEC
                makerPk,
                minAcceptedAtoms: 0xffffffffffn,
                ...BASE_PARAMS_SLP,
            },
            32n,
        );
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0xffffffn,
                numAtomsTruncBytes: 5,
                atomsScaleFactor: 128n,
                scaledTruncAtomsPerTruncSat: 1n,
                numSatsTruncBytes: 4,
                makerPk,
                minAcceptedScaledTruncAtoms: 0x7fn,
                ...BASE_PARAMS_SLP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 224,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0xffffff0000000000n);
        expect(agoraPartial.askedSats(0x10000000000n)).to.equal(549755813888n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x10000000000n)).to.equal(
            500000000n,
        );
        expect(agoraPartial.askedSats(0xffffff0000000000n)).to.equal(
            9223371487098961920n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom(0xffffff0000000000n)).to.equal(
            500000000n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(500000000n);

        const offer = await makeSlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptedAtoms = 0x10000000000n;
        const acceptTxid = await takeSlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms,
        });

        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN SLP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                slpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                    0n,
                    agoraPartial.offeredAtoms() - acceptedAtoms,
                    acceptedAtoms,
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

describe('Agora Partial 7450M XEC vs 2p63-1 full accept', () => {
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

    it('Agora Partial 7450M XEC vs 2p63-1 full accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 0x7fffffffffffffffn,
                priceNanoSatsPerAtom: 80n, // scaled to use the XEC
                makerPk: makerPk,
                minAcceptedAtoms: 0xffffffffffffn,
                ...BASE_PARAMS_SLP,
            },
            32n,
        );

        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0x7fffff42n,
                numAtomsTruncBytes: 4,
                atomsScaleFactor: 1n,
                scaledTruncAtomsPerTruncSat: 190n,
                numSatsTruncBytes: 2,
                makerPk,
                minAcceptedScaledTruncAtoms: 0xffffn,
                ...BASE_PARAMS_SLP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 214,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0x7fffff4200000000n);
        expect(agoraPartial.askedSats(0x100000000n)).to.equal(65536n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x100000000n)).to.equal(
            15258n,
        );
        expect(agoraPartial.askedSats(0x7fffff4200000000n)).to.equal(
            740723589120n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom(0x7fffff4200000000n)).to.equal(
            80n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(80n);

        const offer = await makeSlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptedAtoms = agoraPartial.offeredAtoms();
        const acceptTxid = await takeSlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms,
        });

        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN SLP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                slpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                    0n,
                    acceptedAtoms,
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].sats).to.equal(0n);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].sats).to.equal(740723589120n);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is tokens to taker
        expect(acceptTx.outputs[2].token?.atoms).to.equal(acceptedAtoms);
        expect(acceptTx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
        expect(acceptTx.outputs[2].outputScript).to.equal(takerScriptHex);
    });
});

describe('Agora Partial 7450M XEC vs 2p63-1 small accept', () => {
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

    it('Agora Partial 7450M XEC vs 2p63-1 small accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 0x7fffffffffffffffn,
                priceNanoSatsPerAtom: 1000000000n,
                makerPk,
                minAcceptedAtoms: 0x100000000n,
                ...BASE_PARAMS_SLP,
            },
            32n,
        );
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0x7fffffffn,
                numAtomsTruncBytes: 4,
                atomsScaleFactor: 1n,
                scaledTruncAtomsPerTruncSat: 1n,
                numSatsTruncBytes: 4,
                makerPk,
                minAcceptedScaledTruncAtoms: 1n,
                ...BASE_PARAMS_SLP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 209,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0x7fffffff00000000n);
        expect(agoraPartial.askedSats(0x100000000n)).to.equal(4294967296n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x100000000n)).to.equal(
            1000000000n,
        );
        expect(agoraPartial.askedSats(0x7fffffff00000000n)).to.equal(
            9223372032559808512n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom(0x7fffffff00000000n)).to.equal(
            1000000000n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(1000000000n);

        const offer = await makeSlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptedAtoms = 0x100000000n;
        const acceptTxid = await takeSlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms,
        });

        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN SLP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                slpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                    0n,
                    agoraPartial.offeredAtoms() - acceptedAtoms,
                    acceptedAtoms,
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].sats).to.equal(0n);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].sats).to.equal(4294967296n);
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

describe('Agora Partial 7450M XEC vs 100 full accept', () => {
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

    it('Agora Partial 7450M XEC vs 100 full accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 100n,
                priceNanoSatsPerAtom: 7123456780n * 1000000000n, // scaled to use the XEC
                makerPk: makerPk,
                minAcceptedAtoms: 1n,
                ...BASE_PARAMS_SLP,
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
                ...BASE_PARAMS_SLP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 222,
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

        const offer = await makeSlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeSlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms: 100n,
        });
        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN SLP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                slpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                    0n,
                    100n,
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

describe('Agora Partial 7450M XEC vs 100 small accept', () => {
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

    it('Agora Partial 7450M XEC vs 100 small accept', async () => {
        const [fuelInput] = await makeBuilderInputs(runner, [10000n, BIGSATS]);

        const agora = new Agora(chronik);
        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 100n,
                priceNanoSatsPerAtom: 712345678000n * 1000000000n, // scaled to use the XEC
                makerPk: makerPk,
                minAcceptedAtoms: 1n,
                ...BASE_PARAMS_SLP,
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
                ...BASE_PARAMS_SLP,
                enforcedLockTime: agoraPartial.enforcedLockTime,
                scriptLen: 223,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(100n);
        expect(agoraPartial.minAcceptedAtoms()).to.equal(1n);
        expect(agoraPartial.askedSats(1n)).to.equal(712964571136n);
        expect(agoraPartial.askedSats(10n)).to.equal(7125350744064n);
        expect(agoraPartial.askedSats(100n)).to.equal(71236327571456n);

        const offer = await makeSlpOffer({
            chronik,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeSlpOffer({
            chronik,
            offer,
            takerSk,
            acceptedAtoms: 1n,
        });
        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN SLP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                slpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                    0n,
                    99n,
                    1n,
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
