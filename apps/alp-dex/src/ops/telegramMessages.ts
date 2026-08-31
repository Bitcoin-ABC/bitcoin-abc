// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { atomsToDecimalizedQty } from '../methods/atoms';
import {
    extractUserAddress,
    type ParsedPartiallySignedSwap,
} from '../settle/parseSwap';

export const ECASH_EXPLORER_BASE_URL = 'https://explorer.e.cash';

const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Truncated tokenId when genesis ticker is missing/blank. */
export const fallbackTokenLabel = (tokenId: string): string => {
    if (tokenId.length <= 12) {
        return tokenId;
    }
    return `${tokenId.slice(0, 8)}…${tokenId.slice(-4)}`;
};

/**
 * Short cashaddr preview: skip version nibble, first 2 + last 3 payload chars.
 * `Unknown` (no prefix) becomes `nk.own`.
 */
export const previewAddressLabel = (address: string): string => {
    const payload = address.includes(':')
        ? address.slice(address.indexOf(':') + 1)
        : address;
    if (payload.length < 4) {
        return address;
    }
    return `${payload.slice(1, 3)}.${payload.slice(-3)}`;
};

const previewAddress = (address: string): string =>
    `<a href="${ECASH_EXPLORER_BASE_URL}/address/${escapeHtml(address)}">${escapeHtml(previewAddressLabel(address))}</a>`;

const previewTxid = (txid: string, label: string): string =>
    `<a href="${ECASH_EXPLORER_BASE_URL}/tx/${escapeHtml(txid)}">${escapeHtml(label)}</a>`;

const previewToken = (tokenId: string, label: string): string =>
    `<a href="${ECASH_EXPLORER_BASE_URL}/token/${escapeHtml(tokenId)}">${label}</a>`;

const tokenLabelHtml = (tokenId: string, ticker?: string | null): string => {
    const label = escapeHtml(
        ticker?.trim() ? ticker.trim() : fallbackTokenLabel(tokenId),
    );
    return previewToken(tokenId, label);
};

const formatSwapperLines = (
    userAddress: string,
    username?: string | null,
): string => {
    const lines: string[] = [];
    if (username) {
        lines.push(`<b>User:</b> @${escapeHtml(username)}`);
    }
    lines.push(`<b>Address:</b> ${previewAddress(userAddress)}`);
    return lines.join('\n');
};

const formatRateLine = (
    currentRate: number,
    fromLabel: string,
    toLabel: string,
): string =>
    `<b>Rate:</b> 1 ${fromLabel} === ${currentRate.toFixed(6)} ${toLabel}`;

/** 100 sats = 1.00 XEC. */
export const formatXec = (sats: bigint): string =>
    `${(Number(sats) / 100).toFixed(2)} XEC`;

export type FormerInventoryNoticePile = {
    tokenId: string;
    atoms: bigint;
    utxoCount: number;
    tokenTicker?: string | null;
};

/**
 * Telegram HTML when seller holds same-size leftovers that look like a
 * previously traded pair (not swept).
 */
export const getFormerInventoryNotice = (opts: {
    sellerAddress: string;
    piles: FormerInventoryNoticePile[];
}): string => {
    const { sellerAddress, piles } = opts;
    const lines = piles.map(pile => {
        const ticker = pile.tokenTicker?.trim();
        const label = tokenLabelHtml(pile.tokenId, ticker);
        return `• ${pile.utxoCount}× ${label} @ ${pile.atoms.toString()} atoms`;
    });
    return `⚠️ <b>Former inventory left on seller</b>

${previewAddress(sellerAddress)}
These same-size UTXOs look like a pair this node used to trade. They were <b>not</b> swept to fee.

${lines.join('\n')}`;
};

export interface InvalidSwapMessageParams {
    parsedSwap: ParsedPartiallySignedSwap;
    currentRate: number;
    fromDecimals: number;
    toDecimals: number;
    fromTicker?: string | null;
    toTicker?: string | null;
    username?: string | null;
}

/**
 * Telegram HTML for an invalid swap attempt (validation failed).
 */
export const getInvalidSwapMessage = (
    params: InvalidSwapMessageParams,
): string => {
    const {
        parsedSwap,
        currentRate,
        fromDecimals,
        toDecimals,
        fromTicker,
        toTicker,
        username,
    } = params;
    const fromLabel = tokenLabelHtml(parsedSwap.fromTokenId, fromTicker);
    const toLabel = tokenLabelHtml(parsedSwap.toTokenId, toTicker);

    const userAddress = extractUserAddress(parsedSwap);
    const atomsFrom = parsedSwap.atomsFrom;
    const atomsTo = parsedSwap.atomsTo;

    return `❌ <b>Invalid Swap Attempt</b>

<b>Pair:</b> ${fromLabel} → ${toLabel}
<b>From:</b> ${atomsToDecimalizedQty(atomsFrom, fromDecimals)} ${fromLabel}
<b>To:</b> ${atomsToDecimalizedQty(atomsTo, toDecimals)} ${toLabel}
${formatSwapperLines(userAddress, username)}
<b>Reason:</b> Swap validation failed (rate, conservation, or schema validation error)
${formatRateLine(currentRate, fromLabel, toLabel)}`;
};

export interface BroadcastFailedMessageParams {
    parsedSwap: ParsedPartiallySignedSwap;
    errorMsg: string;
    fromDecimals: number;
    toDecimals: number;
    fromTicker?: string | null;
    toTicker?: string | null;
    username?: string | null;
}

/**
 * Telegram HTML for a broadcast failure after validation passed.
 */
