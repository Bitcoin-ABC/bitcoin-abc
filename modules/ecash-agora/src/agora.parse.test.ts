// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { ChronikClient, PluginEntry, Token, Tx, Utxo } from 'chronik-client';
import {
    OP_0,
    OP_1,
    Script,
    WriterBytes,
    WriterLength,
    fromHex,
    strToBytes,
    toHex,
    writeTxOutput,
} from 'ecash-lib';

import { Agora } from './agora.js';
import { AgoraOneshot } from './oneshot.js';
import { AgoraPartial } from './partial.js';
import { DUMMY_KEYPAIR } from './inputs.js';

const TOKEN_ID = '11'.repeat(32);
const CANCEL_PK_HEX = toHex(DUMMY_KEYPAIR.pk);
const ONESHOT_HEX = toHex(strToBytes(AgoraOneshot.COVENANT_VARIANT));
const PARTIAL_HEX = toHex(strToBytes(AgoraPartial.COVENANT_VARIANT));
const PUBKEY_PREFIX = toHex(strToBytes('P'));
const MAKER_SCRIPT = Script.p2pkh(fromHex('11'.repeat(20)));
const TAKER_P2PKH = Script.p2pkh(fromHex('33'.repeat(20)));
const TAKER_P2SH = Script.p2sh(fromHex('44'.repeat(20)));
const SLP_TOKEN: Token = {
    tokenId: TOKEN_ID,
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
        number: 65,
    },
    atoms: 1n,
    isMintBaton: false,
};

const serializeExtraOutputs = (
    outputs: Parameters<typeof writeTxOutput>[0][],
): string => {
    const writerLength = new WriterLength();
    for (const output of outputs) {
        writeTxOutput(output, writerLength);
    }
    const writer = new WriterBytes(writerLength.length);
    for (const output of outputs) {
        writeTxOutput(output, writer);
    }
    return toHex(writer.data);
};

const validExtraOutputsSer = serializeExtraOutputs([
    { sats: 80000n, script: MAKER_SCRIPT },
]);

// Truncated tail: enough leftover bytes to enter the parse loop, not enough
// for readTxOutput (readU64) to finish.
const truncatedExtraOutputsSer = validExtraOutputsSer.slice(0, 8);

const agoraPlugin = (extraOutputsSerHex: string): PluginEntry => ({
    data: [ONESHOT_HEX, extraOutputsSerHex],
    groups: [PUBKEY_PREFIX + CANCEL_PK_HEX],
});

const oneshotUtxo = (extraOutputsSerHex: string, txid: string): Utxo => ({
    outpoint: { txid, outIdx: 1 },
    blockHeight: 100,
    isCoinbase: false,
    sats: 546n,
    script: Script.p2sh(fromHex('22'.repeat(20))).toHex(),
    isFinal: true,
    plugins: { agora: agoraPlugin(extraOutputsSerHex) },
    token: SLP_TOKEN,
});

const canceledHistoricTx = (extraOutputsSerHex: string, txid: string): Tx =>
    ({
        txid,
        version: 2,
        inputs: [
            {
                prevOut: { txid: 'aa'.repeat(32), outIdx: 1 },
                // Last-but-one op is OP_0 => canceled (skips takenInfo).
                inputScript: Script.fromOps([OP_0, OP_1]).toHex(),
                outputScript: Script.p2sh(fromHex('22'.repeat(20))).toHex(),
                sats: 546n,
                sequenceNo: 0xffffffff,
                token: SLP_TOKEN,
                plugins: { agora: agoraPlugin(extraOutputsSerHex) },
            },
        ],
        outputs: [],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 1,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        isFinal: true,
        block: {
            height: 100,
            hash: 'bb'.repeat(32),
            timestamp: 1,
        },
    }) as Tx;

const mockChronik = (plugin: {
    utxos?: (groupHex: string) => Promise<{ utxos: Utxo[] }>;
    confirmedTxs?: (
        groupHex: string,
        page?: number,
        pageSize?: number,
    ) => Promise<{ txs: Tx[]; numPages: number; numTxs: number }>;
}): ChronikClient =>
    ({
        plugin: () => plugin,
    }) as unknown as ChronikClient;

