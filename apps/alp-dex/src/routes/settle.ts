// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Address, Tx, fromHex } from 'ecash-lib';
import { PostageTx, type Wallet } from 'ecash-wallet';
import { Router, type Request, type Response } from 'express';
import type { ParsedTradedConfig } from '../config/tradedConfig';
import { POSTAGE_SATS } from '../constants';
import { atomsToDecimalizedQty } from '../methods/atoms';
import { AsyncQueue } from '../methods/queue';
import { HttpError, ValidationError } from '../methods/errors';
import { assertSettleRequestFresh } from '../methods/settleAge';
import { assertTokenId } from '../methods/tokenId';
import {
    getBroadcastFailedMessage,
    getInvalidSwapMessage,
    getSwapFailedMessage,
    getSwapSuccessfulMessage,
} from '../ops/telegramMessages';
import { quoteExactIn, spotToPerWholeFrom } from '../pricing/quotes';
import { pairPricingReserves } from '../pricing/reserves';
import {
    effectiveRateToPerWholeFrom,
    priceImpactPct,
} from '../pricing/templates';
import { assertConfiguredPair } from './quotes';
import {
    humanExchangeRate,
    logSwapOutcome,
    type SwapRecord,
} from '../settle/audit';
import {
    extractUserAddress,
    parsePartiallySignedSwap,
    validatePartiallySignedTx,
    type ParsedPartiallySignedSwap,
} from '../settle/parseSwap';
import type { TradedTokens } from '../tokens/tradedTokens';

export type SendOpsFn = (message: string) => Promise<void>;

export type SettleRouteDeps = {
    seller: Wallet;
    slush: Wallet;
    feeAddress: string;
    tradedConfig: ParsedTradedConfig;
    tradedTokens: TradedTokens;
    /**
     * Shared FIFO with inventory maintain so settle and maintain cannot race
     * on seller UTXOs. Defaults to a local queue when omitted (unit tests).
     */
    walletQueue?: AsyncQueue;
    /**
     * Optional post-settle inventory maintain (fire-and-forget).
     * Errors are logged and must not fail the HTTP response.
     */
    maintainInventory?: () => Promise<unknown>;
    /**
     * Optional Telegram ops send. Fire-and-forget after the stdout audit log.
     */
    sendOps?: SendOpsFn;
    /**
     * Stored settle receipt time. Production omits this so each request
     * stamps `Date.now()`. Tests set a past timestamp so expiry can be
     * asserted without sleeping 20s.
     */
    createdAtMs?: number;
};

type SwapTokenParams = {
    fromTokenId: string;
    toTokenId: string;
};

type SettleBody = {
    serializedTxHex?: unknown;
    prePostageInputSats?: unknown;
    tokenId?: unknown;
    atoms?: unknown;
};

/**
 * Parse a settle-body integer field from the client (not Chronik).
 * Rejects booleans / empty strings that BigInt would silently coerce.
 */
const parseBodyInteger = (
    value: unknown,
    label: string,
    opts: { allowZero: boolean },
): bigint => {
    if (typeof value !== 'string' && typeof value !== 'number') {
        throw new ValidationError(
            `${label} must be an integer string or number`,
        );
    }
    if (typeof value === 'string' && value.trim() === '') {
        throw new ValidationError(
            `${label} must be an integer string or number`,
        );
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new ValidationError(
            `${label} must be an integer string or number`,
        );
    }
    let parsed: bigint;
    try {
        parsed = BigInt(value);
    } catch {
        throw new ValidationError(
            `${label} must be an integer string or number`,
        );
    }
    if (parsed < 0n) {
        throw new ValidationError(`${label} must not be negative`);
    }
    if (!opts.allowZero && parsed === 0n) {
        throw new ValidationError(`${label} must be positive`);
    }
    return parsed;
};

/**
 * Client IP from Express (`req.ip`). Set `trust proxy` in createApp when a
 * reverse proxy sits in front.
 */
export const clientIpFromRequest = (req: Request): string =>
    req.ip ?? req.socket.remoteAddress ?? 'unknown';

const humanQty = (atoms: bigint, decimals: number | undefined): number => {
    if (decimals === undefined) {
        return 0;
    }
    return Number(atomsToDecimalizedQty(atoms, decimals));
};

