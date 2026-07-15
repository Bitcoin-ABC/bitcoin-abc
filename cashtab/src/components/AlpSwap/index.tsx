// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import ActionButtonRow from 'components/Common/ActionButtonRow';
import PrimaryButton from 'components/Common/Buttons';
import { InlineLoader } from 'components/Common/Spinner';
import TokenIcon from 'components/Etokens/TokenIcon';
import { SwapIcon } from 'components/Common/CustomIcons';
import { explorer } from 'config/explorer';
import { alpSwap } from 'config/alpSwap';
import { getTokenGenesisInfo } from 'chronik';
import { confirmBiometricBroadcast } from 'services/biometricLockService';
import {
    TradablePair,
    MarketPair,
    SwapTemplateResponse,
    fetchStatus,
    fetchInventory,
    fetchSpotPrice,
    fetchSwapTemplate,
    settleSwap,
    roundSwapQty,
    uniqueTokenIdsFromPairs,
    findPair,
    minExactInQtyForFeeOutputs,
    minExactInQtyForReceiveAtom,
    minExactInQtyForReceiveAtomFromReserves,
    exactInReceivesAtLeastOneAtom,
    displaySwapFeePct,
    minExactOutQtyForFeeOutputs,
    formatSwapQty,
    resolveToPerFromRate,
    receivingOutputAtoms,
    priceLegCoversFeeOutputs,
    marketPairsFromDirected,
    defaultDirectionForMarket,
    pairsFromStatus,
    statusListedPairsUnusable,
    utxoQtyByTokenIdFromStatus,
    liquidityTotalsFromInventory,
} from 'services/alpSwapService';
import { buildAlpSwapPostageTx } from 'components/AlpSwap/buildPostage';
import AlpSwapExperimentalNotice from 'components/AlpSwap/ExperimentalNotice';
import {
    rememberAlpSwapSettleTxid,
    setAlpSwapBuyerToastSuppressed,
} from 'components/AlpSwap/rememberSettleTxid';
import {
    formatAmountFromTypedInput,
    normalizeDecimalInput,
    formatAmountFromWire,
    caretPosAfterFormat,
    getDecimalSeparator,
} from 'formatting';
import { getUserLocale } from 'helpers';
import {
    Wrapper,
    PairPills,
    PairPill,
    SwapPanel,
    AmountRow,
    AmountHeader,
    TokenBadge,
    ClearButton,
    AmountInput,
    BalanceHint,
    MidRow,
    MidLabel,
    RatePill,
    FlipButton,
    FeeRow,
    ErrorBanner,
    ButtonRow,
    StatusText,
} from 'components/AlpSwap/styled';

interface ActiveQuote {
    template: SwapTemplateResponse;
    exactIn: boolean;
    qty: string;
}

function formatFeePercentLabel(feePct: number): string {
    const pct = feePct * 100;
    const rounded =
        Math.abs(pct - Math.round(pct)) < 1e-9
            ? String(Math.round(pct))
            : pct.toFixed(2).replace(/\.?0+$/, '');
    return `${rounded}%`;
}

function truncateTokenId(tokenId: string): string {
    return `${tokenId.slice(0, 6)}…${tokenId.slice(-4)}`;
}

/**
 * Reachability failures share one banner; the real error is logged.
 * API error bodies (insufficient size, etc.) still surface as-is.
 */
const alpDexUserMessage = (err: unknown, fallback: string): string => {
    console.error(err);
    if (
        err instanceof TypeError ||
        (err instanceof Error &&
            (err.message === 'Failed to fetch' ||
                err.message.startsWith('AlpSwap request failed')))
    ) {
        return alpSwap.unavailableMessage;
    }
    return err instanceof Error ? err.message : fallback;
};

