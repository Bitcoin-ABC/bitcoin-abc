// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { alpSwap, alpSwapBaseUrl, FeaturedAgoraSwapPair } from 'config/alpSwap';

export interface TradablePair {
    fromTokenId: string;
    toTokenId: string;
    fromDecimals: number;
    toDecimals: number;
    fromUtxoQty?: number;
    toUtxoQty?: number;
    feePct?: number;
}

/** Undirected market (both swap directions may exist as TradablePair rows). */
export interface MarketPair {
    key: string;
    tokenIdA: string;
    tokenIdB: string;
    decimalsA: number;
    decimalsB: number;
}

export interface TradedToken {
    tokenId: string;
    decimals: number;
    /** Sell-side UTXO size in human units (alp-dex config) */
    utxoQty?: number;
    utxoAtoms?: string;
    tokenTicker?: string;
    tokenName?: string;
}

/** GET /api/v1/status `tradedPairs` row (undirected). */
export interface StatusTradedPair {
    aTokenId: string;
    bTokenId: string;
    feePct: number;
    aUtxoQty?: number;
    bUtxoQty?: number;
}

export interface StatusResponse {
    status: string;
    specVersion?: number;
    timestamp?: string;
    swapAddress: string;
    slushAddress: string;
    feeAddress: string;
    postage: { sats: string };
    platformFeeEnabled: boolean;
    tradedTokens: TradedToken[];
    tradedPairs: StatusTradedPair[];
}

/** GET /api/v1/swap/inventory — tokenId → human qty string. */
export type InventoryResponse = Record<string, string>;

export interface SpotQuote {
    rate: number;
    feePct: number;
    source: string;
    reserves: Record<string, string>;
}

export interface AmmQuote {
    source: string;
    amountIn: number;
    amountInAtoms: string;
    amountOutAtoms: string;
    amountOut: number;
    spotRate: number;
    effectiveRate: number;
    feePct: number;
    reserves: { from: string; to: string };
    priceImpactPct: number;
}

export interface SwapOutput {
    tokenId: string;
    atoms: string;
    script?: string;
}

export interface SwapTemplateResponse {
    price: number;
    fee: number;
    rate: number;
    spotRate?: number;
    priceImpactPct?: number;
    feePct: number;
    /** Always 0 on standalone alp-dex (no coordinator). */
    platformFee?: number;
    platformFeePct?: number;
    platformFeeAddress?: string | null;
    outputs: SwapOutput[];
    slushScript?: string;
}

export interface SettleSwapRequest {
    serializedTxHex: string;
    prePostageInputSats: string;
    tokenId: string;
    atoms: string;
}

export interface SettleSwapResponse {
    success: boolean;
    txid?: string;
    postagePaidSats?: string;
    error?: string;
}

/**
 * alp-dex encodes human qty / rate as decimal strings (SPEC.md).
 * Accept a number as well so fixtures and older mocks still parse.
 */
function asFiniteNumber(
    value: string | number | undefined | null,
    label: string,
): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value !== '') {
        const n = Number(value);
        if (Number.isFinite(n)) {
            return n;
        }
    }
    throw new Error(`Invalid ${label} from alp-dex`);
}

async function fetchWithTimeout(
    url: string,
    init?: RequestInit,
): Promise<Response> {
    try {
        return await fetch(url, {
            ...init,
            signal: AbortSignal.timeout(alpSwap.requestTimeoutMs),
        });
    } catch (err) {
        if (
            err instanceof Error &&
            (err.name === 'TimeoutError' || err.name === 'AbortError')
        ) {
            throw new Error('AlpSwap request timed out');
        }
        throw err;
    }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetchWithTimeout(url, init);
    let body: T & { error?: string };
    try {
        body = await response.json();
    } catch {
        throw new Error(
            `AlpSwap request failed (${response.status}): invalid JSON`,
        );
    }
    if (!response.ok) {
        throw new Error(
            body?.error || `AlpSwap request failed (${response.status})`,
        );
    }
    return body;
}

export function statusUrl(baseUrl = alpSwapBaseUrl()): string {
    return `${baseUrl.replace(/\/+$/, '')}/api/v1/status`;
}

export function inventoryUrl(baseUrl = alpSwapBaseUrl()): string {
    return `${baseUrl.replace(/\/+$/, '')}/api/v1/swap/inventory`;
}

export function spotPriceUrl(
    fromTokenId: string,
    toTokenId: string,
    baseUrl = alpSwapBaseUrl(),
): string {
    return `${baseUrl.replace(/\/+$/, '')}/api/v1/swap/${fromTokenId}/${toTokenId}/price`;
}

