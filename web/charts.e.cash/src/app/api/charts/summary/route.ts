// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';

export async function GET(_request: NextRequest) {
    try {
        const summary = await db.getSummary();
        return NextResponse.json(summary);
    } catch (error) {
        console.error('Failed to fetch summary:', error);
        return NextResponse.json(
            { error: 'Failed to fetch summary' },
            { status: 500 },
        );
    }
}
