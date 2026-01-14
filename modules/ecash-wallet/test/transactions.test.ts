// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * transactions.test.ts
 *
 * Build and broadcast eCash txs using the ecash-wallet lib and regtest
 * Confirm validity of txs using chronik and chronik-client
 */

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    Address,
    DEFAULT_DUST_SATS,
    Script,
    toHex,
    fromHex,
    TxOutput,
    SLP_MAX_SEND_OUTPUTS,
    ALP_POLICY_MAX_OUTPUTS,
    OP_RETURN_MAX_BYTES,
    payment,
    SLP_TOKEN_TYPE_FUNGIBLE,
    ALP_TOKEN_TYPE_STANDARD,
    SLP_TOKEN_TYPE_MINT_VAULT,
    SLP_TOKEN_TYPE_NFT1_GROUP,
    SLP_TOKEN_TYPE_NFT1_CHILD,
    ALL_BIP143,
    MAX_TX_SERSIZE,
    OP_RETURN,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Wallet } from '../src/wallet';
import { GENESIS_TOKEN_ID_PLACEHOLDER } from 'ecash-lib/dist/payment';

use(chaiAsPromised);

// Configure available satoshis
const NUM_COINS = 500;
const COIN_VALUE = 1100000000n;

const MOCK_DESTINATION_ADDRESS = Address.p2pkh('deadbeef'.repeat(5)).toString();
const MOCK_DESTINATION_SCRIPT = Script.fromAddress(MOCK_DESTINATION_ADDRESS);

// Discovered through empirical testing
const MAX_P2PKH_OUTPUTS_FOR_SINGLE_TX_SIZE_BROADCAST_LIMIT_AND_ONE_INPUT = 2935;

// Helper function
const getDustOutputs = (count: number) => {
    const outputs: TxOutput[] = [];
    for (let i = 0; i < count; i++) {
        // Convert integer to hex string (without '0x' prefix)
        let hex = i.toString(16);

        // Pad with leading zeros to 40 characters (20 bytes)
        // NB we assume the number is less than 40 bytes, i.e. < 0xffffffffffffffffffffffffffffffffffffffff
        hex = hex.padStart(40, '0');

        const script = Script.p2pkh(fromHex(hex));
        outputs.push({ script, sats: DEFAULT_DUST_SATS });
    }
    return outputs;
};