export function ammQuoteUrl(
    fromTokenId: string,
    toTokenId: string,
    qty: string,
    baseUrl = alpSwapBaseUrl(),
): string {
    return `${baseUrl.replace(/\/+$/, '')}/api/v1/swap/${fromTokenId}/${toTokenId}/amm/${qty}`;
}

export function swapTemplateUrl(
    fromTokenId: string,
    toTokenId: string,
    params: { from?: string; to?: string; feePct: number },
    baseUrl = alpSwapBaseUrl(),
): string {
    const qs = new URLSearchParams();
    if (typeof params.from === 'string') {
        qs.set('from', params.from);
    }
    if (typeof params.to === 'string') {
        qs.set('to', params.to);
    }
    qs.set('feePct', String(params.feePct));
    return `${baseUrl.replace(/\/+$/, '')}/api/v1/swap/${fromTokenId}/${toTokenId}?${qs.toString()}`;
}

export function settleUrl(
    fromTokenId: string,
    toTokenId: string,
    baseUrl = alpSwapBaseUrl(),
): string {
    return `${baseUrl.replace(/\/+$/, '')}/api/v1/swap/${fromTokenId}/${toTokenId}`;
}

export async function fetchStatus(
    baseUrl = alpSwapBaseUrl(),
): Promise<StatusResponse> {
    return fetchJson<StatusResponse>(statusUrl(baseUrl));
}

export async function fetchInventory(
    baseUrl = alpSwapBaseUrl(),
): Promise<InventoryResponse> {
    return fetchJson<InventoryResponse>(inventoryUrl(baseUrl));
}

export async function fetchSpotPrice(
    fromTokenId: string,
    toTokenId: string,
    baseUrl = alpSwapBaseUrl(),
): Promise<SpotQuote> {
    const raw = await fetchJson<
        Omit<SpotQuote, 'rate'> & { rate: string | number }
    >(spotPriceUrl(fromTokenId, toTokenId, baseUrl));
    return {
        ...raw,
        rate: asFiniteNumber(raw.rate, 'spot rate'),
    };
}

export async function fetchAmmQuote(
    fromTokenId: string,
    toTokenId: string,
    qty: string,
    baseUrl = alpSwapBaseUrl(),
): Promise<AmmQuote> {
    const raw = await fetchJson<
        Omit<
            AmmQuote,
            'amountIn' | 'amountOut' | 'spotRate' | 'effectiveRate'
        > & {
            amountIn: string | number;
            amountOut: string | number;
            spotRate: string | number;
            effectiveRate: string | number;
        }
    >(ammQuoteUrl(fromTokenId, toTokenId, qty, baseUrl));
    return {
        ...raw,
        amountIn: asFiniteNumber(raw.amountIn, 'amountIn'),
        amountOut: asFiniteNumber(raw.amountOut, 'amountOut'),
        spotRate: asFiniteNumber(raw.spotRate, 'spotRate'),
        effectiveRate: asFiniteNumber(raw.effectiveRate, 'effectiveRate'),
    };
}

type RawSwapTemplate = Omit<
    SwapTemplateResponse,
    'price' | 'fee' | 'rate' | 'spotRate' | 'platformFee'
> & {
    price: string | number;
    fee: string | number;
    rate: string | number;
    spotRate?: string | number;
    platformFee?: string | number;
};

export async function fetchSwapTemplate(
    fromTokenId: string,
    toTokenId: string,
    params: { from?: string; to?: string; feePct: number },
    baseUrl = alpSwapBaseUrl(),
): Promise<SwapTemplateResponse> {
    const raw = await fetchJson<RawSwapTemplate>(
        swapTemplateUrl(fromTokenId, toTokenId, params, baseUrl),
    );
    return {
        ...raw,
        price: asFiniteNumber(raw.price, 'template price'),
        fee: asFiniteNumber(raw.fee, 'template fee'),
        rate: asFiniteNumber(raw.rate, 'template rate'),
        spotRate:
            typeof raw.spotRate === 'undefined'
                ? undefined
                : asFiniteNumber(raw.spotRate, 'template spotRate'),
        platformFee:
            typeof raw.platformFee === 'undefined'
                ? 0
                : asFiniteNumber(raw.platformFee, 'template platformFee'),
        platformFeePct: raw.platformFeePct ?? 0,
        platformFeeAddress: raw.platformFeeAddress ?? null,
    };
}

export async function settleSwap(
    fromTokenId: string,
    toTokenId: string,
    body: SettleSwapRequest,
    baseUrl = alpSwapBaseUrl(),
): Promise<SettleSwapResponse> {
    const response = await fetchWithTimeout(
        settleUrl(fromTokenId, toTokenId, baseUrl),
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        },
    );
    let data: SettleSwapResponse;
    try {
        data = await response.json();
    } catch {
        throw new Error(
            `Swap settle failed (${response.status}): invalid JSON`,
        );
    }
    if (!response.ok || !data.success) {
        throw new Error(data.error || 'Swap failed');
    }
    return data;
}

