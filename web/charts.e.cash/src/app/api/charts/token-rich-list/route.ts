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
        const tokenId = searchParams.get('token_id');
        if (!tokenId || !/^[0-9a-fA-F]{64}$/.test(tokenId)) {
            return NextResponse.json(
                { error: 'token_id query param required (64-char hex)' },
                { status: 400 },
            );
        }

        const limit = parseBoundedInt(searchParams.get('limit'), 100, 1, 500);
        if (limit === null) {
            return NextResponse.json(
                { error: 'limit must be a valid integer when provided' },
                { status: 400 },
            );
        }

        let minAtoms: bigint;
        const minAtomsRaw = searchParams.get('min_atoms');
        try {
            if (minAtomsRaw !== null && minAtomsRaw !== '') {
                if (!/^[+-]?\d+$/.test(minAtomsRaw)) {
                    throw new Error('invalid');
                }
            }
            const parsedMinAtoms = BigInt(minAtomsRaw || '1');
            minAtoms = parsedMinAtoms < BigInt(1) ? BigInt(1) : parsedMinAtoms;
        } catch {
            return NextResponse.json(
                { error: 'min_atoms must be a valid integer when provided' },
                { status: 400 },
            );
        }

        // Mint batons always have 0 atoms; default min_atoms (>= 1) excludes
        // them. Callers that want batons must pass include_mint_batons=true
        // and min_atoms=0.
        const includeMintBatons =
            searchParams.get('include_mint_batons') === 'true';

        const rows = await db.getTokenRichList(
            tokenId.toLowerCase(),
            limit,
            minAtoms,
            includeMintBatons,
        );

        const richList = rows.map((row, index) => ({
            rank: index + 1,
            address: scriptToAddress(row.output_script),
            atoms: row.atoms,
            is_mint_baton: row.is_mint_baton,
            token_protocol: row.token_protocol,
            token_type: row.token_type,
        }));

        return NextResponse.json({
            token_id: tokenId.toLowerCase(),
            entries: richList,
        });
    } catch (error) {
        console.error('Failed to fetch token rich list:', error);
        return NextResponse.json(
            { error: 'Failed to fetch token rich list' },
            { status: 500 },
        );
    }
}
