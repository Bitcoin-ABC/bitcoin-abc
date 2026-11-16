// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { PostageTx, type Wallet, type WalletUtxo } from 'ecash-wallet';

/**
 * `addFuelAndSign` takes every sats-only UTXO on the seller. Settle may
 * attach only avalanche-final postage, so the selection is narrowed for
 * this call and then restored.
 */
export const addFuelAndSignFinalized = (
    postageTx: PostageTx,
    seller: Wallet,
    prePostageInputSats: bigint,
    requiredUtxos: WalletUtxo[],
) => {
    const finalizedPostage = seller
        .spendableSatsOnlyUtxos()
        .filter(utxo => utxo.isFinal);
    const wallet = seller as Wallet & {
        spendableSatsOnlyUtxos: () => WalletUtxo[];
    };
    const previous = wallet.spendableSatsOnlyUtxos;
    wallet.spendableSatsOnlyUtxos = () => finalizedPostage;
    try {
        return postageTx.addFuelAndSign(
            seller,
            prePostageInputSats,
            requiredUtxos,
        );
    } finally {
        wallet.spendableSatsOnlyUtxos = previous;
    }
};
