// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use client';

import { format } from 'date-fns';
import { chartOptions } from '../config/chartOptions';
import type { SummaryData } from '../app/page';

interface ChartNavigationProps {
    selectedChart: string;
    onChartSelect: (chartId: string) => void;
    summaryData: SummaryData | null;
}

export default function ChartNavigation({
    selectedChart,
    onChartSelect,
    summaryData,
}: ChartNavigationProps) {
    return (
        <div
            className="custom-scrollbar h-screen w-64 overflow-y-auto border-r border-white/10 bg-[#181A20]"
            style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#01a0e0 #090916',
            }}
        >
            <div className="p-4">
                {summaryData && (
                    <div className="mb-4 space-y-1 border-b border-white/10 pb-4 text-xs text-[#cccccc]">
                        <p>
                            🟦 {summaryData.lowestBlockHeight.toLocaleString()}{' '}
                            - {summaryData.latestBlockHeight.toLocaleString()}
                        </p>
                        {summaryData.dataRange && (
                            <p>
                                📅{' '}
                                {format(
                                    new Date(
                                        summaryData.dataRange.earliestDate,
                                    ),
                                    'MMM d, yyyy',
                                )}{' '}
                                thru{' '}
                                {format(
                                    new Date(summaryData.dataRange.latestDate),
                                    'MMM d, yyyy',
                                )}
                            </p>
                        )}
                    </div>
                )}
                <h2 className="mb-4 text-lg font-semibold text-white">
                    Charts
                </h2>
                <nav className="space-y-1">
                    {chartOptions.map(chart => (
                        <button
                            key={chart.id}
                            onClick={() => onChartSelect(chart.id)}
                            className={`w-full rounded-lg p-3 text-left transition-colors ${
                                selectedChart === chart.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <div className="text-sm font-medium">
                                {chart.name}
                            </div>
                            <div className="mt-1 text-xs opacity-75">
                                {chart.description}
                            </div>
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
}
