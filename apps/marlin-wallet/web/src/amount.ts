// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { webViewError } from './common';
import { ChronikClient, type Tx } from 'chronik-client';
import { Wallet } from 'ecash-wallet';
import { activeAssetDecimals } from './active-asset';
import { buildAction, buildTokenSendAction } from './wallet';
import { XEC_ASSET, type AssetDefinition } from './supported-assets';

export function atomsToUnit(atoms: number, decimals: number): number {
    if (!Number.isSafeInteger(atoms)) {
        // This is safe for Firma: with 4 decimal places, the maximum atoms is
        // 9007199254740991 (2^53 - 1) which means 900719925474,0991 Firma.
        // This is over 900 billion Firma, aka 900 billion USD. One day this
        // might not be enough, but there will be enough time to fix it.
        // This might hold as well for other tokens, but this needs to be
        // checked on a case-by-case basis.
        throw new Error('atoms out of range in atomsToUnit: ' + atoms);
    }
    return Math.round(atoms) / Math.pow(10, decimals);
}

export function unitToAtoms(unit: number, decimals: number): number {
    const atoms = Math.round(unit * Math.pow(10, decimals));
    if (!Number.isSafeInteger(atoms)) {
        throw new Error('atoms out of range in unitToAtoms: ' + atoms);
    }
    return atoms;
}

/**
 * Net change in atoms for this wallet in a tx (satoshis for XEC, token atoms
 * when tokenId is set).
 */
export function calculateTransactionAmountAtomsFromTx(
    wallet: Wallet,
    tx: Tx,
    tokenId: string | null,
): number {
    const { balanceSatsDelta, tokenDeltas } = wallet.getTxAmounts(tx);
    if (tokenId === null) {
        return Number(balanceSatsDelta);
    }
    const delta = tokenDeltas.get(tokenId);
    return delta !== undefined ? Number(delta) : 0;
}

/**
 * Net change in atoms for this wallet in a tx (satoshis for XEC, token atoms
 * when tokenId is set). Fetches the tx from Chronik.
 */
export async function calculateTransactionAmountAtoms(
    wallet: Wallet,
    chronik: ChronikClient,
    txid: string,
    tokenId: string | null,
): Promise<number> {
    try {
        const tx = await chronik.tx(txid);
        if (!tx) {
            webViewError('Transaction not found:', txid);
            return 0;
        }

        return calculateTransactionAmountAtomsFromTx(wallet, tx, tokenId);
    } catch (error) {
        webViewError('Failed calculating transaction amount:', error);
        return 0;
    }
}

// Calculate maximum spendable XEC amount
export function calculateMaxSpendableAmount(wallet: Wallet): number {
    return atomsToUnit(Number(wallet.maxSendSats()), XEC_ASSET.decimals);
}

export function calculateMaxSpendableTokenDisplay(
    wallet: Wallet,
    tokenId: string,
): number {
    const atoms = wallet
        .spendableUtxos()
        .filter(
            utxo => utxo.token?.tokenId === tokenId && !utxo.token.isMintBaton,
        )
        .reduce((sum, utxo) => sum + (utxo.token?.atoms ?? 0n), 0n);
    return atomsToUnit(Number(atoms), activeAssetDecimals());
}

export function estimateTransactionFee(
    wallet: Wallet,
    recipientAddress: string,
    amountXEC: number,
    opReturnRaw?: string,
): { feeXEC: number; totalXEC: number } | null {
    try {
        const amountSatoshis = unitToAtoms(amountXEC, XEC_ASSET.decimals);
        const action = buildAction(
            wallet,
            recipientAddress,
            amountSatoshis,
            opReturnRaw,
        );
        const inspectAction = action.inspect();
        const feeSatoshis = Number(inspectAction.fee());
        const feeXEC = atomsToUnit(feeSatoshis, XEC_ASSET.decimals);
        const totalXEC = amountXEC + feeXEC;
        return { feeXEC, totalXEC };
    } catch (error) {
        webViewError('Failed estimating transaction fee:', error);
        return null;
    }
}

export function estimateTokenSendFeeAndGas(
    wallet: Wallet,
    recipientAddress: string,
    amountUnit: number,
    token: AssetDefinition,
): { feeXEC: number } | null {
    try {
        const atoms = BigInt(unitToAtoms(amountUnit, token.decimals));
        const action = buildTokenSendAction(
            wallet,
            recipientAddress,
            atoms,
            token,
        );
        const inspectAction = action.inspect();
        let inputSats = 0n;
        let walletOutputSats = 0n;
        for (const builtTx of inspectAction.txs) {
            for (const input of builtTx.tx.inputs) {
                inputSats += input.signData?.sats ?? 0n;
            }
            for (const out of builtTx.tx.outputs) {
                if (wallet.isWalletScript(out.script)) {
                    walletOutputSats += out.sats;
                }
            }
        }
        const feeSatoshis = inputSats - walletOutputSats;
        return { feeXEC: atomsToUnit(Number(feeSatoshis), XEC_ASSET.decimals) };
    } catch (error) {
        webViewError('Failed estimating token transaction fee:', error);
        return null;
    }
}
