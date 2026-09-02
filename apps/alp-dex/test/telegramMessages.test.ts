// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { Script } from 'ecash-lib';
import type { ParsedPartiallySignedSwap } from '../src/settle/parseSwap';
import {
    ECASH_EXPLORER_BASE_URL,
    fallbackTokenLabel,
    formatPriceImpact,
    formatSignificantFigures,
    formatTokenQty,
    formatXec,
    getBroadcastFailedMessage,
    getFormerInventoryNotice,
    getInvalidSwapMessage,
    getSwapFailedMessage,
    getSwapSuccessfulMessage,
    previewAddressLabel,
} from '../src/ops/telegramMessages';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);

const TEST_USER = 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';
const TEST_USER_SCRIPT = Script.fromAddress(TEST_USER).toHex();

const createMockParsedSwap = (
    fromTokenId: string,
    toTokenId: string,
    atomsFrom: bigint,
    atomsTo: bigint,
    feeAtoms: bigint = 0n,
): ParsedPartiallySignedSwap => {
    const outputs: ParsedPartiallySignedSwap['outputs'] = [
        {
            tokenId: fromTokenId,
            atoms: atomsFrom - feeAtoms,
            script: 'slush_script_hex',
        },
    ];
    if (feeAtoms > 0n) {
        outputs.push({
            tokenId: fromTokenId,
            atoms: feeAtoms,
            script: 'fee_script_hex',
        });
    }
    outputs.push({
        tokenId: toTokenId,
        atoms: atomsTo,
        script: TEST_USER_SCRIPT,
    });
    return {
        outputs,
        fromTokenId,
        toTokenId,
        feeInFromAtoms: feeAtoms,
        platformFeeInFromAtoms: 0n,
        atomsFrom,
        atomsTo,
        effectiveRate: Number(atomsTo) / Number(atomsFrom),
    };
};

