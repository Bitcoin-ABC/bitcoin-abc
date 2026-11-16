// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { ChronikError, type ChronikClient } from 'chronik-client';
import {
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    Script,
    Tx,
    fromHex,
} from 'ecash-lib';
import type { Wallet, WalletUtxo } from 'ecash-wallet';
import { SETTLE_PENDING_UNSEEN_MS } from '../src/constants';
import {
    LocalBook,
    applySlushUtxos,
    removeSellerOutpoints,
    slushUtxosFromFill,
} from '../src/inventory/localBook';
import type { ParsedPartiallySignedSwap } from '../src/settle/parseSwap';
import type { TradedTokens } from '../src/tokens/tradedTokens';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);
const slushScriptHex = '76a914' + '11'.repeat(20) + '88ac';
const feeScriptHex = '76a914' + '22'.repeat(20) + '88ac';
const buyerScriptHex = '76a914' + '44'.repeat(20) + '88ac';
const FILL_TXID = 'ab'.repeat(32);

const stubWallet = (address: string, utxos: WalletUtxo[] = []): Wallet =>
    ({
        address,
        utxos,
        updateBalance: () => undefined,
    }) as unknown as Wallet;

const sellerUtxo = (txid: string, outIdx: number): WalletUtxo => ({
    outpoint: { txid, outIdx },
    blockHeight: 800_000,
    isCoinbase: false,
    sats: DEFAULT_DUST_SATS,
    isFinal: true,
    token: {
        tokenId: TOKEN_B,
        tokenType: ALP_TOKEN_TYPE_STANDARD,
        atoms: 200_000n,
        isMintBaton: false,
    },
    address: 'ecash:seller',
});

const parsedSwap = (): ParsedPartiallySignedSwap => ({
    outputs: [
        { tokenId: TOKEN_A, atoms: 10_000n, script: slushScriptHex },
        { tokenId: TOKEN_A, atoms: 200n, script: feeScriptHex },
        { tokenId: TOKEN_B, atoms: 4_997n, script: buyerScriptHex },
        { tokenId: TOKEN_B, atoms: 195_003n, script: slushScriptHex },
    ],
    fromTokenId: TOKEN_A,
    toTokenId: TOKEN_B,
    feeInFromAtoms: 200n,
    platformFeeInFromAtoms: 0n,
    atomsFrom: 10_200n,
    atomsTo: 4_997n,
    effectiveRate: 0.4997,
});

const swapTx = (): Tx =>
    new Tx({
        inputs: [],
        outputs: [
            { sats: 0n, script: new Script() },
            {
                sats: DEFAULT_DUST_SATS,
                script: new Script(fromHex(slushScriptHex)),
            },
            {
                sats: DEFAULT_DUST_SATS,
                script: new Script(fromHex(feeScriptHex)),
            },
            {
                sats: DEFAULT_DUST_SATS,
                script: new Script(fromHex(buyerScriptHex)),
            },
            {
                sats: DEFAULT_DUST_SATS,
                script: new Script(fromHex(slushScriptHex)),
            },
        ],
    });