describe('Agora offer-group parse robustness', () => {
    it('Keeps readable ONESHOT offers when another utxo extra_outputs_ser does not parse', async () => {
        const good = oneshotUtxo(validExtraOutputsSer, '01'.repeat(32));
        const unreadable = oneshotUtxo(
            truncatedExtraOutputsSer,
            '02'.repeat(32),
        );
        const agora = new Agora(
            mockChronik({
                utxos: async () => ({ utxos: [good, unreadable] }),
            }),
        );

        const offers = await agora.activeOffersByTokenId(TOKEN_ID);
        expect(offers).to.have.length(1);
        expect(offers[0].outpoint.txid).to.equal(good.outpoint.txid);
        expect(offers[0].status).to.equal('OPEN');
        expect(offers[0].variant.type).to.equal('ONESHOT');
    });

    it('Keeps readable historic offers when a canceled covenant extra_outputs_ser does not parse', async () => {
        const goodTx = canceledHistoricTx(
            validExtraOutputsSer,
            '03'.repeat(32),
        );
        const unreadableTx = canceledHistoricTx(
            truncatedExtraOutputsSer,
            '04'.repeat(32),
        );
        const agora = new Agora(
            mockChronik({
                confirmedTxs: async () => ({
                    txs: [goodTx, unreadableTx],
                    numPages: 1,
                    numTxs: 2,
                }),
            }),
        );

        const result = await agora.historicOffers({
            type: 'TOKEN_ID',
            tokenId: TOKEN_ID,
            table: 'CONFIRMED',
        });
        expect(result.offers).to.have.length(1);
        expect(result.offers[0].status).to.equal('CANCELED');
        expect(result.offers[0].outpoint.txid).to.equal(
            goodTx.inputs[0].prevOut.txid,
        );
        expect(result.numTxs).to.equal(2);
    });

    it('Keeps readable historic offers when a TAKEN tx has only two outputs', async () => {
        const goodTx = canceledHistoricTx(
            validExtraOutputsSer,
            '07'.repeat(32),
        );
        // Consensus-valid ONESHOT accept: OP_RETURN + maker payment, no outputs[2].
        // Last-but-one op is OP_1 => TAKEN (not canceled).
        const shortTakenTx = canceledHistoricTx(
            validExtraOutputsSer,
            '08'.repeat(32),
        );
        shortTakenTx.inputs[0].inputScript = Script.fromOps([
            OP_1,
            OP_1,
        ]).toHex();
        shortTakenTx.outputs = [
            { sats: 0n, outputScript: '6a' },
            { sats: 80000n, outputScript: MAKER_SCRIPT.toHex() },
        ];
        const agora = new Agora(
            mockChronik({
                confirmedTxs: async () => ({
                    txs: [shortTakenTx, goodTx],
                    numPages: 1,
                    numTxs: 2,
                }),
            }),
        );

        const result = await agora.historicOffers({
            type: 'TOKEN_ID',
            tokenId: TOKEN_ID,
            table: 'CONFIRMED',
        });
        const canceled = result.offers.find(
            offer => offer.status === 'CANCELED',
        );
        expect(canceled).to.not.equal(undefined);
        expect(canceled!.outpoint.txid).to.equal(goodTx.inputs[0].prevOut.txid);
        const taken = result.offers.find(offer => offer.status === 'TAKEN');
        expect(taken).to.not.equal(undefined);
        expect(taken!.takenInfo).to.equal(undefined);
        expect(result.numTxs).to.equal(2);
    });

    it('Sets takenInfo from output 2 when a full accept pays a P2SH recipient', async () => {
        const fullAcceptP2sh = canceledHistoricTx(
            validExtraOutputsSer,
            '09'.repeat(32),
        );
        fullAcceptP2sh.inputs[0].inputScript = Script.fromOps([
            OP_1,
            OP_1,
        ]).toHex();
        fullAcceptP2sh.outputs = [
            { sats: 0n, outputScript: '6a' },
            { sats: 80000n, outputScript: MAKER_SCRIPT.toHex() },
            {
                sats: 546n,
                outputScript: TAKER_P2SH.toHex(),
                token: SLP_TOKEN,
            },
        ];
        const agora = new Agora(
            mockChronik({
                confirmedTxs: async () => ({
                    txs: [fullAcceptP2sh],
                    numPages: 1,
                    numTxs: 1,
                }),
            }),
        );

        const result = await agora.historicOffers({
            type: 'TOKEN_ID',
            tokenId: TOKEN_ID,
            table: 'CONFIRMED',
        });
        expect(result.offers).to.have.length(1);
        expect(result.offers[0].status).to.equal('TAKEN');
        expect(result.offers[0].takenInfo).to.deep.equal({
            sats: 80000n,
            atoms: 1n,
            takerScriptHex: TAKER_P2SH.toHex(),
        });
    });

    it('Sets takenInfo from output 3 when output 2 is a leftover agora offer', async () => {
        const partialAccept = canceledHistoricTx(
            validExtraOutputsSer,
            '0a'.repeat(32),
        );
        partialAccept.inputs[0].inputScript = Script.fromOps([
            OP_1,
            OP_1,
        ]).toHex();
        partialAccept.outputs = [
            { sats: 0n, outputScript: '6a' },
            { sats: 40000n, outputScript: MAKER_SCRIPT.toHex() },
            {
                sats: 546n,
                outputScript: Script.p2sh(fromHex('55'.repeat(20))).toHex(),
                plugins: { agora: agoraPlugin(validExtraOutputsSer) },
                token: SLP_TOKEN,
            },
            {
                sats: 546n,
                outputScript: TAKER_P2PKH.toHex(),
                token: { ...SLP_TOKEN, atoms: 1n },
            },
        ];
        const agora = new Agora(
            mockChronik({
                confirmedTxs: async () => ({
                    txs: [partialAccept],
                    numPages: 1,
                    numTxs: 1,
                }),
            }),
        );

        const result = await agora.historicOffers({
            type: 'TOKEN_ID',
            tokenId: TOKEN_ID,
            table: 'CONFIRMED',
        });
        expect(result.offers).to.have.length(1);
        expect(result.offers[0].status).to.equal('TAKEN');
        expect(result.offers[0].takenInfo).to.deep.equal({
            sats: 40000n,
            atoms: 1n,
            takerScriptHex: TAKER_P2PKH.toHex(),
        });
    });

    it('Drops a version-skewed PARTIAL plugin data() shape instead of rejecting the group', async () => {
        const good = oneshotUtxo(validExtraOutputsSer, '05'.repeat(32));
        const outdatedPartial: Utxo = {
            ...oneshotUtxo(validExtraOutputsSer, '06'.repeat(32)),
            plugins: {
                agora: {
                    // Missing enforcedLockTimeHex => _parsePartialOfferUtxo throws
                    data: [PARTIAL_HEX],
                    groups: [PUBKEY_PREFIX + CANCEL_PK_HEX],
                },
            },
        };
        const agora = new Agora(
            mockChronik({
                utxos: async () => ({ utxos: [good, outdatedPartial] }),
            }),
        );

        const offers = await agora.activeOffersByTokenId(TOKEN_ID);
        expect(offers).to.have.length(1);
        expect(offers[0].outpoint.txid).to.equal(good.outpoint.txid);
    });
});
