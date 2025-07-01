// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { differenceInYears, differenceInMonths } from 'date-fns';

export function getXAxisFormat(data: Array<{ date: string }>): string {
    if (!data || data.length === 0) return 'MMM dd';

    const startDate = new Date(data[0].date);
    const endDate = new Date(data[data.length - 1].date);

    const yearsDiff = differenceInYears(endDate, startDate);
    const monthsDiff = differenceInMonths(endDate, startDate);

    if (yearsDiff >= 5 || monthsDiff >= 54) {
        return 'yyyy'; // Show only years for 5+ years or 54+ months
    } else if (yearsDiff >= 1) {
        return 'MMM yyyy'; // Show months and years for 1-5 years
    } else {
        return 'MMM dd'; // Show months and days for less than 1 year
    }
}

export function getXAxisTickInterval(data: Array<{ date: string }>): number {
    if (!data || data.length === 0) return 1;

    const startDate = new Date(data[0].date);
    const endDate = new Date(data[data.length - 1].date);

    const yearsDiff = differenceInYears(endDate, startDate);
    const monthsDiff = differenceInMonths(endDate, startDate);

    if (yearsDiff >= 5 || monthsDiff >= 54) {
        // For 5+ years or 54+ months, show 1 tick per year
        return Math.max(1, Math.floor(data.length / yearsDiff));
    } else if (yearsDiff >= 3 || monthsDiff >= 35) {
        // For 3-5 years, show 1 tick per 3 months (every 3rd month)
        return Math.max(1, Math.floor(data.length / (monthsDiff / 3)));
    } else if (yearsDiff >= 2 || monthsDiff >= 23) {
        // For 2-3 years, show 1 tick per 2 months (every other month)
        return Math.max(1, Math.floor(data.length / (monthsDiff / 2)));
    } else if (yearsDiff >= 1 || monthsDiff >= 12) {
        // For 1-2 years, show 1 tick per month minimum
        return Math.max(1, Math.floor(data.length / monthsDiff));
    } else {
        // For less than 1 year, show reasonable tick density
        return Math.max(1, Math.floor(data.length / 12));
    }
}

export function formatValue(value: number): string {
    if (value >= 1e6) {
        return `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (value >= 1e3) {
        return `${(value / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    }
    if (Math.abs(value) < 1e3 && Math.floor(value) !== value) {
        return value
            .toFixed(2)
            .replace(/\.00$/, '')
            .replace(/(\.[1-9])0$/, '$1');
    }
    return value.toString();
}

export function formatXECValue(value: number): string {
    if (value >= 1e9) {
        return `${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
    }
    if (value >= 1e6) {
        return `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (value >= 1e3) {
        return `${(value / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    }
    if (Math.abs(value) < 1e3 && Math.floor(value) !== value) {
        return value
            .toFixed(2)
            .replace(/\.00$/, '')
            .replace(/(\.[1-9])0$/, '$1');
    }
    return value.toString();
}

export function formatUSDValue(value: number): string {
    if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
    }
    if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (value >= 1e3) {
        return `$${(value / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    }
    if (Math.abs(value) < 1e3 && Math.floor(value) !== value) {
        return `$${value
            .toFixed(2)
            .replace(/\.00$/, '')
            .replace(/(\.[1-9])0$/, '$1')}`;
    }
    return `$${Math.round(value)}`;
}

export function formatBinanceM(value: number): string {
    if (value >= 1e9) {
        return `${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
    }
    return `${Math.round(value / 1000000).toLocaleString()}M`;
}

/**
 * Trims the leading zero-history from a data array, starting at the first index
 * where any of the specified keys is nonzero.
 * @param data Array of objects with date and value keys
 * @param keys Array of keys to check for nonzero values
 * @returns Trimmed data array
 */
export function trimZeroHistory<T>(data: T[], keys: string[]): T[] {
    if (!data || data.length === 0) return data;
    const firstNonZeroIdx = data.findIndex(row =>
        keys.some(key => Number((row as Record<string, unknown>)[key]) !== 0),
    );
    return firstNonZeroIdx === -1 ? data : data.slice(firstNonZeroIdx);
}
