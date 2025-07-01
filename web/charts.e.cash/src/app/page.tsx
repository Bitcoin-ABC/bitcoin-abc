// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

import DateRangeSelector from '../components/DateRangeSelector';
import ChartNavigation from '../components/ChartNavigation';
import ChartRenderer from '../components/ChartRenderer';
import { chartOptions } from '../config/chartOptions';

export interface DailyStats {
    date: string;
    total_blocks: number;
    total_transactions: number;
    avg_block_size: number;
}

export interface CoinbaseOutputData {
    date: string;
    value: number;
    label: string;
}

export interface RewardsData {
    date: string;
    miner_reward: number;
    staking_reward: number | null;
    ifp_reward: number | null;
    total: number;
}

export interface SummaryData {
    totalBlocks: number;
    latestBlockHeight: number;
    lowestBlockHeight: number;
    latestDayStats: DailyStats | null;
    recentStats: DailyStats[];
    dataRange?: {
        earliestDate: string;
        latestDate: string;
    };
}

export interface DailyClaimsData {
    date: string;
    cachet_claims: number;
    cashtab_faucet_claims: number;
}

export interface CumulativeClaimsData {
    date: string;
    cumulative_cachet_claims: number;
    cumulative_cashtab_faucet_claims: number;
}

export interface DailyBinanceWithdrawalsData {
    date: string;
    withdrawal_count: number;
    withdrawal_sats: number;
}

export interface DailyAgoraVolumeData {
    date: string;
    xecx: number;
    firma: number;
    other: number;
    total: number;
}

export interface DailyTokenTypeData {
    date: string;
    tx_count_alp_token_type_standard: number;
    tx_count_slp_token_type_fungible: number;
    tx_count_slp_token_type_mint_vault: number;
    tx_count_slp_token_type_nft1_group: number;
    tx_count_slp_token_type_nft1_child: number;
    app_txs_count: number;
    non_token_txs: number;
}

export interface DailyGenesisTxsData {
    date: string;
    genesis_alp_standard: number;
    genesis_slp_fungible: number;
    genesis_slp_mint_vault: number;
    genesis_slp_nft1_group: number;
    genesis_slp_nft1_child: number;
}

export interface CumulativeTokensCreatedData {
    date: string;
    cumulative_alp_standard: number;
    cumulative_slp_fungible: number;
    cumulative_slp_mint_vault: number;
    cumulative_slp_nft1_group: number;
    cumulative_slp_nft1_child: number;
}

export interface DailyPriceData {
    date: string;
    avg_price_usd: number;
}

// API response interfaces
interface CoinbaseAPIResponse {
    date: string;
    sum_coinbase_output_sats: string;
    miner_reward_sats: string;
    staking_reward_sats: string | null;
    ifp_reward_sats: string | null;
}

interface BinanceWithdrawalsAPIResponse {
    date: string;
    withdrawal_count: string;
    withdrawal_sats: string;
}

interface AgoraVolumeAPIResponse {
    date: string;
    xecx: string;
    firma: string;
    other: string;
    total: string;
}