const minExactInQty = (
    pair: TradablePair,
    makerFeePct: number,
    platformFeePct: number,
    toPerFromRate: number | null,
    reserves?: Record<string, string> | null,
): number => {
    const feeMin = minExactInQtyForFeeOutputs(
        pair.fromDecimals,
        makerFeePct,
        platformFeePct,
    );
    const fromReserve = reserves?.[pair.fromTokenId];
    const toReserve = reserves?.[pair.toTokenId];
    if (typeof fromReserve === 'string' && typeof toReserve === 'string') {
        try {
            return Math.max(
                feeMin,
                minExactInQtyForReceiveAtomFromReserves(
                    fromReserve,
                    toReserve,
                    pair.fromDecimals,
                    makerFeePct,
                ),
            );
        } catch {
            // Fall through to linear spot when reserves cannot yield 1 atom.
        }
    }
    if (toPerFromRate === null || !(toPerFromRate > 0)) {
        return feeMin;
    }
    return Math.max(
        feeMin,
        minExactInQtyForReceiveAtom(
            pair.fromDecimals,
            pair.toDecimals,
            makerFeePct,
            platformFeePct,
            toPerFromRate,
        ),
    );
};

const AlpSwap: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    const [searchParams] = useSearchParams();
    const requestedFrom = searchParams.get('from');
    const requestedTo = searchParams.get('to');
    if (!isWalletContextLoaded(ContextValue)) {
        return null;
    }
    const { chronik, cashtabState, updateCashtabState, ecashWallet } =
        ContextValue;
    const { cashtabCache, tokens } = cashtabState;
    if (!ecashWallet) {
        return null;
    }
    const userLocale = getUserLocale(navigator);

    const [pairs, setPairs] = useState<TradablePair[] | null>(null);
    const [liquidityTotals, setLiquidityTotals] = useState<
        Record<string, number>
    >({});
    /** tokenId → seller utxoQty (human units) from /api/v1/status */
    const [utxoQtyByTokenId, setUtxoQtyByTokenId] = useState<
        Record<string, number>
    >({});
    /** Standalone alp-dex has no coordinator platform fee. */
    const platformFeePct = 0;
    const [loadError, setLoadError] = useState<string | null>(null);

    const [fromTokenId, setFromTokenId] = useState<string | null>(null);
    const [toTokenId, setToTokenId] = useState<string | null>(null);
    const [fromAmountStr, setFromAmountStr] = useState('');
    const [toAmountStr, setToAmountStr] = useState('');
    const [fromFieldError, setFromFieldError] = useState<string | null>(null);
    const [toFieldError, setToFieldError] = useState<string | null>(null);

    const [spotRate, setSpotRate] = useState<number | null>(null);
    const [spotReserves, setSpotReserves] = useState<Record<
        string,
        string
    > | null>(null);
    const [activeQuote, setActiveQuote] = useState<ActiveQuote | null>(null);
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [isSwapping, setIsSwapping] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const quoteRequestId = useRef(0);
    const fromTokenIdRef = useRef<string | null>(null);
    const toTokenIdRef = useRef<string | null>(null);
    fromTokenIdRef.current = fromTokenId;
    toTokenIdRef.current = toTokenId;

    const tokenLabel = useCallback(
        (tokenId: string): { ticker: string; name: string } => {
            const cached = cashtabCache.tokens.get(tokenId);
            if (cached?.genesisInfo) {
                return {
                    ticker:
                        cached.genesisInfo.tokenTicker ||
                        truncateTokenId(tokenId),
                    name:
                        cached.genesisInfo.tokenName ||
                        truncateTokenId(tokenId),
                };
            }
            return {
                ticker: truncateTokenId(tokenId),
                name: truncateTokenId(tokenId),
            };
        },
        [cashtabCache.tokens],
    );

    const activePair = useMemo(() => {
        if (!pairs || !fromTokenId || !toTokenId) {
            return undefined;
        }
        return findPair(pairs, fromTokenId, toTokenId);
    }, [pairs, fromTokenId, toTokenId]);

    /** Pair fee from /status — required to quote; no local default. */
    const makerFeePct =
        typeof activePair?.feePct === 'number' &&
        Number.isFinite(activePair.feePct)
            ? activePair.feePct
            : null;

    const markets = useMemo(
        () => marketPairsFromDirected(pairs ?? []),
        [pairs],
    );

    const selectedMarketKey = useMemo(() => {
        if (!fromTokenId || !toTokenId) {
            return null;
        }
        const [tokenIdA, tokenIdB] = [fromTokenId, toTokenId].sort();
        return `${tokenIdA}:${tokenIdB}`;
    }, [fromTokenId, toTokenId]);

    const fromBalance = fromTokenId
        ? Number(tokens.get(fromTokenId) || '0')
        : 0;
    const toInventory =
        toTokenId && typeof liquidityTotals[toTokenId] === 'number'
            ? liquidityTotals[toTokenId]
            : null;

    const loadCatalog = useCallback(async () => {
        setLoadError(null);
        try {
            const [statusRes, inventoryRes] = await Promise.all([
                fetchStatus(),
                fetchInventory(),
            ]);
            const loadedPairs = pairsFromStatus(statusRes);
            if (statusListedPairsUnusable(statusRes)) {
                throw new Error('AlpSwap catalog is missing feePct or utxoQty');
            }
            setPairs(loadedPairs);
            setLiquidityTotals(liquidityTotalsFromInventory(inventoryRes));
            setUtxoQtyByTokenId(utxoQtyByTokenIdFromStatus(statusRes));

            const marketsLoaded = marketPairsFromDirected(loadedPairs);
            const requestedDir =
                requestedFrom && requestedTo
                    ? findPair(loadedPairs, requestedFrom, requestedTo)
                        ? {
                              fromTokenId: requestedFrom,
                              toTokenId: requestedTo,
                          }
                        : findPair(loadedPairs, requestedTo, requestedFrom)
                          ? {
                                fromTokenId: requestedTo,
                                toTokenId: requestedFrom,
                            }
                          : null
                    : null;
            if (requestedDir) {
                setFromTokenId(requestedDir.fromTokenId);
                setToTokenId(requestedDir.toTokenId);
            } else if (marketsLoaded.length > 0) {
                const dir = defaultDirectionForMarket(
                    loadedPairs,
                    marketsLoaded[0],
                );
                if (dir) {
                    const prevFrom = fromTokenIdRef.current;
                    const prevTo = toTokenIdRef.current;
                    const stillValid =
                        prevFrom != null &&
                        prevTo != null &&
                        marketsLoaded.some(
                            m =>
                                (m.tokenIdA === prevFrom &&
                                    m.tokenIdB === prevTo) ||
                                (m.tokenIdA === prevTo &&
                                    m.tokenIdB === prevFrom),
                        );
                    if (!stillValid) {
                        setFromTokenId(dir.fromTokenId);
                        setToTokenId(dir.toTokenId);
                    }
                }
            }

            // Best-effort chronik metadata for tickers/icons
            const tokenIds = uniqueTokenIdsFromPairs(loadedPairs);
            const missing = tokenIds.filter(
                id => typeof cashtabCache.tokens.get(id) === 'undefined',
            );
            if (missing.length > 0) {
                await Promise.allSettled(
                    missing.map(async tokenId => {
                        try {
                            const info = await getTokenGenesisInfo(
                                chronik,
                                tokenId,
                            );
                            cashtabCache.tokens.set(tokenId, info);
                        } catch {
                            // Ignore; UI falls back to truncated token id
                        }
                    }),
                );
                await updateCashtabState({ cashtabCache });
            }
        } catch (err) {
            console.error('AlpSwap: failed to load catalog', err);
            setLoadError(alpSwap.unavailableMessage);
            setPairs([]);
            setUtxoQtyByTokenId({});
        }
    }, [cashtabCache, chronik, updateCashtabState, requestedFrom, requestedTo]);

    useEffect(() => {
        void loadCatalog();
    }, []);

    useEffect(() => {
        if (!pairs || !requestedFrom || !requestedTo) {
            return;
        }
        if (findPair(pairs, requestedFrom, requestedTo)) {
            setFromTokenId(requestedFrom);
            setToTokenId(requestedTo);
            return;
        }
        if (findPair(pairs, requestedTo, requestedFrom)) {
            setFromTokenId(requestedTo);
            setToTokenId(requestedFrom);
        }
    }, [pairs, requestedFrom, requestedTo]);

    const clearAmounts = () => {
        setFromAmountStr('');
        setToAmountStr('');
        setFromFieldError(null);
        setToFieldError(null);
        setActiveQuote(null);
        setQuoteError(null);
        setIsLoadingQuote(false);
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
    };

    const selectMarket = (market: MarketPair) => {
        if (!pairs) {
            return;
        }
        const dir = defaultDirectionForMarket(pairs, market);
        if (!dir) {
            return;
        }
        setFromTokenId(dir.fromTokenId);
        setToTokenId(dir.toTokenId);
        clearAmounts();
    };

    // Spot rate when pair changes
    useEffect(() => {
        if (!fromTokenId || !toTokenId || fromTokenId === toTokenId) {
            setSpotRate(null);
            setSpotReserves(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetchSpotPrice(fromTokenId, toTokenId);
                if (!cancelled) {
                    const pair = findPair(pairs ?? [], fromTokenId, toTokenId);
                    const resolved = pair
                        ? resolveToPerFromRate(
                              res.rate,
                              res.reserves,
                              fromTokenId,
                              toTokenId,
                              pair.fromDecimals,
                              pair.toDecimals,
                          )
                        : res.rate > 0
                          ? res.rate
                          : null;
                    setSpotRate(resolved);
                    setSpotReserves(res.reserves ?? null);
                }
            } catch {
                if (!cancelled) {
                    setSpotRate(null);
                    setSpotReserves(null);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [fromTokenId, toTokenId, pairs]);

    const runQuote = useCallback(
        async (exactIn: boolean, qtyRaw: number) => {
            if (
                !fromTokenId ||
                !toTokenId ||
                !activePair ||
                makerFeePct === null
            ) {
                return;
            }
            const requestId = ++quoteRequestId.current;
            setIsLoadingQuote(true);
            setQuoteError(null);
            try {
                const qty = roundSwapQty(
                    qtyRaw,
                    exactIn ? activePair.fromDecimals : activePair.toDecimals,
                );
                // Template feePct is the maker/LP spread. Standalone alp-dex
                // does not add a coordinator platform fee. Query feePct must
                // match the pair (from /status); spot may confirm the same value.
                let feePct = makerFeePct;
                const spot = await fetchSpotPrice(fromTokenId, toTokenId);
                if (typeof spot.feePct === 'number') {
                    feePct = spot.feePct;
                }

                const template = await fetchSwapTemplate(
                    fromTokenId,
                    toTokenId,
                    exactIn ? { from: qty, feePct } : { to: qty, feePct },
                );

                if (requestId !== quoteRequestId.current) {
                    return;
                }

                const resolvedMakerFeePct =
                    typeof template.feePct === 'number'
                        ? template.feePct
                        : feePct;
                const resolvedPlatformFeePct = 0;

                const resolvedRate = resolveToPerFromRate(
                    spot.rate,
                    spot.reserves,
                    fromTokenId,
                    toTokenId,
                    activePair.fromDecimals,
                    activePair.toDecimals,
                );
                if (resolvedRate !== null && resolvedRate > 0) {
                    setSpotRate(resolvedRate);
                }
                if (spot.reserves) {
                    setSpotReserves(spot.reserves);
                }

                // Fee outs and the buyer receive out must each be ≥ 1 atom.
                // Template atoms can round a linear spot up to 1 while CP
                // exact-in (settle) still yields 0 — reject that too.
                const recvAtoms = receivingOutputAtoms(
                    template.outputs,
                    toTokenId,
                );
                const fromReserve = spot.reserves?.[fromTokenId];
                const toReserve = spot.reserves?.[toTokenId];
                const cpReceiveOk =
                    !exactIn ||
                    typeof fromReserve !== 'string' ||
                    typeof toReserve !== 'string' ||
                    exactInReceivesAtLeastOneAtom(
                        Number(qty),
                        activePair.fromDecimals,
                        resolvedMakerFeePct,
                        fromReserve,
                        toReserve,
                    );
                const feesCovered = priceLegCoversFeeOutputs(
                    template.price,
                    activePair.fromDecimals,
                    resolvedMakerFeePct,
                    resolvedPlatformFeePct,
                );
                if (!feesCovered || recvAtoms < 1n || !cpReceiveOk) {
                    setActiveQuote(null);
                    if (exactIn) {
                        const minQty = minExactInQty(
                            activePair,
                            resolvedMakerFeePct,
                            resolvedPlatformFeePct,
                            resolvedRate,
                            spot.reserves,
                        );
                        const localeMin = formatAmountFromWire(
                            formatSwapQty(minQty, activePair.fromDecimals),
                            userLocale,
                        );
                        setToFieldError(null);
                        setToAmountStr('');
                        setFromFieldError(
                            `Minimum swap is ${localeMin} (covers fees)`,
                        );
                    } else {
                        const toPerFromRate =
                            template.price > 0
                                ? Number(qty) / template.price
                                : resolvedRate !== null && resolvedRate > 0
                                  ? resolvedRate
                                  : 0;
                        if (toPerFromRate > 0) {
                            const minTo = minExactOutQtyForFeeOutputs(
                                activePair.toDecimals,
                                activePair.fromDecimals,
                                resolvedMakerFeePct,
                                resolvedPlatformFeePct,
                                toPerFromRate,
                            );
                            const localeMin = formatAmountFromWire(
                                formatSwapQty(minTo, activePair.toDecimals),
                                userLocale,
                            );
                            setFromFieldError(null);
                            setToFieldError(
                                `Minimum receive is ${localeMin} (covers fees)`,
                            );
                        } else {
                            setFromFieldError(null);
                            setToFieldError('Amount too small to cover fees');
                        }
                    }
                    return;
                }

                setActiveQuote({
                    template,
                    exactIn,
                    qty,
                });

                if (exactIn) {
                    const decimalized =
                        Number(recvAtoms) / 10 ** activePair.toDecimals;
                    const wire =
                        formatSwapQty(decimalized, activePair.toDecimals) ||
                        '0';
                    setToAmountStr(formatAmountFromWire(wire, userLocale));
                    // Keep from as user typed; template.price is net of fee
                } else {
                    const wire = template.price
                        .toFixed(Math.min(6, activePair.fromDecimals + 2))
                        .replace(/\.?0+$/, '');
                    setFromAmountStr(formatAmountFromWire(wire, userLocale));
                }
            } catch (err) {
                if (requestId !== quoteRequestId.current) {
                    return;
                }
                setActiveQuote(null);
                setQuoteError(alpDexUserMessage(err, 'Failed to get quote'));
            } finally {
                if (requestId === quoteRequestId.current) {
                    setIsLoadingQuote(false);
                }
            }
        },
        [fromTokenId, toTokenId, activePair, makerFeePct, userLocale],
    );

    const handleAmountInput = (
        side: 'from' | 'to',
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const input = e.target;
        const oldValue = input.value;
        const selectionStart =
            typeof input.selectionStart === 'number' ? input.selectionStart : 0;
        const maxDecimals =
            side === 'from' ? activePair?.fromDecimals : activePair?.toDecimals;
        const formatted = formatAmountFromTypedInput(
            oldValue,
            userLocale,
            maxDecimals,
        );
        const decimalSeparator = getDecimalSeparator(userLocale);
        input.value = formatted;
        const nextCaret = caretPosAfterFormat(
            oldValue,
            selectionStart,
            formatted,
            decimalSeparator,
        );
        try {
            input.setSelectionRange(nextCaret, nextCaret);
        } catch {
            // Some environments may reject selection changes
        }

        if (side === 'from') {
            setFromAmountStr(formatted);
        } else {
            setToAmountStr(formatted);
        }
        setFromFieldError(null);
        setToFieldError(null);
        setActiveQuote(null);
        setQuoteError(null);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }

        const normalized = normalizeDecimalInput(formatted, userLocale);
        const numeric = Number(normalized);
        if (!normalized || !Number.isFinite(numeric) || numeric <= 0) {
            setIsLoadingQuote(false);
            if (side === 'from') {
                setToAmountStr('');
            } else {
                setFromAmountStr('');
            }
            return;
        }

        if (makerFeePct === null) {
            setIsLoadingQuote(false);
            return;
        }

        if (side === 'from' && activePair) {
            const minQty = minExactInQty(
                activePair,
                makerFeePct,
                platformFeePct,
                spotRate,
                spotReserves,
            );
            if (numeric < minQty) {
                const localeMin = formatAmountFromWire(
                    formatSwapQty(minQty, activePair.fromDecimals),
                    userLocale,
                );
                setFromFieldError(`Minimum swap is ${localeMin} (covers fees)`);
                setIsLoadingQuote(false);
                setToAmountStr('');
                return;
            }
        }

        if (side === 'to' && activePair && spotRate !== null && spotRate > 0) {
            const minTo = minExactOutQtyForFeeOutputs(
                activePair.toDecimals,
                activePair.fromDecimals,
                makerFeePct,
                platformFeePct,
                spotRate,
            );
            if (numeric < minTo) {
                const localeMin = formatAmountFromWire(
                    formatSwapQty(minTo, activePair.toDecimals),
                    userLocale,
                );
                setToFieldError(
                    `Minimum receive is ${localeMin} (covers fees)`,
                );
                setIsLoadingQuote(false);
                setFromAmountStr('');
                return;
            }
        }

        if (side === 'from' && numeric > fromBalance) {
            setFromFieldError('Insufficient token balance');
        } else if (
            side === 'to' &&
            toInventory !== null &&
            numeric > toInventory
        ) {
            setToFieldError('Amount exceeds available liquidity');
        }

        setIsLoadingQuote(true);
        debounceRef.current = setTimeout(() => {
            void runQuote(side === 'from', numeric);
            debounceRef.current = null;
        }, alpSwap.quoteDebounceMs);
    };

    const flipPair = () => {
        if (!fromTokenId || !toTokenId || !pairs) {
            return;
        }
        const flipped = findPair(pairs, toTokenId, fromTokenId);
        if (!flipped) {
            toast.error('Reverse pair is not available');
            return;
        }
        setFromTokenId(toTokenId);
        setToTokenId(fromTokenId);
        clearAmounts();
    };

    const handleSwap = async () => {
        if (
            !ecashWallet ||
            !fromTokenId ||
            !toTokenId ||
            !activePair ||
            !activeQuote
        ) {
            return;
        }
        const fromAmt = Number(
            normalizeDecimalInput(fromAmountStr, userLocale),
        );
        if (!Number.isFinite(fromAmt) || fromAmt <= 0) {
            setFromFieldError('Enter a swap amount');
            return;
        }
        if (fromAmt > fromBalance) {
            setFromFieldError('Insufficient token balance');
            return;
        }
        const swapMakerFeePct =
            typeof activeQuote.template.feePct === 'number'
                ? activeQuote.template.feePct
                : makerFeePct;
        if (swapMakerFeePct === null) {
            setQuoteError(alpSwap.unavailableMessage);
            return;
        }
        const swapPlatformFeePct = 0;
        const swapRecvAtoms = receivingOutputAtoms(
            activeQuote.template.outputs,
            toTokenId,
        );
        if (
            !priceLegCoversFeeOutputs(
                activeQuote.template.price,
                activePair.fromDecimals,
                swapMakerFeePct,
                swapPlatformFeePct,
            ) ||
            swapRecvAtoms < 1n
        ) {
            if (activeQuote.exactIn) {
                const minQty = minExactInQty(
                    activePair,
                    swapMakerFeePct,
                    swapPlatformFeePct,
                    spotRate,
                    spotReserves,
                );
                const localeMin = formatAmountFromWire(
                    formatSwapQty(minQty, activePair.fromDecimals),
                    userLocale,
                );
                setToFieldError(null);
                setFromFieldError(`Minimum swap is ${localeMin} (covers fees)`);
            } else {
                const toAmt = Number(
                    normalizeDecimalInput(toAmountStr, userLocale),
                );
                const toPerFromRate =
                    activeQuote.template.price > 0 &&
                    Number.isFinite(toAmt) &&
                    toAmt > 0
                        ? toAmt / activeQuote.template.price
                        : spotRate != null && spotRate > 0
                          ? spotRate
                          : 0;
                if (toPerFromRate > 0) {
                    const minTo = minExactOutQtyForFeeOutputs(
                        activePair.toDecimals,
                        activePair.fromDecimals,
                        swapMakerFeePct,
                        swapPlatformFeePct,
                        toPerFromRate,
                    );
                    const localeMin = formatAmountFromWire(
                        formatSwapQty(minTo, activePair.toDecimals),
                        userLocale,
                    );
                    setFromFieldError(null);
                    setToFieldError(
                        `Minimum receive is ${localeMin} (covers fees)`,
                    );
                } else {
                    setFromFieldError(null);
                    setToFieldError('Amount too small to cover fees');
                }
            }
            return;
        }

        const receivingUtxoQty = utxoQtyByTokenId[toTokenId];
        if (
            typeof receivingUtxoQty !== 'number' ||
            !Number.isFinite(receivingUtxoQty) ||
            receivingUtxoQty <= 0
        ) {
            setQuoteError(
                'Missing maker UTXO size for the receiving token. Try again later.',
            );
            return;
        }

        if (
            !(await confirmBiometricBroadcast(
                cashtabState.settings,
                'Confirm AlpSwap',
            ))
        ) {
            return;
        }

        setIsSwapping(true);
        setQuoteError(null);
        setAlpSwapBuyerToastSuppressed(true);
        try {
            const built = buildAlpSwapPostageTx({
                wallet: ecashWallet,
                outputs: activeQuote.template.outputs,
                receivingTokenId: toTokenId,
                receivingDecimals: activePair.toDecimals,
                receivingUtxoQty,
                slushScriptHex: activeQuote.template.slushScript,
            });

            const result = await settleSwap(fromTokenId, toTokenId, {
                serializedTxHex: built.serializedTxHex,
                prePostageInputSats: built.prePostageInputSats.toString(),
                tokenId: built.receivingTokenId,
                atoms: built.receivingTokenAtoms.toString(),
            });

            if (!result.txid) {
                throw new Error('Swap succeeded but no txid returned');
            }

            rememberAlpSwapSettleTxid(result.txid);
            const fromTicker = tokenLabel(fromTokenId).ticker;
            const toTicker = tokenLabel(toTokenId).ticker;
            toast.success(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${result.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {`Swapped ${fromAmountStr} ${fromTicker} → ${toAmountStr} ${toTicker}`}
                </a>,
            );
            clearAmounts();
            void fetchInventory()
                .then(res =>
                    setLiquidityTotals(liquidityTotalsFromInventory(res)),
                )
                .catch(() => undefined);
            window.setTimeout(() => {
                setAlpSwapBuyerToastSuppressed(false);
            }, 15_000);
        } catch (err) {
            setAlpSwapBuyerToastSuppressed(false);
            const message = alpDexUserMessage(err, 'Swap failed');
            setQuoteError(message);
            toast.error(message);
        } finally {
            setIsSwapping(false);
        }
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const fromLabel = fromTokenId ? tokenLabel(fromTokenId) : null;
    const toLabel = toTokenId ? tokenLabel(toTokenId) : null;

    const ratePill =
        spotRate !== null && fromLabel && toLabel
            ? `1 ${fromLabel.ticker} ≈ ${spotRate.toPrecision(6)} ${toLabel.ticker}`
            : null;

    const fromAmtNumeric = Number(
        normalizeDecimalInput(fromAmountStr, userLocale),
    );
    const toAmtNumeric = Number(normalizeDecimalInput(toAmountStr, userLocale));
    const canSwap =
        !!activeQuote &&
        !isLoadingQuote &&
        !isSwapping &&
        !fromFieldError &&
        !toFieldError &&
        fromAmtNumeric > 0 &&
        toAmtNumeric > 0 &&
        fromAmtNumeric <= fromBalance;

    const totalFeePct =
        activeQuote != null && typeof activeQuote.template.feePct === 'number'
            ? displaySwapFeePct(
                  activeQuote.template.feePct,
                  activeQuote.template.price,
                  activeQuote.template.fee,
              )
            : makerFeePct;

    return (
        <Wrapper title="AlpSwap">
            <ActionButtonRow variant="agora" activeIndex={2} />
            <div style={{ marginTop: 12 }}>
                <AlpSwapExperimentalNotice />
            </div>
            {pairs === null && (
                <StatusText>
                    <InlineLoader /> Loading pairs…
                </StatusText>
            )}
            {loadError && <ErrorBanner>{loadError}</ErrorBanner>}
            {pairs !== null && pairs.length === 0 && !loadError && (
                <StatusText>No tradable pairs available right now.</StatusText>
            )}
            {pairs !== null && pairs.length > 0 && (
                <PairPills role="list" aria-label="Trading pairs">
                    {markets.map(market => {
                        const a = tokenLabel(market.tokenIdA);
                        const b = tokenLabel(market.tokenIdB);
                        const active = selectedMarketKey === market.key;
                        return (
                            <PairPill
                                key={market.key}
                                type="button"
                                role="listitem"
                                $active={active}
                                aria-pressed={active}
                                aria-label={`Select pair ${a.ticker} and ${b.ticker}`}
                                onClick={() => selectMarket(market)}
                            >
                                <TokenIcon
                                    size={32}
                                    tokenId={market.tokenIdA}
                                />
                                {a.ticker}
                                <span aria-hidden="true">↔</span>
                                <TokenIcon
                                    size={32}
                                    tokenId={market.tokenIdB}
                                />
                                {b.ticker}
                            </PairPill>
                        );
                    })}
                </PairPills>
            )}
            {pairs !== null && pairs.length > 0 && fromTokenId && toTokenId && (
                <SwapPanel>
                    <AmountRow>
                        <AmountHeader>
                            <TokenBadge
                                aria-label={`You pay ${fromLabel?.ticker || ''}`}
                            >
                                <TokenIcon size={32} tokenId={fromTokenId} />
                                {fromLabel?.ticker}
                            </TokenBadge>
                            {fromAmountStr !== '' && (
                                <ClearButton
                                    type="button"
                                    onClick={clearAmounts}
                                >
                                    Clear
                                </ClearButton>
                            )}
                        </AmountHeader>
                        <AmountInput
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            aria-label="Swap from amount"
                            value={fromAmountStr}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => handleAmountInput('from', e)}
                        />
                        <BalanceHint
                            $error={!!fromFieldError && fromAmountStr !== ''}
                        >
                            Balance:{' '}
                            {fromBalance.toLocaleString(userLocale, {
                                maximumFractionDigits:
                                    activePair?.fromDecimals ?? 8,
                            })}
                            {fromFieldError ? ` — ${fromFieldError}` : ''}
                        </BalanceHint>
                    </AmountRow>

                    <MidRow>
                        <MidLabel>to</MidLabel>
                        {ratePill ? (
                            <RatePill>
                                {ratePill}
                                <span>· Market</span>
                            </RatePill>
                        ) : (
                            <InlineLoader />
                        )}
                        <FlipButton
                            type="button"
                            aria-label="Flip swap direction"
                            onClick={flipPair}
                            title="Flip"
                        >
                            <SwapIcon />
                        </FlipButton>
                    </MidRow>

                    <AmountRow>
                        <AmountHeader>
                            <TokenBadge
                                aria-label={`You receive ${toLabel?.ticker || ''}`}
                            >
                                <TokenIcon size={32} tokenId={toTokenId} />
                                {toLabel?.ticker}
                            </TokenBadge>
                        </AmountHeader>
                        <AmountInput
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            aria-label="Swap to amount"
                            value={toAmountStr}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => handleAmountInput('to', e)}
                        />
                        <BalanceHint
                            $error={!!toFieldError && toAmountStr !== ''}
                        >
                            {toInventory !== null
                                ? `Liquidity: ${toInventory.toLocaleString(
                                      userLocale,
                                      {
                                          maximumFractionDigits:
                                              activePair?.toDecimals ?? 8,
                                      },
                                  )}`
                                : 'Liquidity: —'}
                            {toFieldError ? ` — ${toFieldError}` : ''}
                            {isLoadingQuote ? ' · Updating quote…' : ''}
                        </BalanceHint>
                    </AmountRow>

                    <FeeRow>
                        Fee:{' '}
                        {typeof totalFeePct === 'number'
                            ? formatFeePercentLabel(totalFeePct)
                            : '—'}
                        {activeQuote
                            ? ` · Impact: ${(
                                  activeQuote.template.priceImpactPct ?? 0
                              ).toFixed(2)}%`
                            : ''}
                    </FeeRow>

                    {quoteError && <ErrorBanner>{quoteError}</ErrorBanner>}

                    <ButtonRow>
                        <PrimaryButton
                            disabled={!canSwap}
                            onClick={() => void handleSwap()}
                        >
                            {isSwapping ? (
                                <center>
                                    <InlineLoader />
                                </center>
                            ) : (
                                'Swap'
                            )}
                        </PrimaryButton>
                    </ButtonRow>
                </SwapPanel>
            )}
        </Wrapper>
    );
};

export default AlpSwap;