/**
 * Format a human qty for alp-dex template query params (`from=` / `to=`).
 *
 * The node accepts a plain `.` decimal string (not locale, not scientific
 * notation) and converts it with that token's genesis decimals. Extra
 * non-zero digits past genesis decimals are rejected, so we floor to
 * `decimals` here. Use fromDecimals on exact-in and toDecimals on exact-out.
 */
export function roundSwapQty(qty: number, decimals: number): string {
    if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('Quantity must be a positive number');
    }
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) {
        throw new Error('decimals must be an integer in [0, 9]');
    }
    const factor = 10 ** decimals;
    const rounded = Math.floor(qty * factor + 1e-9) / factor;
    if (rounded <= 0) {
        throw new Error('Quantity must be a positive number');
    }
    // Trim trailing zeros but keep a plain decimal string (no sci notation)
    return rounded
        .toFixed(decimals)
        .replace(/(\.\d*?)0+$/, '$1')
        .replace(/\.$/, '');
}

/**
 * Atoms in one DEX sell-side UTXO for a token with the given decimals.
 * `dexUtxoQty` is human units from `/api/v1/status` (no local default).
 */
export function dexUtxoAtoms(decimals: number, dexUtxoQty: number): bigint {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) {
        throw new Error('decimals must be an integer 0-9');
    }
    if (!Number.isFinite(dexUtxoQty) || dexUtxoQty <= 0) {
        throw new Error('dexUtxoQty must be a positive number');
    }
    return BigInt(Math.round(dexUtxoQty)) * 10n ** BigInt(decimals);
}

const isUsableFeePct = (feePct: unknown): feePct is number =>
    typeof feePct === 'number' &&
    Number.isFinite(feePct) &&
    feePct >= 0 &&
    feePct < 1;

const isPositiveUtxoQty = (qty: unknown): qty is number =>
    typeof qty === 'number' && Number.isFinite(qty) && qty > 0;

/**
 * Expand undirected `/api/v1/status` pairs into directed TradablePair rows.
 * Skip a pair unless the server sent feePct and a sell-side utxoQty for
 * both tokens — those are required to quote and size postage.
 */
export function pairsFromStatus(
    status: Pick<StatusResponse, 'tradedPairs' | 'tradedTokens'>,
): TradablePair[] {
    const decimalsById = new Map<string, number>();
    const utxoById = new Map<string, number>();
    for (const token of status.tradedTokens ?? []) {
        if (typeof token.tokenId === 'string' && token.tokenId.length > 0) {
            if (Number.isInteger(token.decimals)) {
                decimalsById.set(token.tokenId, token.decimals);
            }
            if (isPositiveUtxoQty(token.utxoQty)) {
                utxoById.set(token.tokenId, token.utxoQty);
            }
        }
    }
    const out: TradablePair[] = [];
    for (const pair of status.tradedPairs ?? []) {
        const decA = decimalsById.get(pair.aTokenId);
        const decB = decimalsById.get(pair.bTokenId);
        if (decA === undefined || decB === undefined) {
            continue;
        }
        if (!isUsableFeePct(pair.feePct)) {
            continue;
        }
        const aUtxo = pair.aUtxoQty ?? utxoById.get(pair.aTokenId);
        const bUtxo = pair.bUtxoQty ?? utxoById.get(pair.bTokenId);
        if (!isPositiveUtxoQty(aUtxo) || !isPositiveUtxoQty(bUtxo)) {
            continue;
        }
        out.push({
            fromTokenId: pair.aTokenId,
            toTokenId: pair.bTokenId,
            fromDecimals: decA,
            toDecimals: decB,
            fromUtxoQty: aUtxo,
            toUtxoQty: bUtxo,
            feePct: pair.feePct,
        });
        out.push({
            fromTokenId: pair.bTokenId,
            toTokenId: pair.aTokenId,
            fromDecimals: decB,
            toDecimals: decA,
            fromUtxoQty: bUtxo,
            toUtxoQty: aUtxo,
            feePct: pair.feePct,
        });
    }
    return out;
}

/**
 * `/status` advertised markets but none include feePct + utxoQty.
 * Callers should treat this like the exchange is unavailable.
 */
export function statusListedPairsUnusable(
    status: Pick<StatusResponse, 'tradedPairs' | 'tradedTokens'>,
): boolean {
    const listed = status.tradedPairs ?? [];
    return listed.length > 0 && pairsFromStatus(status).length === 0;
}

