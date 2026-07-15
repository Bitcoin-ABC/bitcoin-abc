// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    consumeAlpSwapSettleTxid,
    isAlpSwapBuyerToastSuppressed,
    rememberAlpSwapSettleTxid,
    setAlpSwapBuyerToastSuppressed,
} from 'components/AlpSwap/rememberSettleTxid';

describe('rememberSettleTxid', () => {
    afterEach(() => {
        setAlpSwapBuyerToastSuppressed(false);
        consumeAlpSwapSettleTxid('aa'.repeat(32));
    });

    it('Consumes a remembered settle txid once', () => {
        const txid = 'aa'.repeat(32);
        expect(consumeAlpSwapSettleTxid(txid)).toBe(false);
        rememberAlpSwapSettleTxid(txid);
        expect(consumeAlpSwapSettleTxid(txid)).toBe(true);
        expect(consumeAlpSwapSettleTxid(txid)).toBe(false);
    });

    it('Toggles in-flight buyer toast suppression', () => {
        expect(isAlpSwapBuyerToastSuppressed()).toBe(false);
        setAlpSwapBuyerToastSuppressed(true);
        expect(isAlpSwapBuyerToastSuppressed()).toBe(true);
        setAlpSwapBuyerToastSuppressed(false);
        expect(isAlpSwapBuyerToastSuppressed()).toBe(false);
    });
});