const sendSettleError = (
    res: Response,
    error: unknown,
    logLabel?: string,
): void => {
    if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
    }
    // Never echo internal Error messages (inventory sizes, Chronik URLs, etc.).
    console.error(logLabel ?? 'Settle error:', error);
    res.status(500).json({ error: 'Failed to complete swap transaction' });
};

/**
 * Postage-protocol settle: POST /api/v1/swap/:from/:to
 *
 * Validates a taker-signed postage-ready ALP tx, then fuel + sign + broadcast
 * on a process-local queue via {@link PostageTx}.
 */
export const createSettleRouter = (deps: SettleRouteDeps): Router => {
    const {
        seller,
        slush,
        feeAddress,
        tradedConfig,
        tradedTokens,
        maintainInventory,
        sendOps,
        createdAtMs: createdAtMsOverride,
    } = deps;
    const feeScriptHex = Address.fromCashAddress(feeAddress).toScriptHex();
    // Prefer the process-wide wallet queue so maintain cannot race settle.
    const settleQueue = deps.walletQueue ?? new AsyncQueue();
    const router = Router();

    router.post(
        '/swap/:fromTokenId/:toTokenId',
        async (req: Request<SwapTokenParams>, res: Response) => {
            const clientIp = clientIpFromRequest(req);
            const createdAtMs = createdAtMsOverride ?? Date.now();
            let fromTokenId = req.params.fromTokenId;
            let toTokenId = req.params.toTokenId;
            let serializedTxHex = '';
            let parsedSwap: ParsedPartiallySignedSwap | undefined;
            let takerAddress = 'Unknown';
            let currentRate = 0;
            let displayRate = 0;
            let pairFeePct = 0;
            let postagePaidSats = 0n;
            let txid: string | null = null;
            let validated = false;
            let tradePriceImpactPct: number | undefined;

            const recordOutcome = async (
                isValid: boolean,
                broadcasted: boolean,
                outcome: 'invalid' | 'success' | 'broadcast-failed' | 'failed',
                errorMsg?: string,
            ): Promise<void> => {
                const fromToken = tradedTokens.get(fromTokenId);
                const toToken = tradedTokens.get(toTokenId);
                const record: SwapRecord = {
                    serializedTxHex,
                    isValid,
                    broadcasted,
                    txid,
                    fromTokenId,
                    toTokenId,
                    postagePaidSats: Number(postagePaidSats),
                    clientIp,
                    takerAddress,
                    qtyFrom: parsedSwap
                        ? humanQty(parsedSwap.atomsFrom, fromToken?.decimals)
                        : 0,
                    qtyTo: parsedSwap
                        ? humanQty(parsedSwap.atomsTo, toToken?.decimals)
                        : 0,
                    qtyFee: parsedSwap
                        ? humanQty(
                              parsedSwap.feeInFromAtoms,
                              fromToken?.decimals,
                          )
                        : 0,
                    serverExchangeRate: displayRate,
                    serverFee:
                        isValid &&
                        broadcasted &&
                        parsedSwap !== undefined &&
                        parsedSwap.feeInFromAtoms > 0n
                            ? pairFeePct
                            : 0,
                };
                logSwapOutcome(outcome, record, errorMsg);
                if (sendOps === undefined) {
                    return;
                }
                const fromDecimals = fromToken?.decimals ?? 0;
                const toDecimals = toToken?.decimals ?? 0;
                const fromTicker = fromToken?.tokenTicker;
                const toTicker = toToken?.tokenTicker;
                let message: string | undefined;
                if (outcome === 'success') {
                    if (parsedSwap !== undefined) {
                        message = getSwapSuccessfulMessage({
                            parsedSwap,
                            currentRate: displayRate,
                            postagePaidSats,
                            txid: txid ?? '',
                            fromDecimals,
                            toDecimals,
                            fromTicker,
                            toTicker,
                            priceImpactPct: tradePriceImpactPct,
                        });
                    }
                } else if (outcome === 'invalid' && parsedSwap !== undefined) {
                    message = getInvalidSwapMessage({
                        parsedSwap,
                        currentRate: displayRate,
                        fromDecimals,
                        toDecimals,
                        fromTicker,
                        toTicker,
                        priceImpactPct: tradePriceImpactPct,
                    });
                } else if (
                    outcome === 'broadcast-failed' &&
                    parsedSwap !== undefined
                ) {
                    message = getBroadcastFailedMessage({
                        parsedSwap,
                        errorMsg: errorMsg ?? 'Unknown error',
                        fromDecimals,
                        toDecimals,
                        fromTicker,
                        toTicker,
                        priceImpactPct: tradePriceImpactPct,
                    });
                } else {
                    message = getSwapFailedMessage({
                        parsedSwap: parsedSwap ?? null,
                        errorMsg: errorMsg ?? 'Unknown error',
                        fromDecimals,
                        toDecimals,
                        fromTokenId,
                        toTokenId,
                        fromTicker,
                        toTicker,
                        priceImpactPct: tradePriceImpactPct,
                    });
                }
                if (message !== undefined) {
                    void sendOps(message).catch((tgError: unknown) => {
                        console.error(
                            'Failed to send Telegram ops message:',
                            tgError,
                        );
                    });
                }
            };

            try {
                const pair = assertConfiguredPair(
                    tradedConfig,
                    tradedTokens,
                    req.params.fromTokenId,
                    req.params.toTokenId,
                );
                fromTokenId = pair.fromTokenId;
                toTokenId = pair.toTokenId;
                pairFeePct = pair.feePct;
                const { feePct } = pair;

                const body = req.body as SettleBody;
                const {
                    serializedTxHex: bodyHex,
                    prePostageInputSats,
                    tokenId,
                    atoms,
                } = body;

                if (!bodyHex || typeof bodyHex !== 'string') {
                    throw new ValidationError(
                        'Missing serializedTxHex in request body (expected hex string)',
                    );
                }
                serializedTxHex = bodyHex;
                if (!tokenId || typeof tokenId !== 'string') {
                    throw new ValidationError(
                        'Missing tokenId in request body (expected string)',
                    );
                }

                const bodyTokenId = assertTokenId(tokenId);
                if (bodyTokenId !== toTokenId) {
                    throw new ValidationError(
                        `Invalid tokenId: expected ${toTokenId} (receiving token)`,
                    );
                }

                const toTokenAtomsNeeded = parseBodyInteger(atoms, 'atoms', {
                    allowZero: false,
                });
                const calculatedPrePostageInputSats = parseBodyInteger(
                    prePostageInputSats,
                    'prePostageInputSats',
                    { allowZero: true },
                );

                let deserializedTx: Tx;
                try {
                    deserializedTx = Tx.deser(fromHex(serializedTxHex));
                } catch (error) {
                    throw new ValidationError(
                        `Failed to deserialize transaction: ${error}`,
                    );
                }

                // platformFeeEnabled stays false: do not classify platform outs.
                const swap = parsePartiallySignedSwap(deserializedTx);
                parsedSwap = swap;

                const hasMakerFee = swap.feeInFromAtoms > 0n;
                const minOutputs = 3 + (hasMakerFee ? 1 : 0);
                if (deserializedTx.outputs.length < minOutputs) {
                    throw new ValidationError(
                        `Insufficient outputs: expected at least ${minOutputs}, got ${deserializedTx.outputs.length}`,
                    );
                }

                if (swap.fromTokenId.toLowerCase() !== fromTokenId) {
                    throw new ValidationError(
                        `Token sold mismatch: expected ${fromTokenId}, got ${swap.fromTokenId}`,
                    );
                }
                if (swap.toTokenId.toLowerCase() !== toTokenId) {
                    throw new ValidationError(
                        `Token bought mismatch: expected ${toTokenId}, got ${swap.toTokenId}`,
                    );
                }

                takerAddress = extractUserAddress(swap);
                if (takerAddress === 'Unknown') {
                    throw new ValidationError(
                        'Could not determine user address from swap transaction',
                    );
                }

                const priceLegAtoms =
                    swap.atomsFrom -
                    swap.feeInFromAtoms -
                    swap.platformFeeInFromAtoms;
                if (priceLegAtoms > 0n) {
                    currentRate = Number(swap.atomsTo) / Number(priceLegAtoms);
                    displayRate = humanExchangeRate(
                        swap.atomsTo,
                        priceLegAtoms,
                        tradedTokens.get(fromTokenId)?.decimals ?? 0,
                        tradedTokens.get(toTokenId)?.decimals ?? 0,
                    );
                }

                // Body `atoms` is the buyer receive amount (SPEC). Inventory
                // must cover every toToken out on the tx (buyer + optional
                // change to slush).
                if (toTokenAtomsNeeded !== swap.atomsTo) {
                    throw new ValidationError(
                        `atoms mismatch: body ${toTokenAtomsNeeded}, ` +
                            `tx buyer output ${swap.atomsTo}`,
                    );
                }
                const parsedToTokenAtoms = swap.outputs
                    .filter(output => output.tokenId === swap.toTokenId)
                    .reduce((sum, output) => sum + output.atoms, 0n);

                const settled = await settleQueue.enqueue(async () => {
                    // Drop jobs the taker has already timed out. Check
                    // before inventory work and again immediately before
                    // broadcast so a job that starts at t=19s cannot
                    // still fill at t=25s.
                    assertSettleRequestFresh(createdAtMs);
                    // Band + inventory selection share one post-sync
                    // snapshot so concurrent settles cannot validate
                    // against reserves the previous fill already moved.
                    await Promise.all([seller.sync(), slush.sync()]);

                    const reserves = pairPricingReserves(
                        seller.utxos,
                        slush.utxos,
                        fromTokenId,
                        toTokenId,
                    );
                    const quote = quoteExactIn(priceLegAtoms, reserves, feePct);
                    const expectedToAtoms = quote.amountOut;
                    if (priceLegAtoms > 0n) {
                        const fromDecimals =
                            tradedTokens.get(fromTokenId)?.decimals ?? 0;
                        const toDecimals =
                            tradedTokens.get(toTokenId)?.decimals ?? 0;
                        tradePriceImpactPct = priceImpactPct(
                            spotToPerWholeFrom(
                                reserves.reserveIn,
                                reserves.reserveOut,
                                fromDecimals,
                                toDecimals,
                            ),
                            effectiveRateToPerWholeFrom(
                                priceLegAtoms,
                                swap.atomsTo,
                                fromDecimals,
                                toDecimals,
                            ),
                        );
                    }

                    validatePartiallySignedTx(swap, {
                        slushScriptHex: slush.script.toHex(),
                        feeScriptHex,
                        sellerScriptHex: seller.script.toHex(),
                        currentRate,
                        expectedToAtoms,
                        makerFeePct: feePct,
                        // platformFeeEnabled false: reject unexpected platform outs
                        platformFeePct: 0,
                    });
                    validated = true;

                    const sellerToTokenUtxos = seller.utxos.filter(
                        (
                            utxo,
                        ): utxo is typeof utxo & {
                            token: NonNullable<typeof utxo.token>;
                        } =>
                            utxo.token?.tokenId.toLowerCase() === toTokenId &&
                            utxo.token !== undefined &&
                            !utxo.token.isMintBaton,
                    );

                    const totalToTokenAvailable = sellerToTokenUtxos.reduce(
                        (sum, utxo) => sum + utxo.token.atoms,
                        0n,
                    );
                    if (totalToTokenAvailable < parsedToTokenAtoms) {
                        throw new Error(
                            `Insufficient ${toTokenId} balance: need ${parsedToTokenAtoms} atoms, have ${totalToTokenAvailable} atoms`,
                        );
                    }

                    const toToken = tradedTokens.get(toTokenId)!;
                    const atomsPerUtxo = toToken.utxoAtoms;
                    if (atomsPerUtxo <= 0n) {
                        throw new Error(
                            `Invalid inventory size for ${toTokenId}: ${atomsPerUtxo}`,
                        );
                    }
                    // Exact-size inventory: outs consume whole UTXOs; the
                    // node cannot mint toToken change after the taker
                    // fixed the ALP section.
                    if (parsedToTokenAtoms % atomsPerUtxo !== 0n) {
                        throw new ValidationError(
                            `toToken outputs must total a multiple of ` +
                                `${atomsPerUtxo} atoms (inventory size)`,
                        );
                    }
                    const numUtxosNeededBig = parsedToTokenAtoms / atomsPerUtxo;
                    if (numUtxosNeededBig > BigInt(Number.MAX_SAFE_INTEGER)) {
                        throw new ValidationError(
                            `toToken outputs require too many UTXOs (${numUtxosNeededBig})`,
                        );
                    }
                    const numUtxosNeeded = Number(numUtxosNeededBig);

                    const selectedToTokenUtxos = sellerToTokenUtxos.filter(
                        utxo => utxo.token.atoms === atomsPerUtxo,
                    );
                    if (selectedToTokenUtxos.length < numUtxosNeeded) {
                        throw new Error(
                            `Insufficient DEX ${toTokenId} UTXOs ` +
                                `(${toToken.utxoQty} qty / ${atomsPerUtxo} atoms): ` +
                                `need ${numUtxosNeeded}, have ${selectedToTokenUtxos.length}`,
                        );
                    }

                    const utxosToUse = selectedToTokenUtxos.slice(
                        0,
                        numUtxosNeeded,
                    );

                    const postageTx = new PostageTx(deserializedTx);
                    const builtTx = postageTx.addFuelAndSign(
                        seller,
                        calculatedPrePostageInputSats,
                        utxosToUse,
                    );

                    // Postage = node-added fuel only. Exclude taker inputs
                    // and the toToken inventory UTXOs we attached (those
                    // are dust-sized today, but role — not sats — is the
                    // source of truth; SignData has no tokenId field).
                    const takerPrevOuts = new Set(
                        deserializedTx.inputs.map(
                            input =>
                                `${input.prevOut.txid}:${input.prevOut.outIdx}`,
                        ),
                    );
                    const inventoryPrevOuts = new Set(
                        utxosToUse.map(
                            utxo =>
                                `${utxo.outpoint.txid}:${utxo.outpoint.outIdx}`,
                        ),
                    );
                    const paidSats = builtTx.txs[0].inputs
                        .filter(input => {
                            const key = `${input.prevOut.txid}:${input.prevOut.outIdx}`;
                            return (
                                !takerPrevOuts.has(key) &&
                                !inventoryPrevOuts.has(key)
                            );
                        })
                        .filter(
                            input =>
                                (input.signData?.sats ?? 0n) === POSTAGE_SATS,
                        )
                        .reduce(
                            (a, input) => a + (input.signData?.sats ?? 0n),
                            0n,
                        );

                    assertSettleRequestFresh(createdAtMs);
                    const broadcastResp = await builtTx.broadcast();
                    if (
                        !broadcastResp.success ||
                        !broadcastResp.broadcasted ||
                        broadcastResp.broadcasted.length === 0
                    ) {
                        const errorMsg =
                            broadcastResp.errors?.join(', ') || 'Unknown error';
                        throw new Error(`Broadcast failed: ${errorMsg}`);
                    }

                    return {
                        postagePaidSats: paidSats,
                        txid: broadcastResp.broadcasted[0],
                    };
                });
                postagePaidSats = settled.postagePaidSats;
                txid = settled.txid;

                if (maintainInventory !== undefined) {
                    void maintainInventory().catch((error: unknown) => {
                        console.error(
                            'Post-settle maintainInventory failed:',
                            error instanceof Error
                                ? error.message
                                : String(error),
                        );
                    });
                }

                res.status(200).json({
                    success: true,
                    txid,
                    postagePaidSats: postagePaidSats.toString(),
                });

                // Logs / Telegram must not turn a broadcast swap into a 500.
                await recordOutcome(true, true, 'success').catch(
                    (recordError: unknown) => {
                        console.error(
                            'Failed to record settle outcome:',
                            recordError,
                        );
                    },
                );
            } catch (error: unknown) {
                const status = error instanceof HttpError ? error.status : 500;
                const errorMsg =
                    error instanceof Error ? error.message : String(error);
                const record =
                    status === 400
                        ? recordOutcome(false, false, 'invalid', errorMsg)
                        : errorMsg.includes('Broadcast failed')
                          ? recordOutcome(
                                validated,
                                false,
                                'broadcast-failed',
                                errorMsg,
                            )
                          : recordOutcome(validated, false, 'failed', errorMsg);
                await record.catch((recordError: unknown) => {
                    console.error(
                        'Failed to record settle outcome:',
                        recordError,
                    );
                });
                sendSettleError(res, error, 'Error in POST /api/v1/swap:');
            }
        },
    );

    return router;
};
