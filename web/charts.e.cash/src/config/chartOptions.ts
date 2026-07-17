// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Configuration for a chart that can be displayed in the charts application.
 *
 * This interface defines all the metadata and data configuration needed to render
 * a chart, including how to calculate the maximum value for zoom functionality.
 */
export interface ChartOption {
    /** Unique identifier for the chart, used in URLs and internal routing */
    id: string;

    /** Human-readable name displayed in the chart navigation and title */
    name: string;

    /** Description shown in tooltips and chart navigation */
    description: string;

    /** Configuration for how to access and process chart data */
    dataConfig: {
        /**
         * Key that maps to the data array in the main app state.
         * This should match one of the state variables in page.tsx like:
         * - 'completeDays' -> dailyStats state
         * - 'completeDailyClaims' -> dailyClaims state
         * - 'completeCumulativeClaims' -> cumulativeClaims state
         * etc.
         */
        dataKey: string;

        /**
         * Array of field names to use when calculating the maximum value for zoom.
         * For single-field charts, this array contains one field name.
         * For multi-field charts (like claims with cachet + cashtab), this contains
         * all fields that should be summed together.
         *
         * Examples:
         * - ['total_transactions'] for daily transaction count
         * - ['cachet_claims', 'cashtab_faucet_claims'] for claims (summed)
         * - ['cumulative_cachet_claims', 'cumulative_cashtab_faucet_claims'] for cumulative claims
         */
        fields: string[];

        /**
         * Whether to sum multiple fields when calculating the maximum value.
         *
         * - true: Sum all fields in the 'fields' array for each data point
         * - false/undefined: Use only the first field in the 'fields' array
         *
         * This is used for charts that display multiple data series that should
         * be considered together for zoom calculations (e.g., claims, token types).
         */
        sumFields?: boolean;

        /**
         * Optional function to transform values before calculating the maximum for zoom.
         * This is useful for charts that transform the data (e.g., converting bytes to KB).
         */
        transformValue?: (value: number) => number;
    };
}

/**
 * Array of all available charts in the application.
 *
 * Each chart configuration includes:
 * - Metadata for display (id, name, description)
 * - Data configuration for zoom calculations
 *
 * When adding a new chart:
 * 1. Add a new entry to this array
 * 2. Ensure the dataKey matches a state variable in page.tsx
 * 3. Set fields to the data properties you want to use for zoom
 * 4. Set sumFields to true if the chart has multiple data series that should be summed
 *
 * The getDataMax function in page.tsx will automatically use this configuration
 * to calculate the maximum value for zoom functionality.
 */
