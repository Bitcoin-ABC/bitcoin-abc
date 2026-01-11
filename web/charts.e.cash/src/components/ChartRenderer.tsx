// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    AreaChart,
    Area,
    ComposedChart,
    ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import {
    getXAxisFormat,
    getXAxisTickInterval,
    formatValue,
    formatXECValue,
    formatBinanceM,
    trimZeroHistory,
} from '../utils/chartUtils';
import { useEffect, useState } from 'react';
import { getChartName } from '../config/chartOptions';
import type {
    DailyStats,
    CoinbaseOutputData,
    RewardsData,
    SummaryData,
    DailyClaimsData,
    CumulativeClaimsData,
    DailyBinanceWithdrawalsData,
    DailyAgoraVolumeData,
    DailyTokenTypeData,
    DailyGenesisTxsData,
    CumulativeTokensCreatedData,
    DailyPriceData,
} from '../app/page';
import React from 'react';

// Define a union type for all possible chart data
export type ChartData =
    | { completeDays: DailyStats[] }
    | { completeCoinbaseData: CoinbaseOutputData[] }
    | { completeRewardsData: RewardsData[] }
    | { completeDailyClaims: DailyClaimsData[] }
    | { completeCumulativeClaims: CumulativeClaimsData[] }
    | { completeBinanceWithdrawals: DailyBinanceWithdrawalsData[] }
    | { _completeAgoraVolume: DailyAgoraVolumeData[] }
    | { _completeCumulativeAgoraVolume: DailyAgoraVolumeData[] }
    | { completeTokenTypeData: DailyTokenTypeData[] }
    | { completeGenesisTxsData: DailyGenesisTxsData[] }
    | { completeCumulativeTokensData: CumulativeTokensCreatedData[] }
    | { completePriceData: DailyPriceData[] }
    | {
          dailyAgoraVolumeUSD: Array<{
              date: string;
              usd: number;
              xecx_usd: number;
              firma_usd: number;
              other_usd: number;
          }>;
      }
    | {
          cumulativeAgoraVolumeUSD: Array<{
              date: string;
              usd: number;
              xecx_usd: number;
              firma_usd: number;
              other_usd: number;
          }>;
      }
    | Record<string, unknown>;

interface ChartRendererProps {
    chartId: string;
    data: ChartData;
    summaryData?: SummaryData | null;
    yAxisDomain?: [number | 'auto', number | 'auto'];
}

const BCH_FORK_DATE = '2017-08-01T00:00:00.000Z';
const XEC_FORK_DATE = '2020-11-15T00:00:00.000Z';

// Chart margin constants
const CHART_MARGINS_DESKTOP = { left: 70, right: 70 };
const CHART_MARGINS_MOBILE = { left: 16, right: 24, top: 16, bottom: 64 };
const CHART_MARGINS_MOBILE_PRICE = { ...CHART_MARGINS_MOBILE, left: 40 };

// Custom hook to detect mobile
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        function handleResize() {
            setIsMobile(window.innerWidth <= 640);
        }
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
}

// Helper function to check if any data has non-zero values for specific keys
function hasNonZeroValues<T>(data: T[], keys: string[]): boolean {
    return data.some(row =>
        keys.some(key => Number((row as Record<string, unknown>)[key]) !== 0),
    );
}

// Color mapping for legend items by dataKey
const LEGEND_COLORS: Record<string, string> = {
    // Cumulative Tokens Created
    cumulative_alp_standard: '#01a0e0',
    cumulative_slp_fungible: '#22c55e',
    cumulative_slp_mint_vault: '#f97316',
    cumulative_slp_nft1_group: '#a855f7',
    cumulative_slp_nft1_child: '#f43f5e',
    // Genesis Tokens
    genesis_alp_standard: '#01a0e0',
    genesis_slp_fungible: '#22c55e',
    genesis_slp_mint_vault: '#f97316',
    genesis_slp_nft1_group: '#a855f7',
    genesis_slp_nft1_child: '#f43f5e',
    // Agora Volume
    xecx: '#01a0e0',
    firma: '#22c55e',
    other: '#f97316',
    // USD
    xecx_usd: '#01a0e0',
    firma_usd: '#22c55e',
    other_usd: '#f97316',
    // Rewards
    miner_reward: '#01a0e0',
    staking_reward: '#22c55e',
    ifp_reward: '#f97316',
    // Claims
    cachet_claims: '#FFC94D', // richer gold
    cashtab_faucet_claims: '#01a0e0', // blue
    cumulative_cachet_claims: '#FFC94D', // richer gold
    cumulative_cashtab_faucet_claims: '#01a0e0', // blue
    // Binance
    withdrawal_sats: '#01a0e0',
    withdrawal_count: '#ff6b6b',
    // Token Types
    tx_count_alp_token_type_standard: '#01a0e0',
    tx_count_slp_token_type_fungible: '#22c55e',
    tx_count_slp_token_type_mint_vault: '#f97316',
    tx_count_slp_token_type_nft1_group: '#a855f7',
    tx_count_slp_token_type_nft1_child: '#f43f5e',
    app_txs_count: '#0ea5e9',
    non_token_txs: '#64748b',
};

