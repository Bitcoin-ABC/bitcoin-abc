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

/** Escaped ticker (or truncated tokenId). No explorer link. */
export const tokenPlainLabel = (
    tokenId: string,
    ticker?: string | null,
): string =>
    escapeHtml(ticker?.trim() ? ticker.trim() : fallbackTokenLabel(tokenId));

/** First (and only) explorer link for a tokenId in a message. */
export const tokenLinkedLabel = (
    tokenId: string,
    ticker?: string | null,
): string => previewToken(tokenId, tokenPlainLabel(tokenId, ticker));

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

/** Group the integer part of an exact decimalized qty (e.g. 2171731.97 → 2,171,731.97). */
export const formatTokenQty = (atoms: bigint, decimals: number): string => {
    const qty = atomsToDecimalizedQty(atoms, decimals);
    const negative = qty.startsWith('-');
    const unsigned = negative ? qty.slice(1) : qty;
    const [whole, frac] = unsigned.split('.');
    const grouped = BigInt(whole ?? '0').toLocaleString('en-US');
    const body = frac === undefined ? grouped : `${grouped}.${frac}`;
    return negative ? `-${body}` : body;
};

/**
 * Format a number to `figures` significant digits without scientific notation.
 * 147656 → 147,700; 0.00000677 → 0.000006770
 */
export const formatSignificantFigures = (
    value: number,
    figures = 4,
): string => {
    if (!Number.isFinite(value)) {
        return 'n/a';
    }
    if (value === 0) {
        return '0';
    }
    const asNumber = Number(value.toPrecision(figures));
    if (!Number.isFinite(asNumber) || asNumber === 0) {
        return '0';
    }
    const mag = Math.floor(Math.log10(Math.abs(asNumber)));
    const fractionDigits = Math.max(0, figures - mag - 1);
    return asNumber.toLocaleString('en-US', {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
    });
};

/** Price impact as a percent (2 d.p.; sub-0.01 shown as &lt;0.01%). */
export const formatPriceImpact = (pct: number): string => {
    if (!Number.isFinite(pct)) {
        return 'n/a';
    }
    const abs = Math.abs(pct);
    if (abs !== 0 && abs < 0.01) {
        return `${pct < 0 ? '-' : ''}&lt;0.01%`;
    }
    return `${pct.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}%`;
};

const formatRateLine = (
    currentRate: number,
    fromLabel: string,
    toLabel: string,
): string =>
    `<b>Rate:</b> 1 ${fromLabel} === ${formatSignificantFigures(currentRate)} ${toLabel}`;

const formatPriceImpactLine = (priceImpactPct?: number): string =>
    priceImpactPct === undefined
        ? ''
        : `<b>Price impact:</b> ${formatPriceImpact(priceImpactPct)}\n`;

/** 100 sats = 1.00 XEC. */
export const formatXec = (sats: bigint): string =>
    `${(Number(sats) / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} XEC`;

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
        const label = tokenLinkedLabel(pile.tokenId, ticker);
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
    priceImpactPct?: number;
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
        priceImpactPct,
    } = params;
    const fromLinked = tokenLinkedLabel(parsedSwap.fromTokenId, fromTicker);
    const toLinked = tokenLinkedLabel(parsedSwap.toTokenId, toTicker);
    const fromPlain = tokenPlainLabel(parsedSwap.fromTokenId, fromTicker);
    const toPlain = tokenPlainLabel(parsedSwap.toTokenId, toTicker);

    const userAddress = extractUserAddress(parsedSwap);
    const atomsFrom = parsedSwap.atomsFrom;
    const atomsTo = parsedSwap.atomsTo;

    return `❌ <b>Invalid Swap Attempt</b>

<b>Pair:</b> ${fromLinked} → ${toLinked}
<b>From:</b> ${formatTokenQty(atomsFrom, fromDecimals)} ${fromPlain}
<b>To:</b> ${formatTokenQty(atomsTo, toDecimals)} ${toPlain}
${formatSwapperLines(userAddress, username)}
<b>Reason:</b> Swap validation failed (rate, conservation, or schema validation error)
${formatRateLine(currentRate, fromPlain, toPlain)}
${formatPriceImpactLine(priceImpactPct)}`.trimEnd();
};

