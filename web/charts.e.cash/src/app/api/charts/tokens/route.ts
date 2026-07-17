// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';
import { parseBoundedInt } from '../../../../lib/chartQueryParams';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const protocol = searchParams.get('protocol') ?? undefined;
        const limit = parseBoundedInt(searchParams.get('limit'), 100, 1, 1000);
        if (limit === null) {
            return NextResponse.json(
                { error: 'limit must be a valid integer when provided' },
                { status: 400 },
            );
        }

        const rows = await db.getIndexedTokens(limit, protocol);

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Failed to fetch indexed tokens:', error);
        return NextResponse.json(
            { error: 'Failed to fetch indexed tokens' },
            { status: 500 },
        );
    }
}