export default function Home() {
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [coinbaseOutputData, setCoinbaseOutputData] = useState<
        CoinbaseOutputData[]
    >([]);
    const [rewardsData, setRewardsData] = useState<RewardsData[]>([]);
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dailyClaims, setDailyClaims] = useState<DailyClaimsData[]>([]);
    const [cumulativeClaims, setCumulativeClaims] = useState<
        CumulativeClaimsData[]
    >([]);
    const [binanceWithdrawals, setBinanceWithdrawals] = useState<
        DailyBinanceWithdrawalsData[]
    >([]);
    const [agoraVolume, setAgoraVolume] = useState<DailyAgoraVolumeData[]>([]);
    const [cumulativeAgoraVolume, setCumulativeAgoraVolume] = useState<
        DailyAgoraVolumeData[]
    >([]);
    const [tokenTypeData, setTokenTypeData] = useState<DailyTokenTypeData[]>(
        [],
    );
    const [genesisTxsData, setGenesisTxsData] = useState<DailyGenesisTxsData[]>(
        [],
    );
    const [cumulativeTokensData, setCumulativeTokensData] = useState<
        CumulativeTokensCreatedData[]
    >([]);
    const [priceData, setPriceData] = useState<DailyPriceData[]>([]);
    const [dailyAgoraVolumeUSD, setDailyAgoraVolumeUSD] = useState<
        Array<{
            date: string;
            usd: number;
            xecx_usd: number;
            firma_usd: number;
            other_usd: number;
        }>
    >([]);
    const [cumulativeAgoraVolumeUSD, setCumulativeAgoraVolumeUSD] = useState<
        Array<{
            date: string;
            usd: number;
            xecx_usd: number;
            firma_usd: number;
            other_usd: number;
        }>
    >([]);
    const [dateRange, setDateRange] = useState<{
        startDate: string;
        endDate: string;
    } | null>(() => {
        // Set initial date range for the last year
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        return { startDate, endDate };
    });
    const [selectedChart, setSelectedChart] =
        useState<string>('daily-transactions');
    const [yMax, setYMax] = useState<number | null>(null);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    // Add a ref to prevent multiple simultaneous requests
    const isFetching = useRef(false);

    // Store the initial yMax for proportional zooming
    const initialYMax = useRef<number | null>(null);

    // Track if user has started zooming
    const hasStartedZooming = useRef(false);

    // Simple zoom system: 5% per tick
    const zoomTickPercent = 0.05; // 5% per scroll tick

    const handleDateRangeChange = useCallback(
        (startDate: string, endDate: string) => {
            setDateRange({ startDate, endDate });
        },
        [],
    );

    // Function to fetch data for a specific chart
    const fetchChartData = async (
        chartId: string,
        startDate?: string,
        endDate?: string,
    ) => {
        if (isFetching.current) {
            return;
        }

        try {
            isFetching.current = true;
            setLoading(true);

            const params = new URLSearchParams();
            if (startDate && endDate) {
                params.append('start_date', startDate);
                params.append('end_date', endDate);
            }

            switch (chartId) {
                case 'daily-transactions':
                case 'daily-blocks':
                case 'block-sizes': {
                    const dailyStatsRes = await fetch(
                        `/api/charts/daily-stats?${params}`,
                    );
                    if (dailyStatsRes.ok) {
                        setDailyStats(
                            (await dailyStatsRes.json()) as DailyStats[],
                        );
                    }
                    break;
                }

                case 'coinbase-output': {
                    const coinbaseRes = await fetch(
                        `/api/charts/daily-coinbase?${params}`,
                    );
                    if (coinbaseRes.ok) {
                        const coinbaseData =
                            (await coinbaseRes.json()) as CoinbaseAPIResponse[];
                        const transformedData: CoinbaseOutputData[] =
                            coinbaseData.map(
                                (item): CoinbaseOutputData => ({
                                    date: item.date,
                                    value:
                                        Number(item.sum_coinbase_output_sats) /
                                        100,
                                    label: 'Coinbase Output',
                                }),
                            );
                        setCoinbaseOutputData(transformedData);
                    }
                    break;
                }

                case 'rewards': {
                    const rewardsRes = await fetch(
                        `/api/charts/daily-coinbase?${params}`,
                    );
                    if (rewardsRes.ok) {
                        const coinbaseData =
                            (await rewardsRes.json()) as CoinbaseAPIResponse[];
                        const rewardsData: RewardsData[] = coinbaseData.map(
                            (item): RewardsData => {
                                const itemDate = new Date(item.date);
                                const ifpActivationDate = new Date(
                                    '2020-11-15',
                                );
                                const stakingActivationDate = new Date(
                                    '2023-11-15',
                                );

                                const ifpReward =
                                    itemDate < ifpActivationDate
                                        ? null
                                        : item.ifp_reward_sats;
                                const stakingReward =
                                    itemDate < stakingActivationDate
                                        ? null
                                        : item.staking_reward_sats;

                                return {
                                    date: item.date,
                                    miner_reward:
                                        Number(item.miner_reward_sats) / 100,
                                    staking_reward:
                                        stakingReward == null
                                            ? null
                                            : Number(stakingReward) / 100,
                                    ifp_reward:
                                        ifpReward == null
                                            ? null
                                            : Number(ifpReward) / 100,
                                    total:
                                        (Number(item.miner_reward_sats) +
                                            (stakingReward
                                                ? Number(stakingReward)
                                                : 0) +
                                            (ifpReward
                                                ? Number(ifpReward)
                                                : 0)) /
                                        100,
                                };
                            },
                        );
                        setRewardsData(rewardsData);
                    }
                    break;
                }

                case 'claims': {
                    const claimsRes = await fetch(
                        `/api/charts/daily-claims?${params}`,
                    );
                    if (claimsRes.ok) {
                        setDailyClaims(
                            (await claimsRes.json()) as DailyClaimsData[],
                        );
                    }
                    break;
                }

                case 'cumulative-claims': {
                    const cumulativeClaimsRes = await fetch(
                        `/api/charts/cumulative-claims?${params}`,
                    );
                    if (cumulativeClaimsRes.ok) {
                        setCumulativeClaims(
                            (await cumulativeClaimsRes.json()) as CumulativeClaimsData[],
                        );
                    }
                    break;
                }

                case 'binance-withdrawals': {
                    const binanceRes = await fetch(
                        `/api/charts/daily-binance-withdrawals?${params}`,
                    );
                    if (binanceRes.ok) {
                        const binanceData =
                            (await binanceRes.json()) as BinanceWithdrawalsAPIResponse[];
                        const transformedData: DailyBinanceWithdrawalsData[] =
                            binanceData.map(
                                (item): DailyBinanceWithdrawalsData => ({
                                    date: item.date,
                                    withdrawal_count: Number(
                                        item.withdrawal_count,
                                    ),
                                    withdrawal_sats:
                                        Number(item.withdrawal_sats) / 100,
                                }),
                            );
                        setBinanceWithdrawals(transformedData);
                    }
                    break;
                }

                case 'agora-volume': {
                    const agoraRes = await fetch(
                        `/api/charts/daily-agora-volume?${params}`,
                    );
                    if (agoraRes.ok) {
                        const agoraData =
                            (await agoraRes.json()) as AgoraVolumeAPIResponse[];
                        const transformedData: DailyAgoraVolumeData[] =
                            agoraData.map(
                                (item): DailyAgoraVolumeData => ({
                                    ...item,
                                    xecx: Number(item.xecx) / 100,
                                    firma: Number(item.firma) / 100,
                                    other: Number(item.other) / 100,
                                    total: Number(item.total) / 100,
                                }),
                            );
                        setAgoraVolume(transformedData);
                    }
                    break;
                }

                case 'cumulative-agora-volume': {
                    const cumulativeAgoraRes = await fetch(
                        `/api/charts/cumulative-agora-volume?${params}`,
                    );
                    if (cumulativeAgoraRes.ok) {
                        const cumulativeAgoraData =
                            (await cumulativeAgoraRes.json()) as AgoraVolumeAPIResponse[];
                        const transformedData: DailyAgoraVolumeData[] =
                            cumulativeAgoraData.map(
                                (item): DailyAgoraVolumeData => ({
                                    ...item,
                                    xecx: Number(item.xecx) / 100,
                                    firma: Number(item.firma) / 100,
                                    other: Number(item.other) / 100,
                                    total: Number(item.total) / 100,
                                }),
                            );
                        setCumulativeAgoraVolume(transformedData);
                    }
                    break;
                }

                case 'daily-token-type-tx-counts': {
                    const tokenTypeRes = await fetch(
                        `/api/charts/daily-token-type-tx-counts?${params}`,
                    );
                    if (tokenTypeRes.ok) {
                        setTokenTypeData(
                            (await tokenTypeRes.json()) as DailyTokenTypeData[],
                        );
                    }
                    break;
                }

                case 'daily-genesis-txs': {
                    const genesisRes = await fetch(
                        `/api/charts/daily-genesis-txs?${params}`,
                    );
                    if (genesisRes.ok) {
                        setGenesisTxsData(
                            (await genesisRes.json()) as DailyGenesisTxsData[],
                        );
                    }
                    break;
                }

                case 'cumulative-tokens-created': {
                    const cumulativeTokensRes = await fetch(
                        `/api/charts/cumulative-tokens-created?${params}`,
                    );
                    if (cumulativeTokensRes.ok) {
                        setCumulativeTokensData(
                            (await cumulativeTokensRes.json()) as CumulativeTokensCreatedData[],
                        );
                    }
                    break;
                }

                case 'price': {
                    const priceRes = await fetch(
                        `/api/charts/daily-price?${params}`,
                    );
                    if (priceRes.ok) {
                        setPriceData(
                            (await priceRes.json()) as DailyPriceData[],
                        );
                    }
                    break;
                }

                case 'agora-volume-usd': {
                    const agoraUSDRes = await fetch(
                        `/api/charts/daily-agora-volume-usd?${params}`,
                    );
                    if (agoraUSDRes.ok) {
                        setDailyAgoraVolumeUSD(
                            (await agoraUSDRes.json()) as Array<{
                                date: string;
                                usd: number;
                                xecx_usd: number;
                                firma_usd: number;
                                other_usd: number;
                            }>,
                        );
                    }
                    break;
                }

                case 'cumulative-agora-volume-usd': {
                    const cumulativeAgoraUSDRes = await fetch(
                        `/api/charts/cumulative-agora-volume-usd?${params}`,
                    );
                    if (cumulativeAgoraUSDRes.ok) {
                        setCumulativeAgoraVolumeUSD(
                            (await cumulativeAgoraUSDRes.json()) as Array<{
                                date: string;
                                usd: number;
                                xecx_usd: number;
                                firma_usd: number;
                                other_usd: number;
                            }>,
                        );
                    }
                    break;
                }
            }
        } catch (err) {
            setError('Failed to fetch chart data');
            console.error('Error fetching chart data:', err);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    };

    // Function to fetch summary data (used by navigation)
    const fetchSummaryData = async () => {
        try {
            const summaryRes = await fetch('/api/charts/summary');
            if (summaryRes.ok) {
                const summary = await summaryRes.json();
                setSummaryData(summary);
            }
        } catch (err) {
            console.error('Error fetching summary data:', err);
        }
    };

    // Memoize fetchChartData to prevent recreation on every render
    const memoizedFetchChartData = useCallback(
        async (chartId: string, startDate?: string, endDate?: string) => {
            await fetchChartData(chartId, startDate, endDate);
        },
        [],
    );

    // Fetch summary data on mount
    useEffect(() => {
        fetchSummaryData();
    }, []);

    // Fetch data when date range changes or chart changes
    useEffect(() => {
        if (dateRange && selectedChart) {
            memoizedFetchChartData(
                selectedChart,
                dateRange.startDate,
                dateRange.endDate,
            );
        }
    }, [dateRange, selectedChart, memoizedFetchChartData]);

    // Handle chart selection
    const handleChartSelect = useCallback((chartId: string) => {
        setSelectedChart(chartId);
        // Reset zoom when switching charts
        setYMax(null);
        hasStartedZooming.current = false;
    }, []);

    // Use the filtered data directly since we're now using proper date ranges
    const completeDays = dailyStats;

    // Use the filtered data directly since we're now using proper date ranges
    const completeCoinbaseData = coinbaseOutputData;

    // Use the filtered data directly since we're now using proper date ranges
    const completeRewardsData = rewardsData;

    // Use the filtered data directly since we're now using proper date ranges
    const completeDailyClaims = dailyClaims;
    const completeCumulativeClaims = cumulativeClaims;
    const completeBinanceWithdrawals = binanceWithdrawals;
    const _completeAgoraVolume = agoraVolume;
    const _completeCumulativeAgoraVolume = cumulativeAgoraVolume;
    const completeTokenTypeData = tokenTypeData;
    const completeGenesisTxsData = genesisTxsData;
    const completeCumulativeTokensData = cumulativeTokensData;
    const completePriceData = priceData;

    function handleResetY() {
        // Reset to auto-scaling
        setYMax(null);
        hasStartedZooming.current = false;
    }

    // Reset yMax when selectedChart changes
    useEffect(() => {
        // Always reset to auto-scaling when switching charts
        setYMax(null);
        hasStartedZooming.current = false;
        initialYMax.current = null;
    }, [selectedChart]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#090916]">
                <div className="text-center">
                    <div className="mx-auto h-32 w-32 animate-spin rounded-full border-b-2 border-[#01a0e0]"></div>
                    <p className="mt-4 text-[#cccccc]">Loading chart data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#090916]">
                <div className="text-center">
                    <p className="mb-4 text-red-400">{error}</p>
                    <button
                        onClick={() => fetchChartData('daily-transactions')}
                        className="rounded bg-[#01a0e0] px-4 py-2 text-white transition-colors hover:bg-[#0671c0]"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Prepare data object for ChartRenderer with only the current chart's data
    const chartData = {
        completeDays,
        completeCoinbaseData,
        completeRewardsData,
        completeDailyClaims,
        completeCumulativeClaims,
        completeBinanceWithdrawals,
        _completeAgoraVolume,
        _completeCumulativeAgoraVolume,
        completeTokenTypeData,
        completeGenesisTxsData,
        completeCumulativeTokensData,
        completePriceData,
        dailyAgoraVolumeUSD,
        cumulativeAgoraVolumeUSD,
    };

    return (
        <div className="flex h-screen flex-col overflow-x-hidden bg-[#090916] text-white md:flex-row">
            {/* Mobile Hamburger */}
            <button
                className="z-30 p-4 focus:outline-none md:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open chart picker"
            >
                <svg
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6h16M4 12h16M4 18h16"
                    />
                </svg>
            </button>

            {/* Sidebar Navigation (desktop) */}
            <div className="hidden h-screen md:block">
                <ChartNavigation
                    selectedChart={selectedChart}
                    onChartSelect={handleChartSelect}
                    summaryData={summaryData}
                />
            </div>

            {/* Sidebar Navigation (mobile drawer) */}
            {mobileNavOpen && (
                <>
                    <div
                        className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
                        onClick={() => setMobileNavOpen(false)}
                    />
                    <div
                        className="custom-scrollbar fixed left-0 top-0 z-30 h-full w-64 border-r border-white/10 bg-white/5 transition-transform duration-300 md:hidden"
                        style={{
                            transform: mobileNavOpen
                                ? 'translateX(0)'
                                : 'translateX(-100%)',
                        }}
                    >
                        <div className="flex justify-end p-4">
                            <button
                                onClick={() => setMobileNavOpen(false)}
                                aria-label="Close chart picker"
                            >
                                <svg
                                    width="28"
                                    height="28"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <ChartNavigation
                            selectedChart={selectedChart}
                            onChartSelect={id => {
                                handleChartSelect(id);
                                setMobileNavOpen(false);
                            }}
                            summaryData={summaryData}
                        />
                    </div>
                </>
            )}

            {/* Main Content */}
            <div className="flex min-h-0 flex-1 flex-col space-y-2 sm:space-y-4">
                {/* Date Range Selector */}
                <div className="px-4 sm:px-6">
                    <DateRangeSelector
                        onDateRangeChange={handleDateRangeChange}
                        currentStartDate={dateRange?.startDate}
                        currentEndDate={dateRange?.endDate}
                        isLoading={loading}
                    />
                </div>

                {/* Reset button: mobile above chart, desktop inside chart lower left */}
                {hasStartedZooming.current && (
                    <div className="flex justify-center sm:hidden">
                        <button
                            onClick={handleResetY}
                            className="mx-auto w-[80%] cursor-pointer rounded-lg bg-gray-700 px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-gray-600"
                            style={{ maxWidth: '100vw' }}
                        >
                            <span className="sm:hidden">Reset Zoom</span>
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    </div>
                )}

                {/* Chart Display */}
                <div className="min-h-0 flex-1 p-0 sm:px-4">
                    <div className="relative h-full w-full max-w-full pb-20 sm:pb-12">
                        {/* Desktop/tablet Reset button, lower left inside chart */}
                        {hasStartedZooming.current && (
                            <button
                                onClick={handleResetY}
                                className="absolute bottom-4 left-4 z-20 hidden cursor-pointer rounded-lg bg-gray-700 px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-gray-600 sm:block"
                            >
                                Reset
                            </button>
                        )}
                        {/* Touch zoom controls */}
                        <div
                            className="absolute inset-0 z-10"
                            style={{
                                pointerEvents: 'none',
                                touchAction: 'none',
                            }}
                        />
                        <div
                            className="w-full max-w-full"
                            ref={el => {
                                if (el) {
                                    // Create a native event handler for wheel events
                                    const wheelHandler = (e: WheelEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();

                                        // Define getDataMax as a local function
                                        const getDataMax = () => {
                                            const chartOption =
                                                chartOptions.find(
                                                    option =>
                                                        option.id ===
                                                        selectedChart,
                                                );
                                            if (!chartOption) return 0;

                                            const {
                                                dataKey,
                                                fields,
                                                sumFields,
                                                transformValue,
                                            } = chartOption.dataConfig;

                                            // Get the data array based on the dataKey
                                            const dataArray = (() => {
                                                switch (dataKey) {
                                                    case 'completeDays':
                                                        return completeDays;
                                                    case 'completeCoinbaseData':
                                                        return completeCoinbaseData;
                                                    case 'completeRewardsData':
                                                        return completeRewardsData;
                                                    case 'completeDailyClaims':
                                                        return completeDailyClaims;
                                                    case 'completeCumulativeClaims':
                                                        return completeCumulativeClaims;
                                                    case 'completeBinanceWithdrawals':
                                                        return completeBinanceWithdrawals;
                                                    case '_completeAgoraVolume':
                                                        return _completeAgoraVolume;
                                                    case '_completeCumulativeAgoraVolume':
                                                        return _completeCumulativeAgoraVolume;
                                                    case 'completeTokenTypeData':
                                                        return completeTokenTypeData;
                                                    case 'completeGenesisTxsData':
                                                        return completeGenesisTxsData;
                                                    case 'completeCumulativeTokensData':
                                                        return completeCumulativeTokensData;
                                                    case 'completePriceData':
                                                        return completePriceData;
                                                    case 'dailyAgoraVolumeUSD':
                                                        return dailyAgoraVolumeUSD;
                                                    case 'cumulativeAgoraVolumeUSD':
                                                        return cumulativeAgoraVolumeUSD;
                                                    default:
                                                        return [];
                                                }
                                            })();

                                            if (dataArray.length === 0)
                                                return 0;

                                            if (sumFields) {
                                                // Sum multiple fields for each data point
                                                return Math.max(
                                                    ...dataArray.map(item => {
                                                        const typedItem =
                                                            item as unknown as Record<
                                                                string,
                                                                number
                                                            >;
                                                        const sum =
                                                            fields.reduce(
                                                                (
                                                                    sum: number,
                                                                    field: string,
                                                                ) =>
                                                                    sum +
                                                                    (typedItem[
                                                                        field
                                                                    ] || 0),
                                                                0,
                                                            );
                                                        return transformValue
                                                            ? transformValue(
                                                                  sum,
                                                              )
                                                            : sum;
                                                    }),
                                                );
                                            } else {
                                                // Use single field
                                                return Math.max(
                                                    ...dataArray.map(item => {
                                                        const typedItem =
                                                            item as unknown as Record<
                                                                string,
                                                                number
                                                            >;
                                                        const value =
                                                            typedItem[
                                                                fields[0]
                                                            ] || 0;
                                                        return transformValue
                                                            ? transformValue(
                                                                  value,
                                                              )
                                                            : value;
                                                    }),
                                                );
                                            }
                                        };

                                        // On first scroll, capture the current auto-scaled max
                                        if (!hasStartedZooming.current) {
                                            const dataMax = getDataMax();
                                            const estimatedAutoMax = Math.ceil(
                                                dataMax * 1.15,
                                            );
                                            initialYMax.current =
                                                estimatedAutoMax;
                                            hasStartedZooming.current = true;
                                        }

                                        // Use current yMax for zooming, or the initial max if yMax is still null
                                        const currentMax =
                                            yMax !== null
                                                ? yMax
                                                : initialYMax.current!;
                                        const tickAmount =
                                            currentMax * zoomTickPercent;

                                        let newMax;
                                        if (e.deltaY < 0) {
                                            // Scroll up = zoom in (decrease yMax)
                                            newMax = currentMax - tickAmount;
                                        } else {
                                            // Scroll down = zoom out (increase yMax)
                                            newMax = currentMax + tickAmount;
                                        }

                                        // Allow zooming beyond the data maximum for better user experience
                                        const dataMax = getDataMax();
                                        const minMax = Math.max(
                                            dataMax * 0.1,
                                            1,
                                        );
                                        newMax = Math.max(newMax, minMax);

                                        setYMax(Math.round(newMax));
                                    };

                                    el.addEventListener('wheel', wheelHandler, {
                                        passive: false,
                                    });
                                    return () => {
                                        el.removeEventListener(
                                            'wheel',
                                            wheelHandler,
                                        );
                                    };
                                }
                            }}
                        >
                            <ChartRenderer
                                chartId={selectedChart}
                                data={chartData}
                                summaryData={summaryData}
                                yAxisDomain={[0, yMax !== null ? yMax : 'auto']}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
