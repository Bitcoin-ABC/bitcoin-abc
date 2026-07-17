// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';
import { scriptToAddress } from '../../../../lib/scriptToAddress';
import { parseBoundedInt } from '../../../../lib/chartQueryParams';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseBoundedInt(searchParams.get('limit'), 100, 1, 500);
        const minBalanceSats = parseBoundedInt(
            searchParams.get('min_balance_sats'),
            10000,
            0,
            Number.MAX_SAFE_INTEGER,
        );

        if (limit === null || minBalanceSats === null) {
            return NextResponse.json(
                {
                    error: 'limit and min_balance_sats must be valid integers when provided',
                },
                { status: 400 },
            );
        }

        const rows = await db.getRichList(limit, minBalanceSats);

        const richList = rows.map((row, index) => ({
            rank: index + 1,
            address: scriptToAddress(row.output_script),
            balance_xec: row.balance_sats / 100,
            balance_sats: row.balance_sats,
            is_miner: row.is_miner,
            is_staker: row.is_staker,
            is_coinbase_recipient: row.is_coinbase_recipient,
            first_seen: row.first_seen,
        }));

        return NextResponse.json(richList);
    } catch (error) {
        console.error('Failed to fetch rich list:', error);
        return NextResponse.json(
            { error: 'Failed to fetch rich list' },
            { status: 500 },
        );
    }
}