export function utxoQtyByTokenIdFromStatus(
    status: StatusResponse,
): Record<string, number> {
    const fromTokens: Record<string, number> = {};
    for (const token of status.tradedTokens ?? []) {
        if (
            typeof token.tokenId === 'string' &&
            token.tokenId.length > 0 &&
            typeof token.utxoQty === 'number' &&
            Number.isFinite(token.utxoQty) &&
            token.utxoQty > 0
        ) {
            fromTokens[token.tokenId] = token.utxoQty;
        }
    }
    return {
        ...fromTokens,
        ...utxoQtyByTokenIdFromPairs(pairsFromStatus(status)),
    };
}

export function liquidityTotalsFromInventory(
    inventory: InventoryResponse | null | undefined,
): Record<string, number> {
    const out: Record<string, number> = {};
    if (inventory === null || typeof inventory === 'undefined') {
        return out;
    }
    for (const [tokenId, qty] of Object.entries(inventory)) {
        const n = Number(qty);
        if (Number.isFinite(n)) {
            out[tokenId] = n;
        }
    }
    return out;
}

/**
 * Unique token ids from directed pairs, preserving first-seen order.
 */
export function uniqueTokenIdsFromPairs(pairs: TradablePair[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const pair of pairs) {
        for (const id of [pair.fromTokenId, pair.toTokenId]) {
            if (!seen.has(id)) {
                seen.add(id);
                out.push(id);
            }
        }
    }
    return out;
}

/**
 * Tokens that can be received when paying with `fromTokenId`.
 */
export function toTokenIdsForFrom(
    pairs: TradablePair[],
    fromTokenId: string,
): string[] {
    return pairs
        .filter(p => p.fromTokenId === fromTokenId)
        .map(p => p.toTokenId);
}

export function findPair(
    pairs: TradablePair[],
    fromTokenId: string,
    toTokenId: string,
): TradablePair | undefined {
    return pairs.find(
        p => p.fromTokenId === fromTokenId && p.toTokenId === toTokenId,
    );
}

/**
 * AlpSwap screen path with a directed pair preselected.
 *
 * @param fromTokenId Pay-side token
 * @param toTokenId Receive-side token
 */
export function alpSwapPairPath(
    fromTokenId: string,
    toTokenId: string,
): string {
    const qs = new URLSearchParams({
        from: fromTokenId,
        to: toTokenId,
    });
    return `/alpswap?${qs.toString()}`;
}

/**
 * Featured Agora pairs that alp-dex currently lists with quote/settle
 * params (feePct + utxoQty). Token-id match alone is not enough.
 *
 * @param featured Cashtab-side whitelist (XECX/FIRMA for now)
 * @param status `/api/v1/status` body (pairs + tokens)
 */
export function featuredPairsListedOnStatus(
    featured: readonly FeaturedAgoraSwapPair[],
    status: Pick<StatusResponse, 'tradedPairs' | 'tradedTokens'>,
): FeaturedAgoraSwapPair[] {
    const tradable = pairsFromStatus(status);
    if (tradable.length === 0) {
        return [];
    }
    return featured.filter(pair =>
        tradable.some(
            listed =>
                (listed.fromTokenId === pair.tokenIdA &&
                    listed.toTokenId === pair.tokenIdB) ||
                (listed.fromTokenId === pair.tokenIdB &&
                    listed.toTokenId === pair.tokenIdA),
        ),
    );
}

/**
 * Collapse directed /pairs rows into undirected markets for pair selection UI.
 */
export function marketPairsFromDirected(pairs: TradablePair[]): MarketPair[] {
    const byKey = new Map<string, MarketPair>();
    for (const pair of pairs) {
        const aFirst = pair.fromTokenId < pair.toTokenId;
        const tokenIdA = aFirst ? pair.fromTokenId : pair.toTokenId;
        const tokenIdB = aFirst ? pair.toTokenId : pair.fromTokenId;
        const decimalsA = aFirst ? pair.fromDecimals : pair.toDecimals;
        const decimalsB = aFirst ? pair.toDecimals : pair.fromDecimals;
        const key = `${tokenIdA}:${tokenIdB}`;
        if (!byKey.has(key)) {
            byKey.set(key, {
                key,
                tokenIdA,
                tokenIdB,
                decimalsA,
                decimalsB,
            });
        }
    }
    return Array.from(byKey.values());
}

/**
 * Default from→to orientation for a market (prefer tokenIdA → tokenIdB).
 */
export function defaultDirectionForMarket(
    pairs: TradablePair[],
    market: MarketPair,
): { fromTokenId: string; toTokenId: string } | null {
    if (findPair(pairs, market.tokenIdA, market.tokenIdB)) {
        return {
            fromTokenId: market.tokenIdA,
            toTokenId: market.tokenIdB,
        };
    }
    if (findPair(pairs, market.tokenIdB, market.tokenIdA)) {
        return {
            fromTokenId: market.tokenIdB,
            toTokenId: market.tokenIdA,
        };
    }
    return null;
}

