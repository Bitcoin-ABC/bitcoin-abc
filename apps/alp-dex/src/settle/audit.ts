// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export type SwapRecord = {
    serializedTxHex: string;
    isValid: boolean;
    broadcasted: boolean;
    txid: string | null;
    fromTokenId: string;
    toTokenId: string;
    postagePaidSats: number;
    clientIp: string;
    /** Taker address receiving the bought token */
    takerAddress: string;
    qtyFrom: number;
    qtyTo: number;
    /** LP node fee amount (from-token human units) */
    qtyFee: number;
    serverExchangeRate: number;
    /** LP node fee rate (pair feePct) */
    serverFee: number;
};

/**
 * Human-unit rate (to per 1 from) from an atoms ratio.
 * `atomsTo / priceLegAtoms` is only a human rate when decimals match.
 */
export const humanExchangeRate = (
    atomsTo: bigint,
    priceLegAtoms: bigint,
    fromDecimals: number,
    toDecimals: number,
): number => {
    if (priceLegAtoms <= 0n) {
        return 0;
    }
    return (
        (Number(atomsTo) / Number(priceLegAtoms)) *
        10 ** (fromDecimals - toDecimals)
    );
};

export type SettleOutcome =
    | 'invalid'
    | 'success'
    | 'broadcast-failed'
    | 'failed';

/**
 * Structured settle log line. Success goes to stdout; failures to stderr.
 */
export const logSwapOutcome = (
    outcome: SettleOutcome,
    record: SwapRecord,
    errorMsg?: string,
): void => {
    const details = {
        outcome,
        clientIp: record.clientIp,
        fromTokenId: record.fromTokenId,
        toTokenId: record.toTokenId,
        taker: record.takerAddress,
        valid: record.isValid,
        broadcasted: record.broadcasted,
        txid: record.txid,
        qtyFrom: record.qtyFrom,
        qtyTo: record.qtyTo,
        qtyFee: record.qtyFee,
        postageSats: record.postagePaidSats,
        rate: record.serverExchangeRate,
        serializedTxHexLength: record.serializedTxHex.length,
        ...(errorMsg !== undefined ? { error: errorMsg } : {}),
    };
    if (outcome === 'success') {
        console.info('Swap settle outcome', details);
    } else {
        console.error('Swap settle outcome', details);
    }
};
