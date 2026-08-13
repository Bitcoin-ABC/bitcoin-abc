// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, Tx } from 'chronik-client';
import {
    clearAllPendingRedeems,
    completePendingRedeemFromTx,
    createPendingRedeem,
    isHotWalletCoveredRedeem,
    resolvePendingRedeem,
    shouldSuppressInstantRedeemSaleToast,
    waitForAgoraOfferRedeemed,
} from 'components/Etokens/pendingRedeems';

const mockChronikTx = (impl: (txid: string) => Promise<Tx>): ChronikClient => {
    return {
        tx: impl,
    } as unknown as ChronikClient;
};

describe('pendingRedeems', () => {
    afterEach(() => {
        clearAllPendingRedeems();
    });

    describe('isHotWalletCoveredRedeem', () => {
        it('XECX is covered when sweeper sats are at least offered atoms', () => {
            expect(
                isHotWalletCoveredRedeem({
                    isXecxRedeem: true,
                    isFirmaRedeem: false,
                    offeredAtoms: 1_000_000n,
                    askedSats: 1_000_000n,
                    xecxSweeperBalanceSats: 1_000_000n,
                    maxFirmaRedeemSats: null,
                }),
            ).toBe(true);
        });
        it('XECX is not covered when sweeper balance is unknown', () => {
            expect(
                isHotWalletCoveredRedeem({
                    isXecxRedeem: true,
                    isFirmaRedeem: false,
                    offeredAtoms: 1_000_000n,
                    askedSats: 1_000_000n,
                    xecxSweeperBalanceSats: null,
                    maxFirmaRedeemSats: null,
                }),
            ).toBe(false);
        });
        it('XECX is not covered when sweeper sats are below offered atoms', () => {
            expect(
                isHotWalletCoveredRedeem({
                    isXecxRedeem: true,
                    isFirmaRedeem: false,
                    offeredAtoms: 1_000_000n,
                    askedSats: 1_000_000n,
                    xecxSweeperBalanceSats: 999_900n,
                    maxFirmaRedeemSats: null,
                }),
            ).toBe(false);
        });
        it('FIRMA is covered when hot wallet sats exceed asked sats', () => {
            expect(
                isHotWalletCoveredRedeem({
                    isXecxRedeem: false,
                    isFirmaRedeem: true,
                    offeredAtoms: 100_000n,
                    askedSats: 400_000_00n,
                    xecxSweeperBalanceSats: null,
                    maxFirmaRedeemSats: 400_000_01n,
                }),
            ).toBe(true);
        });
        it('FIRMA is not covered when asked sats equal hot wallet sats', () => {
            expect(
                isHotWalletCoveredRedeem({
                    isXecxRedeem: false,
                    isFirmaRedeem: true,
                    offeredAtoms: 100_000n,
                    askedSats: 400_000_00n,
                    xecxSweeperBalanceSats: null,
                    maxFirmaRedeemSats: 400_000_00n,
                }),
            ).toBe(false);
        });
        it('returns false when this is not an XECX or FIRMA redeem', () => {
            expect(
                isHotWalletCoveredRedeem({
                    isXecxRedeem: false,
                    isFirmaRedeem: false,
                    offeredAtoms: 1n,
                    askedSats: 1n,
                    xecxSweeperBalanceSats: 1_000_000n,
                    maxFirmaRedeemSats: 1_000_000n,
                }),
            ).toBe(false);
        });
    });

    describe('pending redeem registry', () => {
        it('resolves createPendingRedeem when the sale spends the offer', async () => {
            const offerTxid = 'aa'.repeat(32);
            const redeemTxid = 'bb'.repeat(32);
            const pending = createPendingRedeem(offerTxid);
            const saleTx = {
                txid: redeemTxid,
                inputs: [{ prevOut: { txid: offerTxid, outIdx: 1 } }],
            } as Tx;

            expect(completePendingRedeemFromTx(saleTx)).toBe(true);
            await expect(pending).resolves.toBe(redeemTxid);
            expect(completePendingRedeemFromTx(saleTx)).toBe(false);
            // Poll often completes first; websocket sale must still be suppressed
            expect(shouldSuppressInstantRedeemSaleToast(saleTx)).toBe(true);
        });
        it('suppresses a sale toast after the poll already resolved the redeem', () => {
            const offerTxid = 'ab'.repeat(32);
            const redeemTxid = 'cd'.repeat(32);
            createPendingRedeem(offerTxid);
            expect(resolvePendingRedeem(offerTxid, redeemTxid)).toBe(true);
            const saleTx = {
                txid: redeemTxid,
                inputs: [{ prevOut: { txid: offerTxid, outIdx: 1 } }],
            } as Tx;
            expect(completePendingRedeemFromTx(saleTx)).toBe(false);
            expect(shouldSuppressInstantRedeemSaleToast(saleTx)).toBe(true);
        });
        it('does not suppress an unrelated agora sale', () => {
            const saleTx = {
                txid: 'ee'.repeat(32),
                inputs: [{ prevOut: { txid: 'ff'.repeat(32), outIdx: 0 } }],
            } as Tx;
            expect(shouldSuppressInstantRedeemSaleToast(saleTx)).toBe(false);
        });
        it('resolvePendingRedeem is a no-op for an unknown offer', () => {
            expect(resolvePendingRedeem('cc'.repeat(32), 'dd'.repeat(32))).toBe(
                false,
            );
        });
    });

    describe('waitForAgoraOfferRedeemed', () => {
        it('returns the redeem txid once a token output is spent', async () => {
            const offerTxid = 'ee'.repeat(32);
            const redeemTxid = 'ff'.repeat(32);
            const chronik = mockChronikTx(async () => {
                return {
                    outputs: [
                        {
                            token: { tokenId: '11'.repeat(32) },
                            spentBy: { txid: redeemTxid, outIdx: 0 },
                        },
                    ],
                } as Tx;
            });

            await expect(
                waitForAgoraOfferRedeemed(chronik, offerTxid, {
                    intervalMs: 10,
                    timeoutMs: 200,
                }),
            ).resolves.toBe(redeemTxid);
        });
        it('returns null on timeout while the offer is unspent', async () => {
            const offerTxid = '11'.repeat(32);
            const chronik = mockChronikTx(async () => {
                return {
                    outputs: [{ token: { tokenId: '22'.repeat(32) } }],
                } as Tx;
            });

            await expect(
                waitForAgoraOfferRedeemed(chronik, offerTxid, {
                    intervalMs: 10,
                    timeoutMs: 40,
                }),
            ).resolves.toBe(null);
        });
        it('returns null immediately when already aborted', async () => {
            const abort = new AbortController();
            abort.abort();
            const chronik = mockChronikTx(async () => {
                throw new Error('should not query when aborted');
            });

            await expect(
                waitForAgoraOfferRedeemed(chronik, '33'.repeat(32), {
                    signal: abort.signal,
                    intervalMs: 10,
                    timeoutMs: 200,
                }),
            ).resolves.toBe(null);
        });
    });
});
