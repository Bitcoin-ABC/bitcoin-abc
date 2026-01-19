// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { webViewError } from './common';
import { ChronikClient } from 'chronik-client';
import { Wallet } from 'ecash-wallet';
import { buildAction } from './wallet';

// Conversion function for display
export function satsToXec(sats: number): number {
    return Math.round(sats) / 100; // Round to avoid floating-point errors
}

// Calculate transaction amount for our address
export async function calculateTransactionAmountSats(
    wallet: Wallet,
    chronik: ChronikClient,
    txid: string,
): Promise<number> {
    try {
        // Get transaction details from Chronik
        const tx = await chronik.tx(txid);
        if (!tx) {
            webViewError('Transaction not found:', txid);
            return 0;
        }

        return Number(wallet.getTxAmounts(tx).balanceSatsDelta);
    } catch (error) {
        webViewError('Failed calculating transaction amount:', error);
        return 0;
    }
}

// Calculate maximum spendable amount
export function calculateMaxSpendableAmount(wallet: Wallet): number {
    return satsToXec(Number(wallet.maxSendSats()));
}

// Estimate transaction fee
export function estimateTransactionFee(
    wallet: Wallet,
    recipientAddress: string,
    amountXEC: number,
    opReturnRaw?: string,
): { feeXEC: number; totalXEC: number } | null {
    try {
        // Convert XEC to satoshis (1 XEC = 100 satoshis)
        const amountSatoshis = Math.round(amountXEC * 100);

        // Build the transaction to get fee estimate
        const action = buildAction(
            wallet,
            recipientAddress,
            amountSatoshis,
            opReturnRaw,
        );
        const inspectAction = action.inspect();

        // Get fee in satoshis and convert to XEC
        const feeSatoshis = Number(inspectAction.fee());
        const feeXEC = satsToXec(feeSatoshis);
        const totalXEC = amountXEC + feeXEC;

        return { feeXEC, totalXEC };
    } catch (error) {
        webViewError('Failed estimating transaction fee:', error);
        return null;
    }
}
