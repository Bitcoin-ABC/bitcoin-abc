// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    ALL_BIP143,
    ALP_STANDARD,
    DEFAULT_DUST_LIMIT,
    Ecc,
    P2PKHSignatory,
    Script,
    TxBuilderInput,
    alpSend,
    emppScript,
    fromHex,
    initWasm,
    shaRmd160,
    toHex,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';

import { AgoraPartial } from '../src/partial.js';
import { makeAlpOffer, takeAlpOffer } from './partial-helper-alp.js';

use(chaiAsPromised);

const BASE_PARAMS_ALP = {
    tokenId: '00'.repeat(32), // filled in later
    tokenType: ALP_STANDARD,
    tokenProtocol: 'ALP' as const,
    dustAmount: DEFAULT_DUST_LIMIT,
};

const BIGSATS = 149 * 5000000000 - 20000;

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

function initKeys(ecc: Ecc) {
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
}

async function makeBuilderInputs(
    runner: TestRunner,
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

describe('AgoraPartial ALP 7450M XEC vs 2p48-1 full accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    before(async () => {
        await initWasm();
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        ecc = runner.ecc;
        initKeys(ecc);
        await runner.setupCoins(1, BIGSATS + 11000);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 2p48-1 full accept', async () => {
        const [fuelInput, takerInput] = await makeBuilderInputs(runner, [
            10000,
            BIGSATS,
        ]);

        const agoraPartial = AgoraPartial.approximateParams({
            offeredTokens: 0xffffffffffffn,
            priceNanoSatsPerToken: 2600000n, // scaled to use the XEC
            makerPk: makerPk,
            minAcceptedTokens: 0xffffffffn,
            ...BASE_PARAMS_ALP,
        });

        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncTokens: 0xffffffn,
                numTokenTruncBytes: 3,
                tokenScaleFactor: 127n,
                scaledTruncTokensPerTruncSat: 190n,
                numSatsTruncBytes: 2,
                makerPk,
                minAcceptedScaledTruncTokens: 32511n,
                ...BASE_PARAMS_ALP,
                scriptLen: 196,
            }),
        );
        expect(agoraPartial.offeredTokens()).to.equal(0xffffff000000n);
        expect(agoraPartial.askedSats(0x1000000n)).to.equal(65536n);
        expect(agoraPartial.priceNanoSatsPerToken(0x1000000n)).to.equal(
            3906250n,
        );
        expect(agoraPartial.askedSats(0xffffff000000n)).to.equal(734936694784n);
        expect(agoraPartial.priceNanoSatsPerToken(0xffffff000000n)).to.equal(
            2611019n,
        );
        expect(agoraPartial.priceNanoSatsPerToken()).to.equal(2611019n);

        const offer = await makeAlpOffer({
            chronik,
            ecc,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeAlpOffer({
            chronik,
            ecc,
            offer,
            takerSk,
            takerInput,
            acceptedTokens: agoraPartial.offeredTokens(),
        });

        const acceptTx = await chronik.tx(acceptTxid);
        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0,
                        agoraPartial.offeredTokens(),
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].value).to.equal(0);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].value).to.equal(734936694784);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is tokens to taker
        expect(acceptTx.outputs[2].token?.amount).to.equal(
            0xffffff000000n.toString(),
        );
        expect(acceptTx.outputs[2].value).to.equal(DEFAULT_DUST_LIMIT);
        expect(acceptTx.outputs[2].outputScript).to.equal(takerScriptHex);
    });
});