// Label mapping for legend items by dataKey
const LEGEND_LABELS: Record<string, string> = {
    cumulative_alp_standard: 'ALP Standard',
    cumulative_slp_fungible: 'SLP Fungible',
    cumulative_slp_mint_vault: 'SLP Mint Vault',
    cumulative_slp_nft1_group: 'SLP NFT1 Group',
    cumulative_slp_nft1_child: 'SLP NFT1 Child',
    genesis_alp_standard: 'ALP Standard',
    genesis_slp_fungible: 'SLP Fungible',
    genesis_slp_mint_vault: 'SLP Mint Vault',
    genesis_slp_nft1_group: 'SLP NFT1 Group',
    genesis_slp_nft1_child: 'SLP NFT1 Child',
    xecx: 'XECX',
    firma: 'Firma',
    other: 'Other',
    xecx_usd: 'XECX',
    firma_usd: 'Firma',
    other_usd: 'Other',
    miner_reward: 'Miner Reward',
    staking_reward: 'Staking Reward',
    ifp_reward: 'IFP Reward',
    cachet_claims: 'Cachet',
    cashtab_faucet_claims: 'XEC',
    cumulative_cachet_claims: 'Cachet',
    cumulative_cashtab_faucet_claims: 'XEC',
    withdrawal_sats: 'Amount',
    withdrawal_count: 'Count',
    tx_count_alp_token_type_standard: 'ALP Standard',
    tx_count_slp_token_type_fungible: 'SLP Fungible',
    tx_count_slp_token_type_mint_vault: 'SLP Mint Vault',
    tx_count_slp_token_type_nft1_group: 'SLP NFT1 Group',
    tx_count_slp_token_type_nft1_child: 'SLP NFT1 Child',
    app_txs_count: 'App Transactions',
    non_token_txs: 'Non-token Transactions',
};

// Custom legend component
const CustomLegend = ({ keys }: { keys: string[] }) => (
    <div className="mb-2 mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {keys.map(key => (
            <span
                key={key}
                className="flex items-center text-xs font-medium"
                style={{ color: LEGEND_COLORS[key] || '#fff' }}
            >
                <svg
                    width="16"
                    height="8"
                    className="mr-1"
                    style={{ display: 'inline' }}
                >
                    <rect
                        width="16"
                        height="8"
                        rx="2"
                        fill={LEGEND_COLORS[key] || '#fff'}
                    />
                </svg>
                {LEGEND_LABELS[key] || key}
            </span>
        ))}
    </div>
);

