// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use client';

import { useState, useEffect, useRef } from 'react';
import {
    format,
    subDays,
    subYears,
    startOfDay,
    endOfDay,
    differenceInDays,
} from 'date-fns';
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ReactDOM from 'react-dom';

interface DateRangeSelectorProps {
    onDateRangeChange: (startDate: string, endDate: string) => void;
    currentStartDate?: string;
    currentEndDate?: string;
    isLoading?: boolean;
}

type DateRange =
    | 'BCH'
    | '4y'
    | '3y'
    | '2y'
    | '1y'
    | '6m'
    | '3m'
    | '1m'
    | 'all'
    | 'xec'
    | 'custom';

export default function DateRangeSelector({
    onDateRangeChange,
    currentStartDate,
    currentEndDate,
    isLoading = false,
}: DateRangeSelectorProps) {
    const [selectedRange, setSelectedRange] = useState<DateRange>('1y');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [tempStartDate, setTempStartDate] = useState<string>('');
    const [tempEndDate, setTempEndDate] = useState<string>('');
    const pickerRef = useRef<HTMLDivElement>(null);
    const customBtnRef = useRef<HTMLButtonElement>(null);
    const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});

    // Calculate date ranges
    const getDateRange = (
        range: DateRange,
    ): { startDate: string; endDate: string } => {
        const today = new Date();
        const endDate = format(endOfDay(today), 'yyyy-MM-dd');

        switch (range) {
            case '4y':
                return {
                    startDate: format(
                        startOfDay(subYears(today, 4)),
                        'yyyy-MM-dd',
                    ),
                    endDate,
                };
            case '3y':
                return {
                    startDate: format(
                        startOfDay(subYears(today, 3)),
                        'yyyy-MM-dd',
                    ),
                    endDate,
                };
            case '2y':
                return {
                    startDate: format(
                        startOfDay(subYears(today, 2)),
                        'yyyy-MM-dd',
                    ),
                    endDate,
                };
            case '1y':
                return {
                    startDate: format(
                        startOfDay(subYears(today, 1)),
                        'yyyy-MM-dd',
                    ),
                    endDate,
                };
            case '6m':
                return {
                    startDate: format(
                        startOfDay(subDays(today, 180)),
                        'yyyy-MM-dd',
                    ),
                    endDate,
                };
            case '3m':
                return {
                    startDate: format(
                        startOfDay(subDays(today, 90)),
                        'yyyy-MM-dd',
                    ),
                    endDate,
                };
            case '1m':
                return {
                    startDate: format(
                        startOfDay(subDays(today, 30)),
                        'yyyy-MM-dd',
                    ),
                    endDate,
                };
            case 'all':
                return {
                    startDate: '2009-01-01', // Bitcoin genesis
                    endDate,
                };
            case 'xec':
                return {
                    startDate: '2020-11-15', // XEC fork date
                    endDate,
                };
            case 'custom':
                return {
                    startDate: customStartDate,
                    endDate: customEndDate,
                };
            case 'BCH':
                return {
                    startDate: '2017-08-01',
                    endDate,
                };
            default:
                return {
                    startDate: format(
                        startOfDay(subYears(today, 1)),
                        'yyyy-MM-dd',
                    ),
                    endDate,
                };
        }
    };

    // Determine which range matches the current date range
    const getRangeFromDates = (
        startDate: string,
        endDate: string,
    ): DateRange => {
        if (!startDate || !endDate) return '1y';

        const start = new Date(startDate);

        // Check if it matches predefined ranges (with some tolerance)
        const today = new Date();
        const fourYearsAgo = subYears(today, 4);
        const threeYearsAgo = subYears(today, 3);
        const twoYearsAgo = subYears(today, 2);
        const oneYearAgo = subYears(today, 1);
        const sixMonthsAgo = subDays(today, 180);
        const threeMonthsAgo = subDays(today, 90);
        const oneMonthAgo = subDays(today, 30);

        if (Math.abs(differenceInDays(start, fourYearsAgo)) <= 2) return '4y';
        if (Math.abs(differenceInDays(start, threeYearsAgo)) <= 2) return '3y';
        if (Math.abs(differenceInDays(start, twoYearsAgo)) <= 2) return '2y';
        if (Math.abs(differenceInDays(start, oneYearAgo)) <= 2) return '1y';
        if (Math.abs(differenceInDays(start, sixMonthsAgo)) <= 2) return '6m';
        if (Math.abs(differenceInDays(start, threeMonthsAgo)) <= 2) return '3m';
        if (Math.abs(differenceInDays(start, oneMonthAgo)) <= 2) return '1m';
        if (startDate === '2017-08-01') return 'BCH';
        if (startDate === '2009-01-01') return 'all';
        if (startDate === '2020-11-15') return 'xec';

        return 'custom';
    };

    // Sync selected range when current dates change
    useEffect(() => {
        if (currentStartDate && currentEndDate) {
            const range = getRangeFromDates(currentStartDate, currentEndDate);
            setSelectedRange(range);

            // If it's a custom range, update the custom date inputs
            if (range === 'custom') {
                setCustomStartDate(currentStartDate);
                setCustomEndDate(currentEndDate);
            }
        }
    }, [currentStartDate, currentEndDate]);

    // Handle click outside to close picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setShowCustomPicker(false);
            }
        };

        if (showCustomPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showCustomPicker]);

    const handleRangeChange = (range: DateRange) => {
        if (range === 'custom') {
            // Initialize temp dates with current custom dates or today
            setTempStartDate(
                customStartDate || format(new Date(), 'yyyy-MM-dd'),
            );
            setTempEndDate(customEndDate || format(new Date(), 'yyyy-MM-dd'));
            // Calculate position for portal dropdown
            if (customBtnRef.current) {
                const rect = customBtnRef.current.getBoundingClientRect();
                setPickerStyle({
                    position: 'absolute',
                    top: rect.bottom + window.scrollY + 4, // 4px margin
                    left: rect.left + window.scrollX,
                    zIndex: 9999,
                });
            }
            setShowCustomPicker(true);
            return;
        }

        setSelectedRange(range);
        setShowCustomPicker(false);
        const { startDate, endDate } = getDateRange(range);
        onDateRangeChange(startDate, endDate);
    };

    const handleCustomDateApply = () => {
        if (tempStartDate && tempEndDate) {
            setCustomStartDate(tempStartDate);
            setCustomEndDate(tempEndDate);
            setSelectedRange('custom');
            setShowCustomPicker(false);
            onDateRangeChange(tempStartDate, tempEndDate);
        }
    };

    const handleCustomDateCancel = () => {
        setShowCustomPicker(false);
        // Reset temp dates to current custom dates
        setTempStartDate(customStartDate);
        setTempEndDate(customEndDate);
    };

    const isCustomValid =
        tempStartDate && tempEndDate && tempStartDate <= tempEndDate;

    return (
        <div className="mb-2 mt-3 flex flex-wrap items-center gap-4 sm:mb-6">
            <div className="-mx-2 flex flex-nowrap gap-2 overflow-x-auto px-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {(
                    [
                        '4y',
                        '3y',
                        '2y',
                        '1y',
                        '6m',
                        '3m',
                        '1m',
                        'all',
                        'BCH',
                        'xec',
                    ] as DateRange[]
                ).map(range => (
                    <button
                        key={range}
                        onClick={() => handleRangeChange(range)}
                        disabled={isLoading}
                        className={`h-10 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors ${
                            selectedRange === range
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                        {range === '4y' && '4 Years'}
                        {range === '3y' && '3 Years'}
                        {range === '2y' && '2 Years'}
                        {range === '1y' && '1 Year'}
                        {range === '6m' && '6 Months'}
                        {range === '3m' && '3 Months'}
                        {range === '1m' && '1 Month'}
                        {range === 'all' && 'All Time'}
                        {range === 'BCH' && 'BCH'}
                        {range === 'xec' && 'XEC'}
                    </button>
                ))}

                {/* Custom Date Button */}
                <div className="relative">
                    <button
                        ref={customBtnRef}
                        onClick={() => handleRangeChange('custom')}
                        disabled={isLoading}
                        className={`flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors ${
                            selectedRange === 'custom'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Custom
                    </button>
                    {/* Portal Dropdown */}
                    {showCustomPicker &&
                        typeof window !== 'undefined' &&
                        ReactDOM.createPortal(
                            <div
                                ref={pickerRef}
                                style={pickerStyle}
                                className="w-80 rounded-lg border border-white/20 bg-[#181A20] p-4 shadow-lg backdrop-blur-sm"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-white">
                                        Select Date Range
                                    </h3>
                                    <button
                                        onClick={handleCustomDateCancel}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-300">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={tempStartDate}
                                            onChange={e =>
                                                setTempStartDate(e.target.value)
                                            }
                                            max={tempEndDate || undefined}
                                            className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-300">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={tempEndDate}
                                            onChange={e =>
                                                setTempEndDate(e.target.value)
                                            }
                                            min={tempStartDate || undefined}
                                            className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={handleCustomDateCancel}
                                            className="flex-1 rounded border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/20"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCustomDateApply}
                                            disabled={!isCustomValid}
                                            className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
                                                isCustomValid
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'cursor-not-allowed bg-gray-600 text-gray-400'
                                            }`}
                                        >
                                            OK
                                        </button>
                                    </div>
                                </div>
                            </div>,
                            document.body,
                        )}
                </div>
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 text-sm text-blue-400">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
                    Loading charts data...
                </div>
            )}
        </div>
    );
}