/**
 * Map tokenId → utxoQty from directed /pairs rows (D2381).
 */
export function utxoQtyByTokenIdFromPairs(
    pairs: TradablePair[],
): Record<string, number> {
    const out: Record<string, number> = {};
    for (const pair of pairs) {
        if (
            typeof pair.fromUtxoQty === 'number' &&
            Number.isFinite(pair.fromUtxoQty) &&
            pair.fromUtxoQty > 0
        ) {
            out[pair.fromTokenId] = pair.fromUtxoQty;
        }
        if (
            typeof pair.toUtxoQty === 'number' &&
            Number.isFinite(pair.toUtxoQty) &&
            pair.toUtxoQty > 0
        ) {
            out[pair.toTokenId] = pair.toUtxoQty;
        }
    }
    return out;
}

/**
 * Human qty → atoms using alp-dex `toTokenAtoms` (Math.round).
 */
export function toTokenAtoms(qty: number, decimals: number): bigint {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
        throw new Error(`Invalid token decimals: ${decimals}`);
    }
    if (!Number.isFinite(qty) || qty < 0) {
        throw new Error(`Invalid token quantity: ${qty}`);
    }
    return BigInt(Math.round(qty * 10 ** decimals));
}

/**
 * Exact-in price leg (maker + platform fees taken from `qty`).
 * Matches alp-dex `quoteExactInTemplate`.
 */
export function exactInPriceLeg(
    qty: number,
    makerFeePct: number,
    platformFeePct: number,
): number {
    const totalPct = makerFeePct + platformFeePct;
    return totalPct === 0 ? qty : qty / (1 + totalPct);
}

/**
 * Fee output atoms for a price-leg human amount (0 when feePct is 0).
 */
export function feeOutputAtoms(
    priceHuman: number,
    feePct: number,
    decimals: number,
): bigint {
    if (!(feePct > 0) || !(priceHuman > 0)) {
        return 0n;
    }
    return toTokenAtoms(feePct * priceHuman, decimals);
}

/**
 * True when every enabled fee (maker / platform) yields ≥ 1 atom on the
 * from-token. Alp-dex omits 0-atom fee outs from the template; settle still
 * requires a platform fee out whenever platformFeePct > 0 (even if atoms
 * round to 0), while maker fee outs are optional when 0 atoms — so Cashtab
 * blocks undersized trades client-side.
 */
export function priceLegCoversFeeOutputs(
    priceHuman: number,
    fromDecimals: number,
    makerFeePct: number,
    platformFeePct: number,
): boolean {
    if (
        makerFeePct > 0 &&
        feeOutputAtoms(priceHuman, makerFeePct, fromDecimals) < 1n
    ) {
        return false;
    }
    if (
        platformFeePct > 0 &&
        feeOutputAtoms(priceHuman, platformFeePct, fromDecimals) < 1n
    ) {
        return false;
    }
    return true;
}

export function exactInCoversFeeOutputs(
    qty: number,
    fromDecimals: number,
    makerFeePct: number,
    platformFeePct: number,
): boolean {
    if (!Number.isFinite(qty) || qty <= 0) {
        return false;
    }
    return priceLegCoversFeeOutputs(
        exactInPriceLeg(qty, makerFeePct, platformFeePct),
        fromDecimals,
        makerFeePct,
        platformFeePct,
    );
}

/**
 * Smallest exact-in from-token qty (at `fromDecimals` resolution) such that
 * maker and platform fee outputs are each at least 1 atom when enabled.
 */
export function minExactInQtyForFeeOutputs(
    fromDecimals: number,
    makerFeePct: number,
    platformFeePct: number,
): number {
    if (
        !Number.isInteger(fromDecimals) ||
        fromDecimals < 0 ||
        fromDecimals > 18
    ) {
        throw new Error(`Invalid token decimals: ${fromDecimals}`);
    }
    const step = 10 ** -fromDecimals;
    const enabledFees = [makerFeePct, platformFeePct].filter(p => p > 0);
    if (enabledFees.length === 0) {
        return step;
    }
    const totalPct = makerFeePct + platformFeePct;
    // Math.round(x) >= 1 when x >= 0.5
    let estimate = Math.max(
        ...enabledFees.map(
            pct => (0.5 * (1 + totalPct)) / (pct * 10 ** fromDecimals),
        ),
    );
    if (!Number.isFinite(estimate) || estimate <= 0) {
        estimate = step;
    }
    const factor = 10 ** fromDecimals;
    let qty = Math.ceil(estimate * factor - 1e-9) / factor;
    for (let i = 0; i < 64; i++) {
        if (
            exactInCoversFeeOutputs(
                qty,
                fromDecimals,
                makerFeePct,
                platformFeePct,
            )
        ) {
            return qty;
        }
        qty = Math.round((qty + step) * factor) / factor;
    }
    return qty;
}

