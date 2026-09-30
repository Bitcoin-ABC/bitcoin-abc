// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    alpRedeemUserMessage,
    settleAlpRedeemExactIn,
} from 'components/Etokens/settleAlpRedeem';
import { SwapTemplateResponse } from 'services/alpSwapService';
import { alpSwap, FIRMA_TOKEN_ID, XECX_TOKEN_ID } from 'config/alpSwap';
import * as alpSwapService from 'services/alpSwapService';
import * as buildPostage from 'components/AlpSwap/buildPostage';

jest.mock('services/alpSwapService', () => {
    const actual = jest.requireActual('services/alpSwapService');
    return {
        ...actual,
        fetchStatus: jest.fn(),
        settleSwap: jest.fn(),
    };
});

jest.mock('components/AlpSwap/buildPostage', () => ({
    buildAlpSwapPostageTx: jest.fn(),
}));

describe('settleAlpRedeemExactIn', () => {
    const wallet = { script: {} } as never;
    const acceptedTemplate: SwapTemplateResponse = {
        price: 1_000_000,
        fee: 0,
        rate: 0.000008,
        feePct: 0.01,
        priceImpactPct: 0.5,
        outputs: [
            { tokenId: XECX_TOKEN_ID, atoms: '100000000', script: 'ab' },
            { tokenId: FIRMA_TOKEN_ID, atoms: '80000' },
        ],
        slushScript: 'cd',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (alpSwapService.fetchStatus as jest.Mock).mockResolvedValue({
            tradedPairs: [
                {
                    aTokenId: XECX_TOKEN_ID,
                    bTokenId: FIRMA_TOKEN_ID,
                    feePct: 0.01,
                    aUtxoQty: 1_000_000,
                    bUtxoQty: 1,
                },
            ],
            tradedTokens: [
                { tokenId: XECX_TOKEN_ID, decimals: 2, utxoQty: 1_000_000 },
                { tokenId: FIRMA_TOKEN_ID, decimals: 4, utxoQty: 1 },
            ],
        });
        (buildPostage.buildAlpSwapPostageTx as jest.Mock).mockReturnValue({
            postageTx: {},
            serializedTxHex: '00',
            prePostageInputSats: 1000n,
            receivingTokenId: FIRMA_TOKEN_ID,
            receivingTokenAtoms: 80000n,
        });
        (alpSwapService.settleSwap as jest.Mock).mockResolvedValue({
            success: true,
            txid: 'ab'.repeat(32),
        });
    });

    it('settles an exact-in XECX→FIRMA redeem', async () => {
        const result = await settleAlpRedeemExactIn({
            wallet,
            fromTokenId: XECX_TOKEN_ID,
            toTokenId: FIRMA_TOKEN_ID,
            fromQty: 1_000_000,
            fromDecimals: 2,
            toDecimals: 4,
            template: acceptedTemplate,
        });
        expect(result.txid).toBe('ab'.repeat(32));
        expect(result.amountOut).toBeCloseTo(8);
        expect(alpSwapService.settleSwap).toHaveBeenCalled();
        expect(buildPostage.buildAlpSwapPostageTx).toHaveBeenCalledWith(
            expect.objectContaining({
                outputs: acceptedTemplate.outputs,
            }),
        );
    });

    it('does not settle a template that pays more than the accepted qty', async () => {
        await expect(
            settleAlpRedeemExactIn({
                wallet,
                fromTokenId: XECX_TOKEN_ID,
                toTokenId: FIRMA_TOKEN_ID,
                fromQty: 1_000_000,
                fromDecimals: 2,
                toDecimals: 4,
                template: {
                    ...acceptedTemplate,
                    outputs: [
                        {
                            tokenId: XECX_TOKEN_ID,
                            atoms: '999999999',
                            script: 'ab',
                        },
                        { tokenId: FIRMA_TOKEN_ID, atoms: '80000' },
                    ],
                },
            }),
        ).rejects.toThrow('Swap quote does not match the accepted amount');
        expect(alpSwapService.settleSwap).not.toHaveBeenCalled();
    });

    it('rejects a non-positive qty', async () => {
        await expect(
            settleAlpRedeemExactIn({
                wallet,
                fromTokenId: XECX_TOKEN_ID,
                toTokenId: FIRMA_TOKEN_ID,
                fromQty: 0,
                fromDecimals: 2,
                toDecimals: 4,
                template: acceptedTemplate,
            }),
        ).rejects.toThrow('Enter a redeem amount');
    });
});

describe('alpRedeemUserMessage', () => {
    it('maps fetch failures to the unavailable banner', () => {
        expect(
            alpRedeemUserMessage(new TypeError('Failed to fetch'), 'x'),
        ).toBe(alpSwap.unavailableMessage);
    });
});