export default function ChartRenderer({
    chartId,
    data,
    yAxisDomain,
}: ChartRendererProps) {
    const isMobile = useIsMobile();

    // Helper functions to safely get data
    const getCompleteDays = (): DailyStats[] => {
        if ('completeDays' in data) {
            return data.completeDays as DailyStats[];
        }
        return [];
    };

    const getCompleteCoinbaseData = (): CoinbaseOutputData[] => {
        if ('completeCoinbaseData' in data) {
            return data.completeCoinbaseData as CoinbaseOutputData[];
        }
        return [];
    };

    const getCompleteRewardsData = (): RewardsData[] => {
        if ('completeRewardsData' in data) {
            return data.completeRewardsData as RewardsData[];
        }
        return [];
    };

    const getCompleteDailyClaims = (): DailyClaimsData[] => {
        if ('completeDailyClaims' in data) {
            return data.completeDailyClaims as DailyClaimsData[];
        }
        return [];
    };

    const getCompleteCumulativeClaims = (): CumulativeClaimsData[] => {
        if ('completeCumulativeClaims' in data) {
            return data.completeCumulativeClaims as CumulativeClaimsData[];
        }
        return [];
    };

    const getCompleteBinanceWithdrawals = (): DailyBinanceWithdrawalsData[] => {
        if ('completeBinanceWithdrawals' in data) {
            return data.completeBinanceWithdrawals as DailyBinanceWithdrawalsData[];
        }
        return [];
    };

    const getCompleteAgoraVolume = (): DailyAgoraVolumeData[] => {
        if ('_completeAgoraVolume' in data) {
            return data._completeAgoraVolume as DailyAgoraVolumeData[];
        }
        return [];
    };

    const getCompleteCumulativeAgoraVolume = (): DailyAgoraVolumeData[] => {
        if ('_completeCumulativeAgoraVolume' in data) {
            return data._completeCumulativeAgoraVolume as DailyAgoraVolumeData[];
        }
        return [];
    };

    const getCompleteTokenTypeData = (): DailyTokenTypeData[] => {
        if ('completeTokenTypeData' in data) {
            return data.completeTokenTypeData as DailyTokenTypeData[];
        }
        return [];
    };

    const getCompleteGenesisTxsData = (): DailyGenesisTxsData[] => {
        if ('completeGenesisTxsData' in data) {
            return data.completeGenesisTxsData as DailyGenesisTxsData[];
        }
        return [];
    };

    const getCompleteCumulativeTokensData =
        (): CumulativeTokensCreatedData[] => {
            if ('completeCumulativeTokensData' in data) {
                return data.completeCumulativeTokensData as CumulativeTokensCreatedData[];
            }
            return [];
        };

    const getCompletePriceData = (): DailyPriceData[] => {
        if ('completePriceData' in data) {
            return data.completePriceData as DailyPriceData[];
        }
        return [];
    };

    const getDailyAgoraVolumeUSD = (): Array<{
        date: string;
        usd: number;
        xecx_usd: number;
        firma_usd: number;
        other_usd: number;
    }> => {
        if ('dailyAgoraVolumeUSD' in data) {
            return data.dailyAgoraVolumeUSD as Array<{
                date: string;
                usd: number;
                xecx_usd: number;
                firma_usd: number;
                other_usd: number;
            }>;
        }
        return [];
    };

    const getCumulativeAgoraVolumeUSD = (): Array<{
        date: string;
        usd: number;
        xecx_usd: number;
        firma_usd: number;
        other_usd: number;
    }> => {
        if ('cumulativeAgoraVolumeUSD' in data) {
            return data.cumulativeAgoraVolumeUSD as Array<{
                date: string;
                usd: number;
                xecx_usd: number;
                firma_usd: number;
                other_usd: number;
            }>;
        }
        return [];
    };

    const renderChart = () => {
        const chartHeight = isMobile ? 375 : 600;
        const completeDays = getCompleteDays();

        switch (chartId) {
            case 'daily-transactions': {
                const xAxisFormat = getXAxisFormat(completeDays);
                const tickInterval = getXAxisTickInterval(completeDays);
                return (
                    <LineChart
                        data={completeDays}
                        margin={
                            isMobile
                                ? CHART_MARGINS_MOBILE
                                : CHART_MARGINS_DESKTOP
                        }
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <ReferenceLine
                            x={BCH_FORK_DATE}
                            stroke="#00FF00"
                            strokeDasharray="8 4"
                            label="BCH Fork"
                        />
                        <ReferenceLine
                            x={XEC_FORK_DATE}
                            stroke="#01a0e0"
                            strokeDasharray="8 4"
                            label="XEC Fork"
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(value: string) =>
                                format(new Date(value), xAxisFormat)
                            }
                            stroke="#ccc"
                            interval={tickInterval}
                            angle={isMobile ? -90 : 0}
                            textAnchor={isMobile ? 'end' : 'middle'}
                        />
                        <YAxis
                            stroke="#ccc"
                            tickFormatter={formatValue}
                            domain={yAxisDomain}
                            allowDataOverflow={true}
                        />
                        <Tooltip
                            labelFormatter={(value: string) =>
                                format(new Date(value), 'MMM dd, yyyy')
                            }
                            formatter={(value: number | undefined) => [
                                value?.toLocaleString() ?? '0',
                                'Transactions',
                            ]}
                            contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                padding: '8px 12px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            }}
                            cursor={{ stroke: '#01a0e0', strokeWidth: 1 }}
                            isAnimationActive={false}
                            animationDuration={0}
                        />
                        <Line
                            type="monotone"
                            dataKey="total_transactions"
                            stroke="#01a0e0"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                );
            }
            case 'daily-blocks': {
                const xAxisFormat = getXAxisFormat(completeDays);
                const tickInterval = getXAxisTickInterval(completeDays);
                return (
                    <LineChart
                        data={completeDays}
                        margin={
                            isMobile
                                ? CHART_MARGINS_MOBILE
                                : CHART_MARGINS_DESKTOP
                        }
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <ReferenceLine
                            x={BCH_FORK_DATE}
                            stroke="#00FF00"
                            strokeDasharray="8 4"
                            label="BCH Fork"
                        />
                        <ReferenceLine
                            x={XEC_FORK_DATE}
                            stroke="#01a0e0"
                            strokeDasharray="8 4"
                            label="XEC Fork"
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(value: string) =>
                                format(new Date(value), xAxisFormat)
                            }
                            stroke="#ccc"
                            interval={tickInterval}
                            angle={isMobile ? -90 : 0}
                            textAnchor={isMobile ? 'end' : 'middle'}
                        />
                        <YAxis
                            stroke="#ccc"
                            tickFormatter={formatValue}
                            domain={yAxisDomain}
                            allowDataOverflow={true}
                        />
                        <Tooltip
                            labelFormatter={(value: string) =>
                                format(new Date(value), 'MMM dd, yyyy')
                            }
                            formatter={(value: number | undefined) => [
                                value?.toLocaleString() ?? '0',
                                'Blocks',
                            ]}
                            contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                padding: '8px 12px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            }}
                            cursor={{ stroke: '#01a0e0', strokeWidth: 1 }}
                            isAnimationActive={false}
                            animationDuration={0}
                        />
                        <Line
                            type="monotone"
                            dataKey="total_blocks"
                            stroke="#01a0e0"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                );
            }
            case 'block-sizes': {
                const blockSizeData = completeDays.map((stat: DailyStats) => ({
                    ...stat,
                    avg_block_size_kb: stat.avg_block_size / 1024,
                }));
                const xAxisFormat = getXAxisFormat(blockSizeData);
                const tickInterval = getXAxisTickInterval(blockSizeData);
                return (
                    <LineChart
                        data={blockSizeData}
                        margin={
                            isMobile
                                ? CHART_MARGINS_MOBILE
                                : CHART_MARGINS_DESKTOP
                        }
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <ReferenceLine
                            x={BCH_FORK_DATE}
                            stroke="#00FF00"
                            strokeDasharray="8 4"
                            label="BCH Fork"
                        />
                        <ReferenceLine
                            x={XEC_FORK_DATE}
                            stroke="#01a0e0"
                            strokeDasharray="8 4"
                            label="XEC Fork"
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(value: string) =>
                                format(new Date(value), xAxisFormat)
                            }
                            stroke="#ccc"
                            interval={tickInterval}
                            angle={isMobile ? -90 : 0}
                            textAnchor={isMobile ? 'end' : 'middle'}
                        />
                        <YAxis
                            stroke="#ccc"
                            tickFormatter={(value: number) =>
                                `${value.toFixed(1)} KB`
                            }
                            domain={yAxisDomain}
                            allowDataOverflow={true}
                        />
                        <Tooltip
                            labelFormatter={(value: string) =>
                                format(new Date(value), 'MMM dd, yyyy')
                            }
                            formatter={(value: number | undefined) => [
                                `${value?.toFixed(1) ?? '0.0'} KB`,
                                'Average Block Size',
                            ]}
                            contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                padding: '8px 12px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            }}
                            cursor={{ stroke: '#01a0e0', strokeWidth: 1 }}
                            isAnimationActive={false}
                            animationDuration={0}
                        />
                        <Line
                            type="monotone"
                            dataKey="avg_block_size_kb"
                            stroke="#01a0e0"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                );
            }
            case 'coinbase-output': {
                const coinbaseData = getCompleteCoinbaseData();
                const xAxisFormat = getXAxisFormat(coinbaseData);
                const tickInterval = getXAxisTickInterval(coinbaseData);
                return (
                    <LineChart
                        data={coinbaseData}
                        margin={
                            isMobile
                                ? CHART_MARGINS_MOBILE
                                : CHART_MARGINS_DESKTOP
                        }
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <ReferenceLine
                            x={BCH_FORK_DATE}
                            stroke="#00FF00"
                            strokeDasharray="8 4"
                            label="BCH Fork"
                        />
                        <ReferenceLine
                            x={XEC_FORK_DATE}
                            stroke="#01a0e0"
                            strokeDasharray="8 4"
                            label="XEC Fork"
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(value: string) =>
                                format(new Date(value), xAxisFormat)
                            }
                            stroke="#ccc"
                            interval={tickInterval}
                            angle={isMobile ? -90 : 0}
                            textAnchor={isMobile ? 'end' : 'middle'}
                        />
                        <YAxis
                            stroke="#ccc"
                            tickFormatter={formatXECValue}
                            domain={yAxisDomain}
                            allowDataOverflow={true}
                        />
                        <Tooltip
                            labelFormatter={(value: string) =>
                                format(new Date(value), 'MMM dd, yyyy')
                            }
                            formatter={(value: number | undefined) => [
                                value !== undefined
                                    ? formatXECValue(value)
                                    : '0 XEC',
                                'Coinbase Output',
                            ]}
                            contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                padding: '8px 12px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            }}
                            cursor={{ stroke: '#01a0e0', strokeWidth: 1 }}
                            isAnimationActive={false}
                            animationDuration={0}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#01a0e0"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                );
            }
            case 'rewards': {
                const filteredRewardsData = getCompleteRewardsData().filter(
                    d =>
                        d.miner_reward !== 0 ||
                        d.staking_reward !== 0 ||
                        d.ifp_reward !== 0,
                );
                const xAxisFormat = getXAxisFormat(filteredRewardsData);
                const tickInterval = getXAxisTickInterval(filteredRewardsData);

                // Check if there are non-zero values for staking and IFP rewards
                const hasStakingRewards = hasNonZeroValues(
                    filteredRewardsData,
                    ['staking_reward'],
                );
                const hasIFPRewards = hasNonZeroValues(filteredRewardsData, [
                    'ifp_reward',
                ]);

                // Build legend keys conditionally
                const legendKeys = ['miner_reward'];
                if (hasStakingRewards) legendKeys.push('staking_reward');
                if (hasIFPRewards) legendKeys.push('ifp_reward');

                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <AreaChart
                                data={filteredRewardsData}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    stroke="#ccc"
                                    tickFormatter={formatXECValue}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => [
                                        value !== undefined
                                            ? formatXECValue(value)
                                            : '0 XEC',
                                        name ? LEGEND_LABELS[name] || name : '',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="miner_reward"
                                    stackId="1"
                                    stroke="#01a0e0"
                                    fill="#01a0e0"
                                    fillOpacity={0.6}
                                />
                                {hasStakingRewards && (
                                    <Area
                                        type="monotone"
                                        dataKey="staking_reward"
                                        stackId="1"
                                        stroke="#22c55e"
                                        fill="#22c55e"
                                        fillOpacity={0.6}
                                    />
                                )}
                                {hasIFPRewards && (
                                    <Area
                                        type="monotone"
                                        dataKey="ifp_reward"
                                        stackId="1"
                                        stroke="#f97316"
                                        fill="#f97316"
                                        fillOpacity={0.6}
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'claims': {
                const trimmedClaims = trimZeroHistory(
                    getCompleteDailyClaims(),
                    ['cachet_claims', 'cashtab_faucet_claims'],
                );
                const xAxisFormat = getXAxisFormat(trimmedClaims);
                const tickInterval = getXAxisTickInterval(trimmedClaims);
                const legendKeys = ['cachet_claims', 'cashtab_faucet_claims'];
                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <BarChart
                                data={trimmedClaims}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    stroke="#ccc"
                                    tickFormatter={formatValue}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => [
                                        value?.toLocaleString() ?? '0',
                                        name ? LEGEND_LABELS[name] || name : '',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Bar
                                    dataKey="cachet_claims"
                                    fill="#FFC94D"
                                    fillOpacity={0.7}
                                />
                                <Bar
                                    dataKey="cashtab_faucet_claims"
                                    fill="#01a0e0"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'cumulative-claims': {
                const trimmedCumulativeClaims = trimZeroHistory(
                    getCompleteCumulativeClaims(),
                    [
                        'cumulative_cachet_claims',
                        'cumulative_cashtab_faucet_claims',
                    ],
                );
                const xAxisFormat = getXAxisFormat(trimmedCumulativeClaims);
                const tickInterval = getXAxisTickInterval(
                    trimmedCumulativeClaims,
                );
                const legendKeys = [
                    'cumulative_cachet_claims',
                    'cumulative_cashtab_faucet_claims',
                ];
                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <AreaChart
                                data={trimmedCumulativeClaims}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    stroke="#ccc"
                                    tickFormatter={formatValue}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => [
                                        value?.toLocaleString() ?? '0',
                                        name ? LEGEND_LABELS[name] || name : '',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cumulative_cachet_claims"
                                    stackId="1"
                                    stroke="#FFC94D"
                                    fill="#FFC94D"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cumulative_cashtab_faucet_claims"
                                    stackId="1"
                                    stroke="#01a0e0"
                                    fill="#01a0e0"
                                    fillOpacity={0.6}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'binance-withdrawals': {
                const trimmedBinance = trimZeroHistory(
                    getCompleteBinanceWithdrawals(),
                    ['withdrawal_count', 'withdrawal_sats'],
                );
                const xAxisFormat = getXAxisFormat(trimmedBinance);
                const tickInterval = getXAxisTickInterval(trimmedBinance);
                const legendKeys = ['withdrawal_count', 'withdrawal_sats'];
                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <ComposedChart
                                data={trimmedBinance}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="#ccc"
                                    tickFormatter={formatValue}
                                    allowDataOverflow={true}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#ccc"
                                    tickFormatter={formatBinanceM}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => {
                                        if (name === 'withdrawal_sats') {
                                            return [
                                                value !== undefined
                                                    ? formatBinanceM(value)
                                                    : '0',
                                                name
                                                    ? LEGEND_LABELS[name] ||
                                                      name
                                                    : '',
                                            ];
                                        }
                                        if (name === 'withdrawal_count') {
                                            return [
                                                value?.toLocaleString() ?? '0',
                                                name
                                                    ? LEGEND_LABELS[name] ||
                                                      name
                                                    : '',
                                            ];
                                        }
                                        return [
                                            value?.toString() ?? '0',
                                            name
                                                ? LEGEND_LABELS[name] || name
                                                : '',
                                        ];
                                    }}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Bar
                                    yAxisId="right"
                                    dataKey="withdrawal_sats"
                                    fill="#01a0e0"
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="withdrawal_count"
                                    stroke="#ff6b6b"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'agora-volume': {
                const trimmedAgora = trimZeroHistory(getCompleteAgoraVolume(), [
                    'xecx',
                    'firma',
                    'other',
                    'total',
                ]);
                const xAxisFormat = getXAxisFormat(trimmedAgora);
                const tickInterval = getXAxisTickInterval(trimmedAgora);
                const legendKeys = ['xecx', 'firma', 'other'];
                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <AreaChart
                                data={trimmedAgora}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    stroke="#ccc"
                                    tickFormatter={formatXECValue}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => [
                                        value !== undefined
                                            ? formatXECValue(value)
                                            : '0 XEC',
                                        name ? LEGEND_LABELS[name] || name : '',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="xecx"
                                    stackId="1"
                                    stroke="#01a0e0"
                                    fill="#01a0e0"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="firma"
                                    stackId="1"
                                    stroke="#22c55e"
                                    fill="#22c55e"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="other"
                                    stackId="1"
                                    stroke="#f97316"
                                    fill="#f97316"
                                    fillOpacity={0.6}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'cumulative-agora-volume': {
                const trimmedCumulative = trimZeroHistory(
                    getCompleteCumulativeAgoraVolume(),
                    ['xecx', 'firma', 'other'],
                );
                const xAxisFormat = getXAxisFormat(trimmedCumulative);
                const tickInterval = getXAxisTickInterval(trimmedCumulative);
                const legendKeys = ['xecx', 'firma', 'other'];
                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <AreaChart
                                data={trimmedCumulative}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    stroke="#ccc"
                                    tickFormatter={formatXECValue}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => [
                                        value !== undefined
                                            ? formatXECValue(value)
                                            : '0 XEC',
                                        name ? LEGEND_LABELS[name] || name : '',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="xecx"
                                    stackId="1"
                                    stroke="#01a0e0"
                                    fill="#01a0e0"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="firma"
                                    stackId="1"
                                    stroke="#22c55e"
                                    fill="#22c55e"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="other"
                                    stackId="1"
                                    stroke="#f97316"
                                    fill="#f97316"
                                    fillOpacity={0.6}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'agora-volume-usd': {
                const dailyAgoraVolumeUSD = getDailyAgoraVolumeUSD();
                const xAxisFormat = getXAxisFormat(dailyAgoraVolumeUSD);
                const tickInterval = getXAxisTickInterval(dailyAgoraVolumeUSD);
                const legendKeys = ['xecx_usd', 'firma_usd', 'other_usd'];
                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <AreaChart
                                data={dailyAgoraVolumeUSD}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    stroke="#ccc"
                                    tickFormatter={formatXECValue}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => [
                                        value !== undefined
                                            ? formatXECValue(value)
                                            : '0 XEC',
                                        name ? LEGEND_LABELS[name] || name : '',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="xecx_usd"
                                    stackId="1"
                                    stroke="#01a0e0"
                                    fill="#01a0e0"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="firma_usd"
                                    stackId="1"
                                    stroke="#22c55e"
                                    fill="#22c55e"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="other_usd"
                                    stackId="1"
                                    stroke="#f97316"
                                    fill="#f97316"
                                    fillOpacity={0.6}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'cumulative-agora-volume-usd': {
                const cumulativeAgoraVolumeUSD = getCumulativeAgoraVolumeUSD();
                const xAxisFormat = getXAxisFormat(cumulativeAgoraVolumeUSD);
                const tickInterval = getXAxisTickInterval(
                    cumulativeAgoraVolumeUSD,
                );
                const legendKeys = ['xecx_usd', 'firma_usd', 'other_usd'];
                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <AreaChart
                                data={cumulativeAgoraVolumeUSD}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    stroke="#ccc"
                                    tickFormatter={formatXECValue}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => [
                                        value !== undefined
                                            ? formatXECValue(value)
                                            : '0 XEC',
                                        name ? LEGEND_LABELS[name] || name : '',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="xecx_usd"
                                    stackId="1"
                                    stroke="#01a0e0"
                                    fill="#01a0e0"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="firma_usd"
                                    stackId="1"
                                    stroke="#22c55e"
                                    fill="#22c55e"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="other_usd"
                                    stackId="1"
                                    stroke="#f97316"
                                    fill="#f97316"
                                    fillOpacity={0.6}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'daily-token-type-tx-counts': {
                const tokenTypeData = getCompleteTokenTypeData();
                const xAxisFormat = getXAxisFormat(tokenTypeData);
                const tickInterval = getXAxisTickInterval(tokenTypeData);
                const legendKeys = [
                    'tx_count_alp_token_type_standard',
                    'tx_count_slp_token_type_fungible',
                    'tx_count_slp_token_type_mint_vault',
                    'tx_count_slp_token_type_nft1_group',
                    'tx_count_slp_token_type_nft1_child',
                    'app_txs_count',
                    'non_token_txs',
                ];
                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <AreaChart
                                data={tokenTypeData}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    stroke="#ccc"
                                    tickFormatter={formatValue}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => [
                                        value?.toLocaleString() ?? '0',
                                        name ? LEGEND_LABELS[name] || name : '',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tx_count_alp_token_type_standard"
                                    stackId="1"
                                    stroke="#01a0e0"
                                    fill="#01a0e0"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tx_count_slp_token_type_fungible"
                                    stackId="1"
                                    stroke="#22c55e"
                                    fill="#22c55e"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tx_count_slp_token_type_mint_vault"
                                    stackId="1"
                                    stroke="#f97316"
                                    fill="#f97316"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tx_count_slp_token_type_nft1_group"
                                    stackId="1"
                                    stroke="#a855f7"
                                    fill="#a855f7"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tx_count_slp_token_type_nft1_child"
                                    stackId="1"
                                    stroke="#f43f5e"
                                    fill="#f43f5e"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="app_txs_count"
                                    stackId="1"
                                    stroke="#0ea5e9"
                                    fill="#0ea5e9"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="non_token_txs"
                                    stackId="1"
                                    stroke="#64748b"
                                    fill="#64748b"
                                    fillOpacity={0.6}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'daily-genesis-txs': {
                const trimmedGenesis = trimZeroHistory(
                    getCompleteGenesisTxsData(),
                    [
                        'genesis_alp_standard',
                        'genesis_slp_fungible',
                        'genesis_slp_mint_vault',
                        'genesis_slp_nft1_group',
                        'genesis_slp_nft1_child',
                    ],
                );
                const xAxisFormat = getXAxisFormat(trimmedGenesis);
                const tickInterval = getXAxisTickInterval(trimmedGenesis);
                const legendKeys = [
                    'genesis_alp_standard',
                    'genesis_slp_fungible',
                    'genesis_slp_mint_vault',
                    'genesis_slp_nft1_group',
                    'genesis_slp_nft1_child',
                ];
                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <AreaChart
                                data={trimmedGenesis}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    stroke="#ccc"
                                    tickFormatter={formatValue}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => [
                                        value?.toLocaleString() ?? '0',
                                        name ? LEGEND_LABELS[name] || name : '',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="genesis_alp_standard"
                                    stackId="1"
                                    stroke="#01a0e0"
                                    fill="#01a0e0"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="genesis_slp_fungible"
                                    stackId="1"
                                    stroke="#22c55e"
                                    fill="#22c55e"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="genesis_slp_mint_vault"
                                    stackId="1"
                                    stroke="#f97316"
                                    fill="#f97316"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="genesis_slp_nft1_group"
                                    stackId="1"
                                    stroke="#a855f7"
                                    fill="#a855f7"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="genesis_slp_nft1_child"
                                    stackId="1"
                                    stroke="#f43f5e"
                                    fill="#f43f5e"
                                    fillOpacity={0.6}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'cumulative-tokens-created': {
                const trimmedCumulative = trimZeroHistory(
                    getCompleteCumulativeTokensData(),
                    [
                        'cumulative_alp_standard',
                        'cumulative_slp_fungible',
                        'cumulative_slp_mint_vault',
                        'cumulative_slp_nft1_group',
                        'cumulative_slp_nft1_child',
                    ],
                );
                const xAxisFormat = getXAxisFormat(trimmedCumulative);
                const tickInterval = getXAxisTickInterval(trimmedCumulative);
                const legendKeys = [
                    'cumulative_alp_standard',
                    'cumulative_slp_fungible',
                    'cumulative_slp_mint_vault',
                    'cumulative_slp_nft1_group',
                    'cumulative_slp_nft1_child',
                ];
                return (
                    <div>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <AreaChart
                                data={trimmedCumulative}
                                margin={
                                    isMobile
                                        ? CHART_MARGINS_MOBILE
                                        : CHART_MARGINS_DESKTOP
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#333"
                                />
                                <ReferenceLine
                                    x={BCH_FORK_DATE}
                                    stroke="#00FF00"
                                    strokeDasharray="8 4"
                                    label="BCH Fork"
                                />
                                <ReferenceLine
                                    x={XEC_FORK_DATE}
                                    stroke="#01a0e0"
                                    strokeDasharray="8 4"
                                    label="XEC Fork"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) =>
                                        format(new Date(value), xAxisFormat)
                                    }
                                    stroke="#ccc"
                                    interval={tickInterval}
                                    angle={isMobile ? -90 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                />
                                <YAxis
                                    stroke="#ccc"
                                    tickFormatter={formatValue}
                                    domain={yAxisDomain}
                                    allowDataOverflow={true}
                                />
                                <Tooltip
                                    labelFormatter={(value: string) =>
                                        format(new Date(value), 'MMM dd, yyyy')
                                    }
                                    formatter={(
                                        value: number | undefined,
                                        name: string | undefined,
                                    ) => [
                                        value?.toLocaleString() ?? '0',
                                        name ? LEGEND_LABELS[name] || name : '',
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        boxShadow:
                                            '0 4px 12px rgba(0, 0, 0, 0.5)',
                                    }}
                                    cursor={{
                                        stroke: '#01a0e0',
                                        strokeWidth: 1,
                                    }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cumulative_alp_standard"
                                    stackId="1"
                                    stroke="#01a0e0"
                                    fill="#01a0e0"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cumulative_slp_fungible"
                                    stackId="1"
                                    stroke="#22c55e"
                                    fill="#22c55e"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cumulative_slp_mint_vault"
                                    stackId="1"
                                    stroke="#f97316"
                                    fill="#f97316"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cumulative_slp_nft1_group"
                                    stackId="1"
                                    stroke="#a855f7"
                                    fill="#a855f7"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cumulative_slp_nft1_child"
                                    stackId="1"
                                    stroke="#f43f5e"
                                    fill="#f43f5e"
                                    fillOpacity={0.6}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <CustomLegend keys={legendKeys} />
                    </div>
                );
            }
            case 'price': {
                const priceData = getCompletePriceData();
                const xAxisFormat = getXAxisFormat(priceData);
                const tickInterval = getXAxisTickInterval(priceData);
                return (
                    <LineChart
                        data={priceData}
                        margin={
                            isMobile
                                ? CHART_MARGINS_MOBILE_PRICE
                                : CHART_MARGINS_DESKTOP
                        }
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <ReferenceLine
                            x={BCH_FORK_DATE}
                            stroke="#00FF00"
                            strokeDasharray="8 4"
                            label="BCH Fork"
                        />
                        <ReferenceLine
                            x={XEC_FORK_DATE}
                            stroke="#01a0e0"
                            strokeDasharray="8 4"
                            label="XEC Fork"
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(value: string) =>
                                format(new Date(value), xAxisFormat)
                            }
                            stroke="#ccc"
                            interval={tickInterval}
                            angle={isMobile ? -90 : 0}
                            textAnchor={isMobile ? 'end' : 'middle'}
                        />
                        <YAxis
                            stroke="#ccc"
                            tickFormatter={(value: number) =>
                                `$${value.toFixed(5)}`
                            }
                            domain={yAxisDomain}
                            allowDataOverflow={true}
                        />
                        <Tooltip
                            labelFormatter={(value: string) =>
                                format(new Date(value), 'MMM dd, yyyy')
                            }
                            formatter={(value: number | undefined) => [
                                `$${value?.toFixed(5) ?? '0.00000'}`,
                                'Price',
                            ]}
                            contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                padding: '8px 12px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            }}
                            cursor={{ stroke: '#01a0e0', strokeWidth: 1 }}
                            isAnimationActive={false}
                            animationDuration={0}
                        />
                        <Line
                            type="monotone"
                            dataKey="avg_price_usd"
                            stroke="#01a0e0"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                );
            }
            default: {
                return (
                    <div className="flex h-64 items-center justify-center text-gray-400">
                        <p>Chart not found</p>
                    </div>
                );
            }
        }
    };

    // Responsive height: 375px on mobile, 600px on larger screens
    const chartHeight = isMobile ? 375 : 600;
    return (
        <div className="h-full w-full max-w-full">
            {/* Chart title - show on both mobile and desktop */}
            <div className="mb-4 text-center">
                <h2 className="text-lg font-semibold text-white">
                    {getChartName(chartId)}
                </h2>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
}