/** Minimum price-leg (from-token human) that yields ≥1 atom per enabled fee. */
export function minPriceLegForFeeOutputs(
    fromDecimals: number,
    makerFeePct: number,
    platformFeePct: number,
): number {
    return exactInPriceLeg(
        minExactInQtyForFeeOutputs(fromDecimals, makerFeePct, platformFeePct),
        makerFeePct,
        platformFeePct,
    );
}

/**
 * Minimum exact-out `to` qty (at toDecimals) such that the implied from price
 * leg covers fee outs. `toPerFromRate` = to-tokens per 1 from-token (spot/effective).
 */
export function minExactOutQtyForFeeOutputs(
    toDecimals: number,
    fromDecimals: number,
    makerFeePct: number,
    platformFeePct: number,
    toPerFromRate: number,
): number {
    if (!Number.isInteger(toDecimals) || toDecimals < 0 || toDecimals > 18) {
        throw new Error(`Invalid token decimals: ${toDecimals}`);
    }
    if (!Number.isFinite(toPerFromRate) || !(toPerFromRate > 0)) {
        throw new Error(`Invalid to-per-from rate: ${toPerFromRate}`);
    }
    const minPrice = minPriceLegForFeeOutputs(
        fromDecimals,
        makerFeePct,
        platformFeePct,
    );
    const raw = minPrice * toPerFromRate;
    const factor = 10 ** toDecimals;
    const step = 10 ** -toDecimals;
    let qty = Math.ceil(raw * factor - 1e-9) / factor;
    // Bump until priceLeg at this rate would cover (qty/rate covers fees).
    for (let i = 0; i < 64; i++) {
        const priceLeg = qty / toPerFromRate;
        if (
            priceLegCoversFeeOutputs(
                priceLeg,
                fromDecimals,
                makerFeePct,
                platformFeePct,
            )
        ) {
            return qty;
        }
        qty = Math.round((qty + step) * factor) / factor;
    }
    return qty;
}

/**
 * Spot to-per-from rate from reserve atom strings when the encoded
 * `/price` rate underflows to 0 (XECX→FIRMA: 1 XECX is << 1 FIRMA atom).
 *
 * @param fromReserveAtoms Seller+slush atoms of the pay token
 * @param toReserveAtoms Seller+slush atoms of the receive token
 * @param fromDecimals Pay-token genesis decimals
 * @param toDecimals Receive-token genesis decimals
 */
export function toPerFromRateFromReserveAtoms(
    fromReserveAtoms: string | number | undefined,
    toReserveAtoms: string | number | undefined,
    fromDecimals: number,
    toDecimals: number,
): number | null {
    if (
        fromReserveAtoms === undefined ||
        toReserveAtoms === undefined ||
        !Number.isInteger(fromDecimals) ||
        !Number.isInteger(toDecimals)
    ) {
        return null;
    }
    const fromAtoms = Number(fromReserveAtoms);
    const toAtoms = Number(toReserveAtoms);
    if (!(fromAtoms > 0) || !(toAtoms > 0)) {
        return null;
    }
    const fromHuman = fromAtoms / 10 ** fromDecimals;
    const toHuman = toAtoms / 10 ** toDecimals;
    if (!(fromHuman > 0) || !(toHuman > 0)) {
        return null;
    }
    return toHuman / fromHuman;
}

/**
 * Prefer a positive encoded rate; otherwise derive it from reserves.
 *
 * @param rate Encoded spot rate (0 when alp-dex floor-div underflows)
 * @param reserves `/price` reserve atom map
 * @param fromTokenId Pay-side token
 * @param toTokenId Receive-side token
 * @param fromDecimals Pay-token decimals
 * @param toDecimals Receive-token decimals
 */
export function resolveToPerFromRate(
    rate: number,
    reserves: Record<string, string> | undefined,
    fromTokenId: string,
    toTokenId: string,
    fromDecimals: number,
    toDecimals: number,
): number | null {
    if (Number.isFinite(rate) && rate > 0) {
        return rate;
    }
    if (!reserves) {
        return null;
    }
    return toPerFromRateFromReserveAtoms(
        reserves[fromTokenId],
        reserves[toTokenId],
        fromDecimals,
        toDecimals,
    );
}

/** Matches alp-dex `FEE_SCALE` for exact-in fee split. */
const FEE_SCALE = 1_000_000_000n;

