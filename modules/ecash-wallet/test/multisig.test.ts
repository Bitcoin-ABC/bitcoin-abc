// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * P2SH m-of-n multisig (ECDSA): partial sign → pass hex → co-signer completes and broadcasts.
 */

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    Address,
    ALL_BIP143,
    ALP_TOKEN_TYPE_STANDARD,
    Ecc,
    fromHex,
    payment,
    Script,
    strToBytes,
    toHex,
    TxBuilder,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { MultisigWallet } from '../src/multisigWallet';
import { Wallet } from '../src/wallet';

use(chaiAsPromised);

const NUM_COINS = 500;
const COIN_VALUE = 1100000000n;
const MOCK_DESTINATION_ADDRESS = Address.p2pkh('deadbeef'.repeat(5)).toString();
const MOCK_DESTINATION_SCRIPT = Script.fromAddress(MOCK_DESTINATION_ADDRESS);

describe('MultisigWallet P2SH ECDSA', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    it('fromCosigners yields same address when cosigner array order is permuted', () => {
        const ecc = new Ecc();
        const sk0 = fromHex('a1'.repeat(32));
        const sk1 = fromHex('b2'.repeat(32));
        const sk2 = fromHex('c3'.repeat(32));
        const pk0 = ecc.derivePubkey(sk0);
        const pk1 = ecc.derivePubkey(sk1);
        const pk2 = ecc.derivePubkey(sk2);

        const c0 = { pk: pk0, sk: sk0 };
        const c1 = { pk: pk1 };
        const c2 = { pk: pk2 };

        const wA = MultisigWallet.fromCosigners([c0, c1, c2], 2, chronik);
        const wB = MultisigWallet.fromCosigners([c2, c0, c1], 2, chronik);

        expect(wA.address).to.equal(wB.address);
        expect(wA.script.toHex()).to.equal(wB.script.toHex());
        expect(wA.redeemScript.toHex()).to.equal(wB.redeemScript.toHex());
    });

    it('fromCosigners rejects duplicate pubkeys', () => {
        const ecc = new Ecc();
        const sk = fromHex('d0'.repeat(32));
        const pk = ecc.derivePubkey(sk);
        expect(() =>
            MultisigWallet.fromCosigners([{ pk, sk }, { pk }], 2, chronik),
        ).to.throw(/Duplicate cosigner pubkey/);
    });

    it('fromCosigners rejects more than one secret key (one party per wallet)', () => {
        const ecc = new Ecc();
        const skA = fromHex('e0'.repeat(32));
        const skB = fromHex('e1'.repeat(32));
        const pkA = ecc.derivePubkey(skA);
        const pkB = ecc.derivePubkey(skB);
        expect(() =>
            MultisigWallet.fromCosigners(
                [
                    { pk: pkA, sk: skA },
                    { pk: pkB, sk: skB },
                ],
                2,
                chronik,
            ),
        ).to.throw(/exactly one cosigner must include a secret key/);
    });

    it('fromCosigners rejects zero secret keys', () => {
        const ecc = new Ecc();
        const pkA = ecc.derivePubkey(fromHex('f9'.repeat(32)));
        const pkB = ecc.derivePubkey(fromHex('f8'.repeat(32)));
        expect(() =>
            MultisigWallet.fromCosigners(
                [{ pk: pkA }, { pk: pkB }],
                2,
                chronik,
            ),
        ).to.throw(/exactly one cosigner must include a secret key/);
    });

    it('Alice partial via TxBuilder, Bob signPartialTx + broadcast', async () => {
        const ecc = new Ecc();
        const aliceSk = fromHex('aa'.repeat(32));
        const bobSk = fromHex('bb'.repeat(32));
        const carolSk = fromHex('cc'.repeat(32));
        const alicePk = ecc.derivePubkey(aliceSk);
        const bobPk = ecc.derivePubkey(bobSk);
        const carolPk = ecc.derivePubkey(carolSk);

        const aliceCosigners = [
            { pk: alicePk, sk: aliceSk },
            { pk: bobPk },
            { pk: carolPk },
        ];
        const bobCosigners = [
            { pk: alicePk },
            { pk: bobPk, sk: bobSk },
            { pk: carolPk },
        ];
        const carolCosigners = [
            { pk: alicePk },
            { pk: bobPk },
            { pk: carolPk, sk: carolSk },
        ];

        const aliceWallet = MultisigWallet.fromCosigners(
            aliceCosigners,
            2,
            chronik,
        );
        const bobWallet = MultisigWallet.fromCosigners(
            bobCosigners,
            2,
            chronik,
        );
        const carolWallet = MultisigWallet.fromCosigners(
            carolCosigners,
            2,
            chronik,
        );

        expect(aliceWallet.address).to.equal(bobWallet.address);
        expect(bobWallet.address).to.equal(carolWallet.address);
        expect(aliceWallet.script.toHex()).to.equal(carolWallet.script.toHex());

        await runner.sendToScript(1_000_000n, aliceWallet.script);
        await aliceWallet.sync();
        await bobWallet.sync();

        const utxo = aliceWallet.spendableSatsOnlyUtxos()[0];
        expect(utxo).to.not.equal(undefined);

        const input = aliceWallet.p2shMultisigUtxoToBuilderInput(
            utxo,
            ALL_BIP143,
        );
        const partialTx = new TxBuilder({
            inputs: [input],
            outputs: [
                { script: MOCK_DESTINATION_SCRIPT, sats: 546n },
                aliceWallet.script,
            ],
        }).sign({
            feePerKb: 1000n,
            dustSats: 546n,
        });

        expect(partialTx.isFullySignedMultisig()).to.equal(false);

        const { broadcasted } = await bobWallet
            .signPartialTx(toHex(partialTx.ser()))
            .broadcast();

        expect(broadcasted[0]).to.have.length(64);
        const tx = await chronik.tx(broadcasted[0]);
        expect(tx.outputs[0].sats).to.equal(546n);
    });

    it('action().build() partial hex; second cosigner broadcasts', async () => {
        const ecc = new Ecc();
        const aliceSk = fromHex('dd'.repeat(32));
        const bobSk = fromHex('ee'.repeat(32));
        const carolSk = fromHex('11'.repeat(32));
        const alicePk = ecc.derivePubkey(aliceSk);
        const bobPk = ecc.derivePubkey(bobSk);
        const carolPk = ecc.derivePubkey(carolSk);

        const aliceCosigners = [
            { pk: alicePk, sk: aliceSk },
            { pk: bobPk },
            { pk: carolPk },
        ];
        const bobCosigners = [
            { pk: alicePk },
            { pk: bobPk, sk: bobSk },
            { pk: carolPk },
        ];
        const carolCosigners = [
            { pk: alicePk },
            { pk: bobPk },
            { pk: carolPk, sk: carolSk },
        ];

        const aliceWallet = MultisigWallet.fromCosigners(
            aliceCosigners,
            2,
            chronik,
        );
        const bobWallet = MultisigWallet.fromCosigners(
            bobCosigners,
            2,
            chronik,
        );
        const carolWallet = MultisigWallet.fromCosigners(
            carolCosigners,
            2,
            chronik,
        );

        expect(aliceWallet.address).to.equal(bobWallet.address);
        expect(aliceWallet.address).to.equal(carolWallet.address);
        expect(bobWallet.script.toHex()).to.equal(carolWallet.script.toHex());

        await runner.sendToScript(1_000_000n, aliceWallet.script);
        await aliceWallet.sync();
        await bobWallet.sync();

        const aliceBuilt = aliceWallet
            .action({
                outputs: [{ script: MOCK_DESTINATION_SCRIPT, sats: 1000n }],
            })
            .build();

        expect(aliceBuilt.txs[0].isFullySignedMultisig()).to.equal(false);

        await expect(
            aliceBuilt.broadcast(),
            'partial tx must not broadcast',
        ).to.be.rejectedWith(/not fully signed/i);

        const partialHex = toHex(aliceBuilt.txs[0].ser());
        const fullySignedBuilt = bobWallet.signPartialTx(partialHex);
        expect(fullySignedBuilt.txs[0].isFullySignedMultisig()).to.equal(true);
        expect(() =>
            bobWallet.signPartialTx(toHex(fullySignedBuilt.txs[0].ser())),
        ).to.throw(/already fully signed/i);

        const { broadcasted } = await fullySignedBuilt.broadcast();
        const tx = await chronik.tx(broadcasted[0]);
        expect(tx.outputs[0].sats).to.equal(1000n);
    });

    it('rejects chained actions (p2shInputData)', async () => {
        const ecc = new Ecc();
        const aliceSk = fromHex('22'.repeat(32));
        const bobSk = fromHex('33'.repeat(32));
        const carolSk = fromHex('aa'.repeat(32));
        const alicePk = ecc.derivePubkey(aliceSk);
        const bobPk = ecc.derivePubkey(bobSk);
        const carolPk = ecc.derivePubkey(carolSk);

        const aliceCosigners = [
            { pk: alicePk, sk: aliceSk },
            { pk: bobPk },
            { pk: carolPk },
        ];
        const aliceWallet = MultisigWallet.fromCosigners(
            aliceCosigners,
            2,
            chronik,
        );

        await runner.sendToScript(1_000_000n, aliceWallet.script);
        await aliceWallet.sync();

        const chainedAction: payment.Action = {
            outputs: [{ script: MOCK_DESTINATION_SCRIPT, sats: 1000n }],
            p2shInputData: {
                lokad: strToBytes('MS01'),
                data: strToBytes('test'),
            },
        };

        expect(() => aliceWallet.action(chainedAction).build()).to.throw(
            /MultisigWallet does not support chained transactions/,
        );
    });

    /**
     * ALP on 2-of-3: each step is built by one cosigner, serialized to raw hex (no PSBT),
     * deserialized by the partner who adds the second ECDSA signature and broadcasts.
     * We alternate who builds the partial tx so both signers "lead" a round on the wire.
     */
    it('ALP genesis, mint, send, burn with raw-hex handoff between cosigners', async () => {
        const ecc = new Ecc();
        const aliceSk = fromHex('f0'.repeat(32));
        const bobSk = fromHex('f1'.repeat(32));
        const carolSk = fromHex('f2'.repeat(32));
        const alicePk = ecc.derivePubkey(aliceSk);
        const bobPk = ecc.derivePubkey(bobSk);
        const carolPk = ecc.derivePubkey(carolSk);

        const aliceCosigners = [
            { pk: alicePk, sk: aliceSk },
            { pk: bobPk },
            { pk: carolPk },
        ];
        const bobCosigners = [
            { pk: alicePk },
            { pk: bobPk, sk: bobSk },
            { pk: carolPk },
        ];
        /** Carol’s device: only she holds sk; used for Alice+Carol / Bob+Carol signing rounds */
        const carolSignerCosigners = [
            { pk: alicePk },
            { pk: bobPk },
            { pk: carolPk, sk: carolSk },
        ];

        const aliceWallet = MultisigWallet.fromCosigners(
            aliceCosigners,
            2,
            chronik,
        );
        const bobWallet = MultisigWallet.fromCosigners(
            bobCosigners,
            2,
            chronik,
        );
        const carolWallet = MultisigWallet.fromCosigners(
            carolSignerCosigners,
            2,
            chronik,
        );

        expect(aliceWallet.address).to.equal(bobWallet.address);
        expect(aliceWallet.address).to.equal(carolWallet.address);

        await runner.sendToScript(3_000_000n, aliceWallet.script);
        await aliceWallet.sync();
        await bobWallet.sync();
        await carolWallet.sync();

        const genesisQty = 1000n;
        const mintQty = 200n;
        const sendQty = 100n;
        const burnQty = genesisQty + mintQty - sendQty;

        const genesisInfo = {
            tokenTicker: 'MS',
            tokenName: 'Multisig ALP',
            url: 'test.com',
            decimals: 0,
            authPubkey: toHex(alicePk),
        };

        const genesisAction: payment.Action = {
            outputs: [
                { sats: 0n },
                {
                    sats: 546n,
                    script: aliceWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisQty,
                },
                {
                    sats: 546n,
                    script: aliceWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    genesisInfo,
                },
            ],
        };

        let hexOnWire = toHex(
            aliceWallet.action(genesisAction).build().txs[0].ser(),
        );
        const { broadcasted } = await bobWallet
            .signPartialTx(hexOnWire)
            .broadcast();
        const tokenId = broadcasted[0];
        expect((await chronik.token(tokenId)).tokenType.type).to.equal(
            'ALP_TOKEN_TYPE_STANDARD',
        );

        await aliceWallet.sync();
        await bobWallet.sync();
        await carolWallet.sync();

        const mintAction: payment.Action = {
            outputs: [
                { sats: 0n },
                {
                    sats: 546n,
                    script: aliceWallet.script,
                    tokenId,
                    atoms: mintQty,
                },
                {
                    sats: 546n,
                    script: aliceWallet.script,
                    tokenId,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                { type: 'MINT', tokenId, tokenType: ALP_TOKEN_TYPE_STANDARD },
            ],
        };

        hexOnWire = toHex(bobWallet.action(mintAction).build().txs[0].ser());
        await aliceWallet.signPartialTx(hexOnWire).broadcast();

        await aliceWallet.sync();
        await bobWallet.sync();
        await carolWallet.sync();

        const sendAction: payment.Action = {
            outputs: [
                { sats: 0n },
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId,
                    atoms: sendQty,
                },
            ],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        hexOnWire = toHex(aliceWallet.action(sendAction).build().txs[0].ser());
        const { broadcasted: sendBroadcasted } = await bobWallet
            .signPartialTx(hexOnWire)
            .broadcast();
        const sendTx = await chronik.tx(sendBroadcasted[0]);
        expect(sendTx.tokenEntries[0].txType).to.equal('SEND');

        await aliceWallet.sync();
        await bobWallet.sync();
        await carolWallet.sync();

        const burnAction: payment.Action = {
            outputs: [{ sats: 0n }],
            tokenActions: [
                {
                    type: 'BURN',
                    tokenId,
                    burnAtoms: burnQty,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        hexOnWire = toHex(bobWallet.action(burnAction).build().txs[0].ser());
        const { broadcasted: burnBroadcasted } = await aliceWallet
            .signPartialTx(hexOnWire)
            .broadcast();
        const burnTx = await chronik.tx(burnBroadcasted[0]);
        expect(burnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(burnQty);

        /**
         * Carol did not sign genesis / first mint / send / first burn (only Alice↔Bob).
         * Here: extra MINT with Alice → Carol on the wire, then BURN with Bob → Carol.
         */
        const extraMintQty = 300n;
        const mintAliceCarolAction: payment.Action = {
            outputs: [
                { sats: 0n },
                {
                    sats: 546n,
                    script: aliceWallet.script,
                    tokenId,
                    atoms: extraMintQty,
                },
                {
                    sats: 546n,
                    script: aliceWallet.script,
                    tokenId,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                { type: 'MINT', tokenId, tokenType: ALP_TOKEN_TYPE_STANDARD },
            ],
        };

        await aliceWallet.sync();
        await bobWallet.sync();
        await carolWallet.sync();

        hexOnWire = toHex(
            aliceWallet.action(mintAliceCarolAction).build().txs[0].ser(),
        );
        await carolWallet.signPartialTx(hexOnWire).broadcast();

        await aliceWallet.sync();
        await bobWallet.sync();
        await carolWallet.sync();

        const burnBobCarolAction: payment.Action = {
            outputs: [{ sats: 0n }],
            tokenActions: [
                {
                    type: 'BURN',
                    tokenId,
                    burnAtoms: extraMintQty,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        hexOnWire = toHex(
            bobWallet.action(burnBobCarolAction).build().txs[0].ser(),
        );
        const { broadcasted: burnBobCarolBroadcasted } = await carolWallet
            .signPartialTx(hexOnWire)
            .broadcast();
        const burnBobCarolTx = await chronik.tx(burnBobCarolBroadcasted[0]);
        expect(burnBobCarolTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnBobCarolTx.tokenEntries[0].actualBurnAtoms).to.equal(
            extraMintQty,
        );
    });

    /**
     * ALP: non-HD P2PKH does GENESIS, then SEND all fungible + MINT that moves the mint baton to
     * 2-of-3 P2SH (minimal new atoms so the baton can be spent via MINT). Multisig cosigners mint
     * more and burn part of the supply via raw-hex handoff.
     */
    it('ALP: P2PKH genesis, migrate token+baton to multisig, multisig mint and burn', async () => {
        const ecc = new Ecc();
        const p2pkhSk = fromHex('b3'.repeat(32));
        const aliceSk = fromHex('b4'.repeat(32));
        const bobSk = fromHex('b5'.repeat(32));
        const carolSk = fromHex('b6'.repeat(32));
        const alicePk = ecc.derivePubkey(aliceSk);
        const bobPk = ecc.derivePubkey(bobSk);
        const carolPk = ecc.derivePubkey(carolSk);

        const p2pkhWallet = Wallet.fromSk(p2pkhSk, chronik);
        const aliceWallet = MultisigWallet.fromCosigners(
            [{ pk: alicePk, sk: aliceSk }, { pk: bobPk }, { pk: carolPk }],
            2,
            chronik,
        );
        const bobWallet = MultisigWallet.fromCosigners(
            [{ pk: alicePk }, { pk: bobPk, sk: bobSk }, { pk: carolPk }],
            2,
            chronik,
        );

        await runner.sendToScript(4_000_000n, p2pkhWallet.script);
        await runner.sendToScript(3_000_000n, aliceWallet.script);
        await p2pkhWallet.sync();
        await aliceWallet.sync();
        await bobWallet.sync();

        const genesisQty = 1000n;
        /** Minimal new mint to satisfy MINT while relocating baton from P2PKH to P2SH */
        const relocateMintQty = 1n;
        const multisigMintQty = 250n;
        const burnQty = 400n;

        const genesisInfo = {
            tokenTicker: 'MIG',
            tokenName: 'Migrate to multisig',
            url: 'test.com',
            decimals: 0,
            authPubkey: toHex(p2pkhWallet.pk),
        };

        const { broadcasted: genBroadcasted } = await p2pkhWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 546n,
                        script: p2pkhWallet.script,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        atoms: genesisQty,
                    },
                    {
                        sats: 546n,
                        script: p2pkhWallet.script,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        isMintBaton: true,
                        atoms: 0n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        genesisInfo,
                    },
                ],
            })
            .build()
            .broadcast();

        const tokenId = genBroadcasted[0];
        expect((await chronik.token(tokenId)).tokenType.type).to.equal(
            'ALP_TOKEN_TYPE_STANDARD',
        );

        await p2pkhWallet.sync();

        await p2pkhWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 546n,
                        script: aliceWallet.script,
                        tokenId,
                        atoms: genesisQty,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ],
            })
            .build()
            .broadcast();

        await p2pkhWallet.sync();

        /**
         * ALP MINT spends the baton UTXO and assigns new token outputs + baton per `outputs`.
         * This is not a SEND: fungible balance was already moved in the prior SEND. Here the
         * wallet only increases supply by `relocateMintQty` and parks both that mint and the
         * new baton on the multisig script.
         */
        const { broadcasted: relocateMintTxids } = await p2pkhWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 546n,
                        script: aliceWallet.script,
                        tokenId,
                        atoms: relocateMintQty,
                    },
                    {
                        sats: 546n,
                        script: aliceWallet.script,
                        tokenId,
                        isMintBaton: true,
                        atoms: 0n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'MINT',
                        tokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ],
            })
            .build()
            .broadcast();

        const relocateMintTx = await chronik.tx(relocateMintTxids[0]);
        expect(relocateMintTx.tokenEntries).to.have.length(1);
        expect(relocateMintTx.tokenEntries[0].txType).to.equal('MINT');
        expect(relocateMintTx.tokenEntries[0].tokenId).to.equal(tokenId);
        expect(relocateMintTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(relocateMintTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            0n,
        );
        expect(relocateMintTx.tokenEntries[0].burnsMintBatons).to.equal(false);
        expect(relocateMintTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        const msScriptHex = aliceWallet.script.toHex();
        expect(relocateMintTx.outputs[1].outputScript).to.equal(msScriptHex);
        expect(relocateMintTx.outputs[1].token?.atoms).to.equal(
            relocateMintQty,
        );
        expect(relocateMintTx.outputs[1].token?.isMintBaton).to.equal(false);
        expect(relocateMintTx.outputs[2].outputScript).to.equal(msScriptHex);
        expect(relocateMintTx.outputs[2].token?.isMintBaton).to.equal(true);

        await p2pkhWallet.sync();
        await aliceWallet.sync();
        await bobWallet.sync();

        const mintBatons = (
            await chronik.tokenId(tokenId).utxos()
        ).utxos.filter(u => u.token?.isMintBaton);
        expect(
            mintBatons.some(u => u.script === aliceWallet.script.toHex()),
        ).to.equal(true);

        const supplyAfterMigrate = (
            await chronik.tokenId(tokenId).utxos()
        ).utxos
            .map(u => u.token?.atoms ?? 0n)
            .reduce((a, b) => a + b, 0n);
        expect(supplyAfterMigrate).to.equal(genesisQty + relocateMintQty);

        let hexOnWire = toHex(
            aliceWallet
                .action({
                    outputs: [
                        { sats: 0n },
                        {
                            sats: 546n,
                            script: aliceWallet.script,
                            tokenId,
                            atoms: multisigMintQty,
                        },
                        {
                            sats: 546n,
                            script: aliceWallet.script,
                            tokenId,
                            isMintBaton: true,
                            atoms: 0n,
                        },
                    ],
                    tokenActions: [
                        {
                            type: 'MINT',
                            tokenId,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                    ],
                })
                .build()
                .txs[0].ser(),
        );
        await bobWallet.signPartialTx(hexOnWire).broadcast();

        await aliceWallet.sync();
        await bobWallet.sync();

        const supplyAfterMultisigMint = (
            await chronik.tokenId(tokenId).utxos()
        ).utxos
            .map(u => u.token?.atoms ?? 0n)
            .reduce((a, b) => a + b, 0n);
        expect(supplyAfterMultisigMint).to.equal(
            genesisQty + relocateMintQty + multisigMintQty,
        );

        hexOnWire = toHex(
            bobWallet
                .action({
                    outputs: [{ sats: 0n }],
                    tokenActions: [
                        {
                            type: 'BURN',
                            tokenId,
                            burnAtoms: burnQty,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                    ],
                })
                .build()
                .txs[0].ser(),
        );
        const { broadcasted: burnIds } = await aliceWallet
            .signPartialTx(hexOnWire)
            .broadcast();
        const burnTx = await chronik.tx(burnIds[0]);
        expect(burnTx.tokenEntries[0].txType).to.equal('SEND');
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(burnQty);
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(burnQty);

        const supplyFinal = (await chronik.tokenId(tokenId).utxos()).utxos
            .map(u => u.token?.atoms ?? 0n)
            .reduce((a, b) => a + b, 0n);
        expect(supplyFinal).to.equal(
            genesisQty + relocateMintQty + multisigMintQty - burnQty,
        );
    });
});
