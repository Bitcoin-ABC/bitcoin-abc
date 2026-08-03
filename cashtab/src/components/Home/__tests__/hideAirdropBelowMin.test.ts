// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { shouldFilterAirdropMsg } from 'components/Home/hideAirdropBelowMin';
import { legacyAirdropTx, incomingXec } from 'chronik/fixtures/mocks';
import { CashtabTx } from 'wallet';

describe('shouldFilterAirdropMsg', () => {
    const airdropTx = {
        ...legacyAirdropTx.tx,
        parsed: legacyAirdropTx.parsed,
    } as CashtabTx;
    // legacy airdrop fixture: satoshisSent = 569 (5.69 XEC)

    it('does not filter non-airdrop txs at any floor', () => {
        const nonAirdrop = {
            ...incomingXec.tx,
            parsed: incomingXec.parsed,
        } as CashtabTx;
        expect(shouldFilterAirdropMsg(nonAirdrop, 5.46)).toBe(false);
        expect(shouldFilterAirdropMsg(nonAirdrop, 10000)).toBe(false);
    });

    it('filters airdrops below the configured floor', () => {
        // 5.69 XEC < 10 / 100 / 1000 / 10000
        expect(shouldFilterAirdropMsg(airdropTx, 10)).toBe(true);
        expect(shouldFilterAirdropMsg(airdropTx, 100)).toBe(true);
        expect(shouldFilterAirdropMsg(airdropTx, 1000)).toBe(true);
        expect(shouldFilterAirdropMsg(airdropTx, 10000)).toBe(true);
    });

    it('does not filter airdrops at or above the configured floor', () => {
        // 5.69 XEC >= 5.46
        expect(shouldFilterAirdropMsg(airdropTx, 5.46)).toBe(false);
    });

    it('filters an airdrop exactly one sat below the floor', () => {
        const justBelow = {
            ...airdropTx,
            parsed: {
                ...airdropTx.parsed,
                // 999 sats = 9.99 XEC < 10 XEC
                satoshisSent: 999,
            },
        } as CashtabTx;
        expect(shouldFilterAirdropMsg(justBelow, 10)).toBe(true);
    });

    it('does not filter an airdrop at exactly the floor amount', () => {
        const atFloor = {
            ...airdropTx,
            parsed: {
                ...airdropTx.parsed,
                // 1000 sats = 10 XEC
                satoshisSent: 1000,
            },
        } as CashtabTx;
        expect(shouldFilterAirdropMsg(atFloor, 10)).toBe(false);
    });

    it('does not filter when appActions is missing', () => {
        const noActions = {
            ...airdropTx,
            parsed: {
                ...airdropTx.parsed,
                appActions: undefined,
            },
        } as unknown as CashtabTx;
        expect(shouldFilterAirdropMsg(noActions, 100)).toBe(false);
    });
});