describe('telegram message builders', () => {
    it('previews addresses and formats XEC', () => {
        assert.strictEqual(previewAddressLabel(TEST_USER), 'z2.035');
        assert.strictEqual(previewAddressLabel('Unknown'), 'nk.own');
        assert.strictEqual(formatXec(1000n), '10.00 XEC');
        assert.strictEqual(formatXec(100_000n), '1,000.00 XEC');
        assert.ok(fallbackTokenLabel(TOKEN_A).includes('aaaaaaaa'));
    });

    it('formats token qtys with locale grouping', () => {
        assert.strictEqual(formatTokenQty(100_0000n, 4), '100');
        assert.strictEqual(formatTokenQty(51n, 4), '0.0051');
        assert.strictEqual(formatTokenQty(2_171_731_97n, 2), '2,171,731.97');
        assert.strictEqual(formatTokenQty(-14_92n, 2), '-14.92');
    });

    it('formats rates to 4 significant figures', () => {
        assert.strictEqual(formatSignificantFigures(147656), '147,700');
        assert.strictEqual(formatSignificantFigures(147014.796036), '147,000');
        assert.strictEqual(formatSignificantFigures(0.95), '0.9500');
        assert.strictEqual(formatSignificantFigures(0.00000677), '0.000006770');
        assert.strictEqual(formatSignificantFigures(0), '0');
    });

    it('formats price impact percents', () => {
        assert.strictEqual(formatPriceImpact(1.234), '1.23%');
        assert.strictEqual(formatPriceImpact(0), '0.00%');
        assert.strictEqual(formatPriceImpact(0.004), '&lt;0.01%');
        assert.strictEqual(formatPriceImpact(-0.004), '-&lt;0.01%');
    });

    it('builds invalid swap HTML with explorer token links', () => {
        const message = getInvalidSwapMessage({
            parsedSwap: createMockParsedSwap(
                TOKEN_A,
                TOKEN_B,
                100_0000n,
                95_0000n,
            ),
            currentRate: 0.95,
            fromDecimals: 4,
            toDecimals: 4,
            fromTicker: 'USD',
            toTicker: 'CHF',
        });
        assert.ok(message.includes('❌ <b>Invalid Swap Attempt</b>'));
        assert.ok(
            message.includes(`${ECASH_EXPLORER_BASE_URL}/token/${TOKEN_A}`),
        );
        assert.ok(message.includes('>USD</a>'));
        assert.strictEqual(
            message.split(`${ECASH_EXPLORER_BASE_URL}/token/${TOKEN_A}`)
                .length - 1,
            1,
        );
        assert.strictEqual(
            message.split(`${ECASH_EXPLORER_BASE_URL}/token/${TOKEN_B}`)
                .length - 1,
            1,
        );
        assert.ok(message.includes('<b>From:</b> 100 USD'));
        assert.ok(message.includes('<b>To:</b> 95 CHF'));
        assert.ok(message.includes('z2.035'));
        assert.ok(message.includes('0.9500'));
        assert.ok(!message.includes('0.950000'));
        assert.ok(message.includes('validation error'));
    });

    it('builds broadcast-failed HTML and escapes error text', () => {
        const message = getBroadcastFailedMessage({
            parsedSwap: createMockParsedSwap(
                TOKEN_A,
                TOKEN_B,
                100_0000n,
                95_0000n,
                2_0000n,
            ),
            errorMsg: 'Network <down>',
            fromDecimals: 4,
            toDecimals: 4,
            fromTicker: 'USD',
            toTicker: 'CHF',
        });
        assert.ok(message.includes('❌ <b>Swap Broadcast Failed</b>'));
        assert.ok(message.includes('<b>From:</b> 100 '));
        assert.ok(message.includes('<code>Network &lt;down&gt;</code>'));
        assert.ok(!message.includes('<code>Network <down></code>'));
    });

    it('builds successful swap HTML with fee, postage, and tx link', () => {
        const txid = 'abc123def456';
        const message = getSwapSuccessfulMessage({
            parsedSwap: createMockParsedSwap(
                TOKEN_A,
                TOKEN_B,
                100_0000n,
                95_0000n,
                2_0000n,
            ),
            currentRate: 0.95,
            postagePaidSats: 1000n,
            txid,
            fromDecimals: 4,
            toDecimals: 4,
            fromTicker: 'BUTTER',
            toTicker: 'GUNS',
            username: 'alice',
            priceImpactPct: 1.234,
        });
        assert.ok(message.includes('✅ <b>Swap Successful</b>'));
        assert.ok(message.includes('<b>Fee:</b> 2 BUTTER (2.0%)'));
        assert.ok(message.includes('(2.0%)'));
        assert.ok(message.includes('<b>Postage:</b> 10.00 XEC'));
        assert.ok(message.includes('<b>User:</b> @alice'));
        assert.ok(message.includes('<b>Price impact:</b> 1.23%'));
        assert.ok(message.includes(`${ECASH_EXPLORER_BASE_URL}/tx/${txid}`));
        assert.ok(message.includes('View Transaction'));
        assert.strictEqual(
            message.split(`${ECASH_EXPLORER_BASE_URL}/token/${TOKEN_A}`)
                .length - 1,
            1,
        );
        assert.strictEqual(
            message.split(`${ECASH_EXPLORER_BASE_URL}/token/${TOKEN_B}`)
                .length - 1,
            1,
        );
        assert.ok(message.includes('<b>From:</b> 100 BUTTER'));
        assert.ok(message.includes('0.9500 GUNS'));
    });

    it('locale-formats large token qtys and 4-sig-fig rates', () => {
        const message = getSwapSuccessfulMessage({
            parsedSwap: createMockParsedSwap(
                TOKEN_A,
                TOKEN_B,
                14_9200n,
                217_173_197n,
                1478n,
            ),
            currentRate: 147014.796036,
            postagePaidSats: 1000n,
            txid: 'bigswap',
            fromDecimals: 4,
            toDecimals: 2,
            fromTicker: 'FIRMA',
            toTicker: 'XECX',
            priceImpactPct: 0.004,
        });
        assert.ok(message.includes('<b>From:</b> 14.92 FIRMA'));
        assert.ok(message.includes('<b>To:</b> 2,171,731.97 XECX'));
        assert.ok(message.includes('147,000 XECX'));
        assert.ok(message.includes('<b>Price impact:</b> &lt;0.01%'));
        assert.ok(!message.includes('147014.796036'));
    });

    it('builds successful zero-fee swap HTML', () => {
        const message = getSwapSuccessfulMessage({
            parsedSwap: createMockParsedSwap(
                TOKEN_B,
                TOKEN_A,
                100_0000n,
                105_0000n,
            ),
            currentRate: 1.05,
            postagePaidSats: 2000n,
            txid: 'def456',
            fromDecimals: 4,
            toDecimals: 4,
            fromTicker: 'CHF',
            toTicker: 'USD',
        });
        assert.ok(message.includes('<b>Fee:</b> 0%'));
        assert.ok(message.includes('<b>Postage:</b> 20.00 XEC'));
        assert.ok(!message.includes('<b>User:</b>'));
    });

    it('builds failed swap HTML with and without parsedSwap', () => {
        const withParsed = getSwapFailedMessage({
            parsedSwap: createMockParsedSwap(
                TOKEN_A,
                TOKEN_B,
                100_0000n,
                95_0000n,
            ),
            errorMsg: 'Insufficient balance',
            fromDecimals: 4,
            toDecimals: 4,
            fromTicker: 'USD',
            toTicker: 'CHF',
        });
        assert.ok(withParsed.includes('❌ <b>Swap Failed</b>'));
        assert.ok(withParsed.includes('<b>From:</b> 100 '));
        assert.ok(withParsed.includes('<code>Insufficient balance</code>'));

        const without = getSwapFailedMessage({
            parsedSwap: null,
            errorMsg: 'Transaction parsing failed',
            fromTokenId: TOKEN_A,
            toTokenId: TOKEN_B,
            fromDecimals: 4,
            toDecimals: 4,
            fromTicker: 'USD',
            toTicker: 'CHF',
        });
        assert.ok(
            without.includes(`${ECASH_EXPLORER_BASE_URL}/token/${TOKEN_A}`),
        );
        assert.ok(without.includes('nk.own'));
        assert.ok(!without.includes('<b>From:</b>'));
    });

    it('builds former-inventory notice with token links', () => {
        const message = getFormerInventoryNotice({
            sellerAddress: TEST_USER,
            piles: [
                {
                    tokenId: TOKEN_A,
                    atoms: 10000n,
                    utxoCount: 5294,
                    tokenTicker: 'BUTTER',
                },
            ],
        });
        assert.ok(message.includes('Former inventory left on seller'));
        assert.ok(message.includes('5294×'));
        assert.ok(message.includes('BUTTER'));
        assert.ok(
            message.includes(`${ECASH_EXPLORER_BASE_URL}/token/${TOKEN_A}`),
        );
        assert.ok(message.includes('were <b>not</b> swept to fee'));
    });
});
