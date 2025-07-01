// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/database';

export async function GET(_request: NextRequest) {
    try {
        // Test database connection
        const testResult = await db.testConnection();

        return NextResponse.json({
            success: true,
            blockCount: testResult.blockCount,
            message: 'Database connection successful',
        });
    } catch (error) {
        console.error('[API] Test DB error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Database connection failed',
            },
            { status: 500 },
        );
    }
}