describe('AgoraPartial 7450M XEC vs 2p48-1 small accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    before(async () => {
        await initWasm();
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        ecc = runner.ecc;
        initKeys(ecc);
        await runner.setupCoins(1, BIGSATS + 11000);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 2p48-1 small accept', async () => {
        const [fuelInput, takerInput] = await makeBuilderInputs(runner, [
            10000,
            BIGSATS,
        ]);

        const agoraPartial = AgoraPartial.approximateParams({
            offeredTokens: 0xffffffffffffn,
            priceNanoSatsPerToken: 30000000000000n, // scaled to use the XEC
            makerPk,
            minAcceptedTokens: 0x1000000n,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncTokens: 0xffffffn,
                numTokenTruncBytes: 3,
                tokenScaleFactor: 128n,
                scaledTruncTokensPerTruncSat: 1n,
                numSatsTruncBytes: 4,
                makerPk,
                minAcceptedScaledTruncTokens: 128n,
                ...BASE_PARAMS_ALP,
                scriptLen: 197,
            }),
        );
        expect(agoraPartial.offeredTokens()).to.equal(0xffffff000000n);
        expect(agoraPartial.askedSats(0x1000000n)).to.equal(549755813888n);
        expect(agoraPartial.priceNanoSatsPerToken(0x1000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.askedSats(0xffffff000000n)).to.equal(
            9223371487098961920n,
        );
        expect(agoraPartial.priceNanoSatsPerToken(0xffffff000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.priceNanoSatsPerToken()).to.equal(32768000000000n);

        const offer = await makeAlpOffer({
            chronik,
            ecc,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptedTokens = 0x1000000n;
        const acceptTxid = await takeAlpOffer({
            chronik,
            ecc,
            offer,
            takerSk,
            takerInput,
            acceptedTokens,
        });

        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0,
                        agoraPartial.offeredTokens() - acceptedTokens,
                        acceptedTokens,
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].value).to.equal(0);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].value).to.equal(549755813888);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is back to the P2SH Script
        expect(acceptTx.outputs[2].token?.amount).to.equal(
            (agoraPartial.offeredTokens() - acceptedTokens).toString(),
        );
        expect(acceptTx.outputs[2].value).to.equal(DEFAULT_DUST_LIMIT);
        expect(acceptTx.outputs[2].outputScript.slice(0, 4)).to.equal('a914');
        // 3rd output is tokens to taker
        expect(acceptTx.outputs[3].token?.amount).to.equal(
            acceptedTokens.toString(),
        );
        expect(acceptTx.outputs[3].value).to.equal(DEFAULT_DUST_LIMIT);
        expect(acceptTx.outputs[3].outputScript).to.equal(takerScriptHex);
    });
});

describe('AgoraPartial 7450M XEC vs 2p47-1 full accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    before(async () => {
        await initWasm();
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        ecc = runner.ecc;
        initKeys(ecc);
        await runner.setupCoins(1, BIGSATS + 11000);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 2p47-1 full accept', async () => {
        const [fuelInput, takerInput] = await makeBuilderInputs(runner, [
            10000,
            BIGSATS,
        ]);

        const agoraPartial = AgoraPartial.approximateParams({
            offeredTokens: 0x7fffffffffffn,
            priceNanoSatsPerToken: 5000000n, // scaled to use the XEC
            makerPk: makerPk,
            minAcceptedTokens: 0xffffffffn,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncTokens: 0x7fffff38n,
                numTokenTruncBytes: 2,
                tokenScaleFactor: 1n,
                scaledTruncTokensPerTruncSat: 200n,
                numSatsTruncBytes: 2,
                makerPk,
                minAcceptedScaledTruncTokens: 0xffffn,
                ...BASE_PARAMS_ALP,
                scriptLen: 191,
            }),
        );
        expect(agoraPartial.offeredTokens()).to.equal(0x7fffff380000n);
        expect(agoraPartial.askedSats(0x10000n)).to.equal(65536n);
        expect(agoraPartial.priceNanoSatsPerToken(0x10000n)).to.equal(
            1000000000n,
        );
        expect(agoraPartial.askedSats(0x7fffff380000n)).to.equal(703687426048n);
        expect(agoraPartial.priceNanoSatsPerToken(0x7fffff380000n)).to.equal(
            5000000n,
        );
        expect(agoraPartial.priceNanoSatsPerToken()).to.equal(5000000n);

        const offer = await makeAlpOffer({
            chronik,
            ecc,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeAlpOffer({
            chronik,
            ecc,
            offer,
            takerSk,
            takerInput,
            acceptedTokens: agoraPartial.offeredTokens(),
        });

        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0,
                        agoraPartial.offeredTokens(),
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].value).to.equal(0);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].value).to.equal(703687426048);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is tokens to taker
        expect(acceptTx.outputs[2].token?.amount).to.equal(
            agoraPartial.offeredTokens().toString(),
        );
        expect(acceptTx.outputs[2].value).to.equal(DEFAULT_DUST_LIMIT);
        expect(acceptTx.outputs[2].outputScript).to.equal(takerScriptHex);
    });
});

