// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getCurrentReceiveAddress,
    getWalletAddressesForSubscription,
    getWalletHashesForParseTx,
} from 'wallet/hd';
import { Wallet } from 'ecash-wallet';
import { ChronikClient } from 'chronik-client';
import { createCashtabWallet, generateMnemonic } from 'wallet';

describe('wallet/hd helpers', () => {
    // Minimal chronik stub — helpers under test do not call the network
    const chronik = {} as ChronikClient;

    it('getCurrentReceiveAddress matches single-address wallet.address', () => {
        const stored = createCashtabWallet(generateMnemonic());
        const wallet = Wallet.fromMnemonic(stored.mnemonic, chronik);
        expect(getCurrentReceiveAddress(wallet)).toBe(wallet.address);
        expect(getWalletAddressesForSubscription(wallet)).toEqual([
            wallet.address,
        ]);
        expect(getWalletHashesForParseTx(wallet)).toEqual([stored.hash]);
    });

    it('HD wallet current receive is the next unused receive index', () => {
        const stored = createCashtabWallet(generateMnemonic(), undefined, {
            hd: true,
        });
        const wallet = Wallet.fromMnemonic(stored.mnemonic, chronik, {
            hd: true,
            receiveIndex: 0,
            changeIndex: 0,
        });

        expect(wallet.isHD).toBe(true);
        expect(getCurrentReceiveAddress(wallet)).toBe(wallet.address);
        expect(getCurrentReceiveAddress(wallet)).toBe(
            wallet.getReceiveAddress(0),
        );

        // After the current unused slot is consumed (e.g. discovery after a
        // receive), Receive should show the new next-unused address.
        wallet.getNextReceiveAddress();
        expect(getCurrentReceiveAddress(wallet)).toBe(
            wallet.getReceiveAddress(1),
        );
        expect(wallet.receiveIndex).toBe(1);
        expect(getWalletAddressesForSubscription(wallet)).toEqual([
            wallet.getReceiveAddress(0),
            wallet.getReceiveAddress(1),
            wallet.getChangeAddress(0),
        ]);
    });
});