/**
 * Exact-in fee split: price-leg floor, leftover atoms go to the fee out.
 *
 * @param totalFromAtoms Total from-token atoms the taker pays
 * @param feePct Maker/LP fee in [0, 1)
 */
export function splitExactInTotalAtoms(
    totalFromAtoms: bigint,
    feePct: number,
): { priceLegAtoms: bigint; feeAtoms: bigint } {
    if (totalFromAtoms <= 0n) {
        throw new Error(
            `totalFromAtoms must be positive (got ${totalFromAtoms})`,
        );
    }
    if (!Number.isFinite(feePct) || feePct < 0 || feePct >= 1) {
        throw new Error(`feePct must be in [0, 1) (got ${feePct})`);
    }
    if (feePct === 0) {
        return { priceLegAtoms: totalFromAtoms, feeAtoms: 0n };
    }
    const feeScaled = BigInt(Math.round(feePct * Number(FEE_SCALE)));
    const priceLegAtoms =
        (totalFromAtoms * FEE_SCALE) / (FEE_SCALE + feeScaled);
    if (priceLegAtoms <= 0n) {
        throw new Error(
            `exact-in total ${totalFromAtoms} too small for feePct ${feePct}`,
        );
    }
    return {
        priceLegAtoms,
        feeAtoms: totalFromAtoms - priceLegAtoms,
    };
}

/**
 * Constant-product exact-in out (floor). 0 when reserves or input are empty.
 *
 * @param amountIn Price-leg from-token atoms
 * @param reserveIn From-token reserve atoms
 * @param reserveOut To-token reserve atoms
 */
export function cpExactInOutAtoms(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
): bigint {
    if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
        return 0n;
    }
    return (amountIn * reserveOut) / (reserveIn + amountIn);
}

/**
 * Smallest price-leg atoms so CP exact-in yields ≥ 1 to-token atom.
 *
 * @param fromReserveAtoms From-token reserve atoms
 * @param toReserveAtoms To-token reserve atoms
 */
export function minPriceLegAtomsForReceiveAtom(
    fromReserveAtoms: bigint,
    toReserveAtoms: bigint,
): bigint {
    if (fromReserveAtoms <= 0n || toReserveAtoms <= 1n) {
        throw new Error('Reserves too small to receive 1 atom');
    }
    const den = toReserveAtoms - 1n;
    return (fromReserveAtoms + den - 1n) / den;
}

/**
 * Smallest exact-in total atoms whose fee-split price leg is ≥ `priceLegAtoms`.
 *
 * @param priceLegAtoms Required CP price-leg atoms
 * @param makerFeePct Maker/LP fee
 */
export function minExactInAtomsForPriceLeg(
    priceLegAtoms: bigint,
    makerFeePct: number,
): bigint {
    if (priceLegAtoms <= 0n) {
        throw new Error('priceLegAtoms must be positive');
    }
    if (!(makerFeePct > 0)) {
        return priceLegAtoms;
    }
    const feeScaled = BigInt(Math.round(makerFeePct * Number(FEE_SCALE)));
    return (
        (priceLegAtoms * (FEE_SCALE + feeScaled) + FEE_SCALE - 1n) / FEE_SCALE
    );
}

/**
 * CP min exact-in human qty so settle's exact-in re-quote is ≥ 1 to-atom.
 * Linear spot (14.86 XECX) can still produce 0 FIRMA atoms.
 *
 * @param fromReserveAtoms From-token reserve atoms
 * @param toReserveAtoms To-token reserve atoms
 * @param fromDecimals Pay-token decimals
 * @param makerFeePct Maker/LP fee
 */
export function minExactInQtyForReceiveAtomFromReserves(
    fromReserveAtoms: string | number | bigint,
    toReserveAtoms: string | number | bigint,
    fromDecimals: number,
    makerFeePct: number,
): number {
    if (
        !Number.isInteger(fromDecimals) ||
        fromDecimals < 0 ||
        fromDecimals > 18
    ) {
        throw new Error(`Invalid token decimals: ${fromDecimals}`);
    }
    const priceLeg = minPriceLegAtomsForReceiveAtom(
        BigInt(fromReserveAtoms),
        BigInt(toReserveAtoms),
    );
    const total = minExactInAtomsForPriceLeg(priceLeg, makerFeePct);
    const factor = 10 ** fromDecimals;
    return Number(total) / factor;
}

/**
 * True when exact-in `fromQty` yields ≥ 1 to-token atom under CP + fee split.
 *
 * @param fromQty Human pay qty
 * @param fromDecimals Pay-token decimals
 * @param feePct Maker/LP fee
 * @param fromReserveAtoms From-token reserve atoms
 * @param toReserveAtoms To-token reserve atoms
 */