describe('AgoraPartial ALP 7450M XEC vs 2p47-1 small accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    before(async () => {
        await initWasm();
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        ecc = runner.ecc;
        initKeys(ecc);
        await runner.setupCoins(1, BIGSATS + 11000);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 2p47-1 small accept', async () => {
        const [fuelInput, takerInput] = await makeBuilderInputs(runner, [
            10000,
            BIGSATS,
        ]);

        const agoraPartial = AgoraPartial.approximateParams({
            offeredTokens: 0x7fffffffffffn,
            priceNanoSatsPerToken: 32000000000000n,
            makerPk,
            minAcceptedTokens: 0x1000000n,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncTokens: 0x7fffffn,
                numTokenTruncBytes: 3,
                tokenScaleFactor: 256n,
                scaledTruncTokensPerTruncSat: 2n,
                numSatsTruncBytes: 4,
                makerPk,
                minAcceptedScaledTruncTokens: 256n,
                ...BASE_PARAMS_ALP,
                scriptLen: 197,
            }),
        );
        expect(agoraPartial.offeredTokens()).to.equal(0x7fffff000000n);
        expect(agoraPartial.askedSats(0x1000000n)).to.equal(549755813888n);
        expect(agoraPartial.priceNanoSatsPerToken(0x1000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.askedSats(0x7fffff000000n)).to.equal(
            4611685468671574016n,
        );
        expect(agoraPartial.priceNanoSatsPerToken(0x7fffff000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.priceNanoSatsPerToken()).to.equal(32768000000000n);

        const offer = await makeAlpOffer({
            chronik,
            ecc,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptedTokens = 0x1000000n;
        const acceptTxid = await takeAlpOffer({
            chronik,
            ecc,
            offer,
            takerSk,
            takerInput,
            acceptedTokens,
        });

        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0,
                        agoraPartial.offeredTokens() - acceptedTokens,
                        acceptedTokens,
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].value).to.equal(0);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].value).to.equal(549755813888);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is back to the P2SH Script
        expect(acceptTx.outputs[2].token?.amount).to.equal(
            (agoraPartial.offeredTokens() - acceptedTokens).toString(),
        );
        expect(acceptTx.outputs[2].value).to.equal(DEFAULT_DUST_LIMIT);
        expect(acceptTx.outputs[2].outputScript.slice(0, 4)).to.equal('a914');
        // 3rd output is tokens to taker
        expect(acceptTx.outputs[3].token?.amount).to.equal(
            acceptedTokens.toString(),
        );
        expect(acceptTx.outputs[3].value).to.equal(DEFAULT_DUST_LIMIT);
        expect(acceptTx.outputs[3].outputScript).to.equal(takerScriptHex);
    });
});

describe('AgoraPartial ALP 7450M XEC vs 100 full accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    before(async () => {
        await initWasm();
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        ecc = runner.ecc;
        initKeys(ecc);
        await runner.setupCoins(1, BIGSATS + 11000);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 100 full accept', async () => {
        const [fuelInput, takerInput] = await makeBuilderInputs(runner, [
            10000,
            BIGSATS,
        ]);

        const agoraPartial = AgoraPartial.approximateParams({
            offeredTokens: 100n,
            priceNanoSatsPerToken: 7123456780n * 1000000000n, // scaled to use the XEC
            makerPk: makerPk,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncTokens: 100n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 0x7fff3a28n / 100n,
                scaledTruncTokensPerTruncSat: 50576n,
                numSatsTruncBytes: 3,
                makerPk,
                minAcceptedScaledTruncTokens: 0x7fff3a28n / 100n,
                ...BASE_PARAMS_ALP,
                scriptLen: 207,
            }),
        );
        expect(agoraPartial.offeredTokens()).to.equal(100n);
        expect(agoraPartial.minAcceptedTokens()).to.equal(1n);
        expect(agoraPartial.askedSats(1n)).to.equal(7130316800n);
        expect(agoraPartial.askedSats(2n)).to.equal(7130316800n * 2n);
        expect(agoraPartial.askedSats(3n)).to.equal(7124724394n * 3n + 2n);
        expect(agoraPartial.askedSats(4n)).to.equal(7126122496n * 4n);
        expect(agoraPartial.askedSats(5n)).to.equal(71236059136n / 2n);
        expect(agoraPartial.askedSats(10n)).to.equal(71236059136n);
        expect(agoraPartial.askedSats(100n)).to.equal(712360591360n);

        const offer = await makeAlpOffer({
            chronik,
            ecc,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeAlpOffer({
            chronik,
            ecc,
            offer,
            takerSk,
            takerInput,
            acceptedTokens: 100n,
        });
        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(agoraPartial.tokenId, agoraPartial.tokenType, [
                        0,
                        agoraPartial.offeredTokens(),
                    ]),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].value).to.equal(0);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].value).to.equal(712360591360);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is tokens to taker
        expect(acceptTx.outputs[2].token?.amount).to.equal('100');
        expect(acceptTx.outputs[2].value).to.equal(DEFAULT_DUST_LIMIT);
        expect(acceptTx.outputs[2].outputScript).to.equal(takerScriptHex);
    });
});

