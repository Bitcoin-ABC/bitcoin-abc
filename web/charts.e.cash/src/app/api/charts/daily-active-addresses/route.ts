// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';
import { parseOptionalDateRange } from '../../../../lib/chartQueryParams';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const dateRange = parseOptionalDateRange(
            searchParams.get('start_date'),
            searchParams.get('end_date'),
        );
        if (!dateRange.ok) {
            return NextResponse.json(
                { error: dateRange.error },
                { status: 400 },
            );
        }

        const dailyActiveAddresses = await db.getDailyActiveAddresses(
            dateRange.startDate,
            dateRange.endDate,
        );

        return NextResponse.json(dailyActiveAddresses);
    } catch (error) {
        console.error('Failed to fetch daily active addresses:', error);
        return NextResponse.json(
            { error: 'Failed to fetch daily active addresses' },
            { status: 500 },
        );
    }
}