export const getBroadcastFailedMessage = (
    params: BroadcastFailedMessageParams,
): string => {
    const {
        parsedSwap,
        errorMsg,
        fromDecimals,
        toDecimals,
        fromTicker,
        toTicker,
        username,
    } = params;
    const fromLabel = tokenLabelHtml(parsedSwap.fromTokenId, fromTicker);
    const toLabel = tokenLabelHtml(parsedSwap.toTokenId, toTicker);

    const qtyTokenBoughtToBuyer = parsedSwap.atomsTo;

    const userAddress = extractUserAddress(parsedSwap);
    const totalFrom = parsedSwap.atomsFrom;

    return `❌ <b>Swap Broadcast Failed</b>

<b>Pair:</b> ${fromLabel} → ${toLabel}
<b>From:</b> ${atomsToDecimalizedQty(totalFrom, fromDecimals)} ${fromLabel}
<b>To:</b> ${atomsToDecimalizedQty(qtyTokenBoughtToBuyer, toDecimals)} ${toLabel}
${formatSwapperLines(userAddress, username)}
<b>Error:</b> <code>${escapeHtml(errorMsg)}</code>`;
};

export interface SwapSuccessfulMessageParams {
    parsedSwap: ParsedPartiallySignedSwap;
    currentRate: number;
    postagePaidSats: bigint;
    txid: string;
    fromDecimals: number;
    toDecimals: number;
    fromTicker?: string | null;
    toTicker?: string | null;
    username?: string | null;
}

/**
 * Telegram HTML for a successful settle.
 */
export const getSwapSuccessfulMessage = (
    params: SwapSuccessfulMessageParams,
): string => {
    const {
        parsedSwap,
        currentRate,
        postagePaidSats,
        txid,
        fromDecimals,
        toDecimals,
        fromTicker,
        toTicker,
        username,
    } = params;
    const fromLabel = tokenLabelHtml(parsedSwap.fromTokenId, fromTicker);
    const toLabel = tokenLabelHtml(parsedSwap.toTokenId, toTicker);

    const qtyTokenSoldToFee = parsedSwap.feeInFromAtoms;
    const qtyTokenBoughtToBuyer = parsedSwap.atomsTo;
    const isZeroFeeSwap = parsedSwap.feeInFromAtoms === 0n;

    const userAddress = extractUserAddress(parsedSwap);
    const totalFrom = parsedSwap.atomsFrom;
    const feeDisplay = isZeroFeeSwap
        ? '0%'
        : totalFrom > 0n
          ? `${((Number(qtyTokenSoldToFee) / Number(totalFrom)) * 100).toFixed(1)}%`
          : '0%';

    return `✅ <b>Swap Successful</b>

<b>Pair:</b> ${fromLabel} → ${toLabel}
<b>From:</b> ${atomsToDecimalizedQty(totalFrom, fromDecimals)} ${fromLabel}
<b>To:</b> ${atomsToDecimalizedQty(qtyTokenBoughtToBuyer, toDecimals)} ${toLabel}
${
    !isZeroFeeSwap
        ? `<b>Fee:</b> ${atomsToDecimalizedQty(qtyTokenSoldToFee, fromDecimals)} ${fromLabel} (${feeDisplay})`
        : `<b>Fee:</b> ${feeDisplay}`
}
${formatRateLine(currentRate, fromLabel, toLabel)}
<b>Postage:</b> ${formatXec(postagePaidSats)}
${formatSwapperLines(userAddress, username)}

${previewTxid(txid, 'View Transaction')}`;
};

export interface SwapFailedMessageParams {
    parsedSwap: ParsedPartiallySignedSwap | null;
    errorMsg: string;
    fromDecimals: number;
    toDecimals: number;
    fromTokenId?: string;
    toTokenId?: string;
    fromTicker?: string | null;
    toTicker?: string | null;
    username?: string | null;
}

/**
 * Telegram HTML for a failed swap (non-broadcast errors).
 */
export const getSwapFailedMessage = (
    params: SwapFailedMessageParams,
): string => {
    const {
        parsedSwap,
        errorMsg,
        fromDecimals,
        toDecimals,
        fromTokenId,
        toTokenId,
        fromTicker,
        toTicker,
        username,
    } = params;

    let fromLabel = 'UNKNOWN';
    let toLabel = 'UNKNOWN';
    let userAddress = 'Unknown';
    let atomsFrom = 0n;
    let atomsTo = 0n;

    if (parsedSwap) {
        fromLabel = tokenLabelHtml(parsedSwap.fromTokenId, fromTicker);
        toLabel = tokenLabelHtml(parsedSwap.toTokenId, toTicker);
        userAddress = extractUserAddress(parsedSwap);
        atomsFrom = parsedSwap.atomsFrom;
        atomsTo = parsedSwap.atomsTo;
    } else if (fromTokenId && toTokenId) {
        fromLabel = tokenLabelHtml(fromTokenId, fromTicker);
        toLabel = tokenLabelHtml(toTokenId, toTicker);
    }

    const fromLine =
        atomsFrom > 0n
            ? `<b>From:</b> ${atomsToDecimalizedQty(atomsFrom, fromDecimals)} ${fromLabel}\n`
            : '';
    const toLine =
        atomsTo > 0n
            ? `<b>To:</b> ${atomsToDecimalizedQty(atomsTo, toDecimals)} ${toLabel}\n`
            : '';
    const amountLines = fromLine + toLine;

    return `❌ <b>Swap Failed</b>

<b>Pair:</b> ${fromLabel} → ${toLabel}
${amountLines}${formatSwapperLines(userAddress, username)}
<b>Error:</b> <code>${escapeHtml(errorMsg)}</code>`;
};