describe('AgoraPartial ALP 7450M XEC vs 100 small accept', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    before(async () => {
        await initWasm();
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        ecc = runner.ecc;
        initKeys(ecc);
        await runner.setupCoins(1, BIGSATS + 11000);
    });

    after(() => {
        runner.stop();
    });

    it('AgoraPartial ALP 7450M XEC vs 100 small accept', async () => {
        const [fuelInput, takerInput] = await makeBuilderInputs(runner, [
            10000,
            BIGSATS,
        ]);

        const agoraPartial = AgoraPartial.approximateParams({
            offeredTokens: 100n,
            priceNanoSatsPerToken: 712345678000n * 1000000000n, // scaled to use the XEC
            makerPk: makerPk,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncTokens: 100n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 0x7ffe05f4n / 100n,
                scaledTruncTokensPerTruncSat: 129471n,
                numSatsTruncBytes: 4,
                makerPk,
                minAcceptedScaledTruncTokens: 0x7ffe05f4n / 100n,
                ...BASE_PARAMS_ALP,
                scriptLen: 208,
            }),
        );
        expect(agoraPartial.offeredTokens()).to.equal(100n);
        expect(agoraPartial.minAcceptedTokens()).to.equal(1n);
        expect(agoraPartial.askedSats(1n)).to.equal(712964571136n);
        expect(agoraPartial.askedSats(10n)).to.equal(7125350744064n);
        expect(agoraPartial.askedSats(100n)).to.equal(71236327571456n);

        const offer = await makeAlpOffer({
            chronik,
            ecc,
            agoraPartial,
            makerSk,
            fuelInput,
        });
        const acceptTxid = await takeAlpOffer({
            chronik,
            ecc,
            offer,
            takerSk,
            takerInput,
            acceptedTokens: 1n,
        });
        const acceptTx = await chronik.tx(acceptTxid);

        // 0th output is OP_RETURN eMPP AGR0 ad + ALP SEND
        expect(acceptTx.outputs[0].outputScript).to.equal(
            toHex(
                emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(
                        agoraPartial.tokenId,
                        agoraPartial.tokenType,
                        [0, 99, 1],
                    ),
                ]).bytecode,
            ),
        );
        expect(acceptTx.outputs[0].value).to.equal(0);
        expect(acceptTx.outputs[0].token).to.equal(undefined);
        // 1st output is sats to maker
        expect(acceptTx.outputs[1].token).to.equal(undefined);
        expect(acceptTx.outputs[1].value).to.equal(712964571136);
        expect(acceptTx.outputs[1].outputScript).to.equal(makerScriptHex);
        // 2nd output is back to the P2SH Script
        expect(acceptTx.outputs[2].token?.amount).to.equal('99');
        expect(acceptTx.outputs[2].value).to.equal(DEFAULT_DUST_LIMIT);
        expect(acceptTx.outputs[2].outputScript.slice(0, 4)).to.equal('a914');
        // 3rd output is tokens to taker
        expect(acceptTx.outputs[3].token?.amount).to.equal('1');
        expect(acceptTx.outputs[3].value).to.equal(DEFAULT_DUST_LIMIT);
        expect(acceptTx.outputs[3].outputScript).to.equal(takerScriptHex);
    });
});