describe('Wallet can build and broadcast on regtest', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        // Setup using ecash-agora_base so we have agora plugin available
        // ecash-wallet will support agora txs
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    it('We can send an eCash tx to a single recipient or multiple recipients', async () => {
        // Init the wallet
        const testWallet = Wallet.fromSk(fromHex('12'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, testWallet.script);

        // Sync the wallet
        await testWallet.sync();

        // We can send a tx to a single recipient
        const sendSats = 546n;
        const resp = await testWallet
            .action({
                outputs: [
                    {
                        script: MOCK_DESTINATION_SCRIPT,
                        sats: sendSats,
                    },
                ],
            })
            .build()
            .broadcast();

        const firstTxid = resp.broadcasted[0];

        expect(firstTxid).to.equal(
            'c979983f62cb14ea449dec2982fd34ab2cac522634f38ce4b0cd32601ef05047',
        );

        // We can check chronik and see that the tx had change added automatically
        const firstTx = await chronik.tx(firstTxid);
        expect(firstTx.size).to.equal(219);

        // The tx was sent with default params so fee expected to be 1000 sats per kb
        // inputSats = outputSats + fee
        // inputSats = (sendSats + changeSats) + fee
        // changeSats = inputSats - sendSats - fee
        const expectedChange = inputSats - sendSats - BigInt(firstTx.size);
        expect(firstTx.outputs[1].sats).to.equal(expectedChange);

        // We can send to multiple recipients
        const OUTPUTS_TO_TEST = 12;
        const dozenOutputs = getDustOutputs(OUTPUTS_TO_TEST);

        const respTwo = await testWallet
            .action({
                outputs: dozenOutputs,
            })
            .build()
            .broadcast();

        const secondTxid = respTwo.broadcasted[0];

        expect(secondTxid).to.equal(
            'a62b0564fcefa5e3fc857e8ad90a408c00421608d7fdc3d13f335a52f29b3fc8',
        );

        // We can go on to broadcast XEC in a chained tx to so many outputs that it would exceed the
        // broadcast size limit of a single tx

        // Send more sats to the wallet so we can afford this
        await runner.sendToScript(10_000_000_00n, testWallet.script);

        // We got 2,936 by iteratively testing what number of outputs will be "just over" the max size in this case
        const willNeedChainedTxOutputCount = getDustOutputs(
            MAX_P2PKH_OUTPUTS_FOR_SINGLE_TX_SIZE_BROADCAST_LIMIT_AND_ONE_INPUT +
                1,
        );

        // We DO NOT get a size error if we build and do not broadcast
        await testWallet.sync();
        const builtOversized = testWallet
            .action({
                outputs: willNeedChainedTxOutputCount,
            })
            .build();

        // We get 2 txs in this chain
        expect(builtOversized.builtTxs).to.have.length(2);

        // Both are under the max size
        expect(builtOversized.builtTxs[0].size()).to.equal(99977);
        expect(builtOversized.builtTxs[1].size()).to.equal(219);

        // We can broadcast the txs
        const chainedTxBroadcastResult = await builtOversized.broadcast();
        expect(chainedTxBroadcastResult.success).to.equal(true);
        expect(chainedTxBroadcastResult.broadcasted).to.have.length(2);
    });
    it('We can send a chained eCash tx to cover outputs that would create create a tx exceeding the broadcast limit', async () => {
        // Init the wallet
        const testWallet = Wallet.fromSk(fromHex('19'.repeat(32)), chronik);

        // Send 1M
        await runner.sendToScript(8_000_000n, testWallet.script);

        const willNeedChainedTxOutputCount = getDustOutputs(
            MAX_P2PKH_OUTPUTS_FOR_SINGLE_TX_SIZE_BROADCAST_LIMIT_AND_ONE_INPUT +
                1,
        );

        // If we do not have the utxos to even cover one tx, we throw the usual msg
        // Build without syncing to check
        expect(() =>
            testWallet
                .action({
                    outputs: willNeedChainedTxOutputCount,
                })
                .build(),
        ).to.throw(
            Error,
            `Insufficient sats to complete tx. Need 1603056 additional satoshis to complete this Action.`,
        );

        // Sync this time
        await testWallet.sync();
        const builtOversized = testWallet
            .action({
                outputs: willNeedChainedTxOutputCount,
            })
            .build();

        // We get 2 txs in this chain
        expect(builtOversized.builtTxs).to.have.length(2);

        // Both are under the max size
        expect(builtOversized.builtTxs[0].size()).to.equal(99977);
        expect(builtOversized.builtTxs[1].size()).to.equal(219);

        // We can broadcast the txs
        const chainedTxBroadcastResult = await builtOversized.broadcast();
        expect(chainedTxBroadcastResult.success).to.equal(true);
        expect(chainedTxBroadcastResult.broadcasted).to.have.length(2);

        // The chained tx covers all outputs from the initial action, though they are not at the same outIdx after the chained outputs
        const chainTxAlpha = await chronik.tx(
            chainedTxBroadcastResult.broadcasted[0],
        );
        const chainTxBeta = await chronik.tx(
            chainedTxBroadcastResult.broadcasted[1],
        );
        const allOutputsInChain = [
            ...chainTxAlpha.outputs,
            ...chainTxBeta.outputs,
        ];

        // All of the action-requested outputs are in the chained txs that executed the action
        for (const requestedOutput of willNeedChainedTxOutputCount) {
            const outputInChain = allOutputsInChain.find(
                o => o.outputScript === requestedOutput.script.toHex(),
            );
            expect(outputInChain).to.not.equal(undefined);
            expect(outputInChain!.sats).to.equal(requestedOutput.sats);
        }

        // The chained tx had all requested outputs, plus
        // +1 for user change
        // +1 for the input of the 2nd required tx
        expect(allOutputsInChain).to.have.length(
            willNeedChainedTxOutputCount.length + 2,
        );
    });
    it('We throw expected error if we can cover the outputs of an action that must be sent with chainedTxs but not the fee of such a tx', async () => {
        // Init the wallet
        const testWallet = Wallet.fromSk(fromHex('20'.repeat(32)), chronik);

        // We choose the exact amount where we could cover a theoretical tx with too many outputs in one tx,
        // but are unable to afford the marginal cost of chaining the action, i.e. the additional tx fees required
        // for multiple txs
        // Got this number through iteratively testing
        await runner.sendToScript(8701019n, testWallet.script);

        // Use many inputs so that the marginal fee of the chained tx is greater than dust, in this case it is 833 sats
        const willNeedChainedTxOutputCount = getDustOutputs(15000);

        // If we do not have the utxos to even cover one tx, we throw the usual msg
        // Build without syncing to scheck
        expect(() =>
            testWallet
                .action({
                    outputs: willNeedChainedTxOutputCount,
                })
                .build(),
        ).to.throw(
            Error,
            `Insufficient sats to complete tx. Need 8190000 additional satoshis to complete this Action.`,
        );

        // If we have enough utxos to cover the standard tx but not the chained tx, we throw
        await testWallet.sync();
        expect(() =>
            testWallet
                .action({
                    outputs: willNeedChainedTxOutputCount,
                })
                .build(),
        ).to.throw(
            Error,
            `Insufficient input sats (8701019) to complete required chained tx output sats`,
        );
    });
    it('We can send a large chained tx with more than 3 txs', async () => {
        // Init the wallet
        const testWallet = Wallet.fromSk(fromHex('20'.repeat(32)), chronik);

        // 1M XEC
        await runner.sendToScript(100000000n, testWallet.script);

        // Enough inputs so we need > 3 txs
        const willNeedChainedTxOutputCount = getDustOutputs(15000);

        // Send it
        await testWallet.sync();
        const result = await testWallet
            .action({
                outputs: willNeedChainedTxOutputCount,
            })
            .build()
            .broadcast();
        expect(result.success).to.equal(true);
    });
    it('We can broadcast a tx that is exactly MAX_TX_SERSIZE', async () => {
        // Init the wallet
        const testWallet = Wallet.fromSk(fromHex('21'.repeat(32)), chronik);

        // Send 10M XEC to the wallet (in fact, this is not enough to cover our tx)
        await runner.sendToScript(10_800_000_00n, testWallet.script);

        // Create the max outputs for a p2pkh one-input tx, XEC only, under broadcast size limit
        const maxOutputsOnSingleTxUnderBroadcastSizeLimit = getDustOutputs(
            MAX_P2PKH_OUTPUTS_FOR_SINGLE_TX_SIZE_BROADCAST_LIMIT_AND_ONE_INPUT,
        );

        // Confirm this tx will be broadcast with a single tx
        await testWallet.sync();
        const builtSingleTx = testWallet
            .action({
                outputs: maxOutputsOnSingleTxUnderBroadcastSizeLimit,
            })
            .build();
        expect(builtSingleTx.builtTxs).to.have.length(1);
        expect(builtSingleTx.builtTxs[0].size()).to.equal(99977);

        // Well let's add an OP_RETURN that will make this tx the EXACT size of the broadcast limit
        const EXTRA_MARGINAL_BYTES_FOR_OP_RETURN_AND_OUTPUT = 10; // guess and check
        const opReturnOutput = {
            sats: 0n,
            script: new Script(
                new Uint8Array([
                    OP_RETURN,
                    ...Array(
                        MAX_TX_SERSIZE -
                            99977 -
                            EXTRA_MARGINAL_BYTES_FOR_OP_RETURN_AND_OUTPUT,
                    ).fill(0),
                ]),
            ),
        };

        // OP_RETURN is 14 bytes, its impact on the tx is +23 bytes
        expect(opReturnOutput.script.toHex()).to.equal(
            '6a00000000000000000000000000',
        );
        await testWallet.sync();
        const exactLimitBroadcasted = await testWallet
            .action({
                outputs: [
                    opReturnOutput,
                    ...maxOutputsOnSingleTxUnderBroadcastSizeLimit,
                ],
            })
            .build()
            .broadcast();

        // We have a single tx here that is exactly MAX_TX_SERSIZE
        expect(exactLimitBroadcasted.broadcasted).to.have.length(1);

        // We have the OP_RETURN
        const tx = await chronik.tx(exactLimitBroadcasted.broadcasted[0]);
        expect(tx.outputs[0].outputScript).to.equal(
            opReturnOutput.script.toHex(),
        );
    });
    it('If an OP_RETURN field pushes a tx over MAX_TX_SERSIZE, we can handle with a chained tx', async () => {
        // Init the wallet
        const testWallet = Wallet.fromSk(fromHex('22'.repeat(32)), chronik);

        // Send 10M XEC to the wallet (in fact, this is not enough to cover our tx)
        await runner.sendToScript(10_800_000_00n, testWallet.script);

        // Create the max outputs for a p2pkh one-input tx, XEC only, under broadcast size limit
        const maxOutputsOnSingleTxUnderBroadcastSizeLimit = getDustOutputs(
            MAX_P2PKH_OUTPUTS_FOR_SINGLE_TX_SIZE_BROADCAST_LIMIT_AND_ONE_INPUT,
        );

        // Confirm this tx will be broadcast with a single tx
        await testWallet.sync();
        const builtSingleTx = testWallet
            .action({
                outputs: maxOutputsOnSingleTxUnderBroadcastSizeLimit,
            })
            .build();
        expect(builtSingleTx.builtTxs).to.have.length(1);
        expect(builtSingleTx.builtTxs[0].size()).to.equal(99977);

        // Well let's add an OP_RETURN that will make this tx the EXACT size of the broadcast limit
        const EXTRA_MARGINAL_BYTES_FOR_OP_RETURN_AND_OUTPUT = 10; // guess and check
        const opReturnOutput = {
            sats: 0n,
            script: new Script(
                new Uint8Array([
                    OP_RETURN,
                    ...Array(
                        MAX_TX_SERSIZE -
                            99977 -
                            EXTRA_MARGINAL_BYTES_FOR_OP_RETURN_AND_OUTPUT,
                    ).fill(0),
                ]),
            ),
        };

        // OP_RETURN is 14 bytes, its impact on the tx is +23 bytes
        expect(opReturnOutput.script.toHex()).to.equal(
            '6a00000000000000000000000000',
        );
        await testWallet.sync();
        const exactLimitBuiltTx = testWallet
            .action({
                outputs: [
                    opReturnOutput,
                    ...maxOutputsOnSingleTxUnderBroadcastSizeLimit,
                ],
            })
            .build();

        // We have a single tx here that is exactly MAX_TX_SERSIZE
        expect(exactLimitBuiltTx.builtTxs).to.have.length(1);
        expect(exactLimitBuiltTx.builtTxs[0].size()).to.equal(MAX_TX_SERSIZE);

        // OK well let's make the OP_RETURN a single byte longer
        const opReturnOutputTooLong = {
            sats: 0n,
            script: new Script(
                new Uint8Array([
                    OP_RETURN,
                    ...Array(
                        MAX_TX_SERSIZE -
                            99977 -
                            EXTRA_MARGINAL_BYTES_FOR_OP_RETURN_AND_OUTPUT +
                            1,
                    ).fill(0),
                ]),
            ),
        };
        expect(opReturnOutputTooLong.script.toHex()).to.equal(
            '6a0000000000000000000000000000',
        );
        await testWallet.sync();

        const oneByteTooLargeBroadcasted = await testWallet
            .action({
                outputs: [
                    opReturnOutputTooLong,
                    ...maxOutputsOnSingleTxUnderBroadcastSizeLimit,
                ],
            })
            .build()
            .broadcast();
        expect(oneByteTooLargeBroadcasted.broadcasted).to.have.length(2);

        // We have the OP_RETURN in the first tx
        const opReturnTx = await chronik.tx(
            oneByteTooLargeBroadcasted.broadcasted[0],
        );
        expect(opReturnTx.outputs[0].outputScript).to.equal(
            opReturnOutputTooLong.script.toHex(),
        );

        // But not the second
        const chainTxOmegaTx = await chronik.tx(
            oneByteTooLargeBroadcasted.broadcasted[1],
        );
        expect(chainTxOmegaTx.outputs[0].outputScript).to.equal(
            '76a9140000000000000000000000000000000000000b7588ac',
        );
    });
    it('We can handle a chained tx with exactly enough outputs that a 3rd tx is required', async () => {
        // Init the wallet
        const testWallet = Wallet.fromSk(fromHex('23'.repeat(32)), chronik);

        // Send 10M XEC
        await runner.sendToScript(10_000_000_00n, testWallet.script);

        // Iteratively discovered, this is true for 2 txs that each have 1 p2pkh input, all outputs p2pkh, no OP_RETURN
        const exactlyEnoughOutputsForThreeMaxSizeTxs = 5870;

        const exactlyEnoughOutputsForTwoMaxSizeTxs = getDustOutputs(
            exactlyEnoughOutputsForThreeMaxSizeTxs,
        );

        // Sync this time
        await testWallet.sync();
        const twoFullTxsBuilt = testWallet
            .clone()
            .action({
                outputs: exactlyEnoughOutputsForTwoMaxSizeTxs,
            })
            .build();

        // We get 2 txs in this chain
        expect(twoFullTxsBuilt.builtTxs).to.have.length(2);

        // Both are JUST under the max size
        expect(twoFullTxsBuilt.builtTxs[0].size()).to.equal(99977);
        expect(twoFullTxsBuilt.builtTxs[1].size()).to.equal(99977);

        const exactlyEnoughOutputsForAThirdTx = getDustOutputs(
            exactlyEnoughOutputsForThreeMaxSizeTxs + 1,
        );

        // Let's add just one more output
        await testWallet.sync();
        const threeTxsBuilt = testWallet
            .action({
                outputs: exactlyEnoughOutputsForAThirdTx,
            })
            .build();
        // We get 2 txs in this chain
        expect(threeTxsBuilt.builtTxs).to.have.length(3);

        // Both are JUST under the max size
        expect(threeTxsBuilt.builtTxs[0].size()).to.equal(99977);
        expect(threeTxsBuilt.builtTxs[1].size()).to.equal(99977);
        expect(threeTxsBuilt.builtTxs[2].size()).to.equal(219);

        // We can broadcast the txs
        const chainedTxBroadcastResult = await threeTxsBuilt.broadcast();
        expect(chainedTxBroadcastResult.success).to.equal(true);
        expect(chainedTxBroadcastResult.broadcasted).to.have.length(3);

        // The last tx has 2 outputs, because when we added one more output to total actions, we needed another chain tx, and we had
        // to make room for that by using a change output in the second tx which was no longer chainTxOmega
        const chainTxOmega = await chronik.tx(
            chainedTxBroadcastResult.broadcasted[2],
        );
        expect(chainTxOmega.inputs.length).to.equal(1);
        expect(chainTxOmega.outputs.length).to.equal(2);
    });
    it('We can handle SLP SLP_TOKEN_TYPE_FUNGIBLE token actions', async () => {
        // Init the wallet
        const slpWallet = Wallet.fromSk(fromHex('13'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, slpWallet.script);

        // Sync the wallet
        await slpWallet.sync();

        // We can mint a fungible token with a mint baton
        const slpGenesisInfo = {
            tokenTicker: 'SLP',
            tokenName: 'SLP Test Token',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 1_000n;

        // Construct the Action for this tx
        const slpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: slpWallet.script,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    genesisInfo: slpGenesisInfo,
                },
            ],
        };

        // Build and broadcast
        const resp = await slpWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const slpGenesisTokenId = resp.broadcasted[0];

        // It's a valid SLP genesis tx
        const tokenInfo = await chronik.token(slpGenesisTokenId);
        expect(tokenInfo.tokenType.type).to.equal('SLP_TOKEN_TYPE_FUNGIBLE');

        // We can get token supply from checking utxos
        const supply = (await chronik.tokenId(slpGenesisTokenId).utxos()).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(supply).to.equal(genesisMintQty);

        // We can mint more of our test token
        const extendedMintQuantity = 333n;

        // Construct the Action for this tx
        const slpMintAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 (same as GENESIS) per SLP spec */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: extendedMintQuantity,
                },
                /** Some normal outputs to show we can have a mint baton at an outIdx > 2 */
                { sats: 1000n, script: MOCK_DESTINATION_SCRIPT },
                { sats: 1001n, script: MOCK_DESTINATION_SCRIPT },
                { sats: 1002n, script: MOCK_DESTINATION_SCRIPT },
                /** Mint baton at outIdx 5, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'MINT',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        // Build and broadcast the MINT tx
        await slpWallet.action(slpMintAction).build().broadcast();

        // Token supply has increased by the mint amount
        const updatedSupply = (
            await chronik.tokenId(slpGenesisTokenId).utxos()
        ).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);

        expect(updatedSupply).to.equal(genesisMintQty + extendedMintQuantity);

        // Include SLP_MAX_SEND_OUTPUTS-1 outputs so we can (just) fit token change AND a leftover output
        const tokenSendOutputs: payment.PaymentOutput[] = [];
        for (let i = 1; i <= SLP_MAX_SEND_OUTPUTS - 1; i++) {
            tokenSendOutputs.push({
                sats: 546n,
                script: slpWallet.script,
                tokenId: slpGenesisTokenId,
                atoms: BigInt(i),
            });
        }

        // We can SEND our test token
        const slpSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-18
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        // Build and broadcast
        const sendResponse = await slpWallet
            .action(slpSendAction)
            .build()
            .broadcast();

        const slpSendTxid = sendResponse.broadcasted[0];

        const sendTx = await chronik.tx(slpSendTxid);
        expect(sendTx.tokenEntries).to.have.length(1);
        expect(sendTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We cannot burn an SLP amount that we do not have exact utxos for
        const burnAtomsThatDoNotMatchUtxos = 300n;
        const slpCannotBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms: burnAtomsThatDoNotMatchUtxos,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        const burnAtoms = 333n;
        const slpBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        // Build and broadcast
        const burnResponse = await slpWallet
            .action(slpBurnAction)
            .build()
            .broadcast();

        const burnTx = await chronik.tx(burnResponse.broadcasted[0]);
        expect(burnTx.tokenEntries).to.have.length(1);
        expect(burnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We can burn exact atoms that do not match an existing utxo with a chained tx
        const chainedBurn = await slpWallet
            .action(slpCannotBurnAction)
            .build()
            .broadcast();
        expect(chainedBurn.success).to.equal(true);
        expect(chainedBurn.broadcasted).to.have.length(2);

        const burnUtxoPrepTxid = chainedBurn.broadcasted[0];
        const chainedBurnTxid = chainedBurn.broadcasted[1];

        const burnUtxoPrepTx = await chronik.tx(burnUtxoPrepTxid);
        const chainedBurnTx = await chronik.tx(chainedBurnTxid);

        expect(burnUtxoPrepTx.tokenEntries).to.have.length(1);
        expect(burnUtxoPrepTx.tokenEntries[0].txType).to.equal('SEND');
        expect(burnUtxoPrepTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(burnUtxoPrepTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        expect(chainedBurnTx.tokenEntries).to.have.length(1);
        expect(chainedBurnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(chainedBurnTx.tokenEntries[0].actualBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(chainedBurnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        const slpSendActionTooManyOutputs: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-17
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
                // Add a single additional token output
                // We will try to add a token change output and this will be an output too far for spec
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: BigInt(1n),
                },
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        // If we build a TX that requires max spec outputs of SLP +1 due to requiring change, it will automatically be chained
        const chainedSendResponse = await slpWallet
            .action(slpSendActionTooManyOutputs)
            .build()
            .broadcast();
        expect(chainedSendResponse.success).to.equal(true);
        expect(chainedSendResponse.broadcasted).to.have.length(2);
    });
    it('We can handle ALP ALP_TOKEN_TYPE_STANDARD token actions', async () => {
        // Init the wallet
        const alpWallet = Wallet.fromSk(fromHex('14'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, alpWallet.script);

        // Sync the wallet
        await alpWallet.sync();

        // We can GENESIS a fungible token with multiple mint quantities and multiple mint batons
        const alpGenesisInfo = {
            tokenTicker: 'ALP',
            tokenName: 'ALP Test Token',
            url: 'cashtab.com',
            decimals: 0,
            /** ALP allows arbitrary data in genesis */
            data: 'deadbeef',
            authPubkey: toHex(alpWallet.pk),
        };

        const genesisMintQtyAlpha = 1_000n;
        const genesisMintQtyBeta = 2_000n;

        // Construct the Action for this tx
        const alpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Misc XEC output at outIdx 1, there is no spec req in ALP for genesis qty at outIdx 1 */
                { sats: 5_555n, script: alpWallet.script },
                /** Mint qty at outIdx 2 for a token we do not have */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQtyAlpha,
                },
                /** Another misc XEC output at outIdx 2, to show we support non-consecutive mint quantities */
                { sats: 3_333n, script: alpWallet.script },
                /** Mint qty at outIdx 3 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQtyBeta,
                },
                /**
                 * Another misc XEC output at outIdx 4, to show
                 * that mintBaton outIdx does not necessarily
                 * immediately follow mint qty */
                { sats: 5_555n, script: alpWallet.script },
                /** Mint baton at outIdx 5 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
                /** Another mint baton at outIdx 6 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    genesisInfo: alpGenesisInfo,
                },
            ],
        };

        // Build and broadcast
        const resp = await alpWallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const alpGenesisTokenId = resp.broadcasted[0];

        // It's a valid ALP genesis tx
        const tokenInfo = await chronik.token(alpGenesisTokenId);
        expect(tokenInfo.tokenType.type).to.equal('ALP_TOKEN_TYPE_STANDARD');

        // We can get token supply from checking utxos
        const supply = (await chronik.tokenId(alpGenesisTokenId).utxos()).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(supply).to.equal(genesisMintQtyAlpha + genesisMintQtyBeta);

        // We get the expected number of mint batons
        const alpTokenUtxos = await chronik.tokenId(alpGenesisTokenId).utxos();
        let numBatons = 0;
        alpTokenUtxos.utxos.forEach(tokenUtxo => {
            if (tokenUtxo.token?.isMintBaton) {
                numBatons += 1;
            }
        });
        expect(numBatons).to.equal(2);

        // We can mint more of our ALP test token
        // NB we cannot combine MINT with SEND for ALP txs
        // NB it would be on-spec to combine MINT with BURN for ALP,
        // but this is NOT supported by ecash-wallet as we would have to
        // provide exact-quantity utxos

        const extendedMintQuantityAlpha = 3_000n;
        const extendedMintQuantityBeta = 5_000n;

        // Construct the Action for this tx
        const alpMintAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    atoms: extendedMintQuantityAlpha,
                },
                /** A non-token output at outIdx 2 */
                { sats: 1000n, script: MOCK_DESTINATION_SCRIPT },
                /** Another mint qty at outIdx 3 as ALP supports multiple non-consecutive mint quantities */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    atoms: extendedMintQuantityBeta,
                },
                /** Some normal outputs to show we can have a mint baton anywhere later */
                { sats: 1001n, script: MOCK_DESTINATION_SCRIPT },
                { sats: 1002n, script: MOCK_DESTINATION_SCRIPT },
                /** Mint baton at outIdx 6 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    isMintBaton: true,
                    atoms: 0n,
                },
                /** Another mint baton at outIdx 7 because ALP lets you mint multiple mint batons */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** ALP mint action */ {
                    type: 'MINT',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast the MINT tx
        await alpWallet.action(alpMintAction).build().broadcast();

        // Token supply has increased by the mint amount
        const updatedSupply = (
            await chronik.tokenId(alpGenesisTokenId).utxos()
        ).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(updatedSupply).to.equal(
            genesisMintQtyAlpha +
                genesisMintQtyBeta +
                extendedMintQuantityAlpha +
                extendedMintQuantityBeta,
        );

        // Now we expect an additional mint baton
        const alpTokenUtxosAfterMint = await chronik
            .tokenId(alpGenesisTokenId)
            .utxos();
        let numBatonsNow = 0;
        alpTokenUtxosAfterMint.utxos.forEach(tokenUtxo => {
            if (tokenUtxo.token?.isMintBaton) {
                numBatonsNow += 1;
            }
        });
        expect(numBatonsNow).to.equal(numBatons + 1);

        // We can MINT and BURN the same tokenId ... if we want to for some reason
        const extendedMintQuantityDelta = 1n;

        // NB the burn qty must be exactly summable by inputs for a MINT + BURN, as we can not also have SEND for the same tokenId
        const burnAtomsWithMint = 1000n;

        // Construct the Action for this tx
        const alpMintandBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    atoms: extendedMintQuantityDelta,
                },
                /** Mint baton at outIdx 2 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    atoms: 0n,
                    isMintBaton: true,
                },
            ],
            tokenActions: [
                {
                    type: 'MINT',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                {
                    type: 'BURN',
                    tokenId: alpGenesisTokenId,
                    burnAtoms: burnAtomsWithMint,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast the MINT tx
        const mintBurn = await alpWallet
            .action(alpMintandBurnAction)
            .build()
            .broadcast();

        const mintAndBurnTx = await chronik.tx(mintBurn.broadcasted[0]);

        // This is a valid MINT and BURN tx
        expect(mintAndBurnTx.tokenEntries).to.have.length(1);
        expect(mintAndBurnTx.tokenEntries[0].txType).to.equal('MINT');
        expect(mintAndBurnTx.tokenEntries[0].actualBurnAtoms).to.equal(
            burnAtomsWithMint,
        );
        expect(mintAndBurnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            burnAtomsWithMint,
        );
        expect(mintAndBurnTx.tokenEntries[0].burnsMintBatons).to.equal(false);
        // I dunno if I would call this normal but I don't have a better idea
        expect(mintAndBurnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // Token supply has increased by the mint amount AND decreased by the burn amount 🤯
        const latestSupply = (
            await chronik.tokenId(alpGenesisTokenId).utxos()
        ).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(latestSupply).to.equal(
            updatedSupply + extendedMintQuantityDelta - burnAtomsWithMint,
        );

        // We can mint more, and also include a second genesis tx
        /**
         * TODO
         * [] Perhaps we should make minting 1 mint baton the DEFAULT
         *    condition. Could see it being pretty easy to accidentally
         *    NOT mint another baton, thereby burning (mb the only) baton
         */

        const extendedMintQuantityGamma = 5n;
        const alpGenesisBetaMintQty = 1000n;

        const alpGenesisInfoBeta = {
            tokenTicker: 'BETA',
            tokenName: 'ALP Test Token Beta',
            url: 'cashtab.com',
            decimals: 9,
            /** ALP allows arbitrary data in genesis */
            data: 'abadcafe',
            authPubkey: toHex(alpWallet.pk),
        };

        // Construct the Action for this tx
        const alpGenesisAndMintAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Genesis mint qty at outIdx 1*/
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: alpGenesisBetaMintQty,
                },
                /** NB no mint baton for this genesis */
                /** Mint qty for slpGenesisAlpha at outIdx 1*/
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    atoms: extendedMintQuantityGamma,
                },
                /** NB no mint baton for alpGenesisTokenId, so impact is we burn a mint baton */
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    genesisInfo: alpGenesisInfoBeta,
                },
                {
                    type: 'MINT',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast
        const genesisAndMintResp = await alpWallet
            .action(alpGenesisAndMintAction)
            .build()
            .broadcast();

        const alpGenesisTokenIdBeta = genesisAndMintResp.broadcasted[0];

        // It's a valid ALP genesis tx
        const tokenInfoBeta = await chronik.token(alpGenesisTokenIdBeta);
        expect(tokenInfoBeta.tokenType.type).to.equal(
            'ALP_TOKEN_TYPE_STANDARD',
        );

        // We can get token supply from checking utxos
        const tokenBetaSupply = (
            await chronik.tokenId(alpGenesisTokenIdBeta).utxos()
        ).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(tokenBetaSupply).to.equal(alpGenesisBetaMintQty);

        // We get the expected number of mint batons for the new token, 0
        // NB we burned a mint baton with this tx without specifying any burn instructions
        // [] TODO, we should throw an error for this condition
        const alpTokenUtxosBeta = await chronik
            .tokenId(alpGenesisTokenIdBeta)
            .utxos();
        let numBatonsBeta = 0;
        alpTokenUtxosBeta.utxos.forEach(tokenUtxo => {
            if (tokenUtxo.token?.isMintBaton) {
                numBatonsBeta += 1;
            }
        });
        expect(numBatonsBeta).to.equal(0);

        // We burned a mint baton for the first token
        const alpTokenUtxosAfterSecondMint = await chronik
            .tokenId(alpGenesisTokenId)
            .utxos();
        let numBatonsAfterBurn = 0;
        alpTokenUtxosAfterSecondMint.utxos.forEach(tokenUtxo => {
            if (tokenUtxo.token?.isMintBaton) {
                numBatonsAfterBurn += 1;
            }
        });
        expect(numBatonsAfterBurn).to.equal(numBatonsNow - 1);

        // We can send multiple tokens in the same tx

        // Note that we expect a change output for BOTH tokens
        // So lets only include TWO fewer outputs than ALP_POLICY_MAX_OUTPUTS
        const alpSendOutputs: payment.PaymentOutput[] = [];
        const EXPECTED_CHANGE_OUTPUTS = 2;
        for (
            let i = 1;
            i <= ALP_POLICY_MAX_OUTPUTS - EXPECTED_CHANGE_OUTPUTS;
            i++
        ) {
            alpSendOutputs.push({
                sats: 546n,
                script: MOCK_DESTINATION_SCRIPT,
                // mix of outputs for each token
                tokenId:
                    i % 2 === 0 ? alpGenesisTokenId : alpGenesisTokenIdBeta,
                atoms: BigInt(i),
            });
        }

        // We can SEND our test token
        const alpSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-27
                 * In this way, we expect token change
                 * at outIdx 29, the higest available outIdx
                 * for ALP token outputs
                 */
                ...alpSendOutputs,
            ],
            tokenActions: [
                /** ALP send action for first token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** ALP send action for 2nd token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenIdBeta,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast
        // Looks like this should work. After all, we will have 29 outputs.
        // But it won't, because we still have to push the 0 atoms into two atomsArrays
        // So we exceed the OP_RETURN
        expect(() =>
            alpWallet.clone().action(alpSendAction).build(ALL_BIP143),
        ).to.throw(
            Error,
            `Specified action results in OP_RETURN of 434 bytes, vs max allowed of ${OP_RETURN_MAX_BYTES}.`,
        );

        // Ok let's cull some outputs
        // Take the first 9 outputs. NB this will give us an OP_RETURN of 218 bytes
        const alpSendOutputsThatFit = alpSendOutputs.slice(0, 9);

        const alpSendActionThatWorks: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-9
                 * In this way, we expect token change
                 * at outIdx 10 and outIdx 11
                 *
                 * Not the highest available outIdx for ALP,
                 * but the highest available given a 223-byte
                 * OP_RETURN constraint
                 */
                ...alpSendOutputsThatFit,
            ],
            tokenActions: [
                /** ALP send action for first token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** ALP send action for 2nd token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenIdBeta,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        const alpSendResponse = await alpWallet
            .action(alpSendActionThatWorks)
            .build()
            .broadcast();

        const alpSendTxid = alpSendResponse.broadcasted[0];

        const sendTx = await chronik.tx(alpSendTxid);
        // We sent two tokens
        expect(sendTx.tokenEntries).to.have.length(2);
        expect(sendTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // Burn all of token 2 and some of token 1
        // We can build and broadcast an ALP BURN
        const alpGenesisTokenIdBurnAtoms = 10n;
        const alpGenesisTokenIdBetaBurnAtomsCannotBurnAll = 100n;

        // ecash-wallet infers a SEND action for ALP token change when exact atoms aren't available
        const alpDoubleBurn: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Specify a send for alpGenesisTokenId */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: alpGenesisTokenId,
                    atoms: 111n,
                },
                /**
                 * We don't specify any token SEND outputs
                 * for alpGenesisTokenIdBeta, since we
                 * want to just burn it
                 */
            ],
            tokenActions: [
                /** ALP send action for first token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** ALP burn action for 2nd token */
                {
                    type: 'BURN',
                    tokenId: alpGenesisTokenIdBeta,
                    burnAtoms: alpGenesisTokenIdBetaBurnAtomsCannotBurnAll,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                {
                    type: 'BURN',
                    tokenId: alpGenesisTokenId,
                    burnAtoms: alpGenesisTokenIdBurnAtoms,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast
        const burnResponse = await alpWallet
            .action(alpDoubleBurn)
            .build()
            .broadcast();

        const burnTx = await chronik.tx(burnResponse.broadcasted[0]);
        expect(burnTx.tokenEntries).to.have.length(2);
        expect(burnTx.tokenEntries[0].txType).to.equal('SEND');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(
            alpGenesisTokenIdBurnAtoms,
        );
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            alpGenesisTokenIdBurnAtoms,
        );
        expect(burnTx.tokenEntries[1].actualBurnAtoms).to.equal(
            alpGenesisTokenIdBetaBurnAtomsCannotBurnAll,
        );
        expect(burnTx.tokenEntries[1].intentionalBurnAtoms).to.equal(
            alpGenesisTokenIdBetaBurnAtomsCannotBurnAll,
        );
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We can get an error msg explaining token utxos we are missing, including mint batons
        const tokenWeDoNotHave = '11'.repeat(32);
        const outOfReachAlpAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Specify a send for alpGenesisTokenId, but more than we have */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: alpGenesisTokenId,
                    atoms: 1_000_000_000_000n,
                },
                /** Mint qty at outIdx 1, but no mint baton*/
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: tokenWeDoNotHave,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                {
                    type: 'MINT',
                    tokenId: tokenWeDoNotHave,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        expect(() =>
            alpWallet.clone().action(outOfReachAlpAction).build(ALL_BIP143),
        ).to.throw(
            Error,
            `Missing required token utxos: ${tokenWeDoNotHave} => Missing mint baton, ${alpGenesisTokenId} => Missing 999999990135 atoms`,
        );

        /**
         * Punchlist for regtest cases
         *
         * [] ALP burn mint baton - do we need to change the UX here?
         *    i.e. should we require the user to specify a burned mint baton?
         * [] SLP burn  mint baton
         */
    });
    it('We can handle SLP SLP_TOKEN_TYPE_MINT_VAULT token actions (GENESIS, SEND, and BURN, but not MINT)', async () => {
        // Ref https://github.com/badger-cash/slp-specifications/blob/master/slp-token-type-2.md

        // Init the wallet
        const slpMintVaultWallet = Wallet.fromSk(
            fromHex('15'.repeat(32)),
            chronik,
        );

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, slpMintVaultWallet.script);

        // Sync the wallet
        await slpMintVaultWallet.sync();

        // We can mint an SLP_TOKEN_TYPE_MINT_VAULT token
        // Note that this GenesisInfo is distinct from SLP_TOKEN_TYPE_FUNGIBLE
        // Note that this token does not have mint batons
        const slpMintVaultGenesisInfo = {
            tokenTicker: 'SLP',
            tokenName: 'SLP_TOKEN_TYPE_MINT_VAULT Test Token',
            url: 'cashtab.com',
            decimals: 0,
            /** To mint this token, a tx must include utxos with this outputScript */
            mintVaultScripthash: toHex(slpMintVaultWallet.pkh),
        };

        const genesisMintQty = 2_000n;

        // Construct the Action for this tx
        const slpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: slpMintVaultWallet.script,
                    atoms: genesisMintQty,
                },
            ],
            tokenActions: [
                /** SLP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                    genesisInfo: slpMintVaultGenesisInfo,
                },
            ],
        };

        // Build and broadcast
        const resp = await slpMintVaultWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const slpGenesisTokenId = resp.broadcasted[0];

        // It's a valid SLP genesis tx
        const tokenInfo = await chronik.token(slpGenesisTokenId);
        expect(tokenInfo.tokenType.type).to.equal('SLP_TOKEN_TYPE_MINT_VAULT');

        // We can get token supply from checking utxos
        const supply = (await chronik.tokenId(slpGenesisTokenId).utxos()).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(supply).to.equal(genesisMintQty);

        // Include SLP_MAX_SEND_OUTPUTS-1 outputs so we can (just) fit token change AND a leftover output
        const tokenSendOutputs: payment.PaymentOutput[] = [];
        for (let i = 1; i <= SLP_MAX_SEND_OUTPUTS - 1; i++) {
            tokenSendOutputs.push({
                sats: 546n,
                script: slpMintVaultWallet.script,
                tokenId: slpGenesisTokenId,
                atoms: BigInt(i),
            });
        }

        // We can SEND our test token
        const slpSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-18
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                },
            ],
        };

        // Build and broadcast
        const sendResponse = await slpMintVaultWallet
            .action(slpSendAction)
            .build()
            .broadcast();

        const slpSendTxid = sendResponse.broadcasted[0];

        const sendTx = await chronik.tx(slpSendTxid);
        expect(sendTx.tokenEntries).to.have.length(1);
        expect(sendTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We cannot burn an SLP amount that we do not have exact utxos for
        const burnAtomsThatDoNotMatchUtxos = 300n;
        const slpCannotBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms: burnAtomsThatDoNotMatchUtxos,
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                },
            ],
        };

        // We can burn an SLP amount that we do not have exact utxos for with a chained tx
        const chainedBurn = await slpMintVaultWallet
            .action(slpCannotBurnAction)
            .build()
            .broadcast();
        expect(chainedBurn.success).to.equal(true);
        expect(chainedBurn.broadcasted).to.have.length(2);

        const burnUtxoPrepTxid = chainedBurn.broadcasted[0];
        const chainedBurnTxid = chainedBurn.broadcasted[1];

        const burnUtxoPrepTx = await chronik.tx(burnUtxoPrepTxid);
        const chainedBurnTx = await chronik.tx(chainedBurnTxid);

        expect(burnUtxoPrepTx.tokenEntries).to.have.length(1);
        expect(burnUtxoPrepTx.tokenEntries[0].txType).to.equal('SEND');
        expect(burnUtxoPrepTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(burnUtxoPrepTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        expect(chainedBurnTx.tokenEntries).to.have.length(1);
        expect(chainedBurnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(chainedBurnTx.tokenEntries[0].actualBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(chainedBurnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        const slpSendActionTooManyOutputs: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-17
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
                // Add a single additional token output
                // We will try to add a token change output and this will be an output too far for spec
                {
                    sats: 546n,
                    script: slpMintVaultWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: BigInt(1n),
                },
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                },
            ],
        };

        // If we build a TX that requires max spec outputs of SLP +1 due to requiring change, it will automatically be chained
        const chainedSendResponse = await slpMintVaultWallet
            .action(slpSendActionTooManyOutputs)
            .build()
            .broadcast();
        expect(chainedSendResponse.success).to.equal(true);
        expect(chainedSendResponse.broadcasted).to.have.length(2);

        const burnAtoms = 1528n; // We have this exact utxo
        const slpBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms,
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                },
            ],
        };

        // Build and broadcast
        const burnResponse = await slpMintVaultWallet
            .action(slpBurnAction)
            .build()
            .broadcast();

        const burnTx = await chronik.tx(burnResponse.broadcasted[0]);
        expect(burnTx.tokenEntries).to.have.length(1);
        expect(burnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');
    });
    it('We can handle SLP SLP_TOKEN_TYPE_NFT1_GROUP token actions', async () => {
        // NB these tests are functionally identical to the SLP_TOKEN_TYPE_FUNGIBLE tests, except for token type
        // This is in line with spec matches

        // However, when we add support for minting SLP_TOKEN_TYPE_NFT1_CHILD tokens, we will add tests for that
        // unique feature, and will probably also need to test "input prep" txs for SLP_TOKEN_TYPE_NFT1_CHILD tokens,
        // though in a wallet lib it could make sense to do that automatically in a chained tx when minting

        // Init the wallet
        const slpWallet = Wallet.fromSk(fromHex('16'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, slpWallet.script);

        // Sync the wallet
        await slpWallet.sync();

        // We can mint a fungible token with a mint baton
        const slpGenesisInfo = {
            tokenTicker: 'SLP',
            tokenName: 'SLP Test Token',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 1_000n;

        // Construct the Action for this tx
        const slpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: slpWallet.script,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                    genesisInfo: slpGenesisInfo,
                },
            ],
        };

        // Build and broadcast
        const resp = await slpWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const slpGenesisTokenId = resp.broadcasted[0];

        // It's a valid SLP genesis tx
        const tokenInfo = await chronik.token(slpGenesisTokenId);
        expect(tokenInfo.tokenType.type).to.equal('SLP_TOKEN_TYPE_NFT1_GROUP');

        // We can get token supply from checking utxos
        const supply = (await chronik.tokenId(slpGenesisTokenId).utxos()).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(supply).to.equal(genesisMintQty);

        // We can mint more of our test token
        const extendedMintQuantity = 333n;

        // Construct the Action for this tx
        const slpMintAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 (same as GENESIS) per SLP spec */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: extendedMintQuantity,
                },
                /** Some normal outputs to show we can have a mint baton at an outIdx > 2 */
                { sats: 1000n, script: MOCK_DESTINATION_SCRIPT },
                { sats: 1001n, script: MOCK_DESTINATION_SCRIPT },
                { sats: 1002n, script: MOCK_DESTINATION_SCRIPT },
                /** Mint baton at outIdx 5, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'MINT',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // Build and broadcast the MINT tx
        await slpWallet.action(slpMintAction).build().broadcast();

        // Token supply has increased by the mint amount
        const updatedSupply = (
            await chronik.tokenId(slpGenesisTokenId).utxos()
        ).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);

        expect(updatedSupply).to.equal(genesisMintQty + extendedMintQuantity);

        // Include SLP_MAX_SEND_OUTPUTS-1 outputs so we can (just) fit token change AND a leftover output
        const tokenSendOutputs: payment.PaymentOutput[] = [];
        for (let i = 1; i <= SLP_MAX_SEND_OUTPUTS - 1; i++) {
            tokenSendOutputs.push({
                sats: 546n,
                script: slpWallet.script,
                tokenId: slpGenesisTokenId,
                atoms: BigInt(i),
            });
        }

        // We can SEND our test token
        const slpSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-18
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // Build and broadcast
        const sendResponse = await slpWallet
            .action(slpSendAction)
            .build()
            .broadcast();

        const slpSendTxid = sendResponse.broadcasted[0];

        const sendTx = await chronik.tx(slpSendTxid);
        expect(sendTx.tokenEntries).to.have.length(1);
        expect(sendTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        const burnAtoms = 333n;
        const slpBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // Build and broadcast
        const burnResponse = await slpWallet
            .action(slpBurnAction)
            .build()
            .broadcast();

        const burnTx = await chronik.tx(burnResponse.broadcasted[0]);
        expect(burnTx.tokenEntries).to.have.length(1);
        expect(burnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We can burn an SLP amount that we do not have exact utxos for
        const burnAtomsThatDoNotMatchUtxos = 300n;
        const slpCannotBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms: burnAtomsThatDoNotMatchUtxos,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // We can intentionally burn an SLP amount that we do not have exact utxos for
        const chainedBurn = await slpWallet
            .action(slpCannotBurnAction)
            .build()
            .broadcast();
        expect(chainedBurn.success).to.equal(true);
        expect(chainedBurn.broadcasted).to.have.length(2);

        const burnUtxoPrepTxid = chainedBurn.broadcasted[0];
        const chainedBurnTxid = chainedBurn.broadcasted[1];

        const burnUtxoPrepTx = await chronik.tx(burnUtxoPrepTxid);
        const chainedBurnTx = await chronik.tx(chainedBurnTxid);

        expect(burnUtxoPrepTx.tokenEntries).to.have.length(1);
        expect(burnUtxoPrepTx.tokenEntries[0].txType).to.equal('SEND');
        expect(burnUtxoPrepTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(burnUtxoPrepTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        expect(chainedBurnTx.tokenEntries).to.have.length(1);
        expect(chainedBurnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(chainedBurnTx.tokenEntries[0].actualBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(chainedBurnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        const slpSendActionTooManyOutputs: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-17
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
                // Add a single additional token output
                // We will try to add a token change output and this will be an output too far for spec
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: BigInt(1n),
                },
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // If we build a TX that requires max spec outputs of SLP +1 due to requiring change, it will automatically be chained
        const chainedSendResponse = await slpWallet
            .action(slpSendActionTooManyOutputs)
            .build()
            .broadcast();
        expect(chainedSendResponse.success).to.equal(true);
        expect(chainedSendResponse.broadcasted).to.have.length(2);
    });
    it('We can handle SLP SLP_TOKEN_TYPE_NFT1_CHILD token actions', async () => {
        // Init the wallet
        const slpNftWallet = Wallet.fromSk(fromHex('17'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, slpNftWallet.script);

        // Sync the wallet
        await slpNftWallet.sync();

        // Genesis SLP_TOKEN_TYPE_NFT1_GROUP tokens to support minting NFTs
        const slpGenesisInfo = {
            tokenTicker: 'SLP GROUP',
            tokenName: 'SLP Test GROUP',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 1_000n;

        // Construct the Action for this tx
        const slpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: slpNftWallet.script,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                    genesisInfo: slpGenesisInfo,
                },
            ],
        };

        // Build and broadcast
        const resp = await slpNftWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const slpGenesisTokenId = resp.broadcasted[0];

        // It's a valid SLP genesis tx
        const tokenInfo = await chronik.token(slpGenesisTokenId);
        expect(tokenInfo.tokenType.type).to.equal('SLP_TOKEN_TYPE_NFT1_GROUP');

        // We can get token supply from checking utxos
        const supply = (await chronik.tokenId(slpGenesisTokenId).utxos()).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(supply).to.equal(genesisMintQty);

        // We get expected error if we try to mint an NFT without fanning out the inputs
        const nftAlphaGenesisInfo = {
            tokenTicker: 'A',
            tokenName: 'ALPHA',
            url: 'cashtab.com',
            decimals: 0,
            hash: '',
        };
        const nftMintAlpha: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** The NFT */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'GENESIS',
                    groupTokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    genesisInfo: nftAlphaGenesisInfo,
                },
            ],
        };

        // We can immediately mint an NFT without a fan-out tx by using a chained tx
        const alphaNftResp = await slpNftWallet
            .action(nftMintAlpha)
            .build()
            .broadcast();

        // NB the genesis tx here is the SECOND of the broadcasted txs, at index 1
        const nftMintAlphaTxid = alphaNftResp.broadcasted[1];

        // It's a valid SLP genesis tx
        const alphaTokenInfo = await chronik.token(nftMintAlphaTxid);
        expect(alphaTokenInfo.genesisInfo).to.deep.equal(nftAlphaGenesisInfo);

        // We conduct a fan-out tx to mint a SLP_TOKEN_TYPE_NFT1_CHILD token
        const slpFanoutAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send qty at outIdxs 1, 2, and 3 */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: 1n,
                },
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: 1n,
                },
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: 1n,
                },
                /** ecash-wallet will automatically send itself the token change */
            ],
            tokenActions: [
                /** SLP fanout action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // Broadcast the fanout tx
        await slpNftWallet.action(slpFanoutAction).build().broadcast();

        const nftBetaGenesisInfo = {
            tokenTicker: 'B',
            tokenName: 'BETA',
            url: 'cashtab.com',
            decimals: 0,
            hash: '',
        };
        const nftMintBeta: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** The NFT */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'GENESIS',
                    groupTokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    genesisInfo: nftBetaGenesisInfo,
                },
            ],
        };

        // Now we can mint the NFT
        const betaNftResp = await slpNftWallet
            .action(nftMintBeta)
            .build()
            .broadcast();
        const nftMintBetaTxid = betaNftResp.broadcasted[0];

        // It's a valid SLP genesis tx
        const betaTokenInfo = await chronik.token(nftMintBetaTxid);
        expect(betaTokenInfo.genesisInfo).to.deep.equal(nftBetaGenesisInfo);

        // We can send an NFT
        const nftSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send qty at outIdx 1 */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: nftMintAlphaTxid,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: nftMintAlphaTxid,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                },
            ],
        };

        await slpNftWallet.action(nftSendAction).build().broadcast();

        // This NFT now belongs to MOCK_DESTINATION_ADDRESS
        const utxosAtMockDestination = await chronik
            .address(MOCK_DESTINATION_ADDRESS)
            .utxos();
        const utxoAtMockDestination = utxosAtMockDestination.utxos.find(
            utxo => utxo.token?.tokenId === nftMintAlphaTxid,
        );
        expect(utxoAtMockDestination?.token?.atoms).to.equal(1n);

        // We can mint another NFT
        const nftGammaGenesisInfo = {
            tokenTicker: 'G',
            tokenName: 'GAMMA',
            url: 'cashtab.com',
            decimals: 0,
            hash: '',
        };
        const nftMintGamma: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** The NFT */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'GENESIS',
                    groupTokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    genesisInfo: nftGammaGenesisInfo,
                },
            ],
        };

        const gammaNftResp = await slpNftWallet
            .action(nftMintGamma)
            .build()
            .broadcast();
        const nftMintGammaTxid = gammaNftResp.broadcasted[0];

        // It's a valid SLP genesis tx
        const gammaTokenInfo = await chronik.token(nftMintGammaTxid);
        expect(gammaTokenInfo.genesisInfo).to.deep.equal(nftGammaGenesisInfo);

        // We can burn an NFT
        const nftBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: nftMintBetaTxid,
                    burnAtoms: 1n,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                },
            ],
        };

        const burnResp = await slpNftWallet
            .action(nftBurnAction)
            .build()
            .broadcast();
        const nftBurnTxid = burnResp.broadcasted[0];

        // It's a valid SLP burn tx
        const burnTx = await chronik.tx(nftBurnTxid);
        expect(burnTx.tokenEntries).to.have.length(1);
        expect(burnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(1n);
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(1n);
        expect(burnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // No more supply of this NFT
        const utxosThisNft = await chronik.tokenId(nftMintBetaTxid).utxos();
        expect(utxosThisNft.utxos.length).to.equal(0);

        // We cannot mint an NFT with atoms of > 1n
        const nftDeltaGenesisInfo = {
            tokenTicker: 'D',
            tokenName: 'DELTA',
            url: 'cashtab.com',
            decimals: 0,
            hash: '',
        };
        const nftDeltaBeta: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** The NFT, but we attempt to mint with 2n atoms */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: 2n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'GENESIS',
                    groupTokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    genesisInfo: nftDeltaGenesisInfo,
                },
            ],
        };

        expect(() =>
            slpNftWallet.clone().action(nftDeltaBeta).build(ALL_BIP143),
        ).to.throw(
            Error,
            `An SLP_TOKEN_TYPE_NFT1_CHILD GENESIS tx must have 1 atom at outIdx 1. Found 2 atoms.`,
        );

        /**
         * NB if we do attempt to broadcast this tx, chronik will catch and throw this:
         *  Error: Failed getting /broadcast-tx: 400: Tx <txid> failed token checks:
         *  Parsing failed: SLP error: Invalid NFT1 Child GENESIS initial quantity,
         *  expected 1 but got 2. Unexpected burn: Burns 1 atoms.
         */
    });
    it('We can send an ALP tx with DataAction(s)', async () => {
        // Init the wallet
        const alpDataWallet = Wallet.fromSk(fromHex('18'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, alpDataWallet.script);

        // Sync the wallet
        await alpDataWallet.sync();

        // First, create an ALP token
        const alpGenesisInfo = {
            tokenTicker: 'DATA',
            tokenName: 'ALP Data Test Token',
            url: 'cashtab.com',
            decimals: 0,
            data: 'deadbeef',
            authPubkey: toHex(alpDataWallet.pk),
        };

        const genesisMintQty = 1_000n;

        // Construct the Action for genesis
        const alpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 */
                {
                    sats: 546n,
                    script: alpDataWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2 */
                {
                    sats: 546n,
                    script: alpDataWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    genesisInfo: alpGenesisInfo,
                },
            ],
        };

        // Build and broadcast genesis
        const genesisResp = await alpDataWallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const alpTokenId = genesisResp.broadcasted[0];

        // Verify it's a valid ALP genesis tx
        const tokenInfo = await chronik.token(alpTokenId);
        expect(tokenInfo.tokenType.type).to.equal('ALP_TOKEN_TYPE_STANDARD');

        // Now send the token with DataAction containing "test" (ASCII encoded)
        const testData = new TextEncoder().encode('test');

        const alpSendWithDataAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send some tokens */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: alpTokenId,
                    atoms: 100n,
                },
            ],
            tokenActions: [
                /** ALP send action */
                {
                    type: 'SEND',
                    tokenId: alpTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** DataAction with "test" ASCII encoded */
                {
                    type: 'DATA',
                    data: testData,
                },
            ],
        };

        // Build and broadcast the transaction with DataAction
        const sendWithDataResp = await alpDataWallet
            .action(alpSendWithDataAction)
            .build()
            .broadcast();

        const sendWithDataTxid = sendWithDataResp.broadcasted[0];

        // Verify the transaction was successful
        const sendWithDataTx = await chronik.tx(sendWithDataTxid);
        expect(sendWithDataTx.tokenEntries).to.have.length(1);
        expect(sendWithDataTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendWithDataTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendWithDataTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // Verify the data was included in the OP_RETURN
        // The OP_RETURN should contain the ALP SEND pushdata followed by the "test" data

        // The "test" data (74657374 in hex) should be present in the OP_RETURN
        // We can verify this by checking that the transaction was successful and
        // the token was sent correctly, which confirms the DataAction was processed

        // Verify the token was sent correctly (so, the ALP tx was valid)
        const utxosAtDestination = await chronik
            .address(MOCK_DESTINATION_ADDRESS)
            .utxos();
        const tokenUtxoAtDestination = utxosAtDestination.utxos.find(
            utxo => utxo.token?.tokenId === alpTokenId,
        );
        expect(tokenUtxoAtDestination?.token?.atoms).to.equal(100n);

        // Verify we find the data in the OP_RETURN (so, the DataAction was processed)
        const opReturn = sendWithDataTx.outputs[0].outputScript;
        const testDataHex = toHex(testData);

        expect(opReturn).to.include(testDataHex); // "test" in hex: 74657374

        // Test that we get an error when trying to send max ALP outputs with DataAction
        // This should exceed the OP_RETURN size limit
        const maxAlpOutputs: payment.PaymentOutput[] = [];
        for (let i = 1; i <= ALP_POLICY_MAX_OUTPUTS - 1; i++) {
            maxAlpOutputs.push({
                sats: 546n,
                script: MOCK_DESTINATION_SCRIPT,
                tokenId: alpTokenId,
                atoms: BigInt(i),
            });
        }

        const alpMaxOutputsWithDataAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-28
                 * This will be the maximum number of outputs before hitting ALP_POLICY_MAX_OUTPUTS
                 * Adding DataAction should push us over the OP_RETURN size limit
                 */
                ...maxAlpOutputs,
            ],
            tokenActions: [
                /** ALP send action */
                {
                    type: 'SEND',
                    tokenId: alpTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** DataAction with "test" ASCII encoded - this should cause OP_RETURN to exceed size limit */
                {
                    type: 'DATA',
                    data: testData,
                },
            ],
        };

        // This should throw an error because the OP_RETURN would exceed the size limit
        expect(() =>
            alpDataWallet
                .clone()
                .action(alpMaxOutputsWithDataAction)
                .build(ALL_BIP143),
        ).to.throw(
            Error,
            `Specified action results in OP_RETURN of 226 bytes, vs max allowed of 223.`,
        );

        // Test sending ALP transaction with two DataActions: "alpha" and "beta"
        const alphaData = new TextEncoder().encode('alpha');
        const betaData = new TextEncoder().encode('beta');

        const alpSendWithTwoDataActions: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send some tokens */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: alpTokenId,
                    atoms: 50n,
                },
            ],
            tokenActions: [
                /** ALP send action */
                {
                    type: 'SEND',
                    tokenId: alpTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** First DataAction with "alpha" */
                {
                    type: 'DATA',
                    data: alphaData,
                },
                /** Second DataAction with "beta" */
                {
                    type: 'DATA',
                    data: betaData,
                },
            ],
        };

        // Build and broadcast the transaction with two DataActions
        const sendWithTwoDataResp = await alpDataWallet
            .action(alpSendWithTwoDataActions)
            .build()
            .broadcast();

        const sendWithTwoDataTxid = sendWithTwoDataResp.broadcasted[0];

        // Verify the transaction was successful
        const sendWithTwoDataTx = await chronik.tx(sendWithTwoDataTxid);
        expect(sendWithTwoDataTx.tokenEntries).to.have.length(1);
        expect(sendWithTwoDataTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendWithTwoDataTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendWithTwoDataTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // Verify both data actions are included in the OP_RETURN
        const opReturnWithTwoData = sendWithTwoDataTx.outputs[0].outputScript;
        const alphaDataHex = toHex(alphaData);
        const betaDataHex = toHex(betaData);

        expect(opReturnWithTwoData).to.include(alphaDataHex); // "alpha" in hex: 616c706861
        expect(opReturnWithTwoData).to.include(betaDataHex); // "beta" in hex: 62657461

        // Verify the token was sent correctly
        const utxosAtDestinationAfterTwoData = await chronik
            .address(MOCK_DESTINATION_ADDRESS)
            .utxos();
        const tokenUtxosAtDestinationAfterTwoData =
            utxosAtDestinationAfterTwoData.utxos.filter(
                utxo => utxo.token?.tokenId === alpTokenId,
            );

        // We should have 2 UTXOs: one from the first transaction (100 atoms) and one from the second (50 atoms)
        expect(tokenUtxosAtDestinationAfterTwoData).to.have.length(2);

        // Calculate total atoms across all UTXOs
        const totalAtoms = tokenUtxosAtDestinationAfterTwoData.reduce(
            (sum, utxo) => sum + (utxo.token?.atoms || 0n),
            0n,
        );
        expect(totalAtoms).to.equal(150n); // 100 + 50
    });
    it('We can send a chained token tx to 42 recipients for an ALP ALP_TOKEN_TYPE_STANDARD token', async () => {
        // Init the wallet
        const chainedTokenWallet = Wallet.fromSk(
            fromHex('19'.repeat(32)),
            chronik,
        );

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, chainedTokenWallet.script);

        // Sync the wallet
        await chainedTokenWallet.sync();

        // First, create an ALP token
        const alpGenesisInfo = {
            tokenTicker: 'CHAIN',
            tokenName: 'Chained Token Test',
            url: 'cashtab.com',
            decimals: 0,
            authPubkey: toHex(chainedTokenWallet.pk),
        };

        const genesisMintQty = 100_000n; // Enough tokens for 42 recipients

        // Construct the Action for genesis
        const alpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 */
                {
                    sats: 546n,
                    script: chainedTokenWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2 */
                {
                    sats: 546n,
                    script: chainedTokenWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    genesisInfo: alpGenesisInfo,
                },
            ],
        };

        // Build and broadcast genesis
        const genesisResp = await chainedTokenWallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const alpTokenId = genesisResp.broadcasted[0];

        // Verify it's a valid ALP genesis tx
        const tokenInfo = await chronik.token(alpTokenId);
        expect(tokenInfo.tokenType.type).to.equal('ALP_TOKEN_TYPE_STANDARD');

        // Now create a send action with 42 recipients
        // This exceeds ALP_POLICY_MAX_OUTPUTS (29), so it will require chained txs
        const numRecipients = 42;
        const atomsPerRecipient = 1000n;

        // Create 42 unique recipient addresses
        const recipientOutputs: payment.PaymentTokenOutput[] = [];
        for (let i = 0; i < numRecipients; i++) {
            // Create unique addresses for each recipient
            const hex = i.toString(16).padStart(40, '0');
            const script = Script.p2pkh(fromHex(hex));
            recipientOutputs.push({
                sats: DEFAULT_DUST_SATS,
                script,
                tokenId: alpTokenId,
                atoms: atomsPerRecipient,
                isMintBaton: false,
            });
        }

        const alpChainedSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** 42 recipient outputs */
                ...recipientOutputs,
            ],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId: alpTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build the chained transaction
        const chainedSendResp = await chainedTokenWallet
            .action(alpChainedSendAction)
            .build()
            .broadcast();

        // Verify we got multiple transactions (chained)
        expect(chainedSendResp.broadcasted.length).to.be.greaterThan(1);

        // Verify all transactions were broadcast successfully and are valid token txs
        for (let i = 0; i < chainedSendResp.broadcasted.length; i++) {
            const txid = chainedSendResp.broadcasted[i];
            const tx = await chronik.tx(txid);

            // Verify it's a valid token transaction
            expect(tx.tokenEntries).to.have.length(1);
            const tokenEntry = tx.tokenEntries[0];
            expect(tokenEntry.txType).to.equal('SEND');
            expect(tokenEntry.tokenId).to.equal(alpTokenId);
            expect(tokenEntry.tokenType.type).to.equal(
                'ALP_TOKEN_TYPE_STANDARD',
            );
            expect(tokenEntry.tokenType.protocol).to.equal('ALP');
            expect(tx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

            // Verify OP_RETURN output exists at index 0
            expect(tx.outputs[0].sats).to.equal(0n);

            // Verify all token outputs have the correct tokenId
            const tokenOutputs = tx.outputs.filter(
                output => output.token !== undefined,
            );
            for (const output of tokenOutputs) {
                expect(output.token?.tokenId).to.equal(alpTokenId);
                expect(output.token?.tokenType.type).to.equal(
                    'ALP_TOKEN_TYPE_STANDARD',
                );
            }
        }

        // ALP can do this in 2 txs
        expect(chainedSendResp.broadcasted.length).to.equal(2);

        // chainedTxAlpha fits as many outputs as possible
        const chainedTxAlpha = await chronik.tx(chainedSendResp.broadcasted[0]);

        // We have 31 total outputs; 1xOP_RETURN + 29x token outputs + 1x XEC change
        expect(chainedTxAlpha.outputs.length).to.equal(31);

        // The last output is XEC change only
        expect(
            chainedTxAlpha.outputs[chainedTxAlpha.outputs.length - 1].sats,
        ).to.equal(6271433n);
        expect(
            chainedTxAlpha.outputs[chainedTxAlpha.outputs.length - 1].token,
        ).to.equal(undefined);

        // The 2nd-to-last output is the input for the next tx

        // We have non-dust XEC sats combined with token change
        expect(
            chainedTxAlpha.outputs[chainedTxAlpha.outputs.length - 2].sats,
        ).to.equal(8997n);
        expect(
            chainedTxAlpha.outputs[chainedTxAlpha.outputs.length - 2].token
                ?.atoms,
        ).to.equal(72000n);

        const chainedTxOmega = await chronik.tx(chainedSendResp.broadcasted[1]);

        // chainedTxOmega should have exactly 1 input, which is the 2nd-to-last output from chainedTxAlpha
        expect(chainedTxOmega.inputs.length).to.equal(1);
        const chainedInput = chainedTxOmega.inputs[0];
        expect(chainedInput.prevOut.txid).to.equal(chainedTxAlpha.txid);
        expect(chainedInput.prevOut.outIdx).to.equal(29); // 2nd-to-last output index
        expect(chainedInput.sats).to.equal(8997n);
        expect(chainedInput.token?.atoms).to.equal(72000n);

        // We have only OP_RETURN and token outputs for chainedTxOmega
        expect(chainedTxOmega.outputs.length).to.equal(16);

        // Start at 1 as we do not expect the OP_RETURN output to be a token utxo
        for (let i = 1; i < chainedTxOmega.outputs.length; i++) {
            expect(chainedTxOmega.outputs[i].token?.tokenId).to.equal(
                alpTokenId,
            );
        }

        // The last output has exactly dust sats
        expect(
            chainedTxOmega.outputs[chainedTxOmega.outputs.length - 1].sats,
        ).to.equal(DEFAULT_DUST_SATS);
    });
    it('We can send an ALP tx to 29 recipients as 1 tx, but data actions are not supported in chained token send transactions', async () => {
        /**
         * Data actions are not currently supported in chained token send transactions.
         * This test confirms that attempting to include a data action in a chained token send
         * will throw an error.
         */

        // Init the wallet
        const alp29Wallet = Wallet.fromSk(fromHex('1b'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, alp29Wallet.script);

        // Sync the wallet
        await alp29Wallet.sync();

        // First, create an ALP token
        const alpGenesisInfo = {
            tokenTicker: 'ALP29',
            tokenName: 'ALP 29 Recipients Test',
            url: 'cashtab.com',
            decimals: 0,
            authPubkey: toHex(alp29Wallet.pk),
        };

        // Need enough tokens for:
        // 1. First send: (ALP_POLICY_MAX_OUTPUTS - 1) recipients * 1000 atoms = 28,000 atoms
        // 2. Second send (with data action): (ALP_POLICY_MAX_OUTPUTS - 1) recipients * 1000 atoms = 28,000 atoms
        // Total: 56,000 atoms, plus some buffer for change
        const genesisMintQty = 100_000n;

        // Construct the Action for genesis
        const alpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 */
                {
                    sats: 546n,
                    script: alp29Wallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2 */
                {
                    sats: 546n,
                    script: alp29Wallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    genesisInfo: alpGenesisInfo,
                },
            ],
        };

        // Build and broadcast genesis
        const genesisResp = await alp29Wallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const alpTokenId = genesisResp.broadcasted[0];

        // Verify it's a valid ALP genesis tx
        const tokenInfo = await chronik.token(alpTokenId);
        expect(tokenInfo.tokenType.type).to.equal('ALP_TOKEN_TYPE_STANDARD');

        // Now create a send action with ALP_POLICY_MAX_OUTPUTS - 1 recipients
        // This should fit in 1 tx with change (ALP_POLICY_MAX_OUTPUTS - 1 recipients + 1 change = ALP_POLICY_MAX_OUTPUTS token outputs)
        const numRecipients = ALP_POLICY_MAX_OUTPUTS - 1;
        const atomsPerRecipient = 1000n;

        // Create ALP_POLICY_MAX_OUTPUTS - 1 unique recipient addresses
        const recipientOutputs: payment.PaymentTokenOutput[] = [];
        for (let i = 0; i < numRecipients; i++) {
            // Create unique addresses for each recipient
            const hex = i.toString(16).padStart(40, '0');
            const script = Script.p2pkh(fromHex(hex));
            recipientOutputs.push({
                sats: DEFAULT_DUST_SATS,
                script,
                tokenId: alpTokenId,
                atoms: atomsPerRecipient,
                isMintBaton: false,
            });
        }

        const alp29RecipientsAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** ALP_POLICY_MAX_OUTPUTS - 1 recipient outputs */
                ...recipientOutputs,
            ],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId: alpTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast - should be 1 tx
        const singleTxResp = await alp29Wallet
            .action(alp29RecipientsAction)
            .build()
            .broadcast();

        // Verify we got exactly 1 transaction
        expect(singleTxResp.broadcasted.length).to.equal(1);

        const singleTx = await chronik.tx(singleTxResp.broadcasted[0]);
        expect(singleTx.tokenEntries).to.have.length(1);
        expect(singleTx.tokenEntries[0].txType).to.equal('SEND');
        expect(singleTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(singleTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // Verify we have expected outputs: 29x token outputs (ALP_POLICY_MAX_OUTPUTS), 1xOP_RETURN, 1x XEC change
        expect(singleTx.outputs.length).to.equal(
            ALP_POLICY_MAX_OUTPUTS + 1 + 1,
        );

        // Verify we have exactly ALP_POLICY_MAX_OUTPUTS token outputs (ALP_POLICY_MAX_OUTPUTS - 1 recipients + 1 change)
        const tokenOutputs = singleTx.outputs.filter(
            output => output.token !== undefined,
        );
        expect(tokenOutputs.length).to.equal(ALP_POLICY_MAX_OUTPUTS);

        // Now test that data actions are not supported in chained token send transactions
        // Send to ALP_POLICY_MAX_OUTPUTS recipients (29), which exceeds the max when including change
        // This would trigger chained transactions, but data actions are not supported
        const oneByteData = new TextEncoder().encode('x'); // 1 byte data

        // Create ALP_POLICY_MAX_OUTPUTS recipient outputs (one more than before)
        const maxRecipientOutputs: payment.PaymentTokenOutput[] = [];
        for (let i = 0; i < ALP_POLICY_MAX_OUTPUTS; i++) {
            // Create unique addresses for each recipient
            const hex = i.toString(16).padStart(40, '0');
            const script = Script.p2pkh(fromHex(hex));
            maxRecipientOutputs.push({
                sats: DEFAULT_DUST_SATS,
                script,
                tokenId: alpTokenId,
                atoms: atomsPerRecipient,
                isMintBaton: false,
            });
        }

        const alpMaxRecipientsWithOneByteData: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** ALP_POLICY_MAX_OUTPUTS recipient outputs */
                ...maxRecipientOutputs,
            ],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId: alpTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                {
                    type: 'DATA',
                    data: oneByteData,
                },
            ],
        };

        // This should throw an error because data actions are not supported in chained transactions
        expect(() =>
            alp29Wallet
                .clone()
                .action(alpMaxRecipientsWithOneByteData)
                .build(ALL_BIP143),
        ).to.throw(
            Error,
            'Data actions are not supported in chained token send transactions.',
        );
    });
    it('We can send a chained token tx to 42 recipients for an SLP SLP_TOKEN_TYPE_FUNGIBLE token', async () => {
        // Init the wallet
        const chainedSlpWallet = Wallet.fromSk(
            fromHex('1a'.repeat(32)),
            chronik,
        );

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, chainedSlpWallet.script);

        // Sync the wallet
        await chainedSlpWallet.sync();

        // First, create an SLP token
        const slpGenesisInfo = {
            tokenTicker: 'CHAIN',
            tokenName: 'Chained SLP Token Test',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 100_000n; // Enough tokens for 42 recipients

        // Construct the Action for genesis
        const slpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 */
                {
                    sats: 546n,
                    script: chainedSlpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2 */
                {
                    sats: 546n,
                    script: chainedSlpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    genesisInfo: slpGenesisInfo,
                },
            ],
        };

        // Build and broadcast genesis
        const genesisResp = await chainedSlpWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const slpTokenId = genesisResp.broadcasted[0];

        // Verify it's a valid SLP genesis tx
        const tokenInfo = await chronik.token(slpTokenId);
        expect(tokenInfo.tokenType.type).to.equal('SLP_TOKEN_TYPE_FUNGIBLE');

        // Now create a send action with 42 recipients
        // This exceeds SLP_MAX_SEND_OUTPUTS (19), so it will require chained txs
        const numRecipients = 42;
        const atomsPerRecipient = 1000n;

        // Create 42 unique recipient addresses
        const recipientOutputs: payment.PaymentTokenOutput[] = [];
        for (let i = 0; i < numRecipients; i++) {
            // Create unique addresses for each recipient
            const hex = i.toString(16).padStart(40, '0');
            const script = Script.p2pkh(fromHex(hex));
            recipientOutputs.push({
                sats: DEFAULT_DUST_SATS,
                script,
                tokenId: slpTokenId,
                atoms: atomsPerRecipient,
                isMintBaton: false,
            });
        }

        const slpChainedSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** 42 recipient outputs */
                ...recipientOutputs,
            ],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId: slpTokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        // Build the chained transaction
        const chainedSendResp = await chainedSlpWallet
            .action(slpChainedSendAction)
            .build()
            .broadcast();

        // Verify we got multiple transactions (chained)
        expect(chainedSendResp.broadcasted.length).to.be.greaterThan(1);

        // Verify all transactions were broadcast successfully and are valid token txs
        for (let i = 0; i < chainedSendResp.broadcasted.length; i++) {
            const txid = chainedSendResp.broadcasted[i];
            const tx = await chronik.tx(txid);

            // Verify it's a valid token transaction
            expect(tx.tokenEntries).to.have.length(1);
            const tokenEntry = tx.tokenEntries[0];
            expect(tokenEntry.txType).to.equal('SEND');
            expect(tokenEntry.tokenId).to.equal(slpTokenId);
            expect(tokenEntry.tokenType.type).to.equal(
                'SLP_TOKEN_TYPE_FUNGIBLE',
            );
            expect(tokenEntry.tokenType.protocol).to.equal('SLP');
            expect(tx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

            // Verify OP_RETURN output exists at index 0
            expect(tx.outputs[0].sats).to.equal(0n);

            // Verify all token outputs have the correct tokenId
            const tokenOutputs = tx.outputs.filter(
                output => output.token !== undefined,
            );
            for (const output of tokenOutputs) {
                expect(output.token?.tokenId).to.equal(slpTokenId);
                expect(output.token?.tokenType.type).to.equal(
                    'SLP_TOKEN_TYPE_FUNGIBLE',
                );
            }
        }

        // SLP can do this in 3 txs (SLP_MAX_SEND_OUTPUTS = 19)
        // First tx: 19 recipients, second tx: 19 recipients, third tx: 4 recipients + change
        expect(chainedSendResp.broadcasted.length).to.equal(3);

        // chainedTxAlpha fits as many outputs as possible
        const chainedTxAlpha = await chronik.tx(chainedSendResp.broadcasted[0]);

        // We have 21 total outputs; 1xOP_RETURN + 18x recipient token outputs + 1x token chained output + 1x XEC change
        expect(chainedTxAlpha.outputs.length).to.equal(21);

        // The last output is XEC change only
        expect(
            chainedTxAlpha.outputs[chainedTxAlpha.outputs.length - 1].token,
        ).to.equal(undefined);

        // The 2nd-to-last output is the chained output (input for next tx)
        const chainedOutputAlpha =
            chainedTxAlpha.outputs[chainedTxAlpha.outputs.length - 2];
        expect(chainedOutputAlpha.token?.tokenId).to.equal(slpTokenId);
        expect(chainedOutputAlpha.sats).to.equal(15180n);
        expect(chainedOutputAlpha.token?.atoms).to.equal(82000n);

        // chainedTxBeta (second tx)
        const chainedTxBeta = await chronik.tx(chainedSendResp.broadcasted[1]);

        // chainedTxBeta should have exactly 1 input, which is the 2nd-to-last output from chainedTxAlpha
        expect(chainedTxBeta.inputs.length).to.equal(1);
        const chainedInputBeta = chainedTxBeta.inputs[0];
        expect(chainedInputBeta.prevOut.txid).to.equal(chainedTxAlpha.txid);
        expect(chainedInputBeta.prevOut.outIdx).to.equal(19); // 2nd-to-last output index

        // We have 20 total outputs; 1xOP_RETURN + 18x token outputs + 1x chained output
        // All the XEC-only change is handled in chainedTxAlpha
        expect(chainedTxBeta.outputs.length).to.equal(20);

        // The last output is the chained output (input for next tx)
        const chainedOutputBeta =
            chainedTxBeta.outputs[chainedTxBeta.outputs.length - 1];
        expect(chainedOutputBeta.token?.tokenId).to.equal(slpTokenId);
        expect(chainedOutputBeta.sats).to.equal(4329n);
        expect(chainedOutputBeta.token?.atoms).to.equal(64000n);

        // chainedTxOmega (final tx)
        const chainedTxOmega = await chronik.tx(chainedSendResp.broadcasted[2]);

        // chainedTxOmega should have exactly 1 input, which is the 2nd-to-last output from chainedTxBeta
        expect(chainedTxOmega.inputs.length).to.equal(1);
        const chainedInputOmega = chainedTxOmega.inputs[0];
        expect(chainedInputOmega.prevOut.txid).to.equal(chainedTxBeta.txid);
        expect(chainedInputOmega.prevOut.outIdx).to.equal(19); // 2nd-to-last output index

        // We have only OP_RETURN and token outputs for chainedTxOmega
        expect(chainedTxOmega.outputs.length).to.equal(8); // 1 OP_RETURN + 7 recipients

        // Start at 1 as we do not expect the OP_RETURN output to be a token utxo
        for (let i = 1; i < chainedTxOmega.outputs.length; i++) {
            expect(chainedTxOmega.outputs[i].token?.tokenId).to.equal(
                slpTokenId,
            );
        }

        // The last output has exactly dust sats (token change)
        expect(
            chainedTxOmega.outputs[chainedTxOmega.outputs.length - 1].sats,
        ).to.equal(DEFAULT_DUST_SATS);
    });

    it('We can send a chained token tx and then another tx without syncing', async () => {
        // This test verifies that the wallet's UTXO set is correctly updated after
        // building/broadcasting chained token transactions, so subsequent transactions
        // can use the updated UTXO set without needing to sync
        const wallet = Wallet.fromSk(fromHex('1c'.repeat(32)), chronik);

        // Send enough XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, wallet.script);
        await wallet.sync();

        // First, create an ALP token
        const alpGenesisInfo = {
            tokenTicker: 'CHAIN2',
            tokenName: 'Chained Token Test 2',
            url: 'cashtab.com',
            decimals: 0,
            authPubkey: toHex(wallet.pk),
        };

        const genesisMintQty = 200_000n; // Enough for chained send + another send

        const alpGenesisAction: payment.Action = {
            outputs: [
                { sats: 0n },
                {
                    sats: 546n,
                    script: wallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQty,
                },
                {
                    sats: 546n,
                    script: wallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    genesisInfo: alpGenesisInfo,
                },
            ],
        };

        const genesisResp = await wallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const tokenId = genesisResp.broadcasted[0];

        // Verify it's a valid ALP genesis tx
        const tokenInfo = await chronik.token(tokenId);
        expect(tokenInfo.tokenType.type).to.equal('ALP_TOKEN_TYPE_STANDARD');

        // Now create a chained send action with 42 recipients
        const numRecipients = 42;
        const atomsPerRecipient = 1000n;

        const recipientOutputs: payment.PaymentTokenOutput[] = [];
        for (let i = 0; i < numRecipients; i++) {
            const hex = i.toString(16).padStart(40, '0');
            const script = Script.p2pkh(fromHex(hex));
            recipientOutputs.push({
                sats: DEFAULT_DUST_SATS,
                script,
                tokenId,
                atoms: atomsPerRecipient,
                isMintBaton: false,
            });
        }

        const chainedSendAction: payment.Action = {
            outputs: [{ sats: 0n }, ...recipientOutputs],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast the chained transaction
        const chainedSendResp = await wallet
            .action(chainedSendAction)
            .build()
            .broadcast();

        // Verify we got multiple transactions (chained)
        expect(chainedSendResp.broadcasted.length).to.equal(2);

        // Verify all chained transactions are valid
        for (const txid of chainedSendResp.broadcasted) {
            const tx = await chronik.tx(txid);
            expect(tx.tokenEntries).to.have.length(1);
            expect(tx.tokenEntries[0].txType).to.equal('SEND');
            expect(tx.tokenEntries[0].tokenId).to.equal(tokenId);
            expect(tx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');
        }

        // Now send another transaction WITHOUT syncing
        // This should work because the wallet's UTXO set was updated after the chained send
        const additionalRecipientScript = Script.p2pkh(
            fromHex('ff'.repeat(20)),
        );
        const additionalSendAction: payment.Action = {
            outputs: [
                { sats: 0n },
                {
                    sats: DEFAULT_DUST_SATS,
                    script: additionalRecipientScript,
                    tokenId,
                    atoms: 5000n,
                    isMintBaton: false,
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

        // This should succeed without syncing because the wallet's UTXO set
        // was updated after the chained send
        const additionalSendResp = await wallet
            .action(additionalSendAction)
            .build()
            .broadcast();

        // Verify the additional transaction was successful
        expect(additionalSendResp.success).to.equal(true);
        expect(additionalSendResp.broadcasted.length).to.equal(1);

        const additionalTx = await chronik.tx(
            additionalSendResp.broadcasted[0],
        );
        expect(additionalTx.tokenEntries).to.have.length(1);
        expect(additionalTx.tokenEntries[0].txType).to.equal('SEND');
        expect(additionalTx.tokenEntries[0].tokenId).to.equal(tokenId);
        expect(additionalTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // Verify the output went to the correct recipient
        const recipientOutput = additionalTx.outputs.find(
            output => output.outputScript === additionalRecipientScript.toHex(),
        );
        expect(recipientOutput).to.not.equal(undefined);
        expect(recipientOutput?.token?.tokenId).to.equal(tokenId);
        expect(recipientOutput?.token?.atoms).to.equal(5000n);
    });

    it('Edge case: chained token send fuel UTXO threshold (hardcoded)', async () => {
        // This test verifies the fuel UTXO selection logic with a hardcoded threshold
        // Threshold found via binary search: 27629 sats is the minimum needed
        // for a chained token send with 42 recipients
        //
        // Test cases:
        // 1. 27628 sats (1 sat short): should fail during build phase
        // 2. 27629 sats (threshold): should build and broadcast successfully

        const slpGenesisInfo = {
            tokenTicker: 'EDGE',
            tokenName: 'Edge Case Test Token',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 100_000n;
        const numRecipients = 42;
        const atomsPerRecipient = 1000n;

        // Helper to create genesis action for a wallet
        const createGenesisAction = (wallet: Wallet): payment.Action => ({
            outputs: [
                { sats: 0n },
                {
                    sats: 546n,
                    script: wallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQty,
                },
                {
                    sats: 546n,
                    script: wallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    genesisInfo: slpGenesisInfo,
                },
            ],
        });

        // Helper to create recipient outputs
        const createRecipientOutputs = (
            tokenId: string,
        ): payment.PaymentTokenOutput[] => {
            const outputs: payment.PaymentTokenOutput[] = [];
            for (let i = 0; i < numRecipients; i++) {
                const hex = i.toString(16).padStart(40, '0');
                const script = Script.p2pkh(fromHex(hex));
                outputs.push({
                    sats: DEFAULT_DUST_SATS,
                    script,
                    tokenId,
                    atoms: atomsPerRecipient,
                    isMintBaton: false,
                });
            }
            return outputs;
        };

        // Helper to create chained send action
        const createChainedSendAction = (tokenId: string): payment.Action => ({
            outputs: [{ sats: 0n }, ...createRecipientOutputs(tokenId)],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        });

        // Hardcoded threshold found via binary search
        // This is the amount needed AFTER genesis to build the chained send
        // We need to account for genesis transaction cost to get the amount needed BEFORE genesis
        const requiredAfterGenesis = 25_626n; // Amount needed after genesis (found via debug logs)
        const genesisTxCost = 1423n; // Cost of genesis transaction
        const thresholdAmount = requiredAfterGenesis + genesisTxCost;
        const oneSatShortAmount = thresholdAmount - 1n; // (1 sat short)

        // Test 1: One sat short - should fail during build
        const oneSatShortWallet = Wallet.fromSk(
            fromHex('7a'.repeat(32)),
            chronik,
        );

        await runner.sendToScript(oneSatShortAmount, oneSatShortWallet.script);
        await oneSatShortWallet.sync();

        const oneSatShortGenesisResp = await oneSatShortWallet
            .action(createGenesisAction(oneSatShortWallet))
            .build()
            .broadcast();

        const oneSatShortTokenId = oneSatShortGenesisResp.broadcasted[0];

        expect(() =>
            oneSatShortWallet
                .action(createChainedSendAction(oneSatShortTokenId))
                .build(),
        ).to.throw(
            Error,
            'Insufficient sats to complete chained token send. Have 26171 sats, insufficient to cover chained tx required sats (15180) + fee (variable with inputs).',
        );

        // Test 2: Just enough sats - should build and broadcast successfully
        const justEnoughWallet = Wallet.fromSk(
            fromHex('8a'.repeat(32)),
            chronik,
        );

        await runner.sendToScript(thresholdAmount, justEnoughWallet.script);
        await justEnoughWallet.sync();

        const justEnoughGenesisResp = await justEnoughWallet
            .action(createGenesisAction(justEnoughWallet))
            .build()
            .broadcast();

        const justEnoughTokenId = justEnoughGenesisResp.broadcasted[0];

        const justEnoughBuilt = await justEnoughWallet
            .action(createChainedSendAction(justEnoughTokenId))
            .build();

        const justEnoughResp = await justEnoughBuilt.broadcast();

        // Should have multiple chained transactions
        expect(justEnoughResp.success).to.equal(true);
        expect(justEnoughResp.broadcasted.length).to.equal(3);

        // The last output has token dust sats as expected
        const chainedTxOmega = await chronik.tx(justEnoughResp.broadcasted[2]);
        expect(
            chainedTxOmega.outputs[chainedTxOmega.outputs.length - 1].sats,
        ).to.equal(DEFAULT_DUST_SATS);
    });

    it('We can handle missing inputs error by syncing, rebuilding, and rebroadcasting', async () => {
        // Init the wallet
        const testWallet = Wallet.fromSk(fromHex('99'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, testWallet.script);

        // Sync to get real UTXOs
        await testWallet.sync();
        expect(testWallet.utxos.length).to.be.greaterThan(0);

        // Step 1: Send a tx to itself to create 5 UTXOs
        const selfSendSats = 200_000_00n; // 2M XEC split into 5 outputs
        const selfSendOutputs = Array.from({ length: 5 }, () => ({
            script: testWallet.script,
            sats: selfSendSats / 5n,
        }));
        const selfSendResp = await testWallet
            .action({ outputs: selfSendOutputs })
            .build()
            .broadcast();
        expect(selfSendResp.success).to.equal(true);

        // Sync to get the new UTXOs
        await testWallet.sync();

        // Capture the UTXO set BEFORE the external send (so we can restore it later)
        const utxosBeforeExternalSend = testWallet.utxos.map(utxo => ({
            ...utxo,
            outpoint: { ...utxo.outpoint },
        }));

        // Step 2: Send a tx to an external address (this will spend a UTXO)
        const sendSats = 546n;
        const externalSendAction = testWallet.action({
            outputs: [
                {
                    script: MOCK_DESTINATION_SCRIPT,
                    sats: sendSats,
                },
            ],
        });
        const externalSendBuilt = externalSendAction.build();

        // Capture the input(s) here so we know which utxo was spent
        const firstTxInputs = externalSendBuilt.txs[0].inputs.map(input => ({
            txid: input.prevOut.txid,
            outIdx: input.prevOut.outIdx,
        }));

        // Send the tx, thus spending firstTxInputs
        const externalSendResp = await externalSendBuilt.broadcast();
        expect(externalSendResp.success).to.equal(true);
        const firstTxid = externalSendResp.broadcasted[0];

        // Store the UTXO that was spent in the first transaction
        // We know it is only a single utxo from debug logs in this test
        const spentUtxo = firstTxInputs[0];

        // Step 3: Reset the wallet's UTXO set to still include the UTXO that was just spent
        // This simulates the wallet being out of sync - it still thinks it has a UTXO that was spent
        // We restore the UTXO set from before the external send
        testWallet.utxos = utxosBeforeExternalSend.map(utxo => ({
            ...utxo,
            outpoint: { ...utxo.outpoint },
        }));

        // Step 4: Without syncing, try to send a different tx
        // This should get a mempool conflict error, then sync, rebuild, and rebroadcast
        const duplicateSendAction = testWallet.action({
            outputs: [
                {
                    script: MOCK_DESTINATION_SCRIPT,
                    // We modify the sendSats to make sure we get a different rawTx and different txid
                    // If we do not do this, the wallet will just broadcast the same txid no problem
                    sats: sendSats + 1n,
                },
            ],
        });

        // The build is okay with no error, as there is no network state check when we build
        const duplicateSendBuilt = duplicateSendAction.build();

        // Verify that we built it with a used UTXO (one that was already spent in the first transaction)
        const duplicateSendInputs = duplicateSendBuilt.txs[0].inputs.map(
            input => ({
                txid: input.prevOut.txid,
                outIdx: input.prevOut.outIdx,
            }),
        );

        // The duplicate send should try to use the same UTXO that was already spent in the first transaction
        // This confirms the transaction was built with stale UTXO data
        expect(duplicateSendInputs).to.deep.include(spentUtxo);

        // Try to broadcast - this should fail with mempool conflict or missing inputs error
        // The code should then sync, rebuild, and rebroadcast successfully
        // NB verified we do see the error and rebroadcast in debug log; there is not a way to internally inspect
        // that in this test, tho you can follow the earlier logic to see how it would be impossible to broadcast
        // the already-spend utxo
        const resp = await duplicateSendBuilt.broadcast();

        // Should have successfully broadcast after sync and rebuild
        expect(resp.success).to.equal(true);
        expect(resp.broadcasted.length).to.equal(1);

        // Verify the tx was actually broadcast by checking chronik
        const tx = await chronik.tx(resp.broadcasted[0]);
        expect(tx.inputs.length).to.be.greaterThan(0);
        expect(tx.outputs.length).to.be.greaterThan(0);

        // The txid should be different from the first one (since it was rebuilt)
        expect(resp.broadcasted[0]).to.not.equal(firstTxid);
    });

    it('We can opt out of handling missing inputs error by syncing, rebuilding, and rebroadcasting', async () => {
        // Init the wallet
        const testWallet = Wallet.fromSk(fromHex('99'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, testWallet.script);

        // Sync to get real UTXOs
        await testWallet.sync();
        expect(testWallet.utxos.length).to.be.greaterThan(0);

        // Step 1: Send a tx to itself to create 5 UTXOs
        const selfSendSats = 200_000_00n; // 2M XEC split into 5 outputs
        const selfSendOutputs = Array.from({ length: 5 }, () => ({
            script: testWallet.script,
            sats: selfSendSats / 5n,
        }));
        const selfSendResp = await testWallet
            .action({ outputs: selfSendOutputs })
            .build()
            .broadcast();
        expect(selfSendResp.success).to.equal(true);

        // Sync to get the new UTXOs
        await testWallet.sync();

        // Capture the UTXO set BEFORE the external send (so we can restore it later)
        const utxosBeforeExternalSend = testWallet.utxos.map(utxo => ({
            ...utxo,
            outpoint: { ...utxo.outpoint },
        }));

        // Step 2: Send a tx to an external address (this will spend a UTXO)
        const sendSats = 546n;
        const externalSendAction = testWallet.action({
            outputs: [
                {
                    script: MOCK_DESTINATION_SCRIPT,
                    sats: sendSats,
                },
            ],
        });
        const externalSendBuilt = externalSendAction.build();

        // Capture the input(s) here so we know which utxo was spent
        const firstTxInputs = externalSendBuilt.txs[0].inputs.map(input => ({
            txid: input.prevOut.txid,
            outIdx: input.prevOut.outIdx,
        }));

        // Send the tx, thus spending firstTxInputs
        const externalSendResp = await externalSendBuilt.broadcast();
        expect(externalSendResp.success).to.equal(true);

        // Store the UTXO that was spent in the first transaction
        // We know it is only a single utxo from debug logs in this test
        const spentUtxo = firstTxInputs[0];

        // Step 3: Reset the wallet's UTXO set to still include the UTXO that was just spent
        // This simulates the wallet being out of sync - it still thinks it has a UTXO that was spent
        // We restore the UTXO set from before the external send
        testWallet.utxos = utxosBeforeExternalSend.map(utxo => ({
            ...utxo,
            outpoint: { ...utxo.outpoint },
        }));

        // Step 4: Without syncing, try to send a different tx
        const duplicateSendAction = testWallet.action({
            outputs: [
                {
                    script: MOCK_DESTINATION_SCRIPT,
                    // We modify the sendSats to make sure we get a different rawTx and different txid
                    // If we do not do this, the wallet will just broadcast the same txid no problem
                    sats: sendSats + 1n,
                },
            ],
        });

        // The build is okay with no error, as there is no network state check when we build
        const duplicateSendBuilt = duplicateSendAction.build();

        // Verify that we built it with a used UTXO (one that was already spent in the first transaction)
        const duplicateSendInputs = duplicateSendBuilt.txs[0].inputs.map(
            input => ({
                txid: input.prevOut.txid,
                outIdx: input.prevOut.outIdx,
            }),
        );

        // The duplicate send should try to use the same UTXO that was already spent in the first transaction
        // This confirms the transaction was built with stale UTXO data
        expect(duplicateSendInputs).to.deep.include(spentUtxo);

        // If we opt out of resyncing on utxo conflict, we get our expected error
        const resp = await duplicateSendBuilt.broadcast({
            retryOnUtxoConflict: false,
        });
        expect(resp.success).to.equal(false);
        expect(resp.errors).to.have.length(1);
        expect(resp.errors![0]).to.equal(
            'Error: Failed getting /broadcast-tx: 400: Broadcast failed: Transaction rejected by mempool: txn-mempool-conflict',
        );
    });

    it('We can add received UTXOs from a transaction using addReceivedTx()', async () => {
        // Create two wallets
        const walletA = Wallet.fromSk(fromHex('aa'.repeat(32)), chronik);
        const walletB = Wallet.fromSk(fromHex('bb'.repeat(32)), chronik);

        // Sync both wallets
        await walletA.sync();
        await walletB.sync();

        // Give wallet A a balance
        const inputSats = 1_000_000_00n; // 1M XEC
        await runner.sendToScript(inputSats, walletA.script);
        await walletA.sync();

        // Verify wallet A has balance and wallet B has 0 balance
        expect(walletA.balanceSats).to.equal(1_000_000_00n);
        expect(walletB.balanceSats).to.equal(0n);
        expect(walletB.utxos).to.have.length(0);

        // Wallet A sends to wallet B
        const sendSats = 100_000n; // 100k sats
        const sendAction = walletA.action({
            outputs: [
                {
                    script: walletB.script,
                    sats: sendSats,
                },
            ],
        });
        const sendResp = await sendAction.build().broadcast();
        expect(sendResp.success).to.equal(true);
        const txid = sendResp.broadcasted[0];

        // Get the transaction from chronik
        const tx = await chronik.tx(txid);

        // Verify wallet B still shows 0 balance (hasn't synced)
        expect(walletB.balanceSats).to.equal(0n);
        expect(walletB.utxos).to.have.length(0);

        // Clone wallet B to have another un-synced version
        const walletBClone = Wallet.fromSk(fromHex('bb'.repeat(32)), chronik);

        // Don't sync the clone - it should have 0 balance
        expect(walletBClone.balanceSats).to.equal(0n);
        expect(walletBClone.utxos).to.have.length(0);

        // Use addReceivedTx() on wallet B
        const result = walletB.addReceivedTx(tx);

        // Verify wallet B now has UTXOs and balance
        expect(walletB.utxos.length).to.equal(1);
        // Find the UTXO that was received
        const receivedUtxo = walletB.utxos.find(
            utxo =>
                utxo.outpoint.txid === txid &&
                utxo.sats === sendSats &&
                utxo.address === walletB.address,
        );

        expect(receivedUtxo?.outpoint.txid).to.equal(txid);
        expect(receivedUtxo?.outpoint.outIdx).to.equal(0);
        expect(receivedUtxo?.sats).to.equal(sendSats);
        expect(receivedUtxo?.address).to.equal(walletB.address);
        expect(walletB.balanceSats).to.equal(sendSats);

        // Verify balance deltas
        expect(result.balanceSatsDelta).to.equal(sendSats); // Received sendSats, no inputs spent
        expect(result.tokenDeltas.size).to.equal(0); // No token transactions

        // Sync the clone
        await walletBClone.sync();

        // Verify the clone has the same UTXO set and balance as wallet B
        expect(walletBClone.utxos.length).to.equal(walletB.utxos.length);
        expect(walletBClone.balanceSats).to.equal(walletB.balanceSats);

        // Verify both have the same received UTXO
        const cloneReceivedUtxo = walletBClone.utxos.find(
            utxo =>
                utxo.outpoint.txid === txid &&
                utxo.sats === sendSats &&
                utxo.address === walletBClone.address,
        );
        expect(cloneReceivedUtxo?.outpoint.txid).to.equal(
            receivedUtxo?.outpoint.txid,
        );
        expect(cloneReceivedUtxo?.outpoint.outIdx).to.equal(
            receivedUtxo?.outpoint.outIdx,
        );
        expect(cloneReceivedUtxo?.sats).to.equal(receivedUtxo?.sats);
    });
});