export const chartOptions: ChartOption[] = [
    {
        id: 'daily-transactions',
        name: 'Daily Transaction Count',
        description: 'Number of transactions per day',
        dataConfig: {
            dataKey: 'completeDays', // Maps to dailyStats state in page.tsx
            fields: ['total_transactions'], // Single field, no summing needed
        },
    },
    {
        id: 'daily-blocks',
        name: 'Daily Block Count',
        description: 'Number of blocks mined per day',
        dataConfig: {
            dataKey: 'completeDays',
            fields: ['total_blocks'],
        },
    },
    {
        id: 'block-sizes',
        name: 'Average Block Size',
        description: 'Average block size in KB',
        dataConfig: {
            dataKey: 'completeDays',
            fields: ['avg_block_size'],
            // The chart transforms avg_block_size by dividing by 1024 to display in KB
            // So we need to account for this transformation in zoom calculations
            transformValue: (value: number) => value / 1024,
        },
    },
    {
        id: 'coinbase-output',
        name: 'Coinbase Output',
        description: 'Total coinbase output in XEC',
        dataConfig: {
            dataKey: 'completeCoinbaseData',
            fields: ['value'],
        },
    },
    {
        id: 'rewards',
        name: 'Mining Rewards',
        description: 'Miner, staking, and IFP rewards',
        dataConfig: {
            dataKey: 'completeRewardsData',
            fields: ['total'],
        },
    },
    {
        id: 'claims',
        name: 'Cashtab Faucet',
        description: 'Daily CACHET and XEC claims',
        dataConfig: {
            dataKey: 'completeDailyClaims', // Maps to dailyClaims state in page.tsx
            fields: ['cachet_claims', 'cashtab_faucet_claims'], // Multiple fields
            sumFields: true, // Sum both fields for zoom calculation
        },
    },
    {
        id: 'cumulative-claims',
        name: 'Cumulative Cashtab Faucet',
        description: 'Total CACHET and XEC claims over time',
        dataConfig: {
            dataKey: 'completeCumulativeClaims', // Maps to cumulativeClaims state in page.tsx
            fields: [
                'cumulative_cachet_claims',
                'cumulative_cashtab_faucet_claims',
            ], // Multiple cumulative fields
            sumFields: true, // Sum both cumulative fields for zoom calculation
        },
    },
    {
        id: 'binance-withdrawals',
        name: 'Binance Withdrawals',
        description: 'Daily withdrawal count and volume',
        dataConfig: {
            dataKey: 'completeBinanceWithdrawals',
            fields: ['withdrawal_sats'],
        },
    },
    {
        id: 'agora-volume',
        name: 'Agora Volume',
        description: 'Daily trading volume by exchange',
        dataConfig: {
            dataKey: '_completeAgoraVolume',
            fields: ['total'],
        },
    },
    {
        id: 'cumulative-agora-volume',
        name: 'Cumulative Agora Volume',
        description: 'Total trading volume over time',
        dataConfig: {
            dataKey: '_completeCumulativeAgoraVolume',
            fields: ['total'],
        },
    },
    {
        id: 'daily-token-type-tx-counts',
        name: 'Transactions by Type',
        description: 'Transaction counts by token type',
        dataConfig: {
            dataKey: 'completeTokenTypeData',
            fields: [
                'tx_count_alp_token_type_standard',
                'tx_count_slp_token_type_fungible',
                'tx_count_slp_token_type_mint_vault',
                'tx_count_slp_token_type_nft1_group',
                'tx_count_slp_token_type_nft1_child',
            ],
            sumFields: true,
        },
    },
    {
        id: 'daily-genesis-txs',
        name: 'Genesis Transactions',
        description: 'New token creation by type',
        dataConfig: {
            dataKey: 'completeGenesisTxsData',
            fields: [
                'genesis_alp_standard',
                'genesis_slp_fungible',
                'genesis_slp_mint_vault',
                'genesis_slp_nft1_group',
                'genesis_slp_nft1_child',
            ],
            sumFields: true,
        },
    },
    {
        id: 'cumulative-tokens-created',
        name: 'Cumulative Tokens Created',
        description: 'Total tokens created over time',
        dataConfig: {
            dataKey: 'completeCumulativeTokensData',
            fields: [
                'cumulative_alp_standard',
                'cumulative_slp_fungible',
                'cumulative_slp_mint_vault',
                'cumulative_slp_nft1_group',
                'cumulative_slp_nft1_child',
            ],
            sumFields: true,
        },
    },
    {
        id: 'price',
        name: 'Price Data',
        description: 'Daily price statistics',
        dataConfig: {
            dataKey: 'completePriceData',
            fields: ['avg_price_usd'],
        },
    },
    {
        id: 'agora-volume-usd',
        name: 'Agora Volume (USD)',
        description: 'Daily trading volume in USD',
        dataConfig: {
            dataKey: 'dailyAgoraVolumeUSD',
            fields: ['usd'],
        },
    },
    {
        id: 'cumulative-agora-volume-usd',
        name: 'Cumulative Agora Volume (USD)',
        description: 'Total trading volume in USD over time',
        dataConfig: {
            dataKey: 'cumulativeAgoraVolumeUSD',
            fields: ['usd'],
        },
    },
    {
        id: 'daily-active-addresses',
        name: 'Daily Active Addresses',
        description: 'True unique addresses active per day (sent or received)',
        dataConfig: {
            dataKey: 'completeDailyActiveAddresses',
            fields: ['daily_active_senders', 'daily_active_addresses'],
        },
    },
    {
        id: 'new-addresses-per-day',
        name: 'New Addresses per Day',
        description: 'Unique addresses seen for the first time each day',
        dataConfig: {
            dataKey: 'completeNewAddressesPerDay',
            fields: ['new_addresses_count'],
        },
    },
    {
        id: 'cumulative-addresses',
        name: 'Cumulative Unique Addresses',
        description: 'Total unique addresses ever seen on the eCash network',
        dataConfig: {
            dataKey: 'completeCumulativeAddresses',
            fields: ['cumulative_addresses'],
        },
    },
    {
        id: 'daily-agora-traders',
        name: 'Unique Agora Traders',
        description: 'Unique buyer and seller addresses on Agora DEX per day',
        dataConfig: {
            dataKey: 'completeDailyAgoraTraders',
            fields: ['agora_unique_traders'],
        },
    },
    {
        id: 'daily-fusion',
        name: 'CashFusion Transactions',
        description: 'Daily CashFusion transactions',
        dataConfig: {
            dataKey: 'completeDailyFusion',
            fields: ['fusion_tx_count'],
        },
    },
    {
        id: 'cumulative-fusion',
        name: 'Cumulative CashFusion',
        description: 'Total CashFusion transactions over time',
        dataConfig: {
            dataKey: 'completeCumulativeFusion',
            fields: ['cumulative_fusion_txs'],
        },
    },
    {
        id: 'daily-lokad-txs',
        name: 'LOKAD Protocol Transactions',
        description: 'Daily transactions using LOKAD protocol identifiers',
        dataConfig: {
            dataKey: 'completeDailyLokadTxs',
            fields: ['lokad_tx_count'],
        },
    },
    {
        id: 'daily-unique-miners',
        name: 'Daily Unique Miners',
        description: 'Unique mining reward recipients per day',
        dataConfig: {
            dataKey: 'completeDailyMinersStakers',
            fields: ['daily_unique_miners'],
        },
    },
    {
        id: 'daily-unique-stakers',
        name: 'Daily Unique Stakers',
        description: 'Unique staking reward recipients per day',
        dataConfig: {
            dataKey: 'completeDailyMinersStakers',
            fields: ['daily_unique_stakers'],
        },
    },
    {
        id: 'cumulative-unique-miners',
        name: 'Cumulative Unique Miners',
        description: 'Total unique addresses that have received mining rewards',
        dataConfig: {
            dataKey: 'completeCumulativeMinersStakers',
            fields: ['cumulative_miners'],
        },
    },
    {
        id: 'cumulative-unique-stakers',
        name: 'Cumulative Unique Stakers',
        description:
            'Total unique addresses that have received staking rewards',
        dataConfig: {
            dataKey: 'completeCumulativeMinersStakers',
            fields: ['cumulative_stakers'],
        },
    },
    {
        id: 'returning-vs-new-addresses',
        name: 'Returning vs New Addresses',
        description:
            'Daily breakdown of returning addresses vs first-time addresses',
        dataConfig: {
            dataKey: 'completeReturningVsNewAddresses',
            fields: ['returning_addresses', 'new_addresses'],
            sumFields: true,
        },
    },
    {
        id: 'daily-coinbase-recipients',
        name: 'Daily Coinbase Recipients',
        description:
            'Unique addresses that received coinbase (mining/staking) outputs per day',
        dataConfig: {
            dataKey: 'completeDailyCoinbaseRecipients',
            fields: ['daily_coinbase_recipients'],
        },
    },
    {
        id: 'new-miners-per-day',
        name: 'New Miners per Day',
        description:
            'Addresses receiving mining rewards for the first time each day',
        dataConfig: {
            dataKey: 'completeNewMinersStakers',
            fields: ['new_miners_count'],
        },
    },
    {
        id: 'new-stakers-per-day',
        name: 'New Stakers per Day',
        description:
            'Addresses receiving staking rewards for the first time each day',
        dataConfig: {
            dataKey: 'completeNewMinersStakers',
            fields: ['new_stakers_count'],
        },
    },
    {
        id: 'rich-list',
        name: 'Rich List',
        description: 'Top eCash addresses by balance (current snapshot)',
        dataConfig: {
            dataKey: 'completeRichList',
            fields: ['balance_xec'],
        },
    },
];

/**
 * Retrieves the display name for a chart by its ID.
 *
 * This function is used by the ChartRenderer component to display the chart title.
 * It looks up the chart configuration by ID and returns the human-readable name.
 *
 * @param chartId - The unique identifier of the chart
 * @returns The display name of the chart, or 'Chart' if not found
 *
 * @example
 * getChartName('daily-transactions') // Returns 'Daily Transaction Count'
 * getChartName('claims') // Returns 'Cashtab Faucet'
 * getChartName('nonexistent') // Returns 'Chart'
 */
export function getChartName(chartId: string): string {
    const chart = chartOptions.find(option => option.id === chartId);
    return chart ? chart.name : 'Chart';
}
