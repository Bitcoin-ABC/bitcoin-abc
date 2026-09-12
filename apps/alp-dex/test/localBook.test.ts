// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import {
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    Script,
    Tx,
    fromHex,
} from 'ecash-lib';
import type { Wallet, WalletUtxo } from 'ecash-wallet';
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
});
