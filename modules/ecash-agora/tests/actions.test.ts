// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * actions.test.ts
 *
 * Show src/actions.ts can be used to create actions
 * that lead to valid agora txs broadcast by ecash-wallet
 */

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    toHex,
    fromHex,
    payment,
    SLP_TOKEN_TYPE_FUNGIBLE,
    ALP_TOKEN_TYPE_STANDARD,
    SLP_TOKEN_TYPE_MINT_VAULT,
    SLP_TOKEN_TYPE_NFT1_GROUP,
    SLP_TOKEN_TYPE_NFT1_CHILD,
    slpSend,
    Address,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Wallet } from 'ecash-wallet';
import { Agora } from '../src/agora';
import { AgoraOneshot } from '../src/oneshot';
import { getAgoraPaymentAction } from '../src/actions';

use(chaiAsPromised);

// Configure available satoshis
const NUM_COINS = 500;
const COIN_VALUE = 1100000000n;

describe('We can use ecash-wallet to create desired on-spec Agora txs', () => {
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
    it('We can handle ALP ALP_TOKEN_TYPE_STANDARD agora actions', async () => {
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

        // We can list an ALP token with an agora partial
        const agora = new Agora(chronik);

        // Use selectParams to get an agora partial with the correct params
        const alpAgoraPartial = await agora.selectParams(
            {
                offeredAtoms: genesisMintQtyAlpha,
                priceNanoSatsPerAtom: 1_000_000_000n, // i.e. 1 sat per atom
                makerPk: alpWallet.pk,
                minAcceptedAtoms: 546n, // so, min accept is dust
                tokenId: alpGenesisTokenId,
                tokenType: ALP_TOKEN_TYPE_STANDARD.number,
                tokenProtocol: 'ALP',
            },
            32n,
        );

        // Get the payment action
        const alpListPaymentAction = getAgoraPaymentAction({
            type: 'LIST',
            tokenType: ALP_TOKEN_TYPE_STANDARD,
            variant: { type: 'PARTIAL', params: alpAgoraPartial },
        });

        // Broadcast the agora LIST
        await alpWallet.action(alpListPaymentAction).build().broadcast();

        // Verify we can find the listing with Agora
        const activeListingsByTokenId =
            await agora.activeOffersByTokenId(alpGenesisTokenId);
        expect(activeListingsByTokenId.length).to.equal(1);
        expect(activeListingsByTokenId[0].token.tokenId).to.equal(
            alpGenesisTokenId,
        );
    });
    it('We cannot handle SLP SLP_TOKEN_TYPE_FUNGIBLE agora actions', async () => {
        // Create a partial
        // We can list an ALP token with an agora partial
        const agora = new Agora(chronik);

        // Use selectParams to get an agora partial with the correct params
        const slpFungibleAgoraPartial = await agora.selectParams(
            {
                offeredAtoms: 5_000n,
                priceNanoSatsPerAtom: 1_000_000_000n, // i.e. 1 sat per atom
                makerPk: fromHex('04' + '13'.repeat(64)),
                minAcceptedAtoms: 546n, // so, min accept is dust
                tokenId: '11'.repeat(32),
                tokenType: SLP_TOKEN_TYPE_FUNGIBLE.number,
                tokenProtocol: 'SLP',
            },
            32n,
        );

        // We throw expected error if we try to LIST
        expect(() =>
            getAgoraPaymentAction({
                type: 'LIST',
                tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                variant: { type: 'PARTIAL', params: slpFungibleAgoraPartial },
            }),
        ).to.throw('SLP is not currently supported.');
    });
    it('We cannot handle SLP SLP_TOKEN_TYPE_NFT1_GROUP token actions', async () => {
        // Create a partial
        // We can list an ALP token with an agora partial
        const agora = new Agora(chronik);

        // Use selectParams to get an agora partial with the correct params
        const slpNft1GroupAgoraPartial = await agora.selectParams(
            {
                offeredAtoms: 1_000n,
                priceNanoSatsPerAtom: 1_000_000_000n, // i.e. 1 sat per atom
                makerPk: fromHex('04' + '13'.repeat(64)),
                minAcceptedAtoms: 546n, // so, min accept is dust
                tokenId: '11'.repeat(32),
                tokenType: SLP_TOKEN_TYPE_NFT1_GROUP.number,
                tokenProtocol: 'SLP',
            },
            32n,
        );

        // Expect error because we do not support minting SLP_TOKEN_TYPE_NFT1_GROUP tokens
        expect(() =>
            getAgoraPaymentAction({
                type: 'LIST',
                tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                variant: { type: 'PARTIAL', params: slpNft1GroupAgoraPartial },
            }),
        ).to.throw('SLP is not currently supported.');
    });
    it('We cannot handle SLP SLP_TOKEN_TYPE_NFT1_CHILD token actions', async () => {
        // Create a ONESHOT offer for this NFT
        const slpNft1GroupOneshot = new AgoraOneshot({
            enforcedOutputs: [
                {
                    sats: 0n,
                    script: slpSend(
                        '11'.repeat(32),
                        SLP_TOKEN_TYPE_NFT1_CHILD.number,
                        [1n],
                    ),
                },
                {
                    sats: 10_000n,
                    script: Address.p2pkh('11'.repeat(20)).toScript(),
                },
            ],
            cancelPk: fromHex('04' + '13'.repeat(64)),
        });

        expect(() =>
            getAgoraPaymentAction({
                type: 'LIST',
                tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                variant: { type: 'ONESHOT', params: slpNft1GroupOneshot },
            }),
        ).to.throw('SLP is not currently supported.');
    });
    it('We cannot handle SLP SLP_TOKEN_TYPE_MINT_VAULT agora actions', async () => {
        // Create a partial
        // We can list an ALP token with an agora partial
        const agora = new Agora(chronik);

        // Use selectParams to get an agora partial with the correct params
        const slpMintVaultAgoraPartial = await agora.selectParams(
            {
                offeredAtoms: 1_000n,
                priceNanoSatsPerAtom: 1_000_000_000n, // i.e. 1 sat per atom
                makerPk: fromHex('04' + '13'.repeat(64)),
                minAcceptedAtoms: 546n, // so, min accept is dust
                tokenId: '11'.repeat(32),
                tokenType: SLP_TOKEN_TYPE_MINT_VAULT.number,
                tokenProtocol: 'SLP',
            },
            32n,
        );

        // Expect error because we do not support MINT for SLP_TOKEN_TYPE_MINT_VAULT tokens
        expect(() =>
            getAgoraPaymentAction({
                type: 'LIST',
                tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                variant: { type: 'PARTIAL', params: slpMintVaultAgoraPartial },
            }),
        ).to.throw('SLP is not currently supported.');
    });
});
