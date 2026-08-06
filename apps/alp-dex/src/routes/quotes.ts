// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Address } from 'ecash-lib';
import type { Wallet } from 'ecash-wallet';
import { Router, type Request, type Response } from 'express';
import {
    assertTokenIdInConfig,
    type ParsedTradedConfig,
} from '../config/tradedConfig';
import { pairKey } from '../config/tradedPairs';
import { atomsToDecimalizedQty, decimalizedQtyToAtoms } from '../methods/atoms';
import { HttpError, ValidationError } from '../methods/errors';
import { assertDistinctTokenPair } from '../methods/tokenId';
import { quoteExactIn, spotToPerWholeFrom } from '../pricing/quotes';
import { pairPricingReserves, sumFungibleAtoms } from '../pricing/reserves';
import {
    effectiveRateToPerWholeFrom,
    exactInTemplate,
    exactOutTemplate,
    priceImpactPct,
} from '../pricing/templates';
import type { TradedTokens } from '../tokens/tradedTokens';

export type QuoteRouteDeps = {
    seller: Wallet;
    slush: Wallet;
    feeAddress: string;
    tradedConfig: ParsedTradedConfig;
    tradedTokens: TradedTokens;
};

type SwapTokenParams = {
    fromTokenId: string;
    toTokenId: string;
};

type SwapQtyParams = SwapTokenParams & {
    qty: string;
};

type TokenAvailableParams = {
    tokenId: string;
};

/** Positive decimal qty string (no scientific notation). */
const QTY_REGEX = /^\d+(\.\d{1,18})?$/;

const parsePositiveQty = (
    qtyParam: string,
): { ok: true; qty: string } | { ok: false; error: string } => {
    if (!QTY_REGEX.test(qtyParam)) {
        return {
            ok: false,
            error:
                'qty must be a positive number with up to 18 decimal places ' +
                '(e.g., 1.2345)',
        };
    }
    // Number() so leading-zero zeros like "00" are rejected (string checks miss them).
    const n = Number(qtyParam);
    if (!Number.isFinite(n) || n <= 0) {
        return { ok: false, error: 'qty must be a positive number' };
    }
    return { ok: true, qty: qtyParam };
};

const FEE_PCT_QUERY_RE = /^\d+(\.\d+)?$/;

const parseFeePctQuery = (
    feePct: unknown,
): { ok: true; feePct: number } | { ok: false; error: string } => {
    if (feePct === undefined) {
        return { ok: false, error: "Must provide 'feePct' query parameter" };
    }
    // Reject repeated params (Express → string[]) and trailing garbage
    // (parseFloat('0.02abc') === 0.02).
    if (typeof feePct !== 'string' || !FEE_PCT_QUERY_RE.test(feePct)) {
        return { ok: false, error: 'feePct must be a number >= 0' };
    }
    const parsed = Number(feePct);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return { ok: false, error: 'feePct must be a number >= 0' };
    }
    return { ok: true, feePct: parsed };
};

// Looser than Number.EPSILON: query vs config decimals are independently parsed.
const FEE_PCT_EPS = 1e-12;

/** Client feePct must match the configured pair fee (float-safe). */
const feePctMatchesPair = (requested: number, pairFeePct: number): boolean =>
    Math.abs(requested - pairFeePct) < FEE_PCT_EPS;

/**
 * Map thrown failures to HTTP: `HttpError` / `ValidationError` → status +
 * message; else → 500 (no body leak).
 */
const sendQuoteError = (
    res: Response,
    error: unknown,
    logLabel?: string,
): void => {
    if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
    }
    if (logLabel !== undefined) {
        console.error(logLabel, error);
    }
    res.status(500).json({ error: 'Internal server error' });
};

/**
 * Resolve a directed allowlisted pair and its maker feePct.
 * @throws {ValidationError} on invalid / unlisted pairs
 */