export interface BroadcastFailedMessageParams {
    parsedSwap: ParsedPartiallySignedSwap;
    errorMsg: string;
    fromDecimals: number;
    toDecimals: number;
    fromTicker?: string | null;
    toTicker?: string | null;
    username?: string | null;
    priceImpactPct?: number;
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
        priceImpactPct,
    } = params;
    const fromLinked = tokenLinkedLabel(parsedSwap.fromTokenId, fromTicker);
    const toLinked = tokenLinkedLabel(parsedSwap.toTokenId, toTicker);
    const fromPlain = tokenPlainLabel(parsedSwap.fromTokenId, fromTicker);
    const toPlain = tokenPlainLabel(parsedSwap.toTokenId, toTicker);

    const qtyTokenBoughtToBuyer = parsedSwap.atomsTo;

    const userAddress = extractUserAddress(parsedSwap);
    const totalFrom = parsedSwap.atomsFrom;

    return `❌ <b>Swap Broadcast Failed</b>

<b>Pair:</b> ${fromLinked} → ${toLinked}
<b>From:</b> ${formatTokenQty(totalFrom, fromDecimals)} ${fromPlain}
<b>To:</b> ${formatTokenQty(qtyTokenBoughtToBuyer, toDecimals)} ${toPlain}
${formatSwapperLines(userAddress, username)}
${formatPriceImpactLine(priceImpactPct)}<b>Error:</b> <code>${escapeHtml(errorMsg)}</code>`;
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
    priceImpactPct?: number;
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
        priceImpactPct,
    } = params;
    const fromLinked = tokenLinkedLabel(parsedSwap.fromTokenId, fromTicker);
    const toLinked = tokenLinkedLabel(parsedSwap.toTokenId, toTicker);
    const fromPlain = tokenPlainLabel(parsedSwap.fromTokenId, fromTicker);
    const toPlain = tokenPlainLabel(parsedSwap.toTokenId, toTicker);

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

<b>Pair:</b> ${fromLinked} → ${toLinked}
<b>From:</b> ${formatTokenQty(totalFrom, fromDecimals)} ${fromPlain}
<b>To:</b> ${formatTokenQty(qtyTokenBoughtToBuyer, toDecimals)} ${toPlain}
${
    !isZeroFeeSwap
        ? `<b>Fee:</b> ${formatTokenQty(qtyTokenSoldToFee, fromDecimals)} ${fromPlain} (${feeDisplay})`
        : `<b>Fee:</b> ${feeDisplay}`
}
${formatRateLine(currentRate, fromPlain, toPlain)}
${formatPriceImpactLine(priceImpactPct)}<b>Postage:</b> ${formatXec(postagePaidSats)}
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
    priceImpactPct?: number;
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
        priceImpactPct,
    } = params;

    let fromLinked = 'UNKNOWN';
    let toLinked = 'UNKNOWN';
    let fromPlain = 'UNKNOWN';
    let toPlain = 'UNKNOWN';
    let userAddress = 'Unknown';
    let atomsFrom = 0n;
    let atomsTo = 0n;

    if (parsedSwap) {
        fromLinked = tokenLinkedLabel(parsedSwap.fromTokenId, fromTicker);
        toLinked = tokenLinkedLabel(parsedSwap.toTokenId, toTicker);
        fromPlain = tokenPlainLabel(parsedSwap.fromTokenId, fromTicker);
        toPlain = tokenPlainLabel(parsedSwap.toTokenId, toTicker);
        userAddress = extractUserAddress(parsedSwap);
        atomsFrom = parsedSwap.atomsFrom;
        atomsTo = parsedSwap.atomsTo;
    } else if (fromTokenId && toTokenId) {
        fromLinked = tokenLinkedLabel(fromTokenId, fromTicker);
        toLinked = tokenLinkedLabel(toTokenId, toTicker);
        fromPlain = tokenPlainLabel(fromTokenId, fromTicker);
        toPlain = tokenPlainLabel(toTokenId, toTicker);
    }

    const fromLine =
        atomsFrom > 0n
            ? `<b>From:</b> ${formatTokenQty(atomsFrom, fromDecimals)} ${fromPlain}\n`
            : '';
    const toLine =
        atomsTo > 0n
            ? `<b>To:</b> ${formatTokenQty(atomsTo, toDecimals)} ${toPlain}\n`
            : '';
    const amountLines = fromLine + toLine;

    return `❌ <b>Swap Failed</b>

<b>Pair:</b> ${fromLinked} → ${toLinked}
${amountLines}${formatSwapperLines(userAddress, username)}
${formatPriceImpactLine(priceImpactPct)}<b>Error:</b> <code>${escapeHtml(errorMsg)}</code>`;
};
