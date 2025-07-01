// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        const dailyGenesisTxs = await db.getDailyGenesisTxs(
            startDate || undefined,
            endDate || undefined,
        );

        return NextResponse.json(dailyGenesisTxs);
    } catch (error) {
        console.error('Failed to fetch daily genesis txs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch daily genesis txs' },
            { status: 500 },
        );
    }
}
