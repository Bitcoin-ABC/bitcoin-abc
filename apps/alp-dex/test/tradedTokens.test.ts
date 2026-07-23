// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import type { ChronikClient, TokenInfo } from 'chronik-client';
import { MockChronikClient } from 'mock-chronik-client';
import { parseTradedConfigJson } from '../src/config/tradedConfig';
import { loadTradedTokens } from '../src/tokens/tradedTokens';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);
const MNEMONIC =
    'shift satisfy hammer fit plunge swear athlete gentle tragic sorry blush cheap';
const FEE = 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg';

const alpToken = (
    tokenId: string,
    decimals: number,
    ticker: string,
): TokenInfo => ({
    tokenId,
    tokenType: {
        protocol: 'ALP',
        type: 'ALP_TOKEN_TYPE_STANDARD',
        number: 0,
    },
    timeFirstSeen: 0,
    genesisInfo: {
        tokenTicker: ticker,
        tokenName: ticker,
        url: '',
        decimals,
        data: '',
        authPubkey: '',
    },
});

const config = () =>
    parseTradedConfigJson(
        JSON.stringify({
            port: 3003,
            mnemonic: MNEMONIC,
            feeAddress: FEE,
            chronikUrls: ['https://chronik.example.com'],
            pairs: [
                {
                    aTokenId: TOKEN_A,
                    bTokenId: TOKEN_B,
                    feePct: 0.01,
                    aUtxoQty: 20,
                    bUtxoQty: 1,
                },
            ],
        }),
    );

describe('tradedTokens', () => {
    it('loads ALP genesis and joins utxo sizes', async () => {
        const mock = new MockChronikClient();
        mock.setToken(TOKEN_A, alpToken(TOKEN_A, 2, 'AAA'));
        mock.setToken(TOKEN_B, alpToken(TOKEN_B, 0, 'BBB'));
        const chronik = mock as unknown as ChronikClient;

        const tokens = await loadTradedTokens(chronik, config());
        assert.strictEqual(tokens.get(TOKEN_A)!.decimals, 2);
        assert.strictEqual(tokens.get(TOKEN_A)!.utxoAtoms, 2000n);
        assert.strictEqual(tokens.get(TOKEN_A)!.tokenTicker, 'AAA');
        assert.strictEqual(tokens.get(TOKEN_B)!.utxoAtoms, 1n);
    });

    it('rejects non-ALP tokens', async () => {
        const mock = new MockChronikClient();
        mock.setToken(TOKEN_A, {
            ...alpToken(TOKEN_A, 2, 'AAA'),
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
        });
        mock.setToken(TOKEN_B, alpToken(TOKEN_B, 0, 'BBB'));
        await assert.rejects(
            () => loadTradedTokens(mock as unknown as ChronikClient, config()),
            /expected ALP/,
        );
    });

    it('rejects Chronik token errors', async () => {
        const mock = new MockChronikClient();
        mock.setToken(TOKEN_A, new Error('not found'));
        mock.setToken(TOKEN_B, alpToken(TOKEN_B, 0, 'BBB'));
        await assert.rejects(
            () => loadTradedTokens(mock as unknown as ChronikClient, config()),
            /Failed to fetch Chronik genesis/,
        );
    });
});