const tradedTokens = (): TradedTokens =>
    new Map([
        [
            TOKEN_A,
            {
                tokenId: TOKEN_A,
                decimals: 4,
                utxoQty: 20,
                utxoAtoms: 200_000n,
                tokenTicker: 'A',
                tokenName: 'Token A',
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        ],
        [
            TOKEN_B,
            {
                tokenId: TOKEN_B,
                decimals: 4,
                utxoQty: 20,
                utxoAtoms: 200_000n,
                tokenTicker: 'B',
                tokenName: 'Token B',
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        ],
    ]);

describe('localBook', () => {
    it('credits slush price-leg and toToken change from the parsed swap', () => {
        const slush = stubWallet('ecash:slush');
        const utxos = slushUtxosFromFill(
            swapTx(),
            FILL_TXID,
            slush,
            slushScriptHex,
            parsedSwap(),
            tradedTokens(),
        );
        assert.strictEqual(utxos.length, 2);
        assert.strictEqual(utxos[0]!.outpoint.outIdx, 1);
        assert.strictEqual(utxos[0]!.token?.tokenId, TOKEN_A);
        assert.strictEqual(utxos[0]!.token?.atoms, 10_000n);
        assert.strictEqual(utxos[1]!.outpoint.outIdx, 4);
        assert.strictEqual(utxos[1]!.token?.tokenId, TOKEN_B);
        assert.strictEqual(utxos[1]!.token?.atoms, 195_003n);
    });

    it('does not duplicate slush outpoints on apply', () => {
        const slush = stubWallet('ecash:slush');
        const utxos = slushUtxosFromFill(
            swapTx(),
            FILL_TXID,
            slush,
            slushScriptHex,
            parsedSwap(),
            tradedTokens(),
        );
        applySlushUtxos(slush, utxos);
        applySlushUtxos(slush, utxos);
        assert.strictEqual(slush.utxos.length, 2);
    });

    it('marks an existing unfinal slush outpoint final when the fill is booked', () => {
        const slush = stubWallet('ecash:slush');
        const utxos = slushUtxosFromFill(
            swapTx(),
            FILL_TXID,
            slush,
            slushScriptHex,
            parsedSwap(),
            tradedTokens(),
        );
        const indexed = utxos.map(utxo => ({ ...utxo, isFinal: false }));
        const wallet = stubWallet('ecash:slush', indexed);
        applySlushUtxos(wallet, utxos);
        assert.strictEqual(wallet.utxos.length, 2);
        assert.ok(wallet.utxos.every(utxo => utxo.isFinal === true));
    });

    it('re-applies a fill after Chronik sync restores spent seller UTXOs', () => {
        const spent = { txid: '11'.repeat(32), outIdx: 0 };
        const seller = stubWallet('ecash:seller', [sellerUtxo(spent.txid, 0)]);
        const slush = stubWallet('ecash:slush');
        const book = new LocalBook();
        const slushUtxos = slushUtxosFromFill(
            swapTx(),
            FILL_TXID,
            slush,
            slushScriptHex,
            parsedSwap(),
            tradedTokens(),
        );
        book.record({ slushUtxos, sellerSpent: [spent] }, slush);
        assert.strictEqual(slush.utxos.length, 2);

        seller.utxos = [sellerUtxo(spent.txid, 0)];
        slush.utxos = [];
        book.afterSync(seller, slush);
        assert.strictEqual(seller.utxos.length, 0);
        assert.strictEqual(slush.utxos.length, 2);
        assert.strictEqual(slush.utxos[0]!.token?.atoms, 10_000n);
    });

    it('drops a fill once Chronik no longer shows the spent seller outs', () => {
        const spent = { txid: '11'.repeat(32), outIdx: 0 };
        const slushUtxos = slushUtxosFromFill(
            swapTx(),
            FILL_TXID,
            stubWallet('ecash:slush'),
            slushScriptHex,
            parsedSwap(),
            tradedTokens(),
        );
        const slush = stubWallet('ecash:slush', [...slushUtxos]);
        const seller = stubWallet('ecash:seller');
        const book = new LocalBook();
        book.record({ slushUtxos, sellerSpent: [spent] }, slush);
        assert.strictEqual(slush.utxos.length, 2);
        book.afterSync(seller, slush);
        assert.strictEqual(slush.utxos.length, 2);
        assert.strictEqual(seller.utxos.length, 0);
    });

    it('does not re-credit slush after Chronik indexed and slush outs were spent', () => {
        const spent = { txid: '11'.repeat(32), outIdx: 0 };
        const slushUtxos = slushUtxosFromFill(
            swapTx(),
            FILL_TXID,
            stubWallet('ecash:slush'),
            slushScriptHex,
            parsedSwap(),
            tradedTokens(),
        );
        const seller = stubWallet('ecash:seller');
        const slush = stubWallet('ecash:slush');
        const book = new LocalBook();
        book.record({ slushUtxos, sellerSpent: [spent] }, slush);
        slush.utxos = [];
        book.afterSync(seller, slush);
        assert.strictEqual(slush.utxos.length, 0);
    });

    it('removeSellerOutpoints drops matching seller UTXOs', () => {
        const spent = { txid: '22'.repeat(32), outIdx: 3 };
        const seller = stubWallet('ecash:seller', [
            sellerUtxo(spent.txid, 3),
            sellerUtxo('33'.repeat(32), 0),
        ]);
        removeSellerOutpoints(seller, [spent]);
        assert.strictEqual(seller.utxos.length, 1);
        assert.strictEqual(seller.utxos[0]!.outpoint.txid, '33'.repeat(32));
    });

    const chronikTx = (
        result: { isFinal: boolean } | 'missing',
    ): Pick<ChronikClient, 'tx'> =>
        ({
            tx: async () => {
                if (result === 'missing') {
                    throw new ChronikError('not found', 404);
                }
                return result;
            },
        }) as Pick<ChronikClient, 'tx'>;

    const pendingFill = (seen: boolean, heldAtMs: number) => {
        const spent = { txid: '11'.repeat(32), outIdx: 0 };
        const slushUtxos = slushUtxosFromFill(
            swapTx(),
            FILL_TXID,
            stubWallet('ecash:slush'),
            slushScriptHex,
            parsedSwap(),
            tradedTokens(),
        );
        return {
            spent,
            pending: {
                txid: FILL_TXID,
                slushUtxos,
                sellerSpent: [spent],
                seen,
                heldAtMs,
                tokenIds: [TOKEN_A, TOKEN_B],
            },
        };
    };

    it('keeps an unseen pending settle withheld on a 404', async () => {
        const { spent, pending } = pendingFill(false, Date.now());
        const seller = stubWallet('ecash:seller', [sellerUtxo(spent.txid, 0)]);
        const slush = stubWallet('ecash:slush');
        const book = new LocalBook();
        book.hold(pending);
        await book.reconcilePending(chronikTx('missing'), seller, slush);
        assert.strictEqual(seller.utxos.length, 0);
        assert.strictEqual(slush.utxos.length, 0);
        await book.reconcilePending(
            chronikTx({ isFinal: true }),
            seller,
            slush,
        );
        assert.strictEqual(slush.utxos.length, 2);
    });

    it('books a pending settle once Chronik shows the tx final', async () => {
        const { spent, pending } = pendingFill(false, Date.now());
        const seller = stubWallet('ecash:seller', [sellerUtxo(spent.txid, 0)]);
        const slush = stubWallet('ecash:slush');
        const book = new LocalBook();
        book.hold(pending);
        await book.reconcilePending(
            chronikTx({ isFinal: true }),
            seller,
            slush,
        );
        assert.strictEqual(slush.utxos.length, 2);
        book.afterSync(seller, slush);
        assert.strictEqual(seller.utxos.length, 0);
        assert.strictEqual(slush.utxos.length, 2);
    });

    it('releases a seen pending settle when the tx is gone and coins are unspent', async () => {
        const { spent, pending } = pendingFill(false, Date.now());
        const seller = stubWallet('ecash:seller', [sellerUtxo(spent.txid, 0)]);
        const slush = stubWallet('ecash:slush');
        const book = new LocalBook();
        book.hold(pending);
        await book.reconcilePending(
            chronikTx({ isFinal: false }),
            seller,
            slush,
        );
        assert.strictEqual(seller.utxos.length, 0);
        seller.utxos = [sellerUtxo(spent.txid, 0)];
        await book.reconcilePending(chronikTx('missing'), seller, slush);
        assert.strictEqual(seller.utxos.length, 1);
        assert.strictEqual(slush.utxos.length, 0);
        await book.reconcilePending(
            chronikTx({ isFinal: true }),
            seller,
            slush,
        );
        assert.strictEqual(slush.utxos.length, 0);
    });

    it('releases an unseen pending settle after the hold expires', async () => {
        const { spent, pending } = pendingFill(
            false,
            Date.now() - SETTLE_PENDING_UNSEEN_MS - 1,
        );
        const seller = stubWallet('ecash:seller', [sellerUtxo(spent.txid, 0)]);
        const slush = stubWallet('ecash:slush');
        const book = new LocalBook();
        book.hold(pending);
        await book.reconcilePending(chronikTx('missing'), seller, slush);
        assert.strictEqual(seller.utxos.length, 1);
        assert.strictEqual(slush.utxos.length, 0);
        assert.strictEqual(book.pricingPaused(TOKEN_A), false);
    });

    it('pauses pricing for tokens a pending settle has only half-applied', () => {
        const { pending } = pendingFill(false, Date.now());
        const book = new LocalBook();
        assert.strictEqual(book.pricingPaused(TOKEN_B), false);
        book.hold(pending);
        assert.strictEqual(book.pricingPaused(TOKEN_A), true);
        assert.strictEqual(book.pricingPaused(TOKEN_B), true);
        assert.throws(
            () => book.assertPricingOpen(TOKEN_A, TOKEN_B),
            /pending finality/,
        );
    });

    it('sets isFinal on slush outs Chronik indexed before the fill was booked', async () => {
        const { pending } = pendingFill(true, Date.now());
        const indexed = pending.slushUtxos.map(utxo => ({
            ...utxo,
            isFinal: false,
        }));
        const slush = stubWallet('ecash:slush', indexed);
        const seller = stubWallet('ecash:seller');
        const book = new LocalBook();
        book.hold(pending);
        await book.reconcilePending(
            chronikTx({ isFinal: true }),
            seller,
            slush,
        );
        book.afterSync(seller, slush);
        assert.strictEqual(slush.utxos.length, 2);
        assert.ok(slush.utxos.every(utxo => utxo.isFinal === true));
        assert.strictEqual(book.pricingPaused(TOKEN_A), false);
    });
});
