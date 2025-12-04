// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { webViewError } from './common';
import {
    Ecc,
    shaRmd160,
    TxBuilder,
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    calcTxFee,
} from 'ecash-lib';
import { ChronikClient } from 'chronik-client';
import { Wallet } from 'ecash-wallet';
import { buildTx } from './wallet';

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

        // Get our address hash160 for comparison
        const ecc = new Ecc();
        const pk = ecc.derivePubkey(wallet.sk);
        const pkh = shaRmd160(pk);
        const ourHash160 = Array.from(pkh)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');

        let totalAmount = 0;

        // Check outputs (receives) - amounts sent TO our address
        for (let i = 0; i < tx.outputs.length; i++) {
            const output = tx.outputs[i];

            if (output.outputScript && output.sats) {
                try {
                    // Handle both hex string and Uint8Array formats
                    let outputScript: Uint8Array;
                    if (typeof output.outputScript === 'string') {
                        // Convert hex string to Uint8Array
                        const hex = output.outputScript;
                        outputScript = new Uint8Array(hex.length / 2);
                        for (let j = 0; j < hex.length; j += 2) {
                            outputScript[j / 2] = parseInt(
                                hex.substr(j, 2),
                                16,
                            );
                        }
                    } else {
                        outputScript = output.outputScript as Uint8Array;
                    }

                    // We only support P2PKH scripts
                    if (
                        outputScript &&
                        outputScript.length === 25 &&
                        outputScript[0] === 0x76 &&
                        outputScript[1] === 0xa9 &&
                        outputScript[2] === 0x14
                    ) {
                        // Extract hash160 from P2PKH script
                        const scriptHash160 = outputScript.slice(3, 23);
                        const scriptHash160Hex = Array.from(scriptHash160)
                            .map(byte => byte.toString(16).padStart(2, '0'))
                            .join('');

                        if (scriptHash160Hex === ourHash160) {
                            const amountSats = Number(output.sats);
                            totalAmount += amountSats;
                        }
                    }
                } catch (error) {
                    webViewError(
                        `Could not parse output script from txid ${txid} index ${i}:`,
                        error,
                    );
                }
            }
        }

        // Check inputs (spends) - amounts sent FROM our address
        for (let i = 0; i < tx.inputs.length; i++) {
            const input = tx.inputs[i];

            if (input.outputScript && input.sats) {
                try {
                    // Handle both hex string and Uint8Array formats
                    let inputScript: Uint8Array;
                    if (typeof input.outputScript === 'string') {
                        // Convert hex string to Uint8Array
                        const hex = input.outputScript;
                        inputScript = new Uint8Array(hex.length / 2);
                        for (let j = 0; j < hex.length; j += 2) {
                            inputScript[j / 2] = parseInt(hex.substr(j, 2), 16);
                        }
                    } else {
                        inputScript = input.outputScript as Uint8Array;
                    }

                    // We only support P2PKH scripts
                    if (
                        inputScript &&
                        inputScript.length === 25 &&
                        inputScript[0] === 0x76 &&
                        inputScript[1] === 0xa9 &&
                        inputScript[2] === 0x14
                    ) {
                        // Extract hash160 from P2PKH script
                        const scriptHash160 = inputScript.slice(3, 23);
                        const scriptHash160Hex = Array.from(scriptHash160)
                            .map(byte => byte.toString(16).padStart(2, '0'))
                            .join('');

                        if (scriptHash160Hex === ourHash160) {
                            const amountSats = Number(input.sats);
                            totalAmount -= amountSats;
                        }
                    }
                } catch (error) {
                    webViewError(
                        `Could not parse input script from txid ${txid} index ${i}:`,
                        error,
                    );
                }
            }
        }

        return totalAmount;
    } catch (error) {
        webViewError('Failed calculating transaction amount:', error);
        return 0;
    }
}

// Calculate maximum spendable amount
export function calculateMaxSpendableAmount(wallet: Wallet): number {
    // Select all spendable utxos and calculate the size of a transaction that
    // sends them all to a single p2pkh output + change output
    const spendableUtxos = wallet.spendableUtxos();
    const balanceSats = Wallet.sumUtxosSats(spendableUtxos);
    const inputs = spendableUtxos.map(
        utxo => wallet.p2pkhUtxoToBuilderInput(utxo)!,
    );
    const txBuilder = new TxBuilder({
        inputs,
        // No leftover in this case, send all to self
        outputs: [wallet.script],
    });
    const thisTx = txBuilder.sign({
        feePerKb: DEFAULT_FEE_SATS_PER_KB,
        dustSats: DEFAULT_DUST_SATS,
    });

    const txSize = thisTx.serSize();
    const txFee = calcTxFee(txSize, DEFAULT_FEE_SATS_PER_KB);

    return satsToXec(Number(balanceSats - txFee));
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
        const builtTx = buildTx(
            wallet,
            recipientAddress,
            amountSatoshis,
            opReturnRaw,
        );

        // Get fee in satoshis and convert to XEC
        const feeSatoshis = Number(builtTx.fee());
        const feeXEC = satsToXec(feeSatoshis);
        const totalXEC = amountXEC + feeXEC;

        return { feeXEC, totalXEC };
    } catch (error) {
        webViewError('Failed estimating transaction fee:', error);
        return null;
    }
}