export function exactInReceivesAtLeastOneAtom(
    fromQty: number,
    fromDecimals: number,
    feePct: number,
    fromReserveAtoms: string | number | bigint,
    toReserveAtoms: string | number | bigint,
): boolean {
    try {
        const totalAtoms = toTokenAtoms(fromQty, fromDecimals);
        const { priceLegAtoms } = splitExactInTotalAtoms(totalAtoms, feePct);
        return (
            cpExactInOutAtoms(
                priceLegAtoms,
                BigInt(fromReserveAtoms),
                BigInt(toReserveAtoms),
            ) >= 1n
        );
    } catch {
        return false;
    }
}

/**
 * Fee rate to show on the AlpSwap quote row.
 * Pair `feePct` is the configured maker rate; at tiny sizes the leftover-atom
 * split makes fee/total much larger (0.0168 FIRMA → ~0.6% vs 0.3%).
 *
 * @param pairFeePct Configured maker fee in [0, 1)
 * @param priceHuman Template price-leg human qty
 * @param feeHuman Template fee human qty
 */
export function displaySwapFeePct(
    pairFeePct: number,
    priceHuman?: number,
    feeHuman?: number,
): number {
    if (
        !Number.isFinite(pairFeePct) ||
        typeof priceHuman !== 'number' ||
        typeof feeHuman !== 'number' ||
        !(priceHuman > 0) ||
        !(feeHuman >= 0)
    ) {
        return pairFeePct;
    }
    const total = priceHuman + feeHuman;
    if (!(total > 0)) {
        return pairFeePct;
    }
    const realized = feeHuman / total;
    // 0.05 percentage points: normal 1-atom leftover on a large trade
    // stays on pair feePct (0.9901% still shows as 1%).
    if (Math.abs(realized - pairFeePct) * 100 >= 0.05) {
        return realized;
    }
    return pairFeePct;
}

/**
 * Smallest exact-in from qty so a linear spot rate yields ≥ 1 to-token atom.
 * Fallback when reserve atoms are unavailable.
 *
 * @param fromDecimals Pay-token decimals
 * @param toDecimals Receive-token decimals
 * @param makerFeePct Maker/LP fee
 * @param platformFeePct Coordinator fee (0 on standalone alp-dex)
 * @param toPerFromRate To-human per 1 from-human
 */
export function minExactInQtyForReceiveAtom(
    fromDecimals: number,
    toDecimals: number,
    makerFeePct: number,
    platformFeePct: number,
    toPerFromRate: number,
): number {
    if (!Number.isInteger(toDecimals) || toDecimals < 0 || toDecimals > 18) {
        throw new Error(`Invalid token decimals: ${toDecimals}`);
    }
    if (!Number.isFinite(toPerFromRate) || !(toPerFromRate > 0)) {
        throw new Error(`Invalid to-per-from rate: ${toPerFromRate}`);
    }
    const oneToAtom = 10 ** -toDecimals;
    const totalPct = makerFeePct + platformFeePct;
    const priceLegNeeded = oneToAtom / toPerFromRate;
    const qtyNeeded =
        totalPct === 0 ? priceLegNeeded : priceLegNeeded * (1 + totalPct);
    const feeMin = minExactInQtyForFeeOutputs(
        fromDecimals,
        makerFeePct,
        platformFeePct,
    );
    const factor = 10 ** fromDecimals;
    const step = 10 ** -fromDecimals;
    let qty = Math.max(feeMin, Math.ceil(qtyNeeded * factor - 1e-9) / factor);
    for (let i = 0; i < 64; i++) {
        const net = exactInPriceLeg(qty, makerFeePct, platformFeePct);
        if (net * toPerFromRate + 1e-18 >= oneToAtom) {
            return qty;
        }
        qty = Math.round((qty + step) * factor) / factor;
    }
    return qty;
}

/**
 * Buyer receive output atoms (no script). 0 when missing or unparseable.
 *
 * @param outputs Template outputs
 * @param toTokenId Receive-side token
 */
export function receivingOutputAtoms(
    outputs: SwapOutput[],
    toTokenId: string,
): bigint {
    const receiving = outputs.find(
        o => o.tokenId === toTokenId && typeof o.script === 'undefined',
    );
    if (!receiving) {
        return 0n;
    }
    try {
        const atoms = BigInt(receiving.atoms);
        return atoms > 0n ? atoms : 0n;
    } catch {
        return 0n;
    }
}

export function formatSwapQty(qty: number, decimals: number): string {
    const factor = 10 ** decimals;
    const rounded = Math.round(qty * factor) / factor;
    return rounded
        .toFixed(decimals)
        .replace(/(\.\d*?)0+$/, '$1')
        .replace(/\.$/, '');
}