export const assertConfiguredPair = (
    tradedConfig: ParsedTradedConfig,
    tradedTokens: TradedTokens,
    fromTokenIdRaw: string,
    toTokenIdRaw: string,
): {
    fromTokenId: string;
    toTokenId: string;
    feePct: number;
} => {
    const { fromTokenId, toTokenId } = assertDistinctTokenPair(
        fromTokenIdRaw,
        toTokenIdRaw,
    );
    if (!tradedTokens.has(fromTokenId)) {
        throw new ValidationError(`Token ${fromTokenId} is not a traded token`);
    }
    if (!tradedTokens.has(toTokenId)) {
        throw new ValidationError(`Token ${toTokenId} is not a traded token`);
    }
    const key = pairKey(fromTokenId, toTokenId);
    const pair = tradedConfig.pairs.find(
        p => pairKey(p.tokenIdA, p.tokenIdB) === key,
    );
    if (pair === undefined) {
        throw new ValidationError(
            `Pair ${fromTokenId}/${toTokenId} is not in traded config`,
        );
    }
    return { fromTokenId, toTokenId, feePct: pair.feePct };
};

/**
 * Read-only quote / discovery routes. No broadcast.
 * Reads in-memory wallet UTXOs only.
 */
export const createQuoteRouter = (deps: QuoteRouteDeps): Router => {
    const { seller, slush, feeAddress, tradedConfig, tradedTokens } = deps;
    const feeScriptHex = Address.fromCashAddress(feeAddress).toScriptHex();
    const router = Router();

    /**
     * GET /api/v1/token/:tokenId/available
     * Seller spendable fungible atoms for one allowlisted token.
     */
    router.get(
        '/token/:tokenId/available',
        async (req: Request<TokenAvailableParams>, res: Response) => {
            try {
                const tokenId = assertTokenIdInConfig(
                    tradedConfig,
                    req.params.tokenId,
                );
                const atoms = sumFungibleAtoms(seller.utxos, tokenId);
                res.status(200).json({
                    tokenId,
                    atoms: atoms.toString(),
                });
            } catch (error: unknown) {
                sendQuoteError(
                    res,
                    error,
                    'Error in /api/v1/token/:tokenId/available:',
                );
            }
        },
    );

    /**
     * GET /api/v1/swap/inventory
     * tokenId → human balance (seller + slush pricing reserves).
     */
    router.get('/swap/inventory', async (_req: Request, res: Response) => {
        try {
            const inventory: Record<string, string> = {};
            for (const token of tradedTokens.values()) {
                const atoms =
                    sumFungibleAtoms(seller.utxos, token.tokenId) +
                    sumFungibleAtoms(slush.utxos, token.tokenId);
                inventory[token.tokenId] = atomsToDecimalizedQty(
                    atoms,
                    token.decimals,
                );
            }
            res.status(200).json(inventory);
        } catch (error: unknown) {
            sendQuoteError(res, error, 'Error in /api/v1/swap/inventory:');
        }
    });

    /**
     * GET /api/v1/swap/:from/:to/price/:qty — exact-out + fee outs.
     */
    router.get(
        '/swap/:fromTokenId/:toTokenId/price/:qty',
        async (req: Request<SwapQtyParams>, res: Response) => {
            try {
                const pair = assertConfiguredPair(
                    tradedConfig,
                    tradedTokens,
                    req.params.fromTokenId,
                    req.params.toTokenId,
                );
                const parsedQty = parsePositiveQty(req.params.qty);
                if (!parsedQty.ok) {
                    res.status(400).json({ error: parsedQty.error });
                    return;
                }
                const from = tradedTokens.get(pair.fromTokenId)!;
                const to = tradedTokens.get(pair.toTokenId)!;
                const reserves = pairPricingReserves(
                    seller.utxos,
                    slush.utxos,
                    pair.fromTokenId,
                    pair.toTokenId,
                );
                const body = exactOutTemplate(
                    parsedQty.qty,
                    reserves,
                    pair.feePct,
                    from.decimals,
                    to.decimals,
                    pair.fromTokenId,
                    pair.toTokenId,
                    slush.script.toHex(),
                    feeScriptHex,
                );
                res.status(200).json(body);
            } catch (error: unknown) {
                sendQuoteError(res, error);
            }
        },
    );

    /**
     * GET /api/v1/swap/:from/:to/quote/:qty — exact-in + fee outs
     * (`qty` = total fromToken including maker fee).
     */
    router.get(
        '/swap/:fromTokenId/:toTokenId/quote/:qty',
        async (req: Request<SwapQtyParams>, res: Response) => {
            try {
                const pair = assertConfiguredPair(
                    tradedConfig,
                    tradedTokens,
                    req.params.fromTokenId,
                    req.params.toTokenId,
                );
                const parsedQty = parsePositiveQty(req.params.qty);
                if (!parsedQty.ok) {
                    res.status(400).json({ error: parsedQty.error });
                    return;
                }
                const from = tradedTokens.get(pair.fromTokenId)!;
                const to = tradedTokens.get(pair.toTokenId)!;
                const reserves = pairPricingReserves(
                    seller.utxos,
                    slush.utxos,
                    pair.fromTokenId,
                    pair.toTokenId,
                );
                const body = exactInTemplate(
                    parsedQty.qty,
                    reserves,
                    pair.feePct,
                    from.decimals,
                    to.decimals,
                    pair.fromTokenId,
                    pair.toTokenId,
                    slush.script.toHex(),
                    feeScriptHex,
                );
                res.status(200).json(body);
            } catch (error: unknown) {
                sendQuoteError(res, error);
            }
        },
    );

    /**
     * GET /api/v1/swap/:from/:to/price — spot + reserves + pair feePct.
     */
    router.get(
        '/swap/:fromTokenId/:toTokenId/price',
        async (req: Request<SwapTokenParams>, res: Response) => {
            try {
                const pair = assertConfiguredPair(
                    tradedConfig,
                    tradedTokens,
                    req.params.fromTokenId,
                    req.params.toTokenId,
                );
                const from = tradedTokens.get(pair.fromTokenId)!;
                const to = tradedTokens.get(pair.toTokenId)!;
                const reserves = pairPricingReserves(
                    seller.utxos,
                    slush.utxos,
                    pair.fromTokenId,
                    pair.toTokenId,
                );
                if (reserves.reserveIn === 0n || reserves.reserveOut === 0n) {
                    throw new ValidationError(
                        'Both side reserves must be positive to compute ' +
                            'a local liquidity price',
                    );
                }
                const rate = spotToPerWholeFrom(
                    reserves.reserveIn,
                    reserves.reserveOut,
                    from.decimals,
                    to.decimals,
                );
                const body = {
                    rate,
                    feePct: pair.feePct,
                    source: 'local-liquidity',
                    reserves: {
                        [pair.fromTokenId]: reserves.reserveIn.toString(),
                        [pair.toTokenId]: reserves.reserveOut.toString(),
                    },
                };
                res.status(200).json(body);
            } catch (error: unknown) {
                sendQuoteError(res, error);
            }
        },
    );

    /**
     * GET /api/v1/swap/:from/:to/amm/:qty — CP exact-in discovery (no outs).
     */
    router.get(
        '/swap/:fromTokenId/:toTokenId/amm/:qty',
        async (req: Request<SwapQtyParams>, res: Response) => {
            try {
                const pair = assertConfiguredPair(
                    tradedConfig,
                    tradedTokens,
                    req.params.fromTokenId,
                    req.params.toTokenId,
                );
                const parsedQty = parsePositiveQty(req.params.qty);
                if (!parsedQty.ok) {
                    res.status(400).json({ error: parsedQty.error });
                    return;
                }
                const from = tradedTokens.get(pair.fromTokenId)!;
                const to = tradedTokens.get(pair.toTokenId)!;
                const amountInAtoms = decimalizedQtyToAtoms(
                    parsedQty.qty,
                    from.decimals,
                );
                if (amountInAtoms <= 0n) {
                    throw new ValidationError('qty must be a positive number');
                }
                const reserves = pairPricingReserves(
                    seller.utxos,
                    slush.utxos,
                    pair.fromTokenId,
                    pair.toTokenId,
                );
                const quote = quoteExactIn(
                    amountInAtoms,
                    reserves,
                    /* discovery ignores fee outs */ 0,
                );
                const spotRate = spotToPerWholeFrom(
                    reserves.reserveIn,
                    reserves.reserveOut,
                    from.decimals,
                    to.decimals,
                );
                const effectiveRate = effectiveRateToPerWholeFrom(
                    amountInAtoms,
                    quote.amountOut,
                    from.decimals,
                    to.decimals,
                );
                const body = {
                    source: 'local-liquidity',
                    amountIn: parsedQty.qty,
                    amountInAtoms: amountInAtoms.toString(),
                    amountOutAtoms: quote.amountOut.toString(),
                    amountOut: atomsToDecimalizedQty(
                        quote.amountOut,
                        to.decimals,
                    ),
                    spotRate,
                    effectiveRate,
                    feePct: pair.feePct,
                    reserves: {
                        from: reserves.reserveIn.toString(),
                        to: reserves.reserveOut.toString(),
                    },
                    priceImpactPct: priceImpactPct(spotRate, effectiveRate),
                };
                res.status(200).json(body);
            } catch (error: unknown) {
                sendQuoteError(res, error);
            }
        },
    );

    /**
     * GET /api/v1/swap/:from/:to?from|to&feePct — settleable CP template.
     */
    router.get(
        '/swap/:fromTokenId/:toTokenId',
        async (req: Request<SwapTokenParams>, res: Response) => {
            try {
                const { from, to, feePct } = req.query;
                // Key presence (not truthiness): ?from=&to=1 must not become exact-out.
                const hasFrom = from !== undefined;
                const hasTo = to !== undefined;
                if (!hasFrom && !hasTo) {
                    res.status(400).json({
                        error: "Must provide either 'from' or 'to' query parameter",
                    });
                    return;
                }
                if (hasFrom && hasTo) {
                    res.status(400).json({
                        error: "Cannot provide both 'from' and 'to' query parameters",
                    });
                    return;
                }
                const parsedFee = parseFeePctQuery(feePct);
                if (!parsedFee.ok) {
                    res.status(400).json({ error: parsedFee.error });
                    return;
                }
                const pair = assertConfiguredPair(
                    tradedConfig,
                    tradedTokens,
                    req.params.fromTokenId,
                    req.params.toTokenId,
                );
                if (!feePctMatchesPair(parsedFee.feePct, pair.feePct)) {
                    res.status(400).json({
                        error: `feePct must match configured pair fee (${pair.feePct})`,
                    });
                    return;
                }
                const qtyParam = String(hasFrom ? from : to);
                const parsedQty = parsePositiveQty(qtyParam);
                if (!parsedQty.ok) {
                    res.status(400).json({ error: parsedQty.error });
                    return;
                }
                const fromTok = tradedTokens.get(pair.fromTokenId)!;
                const toTok = tradedTokens.get(pair.toTokenId)!;
                const reserves = pairPricingReserves(
                    seller.utxos,
                    slush.utxos,
                    pair.fromTokenId,
                    pair.toTokenId,
                );
                const body = hasFrom
                    ? exactInTemplate(
                          parsedQty.qty,
                          reserves,
                          pair.feePct,
                          fromTok.decimals,
                          toTok.decimals,
                          pair.fromTokenId,
                          pair.toTokenId,
                          slush.script.toHex(),
                          feeScriptHex,
                      )
                    : exactOutTemplate(
                          parsedQty.qty,
                          reserves,
                          pair.feePct,
                          fromTok.decimals,
                          toTok.decimals,
                          pair.fromTokenId,
                          pair.toTokenId,
                          slush.script.toHex(),
                          feeScriptHex,
                      );
                res.status(200).json(body);
            } catch (error: unknown) {
                sendQuoteError(res, error);
            }
        },
    );

    return router;
};
